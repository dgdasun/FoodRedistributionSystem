package com.foodshare.service;

import com.foodshare.model.Donation;
import com.foodshare.model.FoodRequest;
import com.foodshare.model.Ticket;
import com.foodshare.model.User;
import com.foodshare.repository.DonationRepository;
import com.foodshare.repository.FoodRequestRepository;
import com.foodshare.repository.TicketRepository;
import com.foodshare.repository.UserRepository;
import com.foodshare.util.DonationUnits;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private static final double MEALS_PER_KG = 2.0;
    private static final double CO2_KG_SAVED_PER_KG_FOOD = 2.5;
    private static final Set<String> REVIEWED_ROLES = Set.of("donor", "beneficiary", "farm");

    private final DonationRepository donationRepository;
    private final TicketRepository ticketRepository;
    private final FoodRequestRepository requestRepository;
    private final UserRepository userRepository;

    public DashboardService(DonationRepository donationRepository, TicketRepository ticketRepository,
                             FoodRequestRepository requestRepository, UserRepository userRepository) {
        this.donationRepository = donationRepository;
        this.ticketRepository = ticketRepository;
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
    }

    public Map<String, Object> donorDashboard(String donorId) {
        List<Donation> donations = donationRepository.findByDonorIdOrderByCreatedAtDesc(donorId);
        List<String> donorItemIds = donations.stream().map(Donation::getId).toList();
        List<Ticket> donorTickets = ticketRepository.findByItemIdInOrderByCreatedAtDesc(donorItemIds);

        double totalFoodKg = 0;
        for (Donation d : donations) {
            double allocated = donorTickets.stream()
                    .filter(t -> t.getItemId().equals(d.getId()))
                    .mapToDouble(Ticket::getQuantityKg).sum();
            totalFoodKg += d.getQuantityKg() + allocated;
        }

        Set<String> beneficiarySet = donorTickets.stream().map(Ticket::getBeneficiaryId).collect(Collectors.toSet());
        int peopleHelped = 0;
        for (String bid : beneficiarySet) {
            User u = userRepository.findById(bid).orElse(null);
            peopleHelped += (u != null && u.getOrganizationSize() != null && u.getOrganizationSize() > 0)
                    ? Math.round(u.getOrganizationSize() * 0.3f) : 20;
        }

        double co2Saved = Math.round(totalFoodKg * CO2_KG_SAVED_PER_KG_FOOD * 10) / 10.0;
        int mealsProvided = (int) Math.round(totalFoodKg * MEALS_PER_KG);
        int percentile = donorPercentile(donorId, totalFoodKg);

        List<Map<String, Object>> recent = donations.stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(5)
                .map(d -> {
                    Ticket t = donorTickets.stream().filter(tk -> tk.getItemId().equals(d.getId())).findFirst().orElse(null);
                    Map<String, Object> row = new HashMap<>();
                    row.put("id", d.getId());
                    row.put("name", d.getName());
                    row.put("quantityKg", d.getQuantityKg());
                    row.put("pickupLocation", d.getPickupLocation());
                    row.put("createdAt", d.getCreatedAt().toString());
                    row.put("status", t != null ? ("collected".equals(t.getStatus()) ? "COMPLETED" : "SCHEDULED") : d.getStatus().toUpperCase());
                    return row;
                }).toList();

        Ticket nextTicket = donorTickets.stream()
                .filter(t -> "pending".equals(t.getStatus()))
                .min((a, b) -> a.getPickupDate().compareTo(b.getPickupDate()))
                .orElse(null);

        Map<String, Object> nextPickup = null;
        if (nextTicket != null) {
            Donation item = donationRepository.findById(nextTicket.getItemId()).orElse(null);
            nextPickup = new HashMap<>();
            nextPickup.put("date", nextTicket.getPickupDate().toString());
            nextPickup.put("time", nextTicket.getPickupTime());
            nextPickup.put("itemName", item != null ? item.getName() : null);
            nextPickup.put("quantityKg", nextTicket.getQuantityKg());
            nextPickup.put("pickupLocation", nextTicket.getPickupLocation());
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalDonations", donations.size());
        stats.put("totalFoodKg", Math.round(totalFoodKg * 10) / 10.0);
        stats.put("mealsEquivalent", mealsProvided);
        stats.put("peopleHelped", peopleHelped);
        stats.put("co2SavedKg", co2Saved);

        Map<String, Object> impact = new HashMap<>();
        impact.put("percentile", percentile);
        impact.put("mealsProvided", mealsProvided);
        impact.put("wasteDivertedKg", Math.round(totalFoodKg * 10) / 10.0);
        impact.put("communitiesHelped", beneficiarySet.size());

        long pendingRequests = requestRepository.findByItemIdInOrderByCreatedAtDesc(donorItemIds).stream()
                .filter(r -> "pending".equals(r.getStatus())).count();

        Map<String, Object> result = new HashMap<>();
        result.put("stats", stats);
        result.put("impact", impact);
        result.put("recentDonations", recent);
        result.put("nextPickup", nextPickup);
        result.put("activeListings", donations.stream().filter(Donation::isPublished).count());
        result.put("pendingRequests", pendingRequests);
        return result;
    }

    public Map<String, Object> adminOverview() {
        // Fresh stock is not part of this platform (see DonationService), so it
        // must not appear in any headline figure either - counting it in the
        // total while leaving it out of the surplus/expired split made the
        // "Active Listings" tile fail to add up.
        List<Donation> donations = donationRepository.findAll().stream()
                .filter(d -> !"fresh".equals(d.getStatus()))
                .toList();
        List<User> users = userRepository.findAll();
        List<Ticket> tickets = ticketRepository.findAll();
        List<FoodRequest> requests = requestRepository.findAll();

        Map<String, Double> categoryBreakdown = new HashMap<>();
        for (Donation d : donations) {
            categoryBreakdown.merge(d.getCategory(), d.getQuantityKg(), Double::sum);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalUsers", users.size());
        result.put("totalDonors", users.stream().filter(u -> "donor".equals(u.getRole())).count());
        result.put("totalBeneficiaries", users.stream().filter(u -> "beneficiary".equals(u.getRole())).count());
        // Farms and admins are users too - without these the tile's breakdown
        // could never sum back to totalUsers.
        result.put("totalFarms", users.stream().filter(u -> "farm".equals(u.getRole())).count());
        result.put("totalAdmins", users.stream().filter(u -> "admin".equals(u.getRole())).count());
        Map<String, Long> userStatusBreakdown = userStatusBreakdown(users);
        result.put("userStatusBreakdown", userStatusBreakdown);
        result.put("pendingVerifications", userStatusBreakdown.get("pending"));
        result.put("totalListings", donations.size());
        result.put("surplusItems", donations.stream().filter(d -> "surplus".equals(d.getStatus())).count());
        result.put("expiredItems", donations.stream().filter(d -> "expired".equals(d.getStatus())).count());
        result.put("reservedItems", donations.stream().filter(d -> "reserved".equals(d.getStatus())).count());
        result.put("collectedItems", donations.stream().filter(d -> "collected".equals(d.getStatus())).count());
        result.put("totalTickets", tickets.size());
        result.put("pendingRequests", requests.stream().filter(r -> "pending".equals(r.getStatus())).count());
        result.put("categoryBreakdown", categoryBreakdown);

        // Most donated items (by total kg)
        Map<String, Double> itemKg = new HashMap<>();
        for (Donation d : donations) {
            itemKg.merge(d.getName(), kgOf(d.getQuantityKg()), Double::sum);
        }
        result.put("topItems", topN(itemKg, 6));

        // Top donors by total kg donated
        Map<String, User> usersById = users.stream().collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        Map<String, Double> donorKg = new HashMap<>();
        for (Donation d : donations) {
            donorKg.merge(orgLabel(usersById.get(d.getDonorId()), d.getDonorId()), kgOf(d.getQuantityKg()), Double::sum);
        }
        result.put("topDonors", topN(donorKg, 6));

        // Top receiving organizations by total kg collected via tickets
        Map<String, Double> orgKg = new HashMap<>();
        for (Ticket t : tickets) {
            orgKg.merge(orgLabel(usersById.get(t.getBeneficiaryId()), t.getBeneficiaryId()), kgOf(t.getQuantityKg()), Double::sum);
        }
        result.put("topOrganizations", topN(orgKg, 6));

        // Request approval funnel: pending (awaiting approval) / approved / rejected
        Map<String, Long> requestStatusBreakdown = new LinkedHashMap<>();
        requestStatusBreakdown.put("pending", requests.stream().filter(r -> "pending".equals(r.getStatus())).count());
        // Collected requests were approved first, so they still count toward "approved".
        requestStatusBreakdown.put("approved", requests.stream().filter(r -> "approved".equals(r.getStatus()) || "collected".equals(r.getStatus())).count());
        requestStatusBreakdown.put("rejected", requests.stream().filter(r -> "rejected".equals(r.getStatus())).count());
        result.put("requestStatusBreakdown", requestStatusBreakdown);

        // Food outcome: surplus donations successfully saved vs. wasted, kept separate from items
        // that were already flagged expired/redirected to farms & compost at listing time.
        double savedSurplusKg = donations.stream()
                .filter(d -> "collected".equals(d.getStatus())).mapToDouble(d -> kgOf(d.getQuantityKg())).sum();
        double wastedSurplusKg = donations.stream()
                .filter(d -> "donation".equals(d.getListingType()) && "expired".equals(d.getStatus()))
                .mapToDouble(d -> kgOf(d.getQuantityKg())).sum();
        double expiredFoodsKg = donations.stream()
                .filter(d -> "expired".equals(d.getListingType())).mapToDouble(d -> kgOf(d.getQuantityKg())).sum();

        Map<String, Double> foodOutcome = new LinkedHashMap<>();
        foodOutcome.put("Saved (Collected)", round1(savedSurplusKg));
        foodOutcome.put("Wasted (Unclaimed Surplus)", round1(wastedSurplusKg));
        foodOutcome.put("Expired (Redirected to Compost/Farms)", round1(expiredFoodsKg));
        result.put("foodOutcome", foodOutcome);

        result.put("donatedTotals", donatedTotals(requests));

        return result;
    }

    /**
     * Everything donors have listed and made visible, one total per unit - kg,
     * liters and items/packets are never summed into each other. Hidden
     * (unpublished) listings are left out, so hiding an item takes it off the
     * dashboard. Only records people created count: the DataSeeder demo
     * listings use readable ids instead of ObjectIds and would otherwise
     * inflate the totals.
     */
    private Map<String, Object> donatedTotals(List<FoodRequest> requests) {
        // Stock reserved for a request is taken out of quantityKg, so for records
        // listed before initialQuantity existed the original amount is rebuilt as
        // what's left plus what was reserved for still-standing requests.
        Map<String, Double> reservedByItem = new HashMap<>();
        for (FoodRequest r : requests) {
            if (r.getApprovedQuantityKg() == null || r.getItemId() == null) continue;
            if (!Set.of("approved", "collected", "counter_offer").contains(r.getStatus())) continue;
            reservedByItem.merge(r.getItemId(), r.getApprovedQuantityKg(), Double::sum);
        }

        // quantity: as listed, in each listing's own unit (packets counted as packets).
        // packContents: what those packets hold, by weight and by volume.
        Map<String, Double> quantity = new LinkedHashMap<>();
        Map<String, Long> listings = new LinkedHashMap<>();
        Map<String, Map<String, Double>> byCategory = new LinkedHashMap<>();
        for (String unit : DonationUnits.ALL) {
            quantity.put(unit, 0.0);
            listings.put(unit, 0L);
            byCategory.put(unit, new HashMap<>());
        }
        Map<String, Double> packContents = new LinkedHashMap<>();
        packContents.put(DonationUnits.KG, 0.0);
        packContents.put(DonationUnits.LITERS, 0.0);
        double packetsWithoutSize = 0;

        List<Donation> all = donationRepository.findAll();
        for (Donation d : all) {
            if (d.getId() == null || !ObjectId.isValid(d.getId())) continue;
            // A listing the donor has hidden is not on offer, so it drops out of
            // every total and chart here; publishing it again adds it back.
            if (!d.isPublished()) continue;
            String unit = DonationUnits.of(d.getUnit());
            double original = d.getInitialQuantity() != null
                    ? d.getInitialQuantity()
                    : kgOf(d.getQuantityKg()) + reservedByItem.getOrDefault(d.getId(), 0.0);
            quantity.merge(unit, original, Double::sum);
            listings.merge(unit, 1L, Long::sum);
            String category = d.getCategory() != null ? d.getCategory() : "Other";
            byCategory.get(unit).merge(category, original, Double::sum);

            if (DonationUnits.ITEMS.equals(unit)) {
                if (d.getPackSize() != null && d.getPackSize() > 0 && d.getPackUnit() != null) {
                    packContents.merge(DonationUnits.of(d.getPackUnit()), original * d.getPackSize(), Double::sum);
                } else {
                    packetsWithoutSize += original;
                }
            }
        }
        quantity.replaceAll((unit, value) -> round1(value));
        packContents.replaceAll((unit, value) -> round1(value));

        // Headline kg / liters include what's inside packets, so nothing listed
        // as packets is missing from the weight and volume totals.
        Map<String, Double> totalWithPackets = new LinkedHashMap<>();
        totalWithPackets.put(DonationUnits.KG, round1(quantity.get(DonationUnits.KG) + packContents.get(DonationUnits.KG)));
        totalWithPackets.put(DonationUnits.LITERS,
                round1(quantity.get(DonationUnits.LITERS) + packContents.get(DonationUnits.LITERS)));

        Map<String, Map<String, Double>> categoryCharts = new LinkedHashMap<>();
        byCategory.forEach((unit, cats) -> categoryCharts.put(unit, topN(cats, cats.size())));

        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("quantity", quantity);
        totals.put("packContents", packContents);
        totals.put("totalWithPackets", totalWithPackets);
        totals.put("packetsWithoutSize", (long) packetsWithoutSize);
        totals.put("listings", listings);
        totals.put("totalListings", listings.values().stream().mapToLong(Long::longValue).sum());
        totals.put("byCategory", categoryCharts);
        return totals;
    }

    private Map<String, Long> userStatusBreakdown(List<User> users) {
        Map<String, Long> statuses = new LinkedHashMap<>();
        statuses.put("verified", 0L);
        statuses.put("pending", 0L);
        statuses.put("rejected", 0L);
        statuses.put("active", 0L);

        for (User user : users) {
            String status;
            if (!REVIEWED_ROLES.contains(user.getRole())) {
                status = "active";
            } else if (user.isVerified()) {
                status = "verified";
            } else if ("rejected".equals(user.getVerificationStatus())) {
                status = "rejected";
            } else {
                status = "pending";
            }
            statuses.compute(status, (key, count) -> count + 1);
        }
        return statuses;
    }

    /** Percentage of other active donors (by total kg donated) this donor has out-donated. 0 if they haven't donated yet. */
    private int donorPercentile(String donorId, double myTotalKg) {
        if (myTotalKg <= 0) return 0;
        Map<String, Double> kgByDonor = new HashMap<>();
        for (Donation d : donationRepository.findAll()) {
            kgByDonor.merge(d.getDonorId(), kgOf(d.getQuantityKg()), Double::sum);
        }
        kgByDonor.put(donorId, myTotalKg);
        long others = kgByDonor.size() - 1;
        if (others <= 0) return 100;
        long donorsBelowMe = kgByDonor.entrySet().stream()
                .filter(e -> !e.getKey().equals(donorId) && e.getValue() < myTotalKg).count();
        return (int) Math.round((donorsBelowMe * 100.0) / others);
    }

    private double kgOf(Double quantityKg) {
        return quantityKg != null ? quantityKg : 0;
    }

    private double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }

    private String orgLabel(User user, String fallbackId) {
        if (user == null) return fallbackId != null ? fallbackId : "Unknown";
        if (user.getOrganizationName() != null && !user.getOrganizationName().isBlank()) return user.getOrganizationName();
        return user.getName() != null ? user.getName() : fallbackId;
    }

    private Map<String, Double> topN(Map<String, Double> source, int n) {
        return source.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(n)
                .collect(Collectors.toMap(Map.Entry::getKey, e -> round1(e.getValue()), (a, b) -> a, LinkedHashMap::new));
    }
}
