package com.foodshare.controller;

import com.foodshare.dto.UploadConfirmRequestDTO;
import com.foodshare.model.Donation;
import com.foodshare.model.User;
import com.foodshare.repository.DonationRepository;
import com.foodshare.repository.UserRepository;
import com.foodshare.service.CategoryMatcher;
import com.foodshare.service.DonationService;
import com.foodshare.service.SettingsService;
import com.foodshare.util.ExpiryUtil;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/donations")
public class DonationController {

    private final DonationService donationService;
    private final DonationRepository donationRepository;
    private final SettingsService settingsService;
    private final UserRepository userRepository;
    private final CategoryMatcher categoryMatcher;

    public DonationController(DonationService donationService,
                              DonationRepository donationRepository,
                              SettingsService settingsService,
                              UserRepository userRepository,
                              CategoryMatcher categoryMatcher) {
        this.donationService = donationService;
        this.donationRepository = donationRepository;
        this.settingsService = settingsService;
        this.userRepository = userRepository;
        this.categoryMatcher = categoryMatcher;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String donorId,
                                     @RequestParam(required = false) String status,
                                     @RequestParam(required = false) Boolean published) {
        List<Donation> donations = donationService.reclassifyAll();
        if (donorId != null) donations = donations.stream().filter(d -> donorId.equals(d.getDonorId())).toList();
        if (status != null) donations = donations.stream().filter(d -> status.equals(d.getStatus())).toList();
        if (published != null) donations = donations.stream().filter(d -> d.isPublished() == published).toList();

        List<Map<String, Object>> enriched = donations.stream().map(this::withDaysUntilExpiry).toList();
        return Map.of("donations", enriched);
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        Donation d = donationRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Item not found"));
        return Map.of("donation", withDaysUntilExpiry(d));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(@Valid @RequestBody Donation donation) {
        return Map.of("donation", donationService.create(donation));
    }

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> upload(@RequestParam String donorId, @RequestParam("file") MultipartFile file) throws IOException {
        return uploadResponse(donationService.bulkUpload(donorId, file));
    }

    /** Imports rows an upload held back for category review, with the category the donor picked. */
    @PostMapping("/upload/confirm")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> confirmUpload(@RequestBody UploadConfirmRequestDTO request) {
        return uploadResponse(donationService.importReviewedRows(request.getDonorId(), request.getRows()));
    }

    private Map<String, Object> uploadResponse(DonationService.UploadResult result) {
        String message = result.items().size() + " item(s) imported and classified.";
        if (result.freshSkipped() > 0) {
            message += " " + result.freshSkipped() + " row(s) skipped — still fresh, not yet eligible for donation.";
        }
        if (!result.reviewRequired().isEmpty()) {
            message += " " + result.reviewRequired().size() + " row(s) not imported yet — check their category.";
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", message);
        body.put("surplusDetected", result.surplusDetected());
        body.put("expiredDetected", result.expiredDetected());
        body.put("freshSkipped", result.freshSkipped());
        body.put("items", result.items());
        body.put("categoryCorrections", result.categoryCorrections());
        body.put("reviewRequired", result.reviewRequired());
        // The names a held-back row can be filed under, so the review list offers exactly these.
        body.put("categories", categoryMatcher.categories());
        return body;
    }

    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Donation patch) {
        return Map.of("donation", donationService.update(id, patch));
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable String id) {
        donationService.delete(id);
        return Map.of("message", "Deleted");
    }

    private Map<String, Object> withDaysUntilExpiry(Donation d) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", d.getId());
        map.put("donorId", d.getDonorId());
        map.put("name", d.getName());
        map.put("category", d.getCategory());
        map.put("batchNumber", d.getBatchNumber());
        map.put("quantityKg", d.getQuantityKg());
        map.put("unit", d.getUnit());
        map.put("packSize", d.getPackSize());
        map.put("packUnit", d.getPackUnit());
        map.put("expiryDate", d.getExpiryDate());
        map.put("pickupLocation", d.getPickupLocation());
        map.put("latitude", d.getLatitude());
        map.put("longitude", d.getLongitude());
        map.put("listingType", d.getListingType());
        map.put("status", d.getStatus());
        // How many days this category stays collectable, so the UI can show a
        // meter based on the real rule instead of an invented percentage.
        map.put("expiryThresholdDays", settingsService.resolveExpiryThresholdDays(d.getCategory()));
        map.put("published", d.isPublished());
        map.put("createdAt", d.getCreatedAt());
        map.put("daysUntilExpiry", ExpiryUtil.daysUntil(d.getExpiryDate()));

        // The donor's own coordinates, so the map can place a listing whose
        // pickupLocation is a free-text site name ("ABC Supermarket Hub")
        // rather than a town the client can look up. Listing coordinates, when
        // present, still win - this is only the fallback.
        User donor = d.getDonorId() == null ? null : userRepository.findById(d.getDonorId()).orElse(null);
        if (donor != null) {
            map.put("donorName", donor.getOrganizationName() != null ? donor.getOrganizationName() : donor.getName());
            map.put("donorLatitude", donor.getLatitude());
            map.put("donorLongitude", donor.getLongitude());
        }
        return map;
    }
}
