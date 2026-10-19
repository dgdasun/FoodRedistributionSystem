package com.foodshare.service;

import com.foodshare.model.Donation;
import com.foodshare.repository.DonationRepository;
import com.foodshare.util.ExpiryUtil;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import com.foodshare.model.User;
import com.foodshare.repository.UserRepository;
import org.apache.commons.csv.CSVRecord;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@Service
public class DonationService {

    /**
     * Accepted expiryDate formats for CSV bulk upload, tried in order. Spreadsheet
     * tools (Excel, Google Sheets) often re-render a date column in the system's
     * locale format (e.g. M/d/yyyy) when the file is edited and re-saved, instead
     * of keeping the ISO yyyy-MM-dd format from the sample template.
     */
    private static final DateTimeFormatter[] CSV_DATE_FORMATS = {
            DateTimeFormatter.ISO_LOCAL_DATE,       // 2026-09-17
            DateTimeFormatter.ofPattern("M/d/yyyy"),  // 9/17/2026
            DateTimeFormatter.ofPattern("d/M/yyyy"),  // 17/9/2026
            DateTimeFormatter.ofPattern("M-d-yyyy"),  // 9-17-2026
            DateTimeFormatter.ofPattern("d-M-yyyy"),  // 17-9-2026
    };

    private final DonationRepository donationRepository;
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt");

    private final SettingsService settingsService;
    private final UserRepository userRepository;

    public DonationService(DonationRepository donationRepository,
                           SettingsService settingsService,
                           UserRepository userRepository) {
        this.donationRepository = donationRepository;
        this.settingsService = settingsService;
        this.userRepository = userRepository;
    }

    /**
     * Stamps a listing with its donor's registered pickup point.
     *
     * Donors used to retype a location on every item (and in every CSV row),
     * which is both busywork and the reason the same shop appeared as "Glow
     * mark, Kottawa", "Glowmark, Kottawa" and plain "Kottawa" - three spellings
     * the map had to treat as three places. The donor's profile is the single
     * source of truth now, so a listing can never disagree with it; donors
     * change where they collect from by editing their profile, once.
     *
     * Coordinates come across too, which is what lets the map place a listing
     * whose location text names no town the gazetteer knows.
     */
    private void applyDonorLocation(Donation donation) {
        User donor = donation.getDonorId() == null
                ? null
                : userRepository.findById(donation.getDonorId()).orElse(null);

        if (donor == null) {
            throw new IllegalArgumentException("Unknown donor - cannot determine a pickup location.");
        }

        String org = trimToNull(donor.getOrganizationName());
        String place = trimToNull(donor.getLocation());
        if (org == null && place == null) {
            // Listing food nobody can be told how to collect helps no one, so
            // this fails loudly and says exactly how to fix it.
            throw new IllegalArgumentException(
                    "Your profile has no location yet. Add your organization's location in Profile, "
                            + "then list this item - it is used as the pickup point for everything you donate.");
        }

        // Matches the format already in the database: "ABC Supermarket Hub, Colombo 05".
        String pickup = (org != null && place != null) ? org + ", " + place : (org != null ? org : place);
        donation.setPickupLocation(pickup);
        donation.setLatitude(donor.getLatitude());
        donation.setLongitude(donor.getLongitude());
    }

    private String trimToNull(String v) {
        if (v == null) return null;
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }

    /** Re-evaluates every non-collected item's status against the current (category-aware) expiry threshold. */
    public List<Donation> reclassifyAll() {
        List<Donation> donations = donationRepository.findAll();
        List<Donation> toSave = new ArrayList<>();

        for (Donation d : donations) {
            if ("collected".equals(d.getStatus())) continue;
            int threshold = settingsService.resolveExpiryThresholdDays(d.getCategory());

            // A still-fresh row is legacy data from before this rule existed.
            // Do NOT promote it to "surplus" - that would claim an item weeks
            // from expiry is near-expiry. Leave it untouched and let the filter
            // below keep it out of the platform entirely.
            if (ExpiryUtil.isTooFresh(d.getExpiryDate(), threshold)) {
                if (d.isPublished()) {
                    d.setPublished(false);
                    toSave.add(d);
                }
                continue;
            }

            String newStatus = ExpiryUtil.reListStatus(d.getExpiryDate(), threshold);
            if (!newStatus.equals(d.getStatus())) {
                d.setStatus(newStatus);
                if ("expired".equals(newStatus)) {
                    d.setListingType("expired");
                } else if ("expired".equals(d.getListingType())) {
                    d.setListingType("donation");
                }
                toSave.add(d);
            }
        }
        if (!toSave.isEmpty()) donationRepository.saveAll(toSave);

        // Newest listing first, and never any fresh stock: this platform only
        // carries near-expiry surplus and expired food.
        return donationRepository.findAll(NEWEST_FIRST).stream()
                .filter(d -> !"fresh".equals(d.getStatus()))
                .toList();
    }

    public Donation create(Donation donation) {
        int threshold = settingsService.resolveExpiryThresholdDays(donation.getCategory());

        // REQ-3: reject already-expired items being listed for human consumption
        if (donation.getExpiryDate().isBefore(LocalDate.now()) && !"expired".equals(donation.getListingType())) {
            throw new IllegalArgumentException(
                    "Expiry date has already passed. List this item under the expired/compost workflow instead.");
        }

        if (ExpiryUtil.isTooFresh(donation.getExpiryDate(), threshold)) {
            throw new IllegalArgumentException(
                    "This item is still fresh (more than " + threshold + " day(s) from expiry). "
                            + "Donors can only list surplus (near-expiry) or expired items — check back closer to its expiry date.");
        }

        // Overwrites whatever the client sent: the profile is authoritative, so
        // a hand-crafted request cannot list food at someone else's address.
        applyDonorLocation(donation);

        donation.setStatus(ExpiryUtil.reListStatus(donation.getExpiryDate(), threshold));
        donation.setPublished(false);
        donation.setCreatedAt(Instant.now());
        if (donation.getUnit() == null) donation.setUnit("kg");
        if (donation.getListingType() == null) donation.setListingType("donation");
        return donationRepository.save(donation);
    }

    /**
     * Bulk Data Upload (Module 1) - parses a CSV of supermarket inventory
     * (name,category,batchNumber,quantityKg,expiryDate) and classifies each row
     * as fresh / surplus / expired.
     *
     * A pickupLocation column is ignored if present: every row is stamped with
     * the donor's registered location, the same as a manually added item. Older
     * templates that still carry the column therefore keep working.
     */
    public UploadResult bulkUpload(String donorId, MultipartFile file) throws IOException {
        List<Donation> created = new ArrayList<>();
        long freshSkipped = 0;

        // Resolved once rather than per row - it is the same for the whole file,
        // and it fails before any parsing if the donor has no location on file.
        Donation probe = new Donation();
        probe.setDonorId(donorId);
        applyDonorLocation(probe);
        String pickupLocation = probe.getPickupLocation();
        Double donorLatitude = probe.getLatitude();
        Double donorLongitude = probe.getLongitude();

        try (CSVParser parser = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setTrim(true)
                .build()
                .parse(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            for (CSVRecord row : parser) {
                String name = row.isMapped("name") ? row.get("name") : null;
                String expiryStr = row.isMapped("expiryDate") ? row.get("expiryDate") : null;
                if (name == null || name.isBlank() || expiryStr == null || expiryStr.isBlank()) continue;

                LocalDate expiryDate = parseCsvDate(expiryStr);
                String category = getOrDefault(row, "category", "Other");
                int threshold = settingsService.resolveExpiryThresholdDays(category);

                // Donors can only list surplus (near-expiry) or expired items, not still-fresh stock.
                if (ExpiryUtil.isTooFresh(expiryDate, threshold)) {
                    freshSkipped++;
                    continue;
                }
                String status = ExpiryUtil.reListStatus(expiryDate, threshold);

                Donation d = new Donation();
                d.setDonorId(donorId);
                d.setName(name);
                d.setCategory(category);
                d.setBatchNumber(getOrDefault(row, "batchNumber", "N/A"));
                d.setQuantityKg(parseDoubleSafe(getOrDefault(row, "quantityKg", "0")));
                d.setUnit("kg");
                d.setExpiryDate(expiryDate);
                d.setPickupLocation(pickupLocation);
                d.setLatitude(donorLatitude);
                d.setLongitude(donorLongitude);
                d.setListingType("donation");
                d.setStatus(status);
                d.setPublished(false);
                d.setCreatedAt(Instant.now());
                created.add(d);
            }
        }

        donationRepository.saveAll(created);

        long surplus = created.stream().filter(d -> "surplus".equals(d.getStatus())).count();
        long expired = created.stream().filter(d -> "expired".equals(d.getStatus())).count();
        return new UploadResult(created, surplus, expired, freshSkipped);
    }

    private String getOrDefault(CSVRecord row, String header, String fallback) {
        if (!row.isMapped(header)) return fallback;
        String v = row.get(header);
        return (v == null || v.isBlank()) ? fallback : v;
    }

    private double parseDoubleSafe(String s) {
        try {
            return Double.parseDouble(s);
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private LocalDate parseCsvDate(String raw) {
        String value = raw.trim();
        for (DateTimeFormatter format : CSV_DATE_FORMATS) {
            try {
                return LocalDate.parse(value, format);
            } catch (DateTimeParseException ignored) {
                // try the next accepted format
            }
        }
        throw new IllegalArgumentException(
                "Could not read expiry date '" + value + "'. Use YYYY-MM-DD (e.g. 2026-09-17) or M/D/YYYY (e.g. 9/17/2026).");
    }

    public Donation update(String id, Donation patch) {
        Donation existing = donationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Item not found"));
        if (patch.isPublished() != existing.isPublished()) existing.setPublished(patch.isPublished());
        if (patch.getQuantityKg() != null) existing.setQuantityKg(patch.getQuantityKg());
        if (patch.getStatus() != null) existing.setStatus(patch.getStatus());
        if (patch.getListingType() != null) existing.setListingType(patch.getListingType());
        return donationRepository.save(existing);
    }

    public void delete(String id) {
        if (!donationRepository.existsById(id)) throw new IllegalArgumentException("Item not found");
        donationRepository.deleteById(id);
    }

    public record UploadResult(List<Donation> items, long surplusDetected, long expiredDetected, long freshSkipped) {}
}
