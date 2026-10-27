package com.foodshare.service;

import com.foodshare.dto.UploadConfirmRequestDTO;
import com.foodshare.model.Donation;
import com.foodshare.repository.DonationRepository;
import com.foodshare.util.DonationUnits;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    /** A row with no category at all - not one with an unrecognised category - is filed here, as it always has been. */
    private static final String DEFAULT_UPLOAD_CATEGORY = "Other";

    private final DonationRepository donationRepository;
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt");

    private final SettingsService settingsService;
    private final UserRepository userRepository;
    private final CategoryMatcher categoryMatcher;

    public DonationService(DonationRepository donationRepository,
                           SettingsService settingsService,
                           UserRepository userRepository,
                           CategoryMatcher categoryMatcher) {
        this.donationRepository = donationRepository;
        this.settingsService = settingsService;
        this.userRepository = userRepository;
        this.categoryMatcher = categoryMatcher;
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
        donation.setUnit(DonationUnits.normalize(donation.getUnit()));
        if (donation.getQuantityKg() == null || donation.getQuantityKg() <= 0) {
            throw new IllegalArgumentException("Enter a quantity greater than zero.");
        }
        if (DonationUnits.ITEMS.equals(donation.getUnit()) && donation.getQuantityKg() % 1 != 0) {
            throw new IllegalArgumentException("Items/packets must be a whole number.");
        }
        DonationUnits.applyPackSize(donation);

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
        donation.setInitialQuantity(donation.getQuantityKg());
        if (donation.getListingType() == null) donation.setListingType("donation");
        return donationRepository.save(donation);
    }

    /**
     * Bulk Data Upload (Module 1) - parses a CSV of supermarket inventory
     * (name,category,batchNumber,quantity,unit,expiryDate) and classifies each row
     * as fresh / surplus / expired.
     *
     * A pickupLocation column is ignored if present: every row is stamped with
     * the donor's registered location, the same as a manually added item. Older
     * templates that still carry the column therefore keep working.
     *
     * Each row's category is resolved to a canonical one by CategoryMatcher, so
     * "dary" is saved as "Dairy" (and picks up Dairy's expiry rule) rather than
     * as a category of its own. A row whose category cannot be resolved with
     * confidence is not saved: it comes back in reviewRequired with any
     * suggestion, for the donor to confirm through importReviewedRows.
     */
    public UploadResult bulkUpload(String donorId, MultipartFile file) throws IOException {
        List<Donation> created = new ArrayList<>();
        List<CategoryCorrection> corrections = new ArrayList<>();
        List<CategoryReview> review = new ArrayList<>();
        long freshSkipped = 0;

        // Resolved once rather than per row - it is the same for the whole file,
        // and it fails before any parsing if the donor has no location on file.
        Donation donorLocation = donorLocation(donorId);

        // An inventory export repeats the same few category spellings on every
        // row, so each distinct spelling is matched once per file.
        Map<String, CategoryMatcher.Match> matchesBySpelling = new HashMap<>();

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
                String batchNumber = getOrDefault(row, "batchNumber", "N/A");
                // "quantity" is the current header; "quantityKg" keeps older templates working.
                double quantityKg = parseDoubleSafe(getOrDefault(row, "quantity", getOrDefault(row, "quantityKg", "0")));
                // Optional unit column - files without it were always in kilograms. For
                // items rows, optional packSize/packUnit give one packet's size.
                String unit = DonationUnits.normalize(getOrDefault(row, "unit", DonationUnits.KG));
                Double packSize = DonationUnits.ITEMS.equals(unit) && !getOrDefault(row, "packSize", "").isBlank()
                        ? parseDoubleSafe(getOrDefault(row, "packSize", "0")) : null;
                String packUnit = getOrDefault(row, "packUnit", DonationUnits.KG);
                // The line number a donor sees in their spreadsheet, header being line 1.
                long line = row.getRecordNumber() + 1;

                String typedCategory = getOrDefault(row, "category", null);
                CategoryMatcher.Match match = null;
                String category = DEFAULT_UPLOAD_CATEGORY;
                if (typedCategory != null) {
                    match = matchesBySpelling.computeIfAbsent(typedCategory, categoryMatcher::match);
                    if (!match.isAccepted()) {
                        review.add(new CategoryReview(line, typedCategory, match.category(), match.type(),
                                match.editDistance(), match.similarity(), match.message(),
                                new ReviewItem(name, batchNumber, quantityKg, expiryDate, unit, packSize, packUnit)));
                        continue;
                    }
                    category = match.category();
                }

                Donation d = newUploadedDonation(donorId, donorLocation, name, category, typedCategory,
                        batchNumber, quantityKg, expiryDate);
                // Donors can only list surplus (near-expiry) or expired items, not still-fresh stock.
                if (d == null) {
                    freshSkipped++;
                    continue;
                }
                applyUploadedUnit(d, unit, packSize, packUnit);
                created.add(d);
                if (match != null && (match.type() == CategoryMatcher.MatchType.ALIAS_MATCH
                        || match.type() == CategoryMatcher.MatchType.FUZZY_MATCH)) {
                    corrections.add(new CategoryCorrection(line, typedCategory, category, match.type(),
                            match.editDistance(), match.similarity(), match.message()));
                }
            }
        }

        return saveUploaded(created, freshSkipped, corrections, review);
    }

    /**
     * Imports rows a bulk upload held back for review, once the donor has
     * picked a category for each. The category must now be one of the
     * canonical names exactly - this is the donor's decision, so nothing is
     * guessed here. Every row is checked before any is saved.
     */
    public UploadResult importReviewedRows(String donorId, List<UploadConfirmRequestDTO.Row> rows) {
        if (rows == null || rows.isEmpty()) throw new IllegalArgumentException("No rows to import.");
        Donation donorLocation = donorLocation(donorId);
        List<Donation> created = new ArrayList<>();
        long freshSkipped = 0;

        for (UploadConfirmRequestDTO.Row row : rows) {
            String label = row.getRowNumber() != null ? "Row " + row.getRowNumber() : "A row";
            if (row.getName() == null || row.getName().isBlank() || row.getExpiryDate() == null) {
                throw new IllegalArgumentException(label + " is missing a name or expiry date.");
            }
            CategoryMatcher.Match match = categoryMatcher.match(row.getCategory());
            if (match.type() != CategoryMatcher.MatchType.EXACT_MATCH) {
                throw new IllegalArgumentException(label + ": choose one of the listed categories ("
                        + String.join(", ", categoryMatcher.categories()) + ").");
            }

            String batchNumber = row.getBatchNumber() == null || row.getBatchNumber().isBlank() ? "N/A" : row.getBatchNumber();
            double quantityKg = row.getQuantityKg() == null ? 0.0 : row.getQuantityKg();
            Donation d = newUploadedDonation(donorId, donorLocation, row.getName(), match.category(),
                    row.getOriginalCategory(), batchNumber, quantityKg, row.getExpiryDate());
            if (d == null) {
                freshSkipped++;
            } else {
                applyUploadedUnit(d, row.getUnit(), row.getPackSize(), row.getPackUnit());
                created.add(d);
            }
        }
        return saveUploaded(created, freshSkipped, List.of(), List.of());
    }

    private Donation donorLocation(String donorId) {
        Donation probe = new Donation();
        probe.setDonorId(donorId);
        applyDonorLocation(probe);
        return probe;
    }

    /** Builds an uploaded row's listing, or returns null when the item is still too fresh to list. */
    private Donation newUploadedDonation(String donorId, Donation donorLocation, String name, String category,
                                         String typedCategory, String batchNumber, double quantityKg,
                                         LocalDate expiryDate) {
        int threshold = settingsService.resolveExpiryThresholdDays(category);
        if (ExpiryUtil.isTooFresh(expiryDate, threshold)) return null;

        Donation d = new Donation();
        d.setDonorId(donorId);
        d.setName(name);
        d.setCategory(category);
        if (typedCategory != null && !typedCategory.trim().equals(category)) {
            d.setOriginalCategory(typedCategory.trim());
        }
        d.setBatchNumber(batchNumber);
        d.setQuantityKg(quantityKg);
        d.setInitialQuantity(quantityKg);
        d.setUnit(DonationUnits.KG); // callers replace it via applyUploadedUnit
        d.setExpiryDate(expiryDate);
        d.setPickupLocation(donorLocation.getPickupLocation());
        d.setLatitude(donorLocation.getLatitude());
        d.setLongitude(donorLocation.getLongitude());
        d.setListingType("donation");
        d.setStatus(ExpiryUtil.reListStatus(expiryDate, threshold));
        d.setPublished(false);
        d.setCreatedAt(Instant.now());
        return d;
    }

    /**
     * Sets an uploaded row's unit (kg / liters / items) and, for packets, the
     * size of one packet. Rows without a packet size still import - the size is
     * only validated when one is given.
     */
    private void applyUploadedUnit(Donation d, String unit, Double packSize, String packUnit) {
        d.setUnit(DonationUnits.of(unit));
        if (DonationUnits.ITEMS.equals(d.getUnit()) && packSize != null) {
            d.setPackSize(packSize);
            d.setPackUnit(packUnit == null || packUnit.isBlank() ? DonationUnits.KG : packUnit);
            DonationUnits.applyPackSize(d);
        }
    }

    private UploadResult saveUploaded(List<Donation> created, long freshSkipped,
                                      List<CategoryCorrection> corrections, List<CategoryReview> review) {
        donationRepository.saveAll(created);

        long surplus = created.stream().filter(d -> "surplus".equals(d.getStatus())).count();
        long expired = created.stream().filter(d -> "expired".equals(d.getStatus())).count();
        return new UploadResult(created, surplus, expired, freshSkipped, corrections, review);
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

    public record UploadResult(List<Donation> items, long surplusDetected, long expiredDetected, long freshSkipped,
                               List<CategoryCorrection> categoryCorrections, List<CategoryReview> reviewRequired) {}

    /** A row saved under a different category than was typed, e.g. "veggies" or "Dary". */
    public record CategoryCorrection(long row, String originalCategory, String category,
                                     CategoryMatcher.MatchType matchType, Integer editDistance,
                                     Double similarity, String message) {}

    /** A row held back because its category could not be resolved with confidence. */
    public record CategoryReview(long row, String originalCategory, String suggestedCategory,
                                 CategoryMatcher.MatchType matchType, Integer editDistance,
                                 Double similarity, String message, ReviewItem item) {}

    /** The parsed row, so it can be imported without re-uploading the file. */
    public record ReviewItem(String name, String batchNumber, double quantityKg, LocalDate expiryDate,
                             String unit, Double packSize, String packUnit) {}
}
