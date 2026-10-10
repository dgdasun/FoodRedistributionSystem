package com.foodshare.service;

import com.foodshare.dto.RecommendationDTO;
import com.foodshare.model.Donation;
import com.foodshare.util.ExpiryUtil;
import com.foodshare.model.FoodRequest;
import com.foodshare.model.Ticket;
import com.foodshare.model.User;
import com.foodshare.repository.DonationRepository;
import com.foodshare.repository.FoodRequestRepository;
import com.foodshare.repository.TicketRepository;
import com.foodshare.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class RequestService {

    private final FoodRequestRepository requestRepository;
    private final DonationRepository donationRepository;
    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;
    private final AIClientService aiClientService;
    private final NotificationService notificationService;
    private final SettingsService settingsService;

    public RequestService(FoodRequestRepository requestRepository,
                           DonationRepository donationRepository,
                           UserRepository userRepository,
                           TicketRepository ticketRepository,
                           AIClientService aiClientService,
                           NotificationService notificationService,
                           SettingsService settingsService) {
        this.requestRepository = requestRepository;
        this.donationRepository = donationRepository;
        this.userRepository = userRepository;
        this.ticketRepository = ticketRepository;
        this.aiClientService = aiClientService;
        this.notificationService = notificationService;
        this.settingsService = settingsService;
    }

    public FoodRequest submit(FoodRequest request) {
        User beneficiary = userRepository.findById(request.getBeneficiaryId())
                .orElseThrow(() -> new IllegalArgumentException("Beneficiary not found"));
        if (!beneficiary.isVerified()) {
            throw new IllegalStateException("Your organization must be verified by an administrator before you can request food.");
        }

        Donation item = donationRepository.findById(request.getItemId())
                .orElseThrow(() -> new IllegalArgumentException("Item not found"));

        if ("expired".equals(item.getStatus()) && !"expired".equals(item.getListingType())) {
            throw new IllegalArgumentException("This item has expired and is no longer available for human consumption.");
        }

        request.setStatus("pending");
        request.setCreatedAt(Instant.now());
        if (request.getUrgency() == null) request.setUrgency("medium");

        // Distance feeds the AI priority model, so it is derived here from the
        // two organizations' real coordinates rather than trusted from the
        // client - the browse page used to send Math.random(), which quietly
        // fed noise straight into the ranking.
        Double km = distanceBetween(userRepository.findById(item.getDonorId()).orElse(null), beneficiary);
        if (km != null) request.setDistanceKm(km);
        FoodRequest saved = requestRepository.save(request);

        notificationService.notify(item.getDonorId(), "request",
                "New request received for \"" + item.getName() + "\" (" + request.getQuantityKg() + "kg).");

        return saved;
    }

    /**
     * AI-Assisted Beneficiary Recommendation - delegates the actual scoring
     * to the Python AI/ML service via AIClientService.
     */
    public List<RecommendationDTO> recommendationsFor(String itemId) {
        Donation item = donationRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Item not found"));
        List<FoodRequest> pending = requestRepository.findByItemIdAndStatusOrderByCreatedAtDesc(itemId, "pending");
        List<User> beneficiaries = userRepository.findAllById(
                pending.stream().map(FoodRequest::getBeneficiaryId).distinct().toList());
        return aiClientService.rankRequests(item, pending, beneficiaries);
    }

    /**
     * Approves, counter-offers, rejects or cancels a request.
     * <p>
     * A donor approval that is lower than the requested quantity puts the request into
     * {@code counter_offer} (reserving that quantity from the item) instead of auto-generating
     * a ticket; the beneficiary then accepts (status {@code approved}, ticket generated from the
     * already-reserved quantity) or declines (status {@code cancelled}, quantity released back).
     */
    public FoodRequest updateStatus(String requestId, String status, Double approvedQuantityKg, String reason) {
        FoodRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));
        String previousStatus = request.getStatus();
        Donation item = donationRepository.findById(request.getItemId()).orElse(null);

        if ("approved".equals(status)) {
            if ("counter_offer".equals(previousStatus)) {
                // Beneficiary accepting the donor's counter-offer; the quantity was already reserved.
                request.setStatus("approved");
                requestRepository.save(request);
                if (item != null) {
                    createTicket(request, item, request.getApprovedQuantityKg());
                    notificationService.notify(request.getBeneficiaryId(), "ticket",
                            "Collection ticket generated for the " + request.getApprovedQuantityKg() + "kg you accepted.");
                }
            } else {
                double qty = approvedQuantityKg != null ? approvedQuantityKg : request.getQuantityKg();
                if (item != null) qty = Math.min(qty, item.getQuantityKg());
                request.setApprovedQuantityKg(qty);

                if (qty < request.getQuantityKg()) {
                    request.setStatus("counter_offer");
                    requestRepository.save(request);
                    if (item != null) {
                        reserveStock(item, qty);
                        notificationService.notify(request.getBeneficiaryId(), "request",
                                "The donor could only approve " + qty + "kg of your " + request.getQuantityKg()
                                        + "kg request for \"" + item.getName() + "\". Please review the offer.");
                    }
                } else {
                    request.setStatus("approved");
                    requestRepository.save(request);
                    if (item != null) {
                        reserveStock(item, qty);
                        createTicket(request, item, qty);
                        notificationService.notify(request.getBeneficiaryId(), "ticket",
                                "Your request was approved! Collection ticket generated.");
                    }
                }
            }
        } else if ("rejected".equals(status)) {
            request.setStatus("rejected");
            request.setRejectionReason(reason);
            requestRepository.save(request);
            notificationService.notify(request.getBeneficiaryId(), "request",
                    "Your request for \"" + (item != null ? item.getName() : "an item") + "\" was declined.");
        } else if ("cancelled".equals(status)) {
            // Beneficiary declining a counter-offer; release the reserved quantity back to the donor.
            request.setStatus("cancelled");
            requestRepository.save(request);
            if (item != null && request.getApprovedQuantityKg() != null) {
                releaseStock(item, request.getApprovedQuantityKg());
            }
        } else {
            request.setStatus(status);
            requestRepository.save(request);
        }

        return request;
    }

    private void createTicket(FoodRequest request, Donation item, double quantityKg) {
        Ticket ticket = new Ticket();
        String ticketId = UUID.randomUUID().toString().substring(0, 8);
        ticket.setId("t-" + ticketId);
        ticket.setRequestId(request.getId());
        ticket.setItemId(item.getId());
        ticket.setBeneficiaryId(request.getBeneficiaryId());
        ticket.setQuantityKg(quantityKg);
        ticket.setPickupLocation(item.getPickupLocation());
        ticket.setPickupDate(LocalDate.now().plusDays(1));
        ticket.setPickupTime("10:00 AM");
        ticket.setStatus("pending");
        ticket.setQrCode("FSQR-" + ticket.getId() + "-" + item.getId() + "-" + request.getBeneficiaryId());
        Instant now = Instant.now();
        ticket.setCreatedAt(now);
        int collectionWindowHours = settingsService.resolveCollectionWindowHours(item.getCategory());
        ticket.setExpiresAt(now.plus(collectionWindowHours, ChronoUnit.HOURS));
        ticketRepository.save(ticket);
    }

    /** Reduces available stock in real time (REQ-7), reserving it against a request. */
    private void reserveStock(Donation item, double quantityKg) {
        double remaining = Math.max(0, item.getQuantityKg() - quantityKg);
        item.setQuantityKg(remaining);
        if (remaining == 0) item.setStatus("reserved");
        donationRepository.save(item);
    }

    /** Releases previously-reserved stock back to the donor's available inventory. */
    private void releaseStock(Donation item, double quantityKg) {
        item.setQuantityKg(item.getQuantityKg() + quantityKg);
        if ("reserved".equals(item.getStatus())) {
            // Re-derive the real state instead of hardcoding a status. This used
            // to reset to "fresh", which put stock the system is not meant to
            // carry back into circulation every time a request was cancelled.
            int threshold = settingsService.resolveExpiryThresholdDays(item.getCategory());
            item.setStatus(ExpiryUtil.reListStatus(item.getExpiryDate(), threshold));
        }
        donationRepository.save(item);
    }

    /**
     * Great-circle distance in km between a donor and a beneficiary, or null
     * when either side has no coordinates on file (the model then keeps the
     * request's default).
     */
    private Double distanceBetween(User donor, User beneficiary) {
        if (donor == null || beneficiary == null) return null;
        Double lat1 = donor.getLatitude(), lon1 = donor.getLongitude();
        Double lat2 = beneficiary.getLatitude(), lon2 = beneficiary.getLongitude();
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;

        double earthRadiusKm = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(earthRadiusKm * c * 10.0) / 10.0;
    }

    public List<FoodRequest> byBeneficiary(String beneficiaryId) {
        return requestRepository.findByBeneficiaryIdOrderByCreatedAtDesc(beneficiaryId);
    }

    public List<FoodRequest> byItem(String itemId) {
        return requestRepository.findByItemIdOrderByCreatedAtDesc(itemId);
    }

    public List<FoodRequest> byDonor(String donorId) {
        List<String> donorItemIds = donationRepository.findByDonorIdOrderByCreatedAtDesc(donorId).stream().map(Donation::getId).toList();
        return requestRepository.findByItemIdInOrderByCreatedAtDesc(donorItemIds);
    }
}
