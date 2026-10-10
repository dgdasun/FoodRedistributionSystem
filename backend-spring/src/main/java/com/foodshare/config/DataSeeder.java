package com.foodshare.config;

import com.foodshare.model.*;
import com.foodshare.repository.*;
import org.bson.types.ObjectId;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Seeds MongoDB with the same demo dataset used throughout development
 * (donor, NGOs, a farm partner, admin, sample listings, and 20 days of
 * historical inventory data for the AI prediction model) - only runs when
 * the users collection is empty, so it's safe to restart the app.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    /** Default sign-in password for every seeded demo account. */
    private static final String DEMO_PASSWORD = "password123";

    /** Stamp used for demo accounts and for records that predate createdAt. */
    private static final Instant SEED_CREATED_AT = Instant.parse("2024-01-01T00:00:00Z");

    private final UserRepository userRepository;
    private final DonationRepository donationRepository;
    private final FoodRequestRepository requestRepository;
    private final TicketRepository ticketRepository;
    private final NotificationRepository notificationRepository;
    private final SettingsRepository settingsRepository;
    private final HistoryPointRepository historyPointRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, DonationRepository donationRepository,
                       FoodRequestRepository requestRepository, TicketRepository ticketRepository,
                       NotificationRepository notificationRepository, SettingsRepository settingsRepository,
                       HistoryPointRepository historyPointRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.donationRepository = donationRepository;
        this.requestRepository = requestRepository;
        this.ticketRepository = ticketRepository;
        this.notificationRepository = notificationRepository;
        this.settingsRepository = settingsRepository;
        this.historyPointRepository = historyPointRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        backfillMissingPasswords();
        backfillMissingCreatedAt();
        if (userRepository.count() > 0) return; // already seeded

        if (settingsRepository.count() == 0) settingsRepository.save(new Settings());

        User donor = user("u-donor-1", "donor", null, "R. Perera", "perera@abcsupermarket.lk",
                "ABC Supermarket Hub", "Colombo 05", 6.8845, 79.8578, 0, 0.0, 0, true, "R");
        User admin = user("u-admin-1", "admin", null, "S. Fernando", "admin@foodshare.lk",
                null, null, null, null, 0, 0.0, 0, true, "S");
        User ngo1 = user("u-ngo-1", "beneficiary", "NGO", "H. De Silva", "contact@hopekitchen.lk",
                "Hope Kitchen Foundation", "Kandy", 7.2906, 80.6337, 120, 200.0, 3, true, "H");
        User ngo2 = user("u-ngo-2", "beneficiary", "Charity", "N. Jayasuriya", "info@caringhands.lk",
                "Caring Hands Charity", "Kandy", 7.2833, 80.6333, 60, 100.0, 1, true, "N");
        User farm = user("u-farm-1", "farm", "Farm", "W. Gunawardena", "farm@greenacres.lk",
                "Green Acres Farm", "Kadawatha", 7.0011, 79.9500, 0, 0.0, 0, true, "W");
        User ngo3 = user("u-ngo-3", "beneficiary", "NGO", "P. Rathnayake", "pending@newhope.lk",
                "New Hope Community Center", "Peradeniya", 7.2599, 80.5977, 40, 60.0, 0, false, "P");

        userRepository.saveAll(List.of(donor, admin, ngo1, ngo2, farm, ngo3));

        LocalDate today = LocalDate.now();

        Donation d1 = donation("d-1001", donor.getId(), "Cooked Rice & Curry", "Cooked Meals", "B-2201",
                40.0, today.plusDays(1), "ABC Supermarket Hub, Colombo 05", "donation", "surplus", true, today.minusDays(1));
        Donation d2 = donation("d-1002", donor.getId(), "Bread & Pastries", "Bakery", "B-2202",
                15.0, today.plusDays(2), "City Bakery, Colombo 05", "donation", "surplus", true, today.minusDays(4));
        Donation d3 = donation("d-1003", donor.getId(), "Mixed Vegetables", "Vegetables", "B-2203",
                22.0, today.plusDays(3), "Fresh Mart, Colombo 05", "donation", "surplus", true, today.minusDays(7));
        Donation d4 = donation("d-1004", donor.getId(), "Dairy Yoghurt Cups", "Dairy", "B-2204",
                12.0, today.minusDays(1), "ABC Supermarket Hub, Colombo 05", "expired", "expired", true, today.minusDays(6));
        // Demo stock stays inside the domain: near-expiry surplus only, never
        // fresh - the platform would refuse a fresh listing anyway.
        Donation d5 = donation("d-1005", donor.getId(), "Assorted Fruits", "Fruits", "B-2205",
                8.0, today.plusDays(2), "ABC Supermarket Hub, Colombo 05", "donation", "surplus", true, today.minusDays(1));
        Donation d6 = donation("d-1006", donor.getId(), "Canned Packaged Goods", "Packaged Goods", "B-2206",
                30.0, today.plusDays(3), "ABC Supermarket Hub, Colombo 05", "donation", "surplus", true, today.minusDays(2));

        donationRepository.saveAll(List.of(d1, d2, d3, d4, d5, d6));

        FoodRequest r1 = request("r-1", d2.getId(), ngo1.getId(), 15.0, "high", 4.2, "pending", Instant.now().minusSeconds(86400));
        FoodRequest r2 = request("r-2", d2.getId(), ngo2.getId(), 15.0, "medium", 3.5, "pending", Instant.now());
        FoodRequest r3 = request("r-3", d1.getId(), ngo1.getId(), 40.0, "critical", 4.0, "approved", Instant.now().minusSeconds(86400));
        r3.setApprovedQuantityKg(40.0);

        FoodRequest r4 = request("r-4", d3.getId(), ngo2.getId(), 20.0, "medium", 5.1, "rejected", Instant.now().minusSeconds(172800));
        r4.setRejectionReason("Inventory allocated to an urgent community kitchen request received earlier the same day.");

        FoodRequest r5 = request("r-5", d5.getId(), ngo1.getId(), 20.0, "high", 2.8, "counter_offer", Instant.now().minusSeconds(43200));
        r5.setApprovedQuantityKg(10.0);

        requestRepository.saveAll(List.of(r1, r2, r3, r4, r5));

        Ticket t1 = new Ticket();
        t1.setId("t-9001");
        t1.setRequestId(r3.getId());
        t1.setItemId(d1.getId());
        t1.setBeneficiaryId(ngo1.getId());
        t1.setQuantityKg(40.0);
        t1.setPickupLocation("ABC Supermarket Hub, Colombo 05");
        t1.setPickupDate(today.plusDays(3));
        t1.setPickupTime("11:30 AM");
        t1.setStatus("pending");
        t1.setQrCode("FSQR-9001-D1001-NGO1");
        t1.setCreatedAt(Instant.now().minusSeconds(86400));
        t1.setExpiresAt(Instant.now().plusSeconds(7200)); // Cooked Meals -> 2h collection window
        ticketRepository.save(t1);

        List<Notification> notifications = List.of(
                notification("n-1", donor.getId(), "request", "Hope Kitchen Foundation requested 15kg of Bread & Pastries.", false, Instant.now().minusSeconds(86400)),
                notification("n-2", donor.getId(), "request", "Caring Hands Charity requested 15kg of Bread & Pastries.", false, Instant.now()),
                notification("n-3", donor.getId(), "ticket", "Collection ticket #t-9001 generated for Hope Kitchen Foundation.", true, Instant.now().minusSeconds(86400)),
                notification("n-4", donor.getId(), "expiry", "Dairy Yoghurt Cups (Batch B-2204) has expired and been redirected to farms/compost.", false, Instant.now().minusSeconds(86400))
        );
        notificationRepository.saveAll(notifications);

        seedHistory();
    }

    /**
     * Accounts that predate the createdAt field have nothing stored for it.
     * They are stamped once with a fixed instant that is clearly older than any
     * real signup, so "newest first" puts them at the bottom and, crucially,
     * keeps them in a stable order between reads.
     */
    private void backfillMissingCreatedAt() {
        List<User> stale = userRepository.findAll().stream()
                .filter(u -> u.getCreatedAt() == null || SEED_CREATED_AT.equals(u.getCreatedAt()))
                .toList();
        if (stale.isEmpty()) return;

        List<User> changed = new ArrayList<>();
        for (User u : stale) {
            Instant real = createdAtFromObjectId(u.getId());
            Instant resolved = real != null ? real : SEED_CREATED_AT;
            if (!resolved.equals(u.getCreatedAt())) {
                u.setCreatedAt(resolved);
                changed.add(u);
            }
        }
        if (!changed.isEmpty()) userRepository.saveAll(changed);
    }

    /**
     * Accounts created through registration carry a Mongo ObjectId, and the
     * first four bytes of an ObjectId are the creation time in epoch seconds.
     * That recovers the real signup moment for accounts written before the
     * createdAt field existed - far better than stamping them all identically,
     * which would leave "newest first" with nothing to order by.
     *
     * Seeded demo accounts use readable ids like "u-donor-1", so they return
     * null here and fall back to the fixed seed stamp.
     */
    private Instant createdAtFromObjectId(String id) {
        if (id == null || !ObjectId.isValid(id)) return null;
        return new ObjectId(id).getDate().toInstant();
    }

    /**
     * Accounts seeded before password auth was added (or restored from an older
     * database snapshot) won't have a passwordHash - patch them in place with the
     * same demo password so login keeps working without requiring a DB wipe.
     */
    private void backfillMissingPasswords() {
        List<User> missing = userRepository.findAll().stream()
                .filter(u -> u.getPasswordHash() == null || u.getPasswordHash().isBlank())
                .toList();
        if (missing.isEmpty()) return;

        String hash = passwordEncoder.encode(DEMO_PASSWORD);
        missing.forEach(u -> u.setPasswordHash(hash));
        userRepository.saveAll(missing);
    }

    /** 20 days x 6 categories of dummy historical inventory data for the AI prediction model. */
    private void seedHistory() {
        String[] categories = {"Vegetables", "Dairy", "Bakery", "Cooked Meals", "Fruits", "Packaged Goods"};
        double[] bases = {18, 10, 8, 14, 9, 6};
        double[] trends = {0.1, 0.05, 0.3, 0.25, 0.05, 0.02};

        List<HistoryPoint> points = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int i = 20; i >= 1; i--) {
            LocalDate date = today.minusDays(i);
            for (int c = 0; c < categories.length; c++) {
                double noise = Math.sin(i * 1.3 + categories[c].length()) * 3 + (Math.random() * 2 - 1);
                double qty = Math.max(1, Math.round((bases[c] + trends[c] * (20 - i) + noise) * 10) / 10.0);

                HistoryPoint hp = new HistoryPoint();
                hp.setCategory(categories[c]);
                hp.setDate(date);
                hp.setQuantityKg(qty);
                points.add(hp);
            }
        }
        historyPointRepository.saveAll(points);
    }

    private User user(String id, String role, String orgType, String name, String email, String orgName,
                       String location, Double lat, Double lng, int orgSize, double capacity, int allocations,
                       boolean verified, String avatar) {
        User u = new User();
        u.setId(id);
        u.setCreatedAt(SEED_CREATED_AT);
        u.setRole(role);
        u.setOrgType(orgType);
        u.setName(name);
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(DEMO_PASSWORD));
        u.setOrganizationName(orgName);
        u.setLocation(location);
        u.setLatitude(lat);
        u.setLongitude(lng);
        u.setOrganizationSize(orgSize);
        u.setHandlingCapacityKg(capacity);
        u.setAllocationsLast30Days(allocations);
        u.setVerified(verified);
        u.setVerificationStatus(verified ? "approved" : "pending");
        u.setAvatar(avatar);
        return u;
    }

    private Donation donation(String id, String donorId, String name, String category, String batch,
                               double qty, LocalDate expiry, String location, String listingType, String status,
                               boolean published, LocalDate createdDate) {
        Donation d = new Donation();
        d.setId(id);
        d.setDonorId(donorId);
        d.setName(name);
        d.setCategory(category);
        d.setBatchNumber(batch);
        d.setQuantityKg(qty);
        d.setUnit("kg");
        d.setExpiryDate(expiry);
        d.setPickupLocation(location);
        d.setListingType(listingType);
        d.setStatus(status);
        d.setPublished(published);
        d.setCreatedAt(createdDate.atStartOfDay(java.time.ZoneOffset.UTC).toInstant());
        return d;
    }

    private FoodRequest request(String id, String itemId, String beneficiaryId, double qty, String urgency,
                                 double distance, String status, Instant createdAt) {
        FoodRequest r = new FoodRequest();
        r.setId(id);
        r.setItemId(itemId);
        r.setBeneficiaryId(beneficiaryId);
        r.setQuantityKg(qty);
        r.setUrgency(urgency);
        r.setDistanceKm(distance);
        r.setStatus(status);
        r.setCreatedAt(createdAt);
        return r;
    }

    private Notification notification(String id, String userId, String type, String message, boolean read, Instant createdAt) {
        Notification n = new Notification();
        n.setId(id);
        n.setUserId(userId);
        n.setType(type);
        n.setMessage(message);
        n.setRead(read);
        n.setCreatedAt(createdAt);
        return n;
    }
}
