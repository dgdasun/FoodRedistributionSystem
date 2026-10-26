package com.foodshare.service;

import com.foodshare.dto.UploadConfirmRequestDTO;
import com.foodshare.model.Donation;
import com.foodshare.model.User;
import com.foodshare.repository.DonationRepository;
import com.foodshare.repository.UserRepository;
import com.foodshare.service.CategoryMatcher.MatchType;
import com.foodshare.service.DonationService.CategoryCorrection;
import com.foodshare.service.DonationService.CategoryReview;
import com.foodshare.service.DonationService.UploadResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Bulk CSV upload with category matching, run against in-memory stand-ins for
 * MongoDB so it needs no database. Uses the real categories from application.yml.
 */
class DonationServiceUploadTest {

    private static final String DONOR_ID = "donor-1";
    private static final String SOON = LocalDate.now().plusDays(1).toString();
    private static final String NEXT_YEAR = LocalDate.now().plusYears(1).toString();

    private final List<Donation> saved = new ArrayList<>();
    private DonationService service;

    @BeforeEach
    void setUp() {
        User donor = new User();
        donor.setId(DONOR_ID);
        donor.setOrganizationName("ABC Supermarket");
        donor.setLocation("Colombo 05");

        UserRepository users = fake(UserRepository.class, (method, args) ->
                "findById".equals(method) && DONOR_ID.equals(args[0]) ? Optional.of(donor) : Optional.empty());
        DonationRepository donations = fake(DonationRepository.class, (method, args) -> {
            if (!"saveAll".equals(method)) throw new UnsupportedOperationException(method);
            @SuppressWarnings("unchecked") Iterable<Donation> batch = (Iterable<Donation>) args[0];
            batch.forEach(saved::add);
            return batch;
        });
        // Every category gets a 3-day window, so expiry - not the category rule - decides freshness here.
        SettingsService settings = new SettingsService(null) {
            @Override
            public int resolveExpiryThresholdDays(String rawCategory) {
                return 3;
            }
        };
        CategoryMatcher matcher = new CategoryMatcher(CategoryMatcherTest.applicationYmlProperties());
        service = new DonationService(donations, settings, users, matcher);
    }

    @Test
    void correctsResolvableCategoriesAndHoldsBackTheRest() throws IOException {
        UploadResult result = upload(
                "name,category,batchNumber,quantityKg,expiryDate",
                "Fresh Milk,Dairy,B1,5," + SOON,           // line 2: exact
                "Cheese,DAIRY,B2,2," + SOON,               // line 3: exact after normalizing
                "Whole Wheat Loaf,bred,B3,3," + SOON,      // line 4: typo of the alias "bread"
                "Carrots, vegetabels ,B4,4," + SOON,       // line 5: transposition
                "Leeks,veggies,B5,2," + SOON,              // line 6: alias
                "Phone Charger,Electronics,B6,1," + SOON,  // line 7: unknown
                "Mystery Box,,B7,1," + SOON,               // line 8: no category at all
                "Bananas,Fruites,B8,6," + NEXT_YEAR,       // line 9: corrected, but too fresh to list
                "Rice packs,Dar,B9,8," + SOON);            // line 10: too short to correct

        Map<String, Donation> byName = saved.stream().collect(Collectors.toMap(Donation::getName, Function.identity()));
        assertEquals(6, saved.size());
        assertEquals(result.items(), saved);

        assertEquals("Dairy", byName.get("Fresh Milk").getCategory());
        assertNull(byName.get("Fresh Milk").getOriginalCategory(), "nothing was corrected");
        assertEquals("Dairy", byName.get("Cheese").getCategory());
        assertEquals("DAIRY", byName.get("Cheese").getOriginalCategory());
        assertEquals("Bakery", byName.get("Whole Wheat Loaf").getCategory());
        assertEquals("bred", byName.get("Whole Wheat Loaf").getOriginalCategory());
        assertEquals("Vegetables", byName.get("Carrots").getCategory());
        assertEquals("Vegetables", byName.get("Leeks").getCategory());
        assertEquals("Other", byName.get("Mystery Box").getCategory(), "a blank category keeps its existing default");

        // Everything saved sits on a canonical category - no misspelled duplicates.
        assertTrue(saved.stream().allMatch(d -> List.of("Dairy", "Bakery", "Vegetables", "Other").contains(d.getCategory())));
        assertEquals(1, result.freshSkipped());

        List<CategoryCorrection> corrections = result.categoryCorrections();
        assertEquals(List.of(4L, 5L, 6L), corrections.stream().map(CategoryCorrection::row).toList());
        CategoryCorrection bred = corrections.get(0);
        assertEquals("bred", bred.originalCategory());
        assertEquals("Bakery", bred.category());
        assertEquals(MatchType.FUZZY_MATCH, bred.matchType());
        assertEquals(1, bred.editDistance());
        assertEquals(MatchType.ALIAS_MATCH, corrections.get(2).matchType());

        List<CategoryReview> review = result.reviewRequired();
        assertEquals(List.of(7L, 10L), review.stream().map(CategoryReview::row).toList());

        CategoryReview unknown = review.get(0);
        assertEquals("Electronics", unknown.originalCategory());
        assertEquals(MatchType.UNMATCHED, unknown.matchType());
        assertNull(unknown.suggestedCategory());
        assertEquals("Phone Charger", unknown.item().name());
        assertEquals(LocalDate.parse(SOON), unknown.item().expiryDate());

        CategoryReview tooShort = review.get(1);
        assertEquals(MatchType.REVIEW_REQUIRED, tooShort.matchType());
        assertEquals("Dairy", tooShort.suggestedCategory());
        assertTrue(tooShort.message().contains("Dar"));
    }

    @Test
    void matchesEachDistinctSpellingOnceAcrossManyRows() throws IOException {
        List<String> lines = new ArrayList<>(List.of("name,category,batchNumber,quantityKg,expiryDate"));
        for (int i = 0; i < 2000; i++) {
            lines.add("Item " + i + "," + (i % 2 == 0 ? "Dary" : "vegetabels") + ",B" + i + ",1," + SOON);
        }
        UploadResult result = upload(lines.toArray(String[]::new));

        assertEquals(2000, saved.size());
        assertEquals(2000, result.categoryCorrections().size());
        assertTrue(saved.stream().allMatch(d -> d.getCategory().equals("Dairy") || d.getCategory().equals("Vegetables")));
    }

    @Test
    void reviewedRowsImportWithTheChosenCategory() {
        UploadConfirmRequestDTO.Row row = reviewedRow(7L, "Phone Charger", "Electronics", "packaged goods");
        UploadResult result = service.importReviewedRows(DONOR_ID, List.of(row));

        assertEquals(1, saved.size());
        Donation d = saved.get(0);
        assertEquals("Packaged Goods", d.getCategory());
        assertEquals("Electronics", d.getOriginalCategory());
        assertEquals("ABC Supermarket, Colombo 05", d.getPickupLocation());
        assertEquals("surplus", d.getStatus());
        assertEquals(1, result.surplusDetected());
    }

    @Test
    void reviewedRowsMustUseACanonicalCategory() {
        UploadConfirmRequestDTO.Row good = reviewedRow(2L, "Cheese", "Dar", "Dairy");
        // A confirmation is the donor's own choice, so even a near miss is not guessed at.
        UploadConfirmRequestDTO.Row bad = reviewedRow(3L, "Phone Charger", "Electronics", "Dairyy");

        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> service.importReviewedRows(DONOR_ID, List.of(good, bad)));
        assertTrue(e.getMessage().startsWith("Row 3"), e.getMessage());
        assertTrue(saved.isEmpty(), "no row is saved when any row is invalid");
    }

    @Test
    void reviewedRowsNeedRows() {
        assertThrows(IllegalArgumentException.class, () -> service.importReviewedRows(DONOR_ID, List.of()));
        assertThrows(IllegalArgumentException.class, () -> service.importReviewedRows(DONOR_ID, null));
    }

    private UploadResult upload(String... lines) throws IOException {
        byte[] csv = (String.join("\n", lines) + "\n").getBytes(StandardCharsets.UTF_8);
        return service.bulkUpload(DONOR_ID, new MockMultipartFile("file", "inventory.csv", "text/csv", csv));
    }

    private static UploadConfirmRequestDTO.Row reviewedRow(Long line, String name, String original, String chosen) {
        UploadConfirmRequestDTO.Row row = new UploadConfirmRequestDTO.Row();
        row.setRowNumber(line);
        row.setName(name);
        row.setOriginalCategory(original);
        row.setCategory(chosen);
        row.setBatchNumber("B" + line);
        row.setQuantityKg(1.0);
        row.setExpiryDate(LocalDate.parse(SOON));
        return row;
    }

    @FunctionalInterface
    private interface Handler {
        Object handle(String method, Object[] args);
    }

    /** A repository stand-in that answers only the methods the upload path calls. */
    @SuppressWarnings("unchecked")
    private static <T> T fake(Class<T> type, Handler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type},
                (proxy, method, args) -> method.getDeclaringClass() == Object.class
                        ? method.invoke(handler, args)
                        : handler.handle(method.getName(), args));
    }
}
