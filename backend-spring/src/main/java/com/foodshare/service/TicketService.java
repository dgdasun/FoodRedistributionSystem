package com.foodshare.service;

import com.foodshare.model.Donation;
import com.foodshare.model.Ticket;
import com.foodshare.repository.DonationRepository;
import com.foodshare.repository.FoodRequestRepository;
import com.foodshare.repository.TicketRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class TicketService {

    private final TicketRepository ticketRepository;
    private final DonationRepository donationRepository;
    private final FoodRequestRepository requestRepository;
    private final NotificationService notificationService;

    public TicketService(TicketRepository ticketRepository, DonationRepository donationRepository,
                         FoodRequestRepository requestRepository, NotificationService notificationService) {
        this.ticketRepository = ticketRepository;
        this.donationRepository = donationRepository;
        this.requestRepository = requestRepository;
        this.notificationService = notificationService;
    }

    public List<Ticket> byBeneficiary(String beneficiaryId) {
        return ticketRepository.findByBeneficiaryIdOrderByCreatedAtDesc(beneficiaryId);
    }

    public List<Ticket> byDonor(String donorId) {
        List<String> donorItemIds = donationRepository.findByDonorIdOrderByCreatedAtDesc(donorId).stream().map(Donation::getId).toList();
        return ticketRepository.findByItemIdInOrderByCreatedAtDesc(donorItemIds);
    }

    public Ticket get(String id) {
        return ticketRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
    }

    public Ticket updateStatus(String id, String status) {
        Ticket t = get(id);
        t.setStatus(status);
        t.setUpdatedAt(Instant.now());
        return ticketRepository.save(t);
    }

    /**
     * Donor-side pickup verification: scans the beneficiary's QR code to confirm
     * and finalize the handoff. Only the donor who owns the underlying item may
     * complete it, and only while the ticket is still pending.
     */
    public Ticket completeByQrCode(String qrCode, String donorId) {
        Ticket ticket = ticketRepository.findByQrCode(qrCode)
                .or(() -> ticketRepository.findById(qrCode))
                .orElseThrow(() -> new IllegalArgumentException("QR code not recognized — this ticket doesn't exist."));

        Donation item = donationRepository.findById(ticket.getItemId())
                .orElseThrow(() -> new IllegalArgumentException("The item for this ticket no longer exists."));
        if (!item.getDonorId().equals(donorId)) {
            throw new IllegalArgumentException("This ticket belongs to a different donor's donation.");
        }
        if ("collected".equals(ticket.getStatus())) {
            throw new IllegalStateException("This ticket has already been marked as collected.");
        }

        ticket.setStatus("collected");
        ticket.setUpdatedAt(Instant.now());
        Ticket saved = ticketRepository.save(ticket);

        // Carry the completed handoff through to the request and the item so
        // "collected" shows everywhere, not only on the ticket.
        if (ticket.getRequestId() != null) {
            requestRepository.findById(ticket.getRequestId()).ifPresent(r -> {
                r.setStatus("collected");
                requestRepository.save(r);
            });
        }
        // The item is only fully collected once no stock is left to give away
        // and every other ticket for it has been handed over too.
        boolean stockLeft = item.getQuantityKg() != null && item.getQuantityKg() > 0;
        boolean otherPending = ticketRepository.findByItemIdInOrderByCreatedAtDesc(List.of(item.getId())).stream()
                .anyMatch(t -> !t.getId().equals(ticket.getId()) && "pending".equals(t.getStatus()));
        if (!stockLeft && !otherPending) {
            item.setStatus("collected");
            donationRepository.save(item);
        }

        notificationService.notify(ticket.getBeneficiaryId(), "ticket",
                "Your pickup for \"" + item.getName() + "\" was confirmed by the donor. Donation complete!");

        return saved;
    }
}
