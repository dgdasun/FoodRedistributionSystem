package com.foodshare.service;

import com.foodshare.config.CategoryMatchingProperties;
import com.foodshare.config.CategoryMatchingProperties.Definition;
import com.foodshare.service.CategoryMatcher.Match;
import com.foodshare.service.CategoryMatcher.MatchType;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.ConfigurationPropertySources;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CategoryMatcherTest {

    /** The categories and thresholds exactly as shipped in application.yml. */
    static CategoryMatchingProperties applicationYmlProperties() {
        try {
            var sources = new YamlPropertySourceLoader().load("application", new ClassPathResource("application.yml"));
            return new Binder(ConfigurationPropertySources.from(sources))
                    .bind("foodshare.categories", CategoryMatchingProperties.class)
                    .get();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static CategoryMatcher matcherWith(Definition... definitions) {
        CategoryMatchingProperties properties = new CategoryMatchingProperties();
        properties.setDefinitions(new ArrayList<>(List.of(definitions)));
        return new CategoryMatcher(properties);
    }

    private static Definition category(String name, String... aliases) {
        return new Definition(name, new ArrayList<>(List.of(aliases)));
    }

    /** The scenarios from the feature spec, which assume "Bread" is itself a category. */
    @Nested
    class SpecScenarios {

        private final CategoryMatcher matcher = matcherWith(
                category("Bread"),
                category("Dairy"),
                category("Vegetables", "veggies"),
                category("Fruits"),
                category("Packaged Goods"),
                category("Other"));

        @ParameterizedTest
        @ValueSource(strings = {"Bread", "BREAD", " bread ", "\tbReAd\n"})
        void exactMatchIgnoresCaseAndSurroundingWhitespace(String input) {
            Match m = matcher.match(input);
            assertEquals(MatchType.EXACT_MATCH, m.type());
            assertEquals("Bread", m.category());
            assertEquals(0, m.editDistance());
            assertEquals(input, m.input(), "the original value is kept for reporting");
        }

        @Test
        void exactMatchCollapsesInnerWhitespace() {
            assertEquals("Packaged Goods", matcher.match("  packaged    goods ").category());
            assertEquals("Packaged Goods", matcher.match("packaged_goods").category());
            assertEquals(MatchType.EXACT_MATCH, matcher.match("PACKAGED GOODS").type(), "non-breaking space");
        }

        @ParameterizedTest(name = "{0} -> {1} ({2} edit)")
        @CsvSource({
                "bred,       Bread,      1",   // deletion
                "breadd,     Bread,      1",   // insertion
                "Dary,       Dairy,      1",   // deletion
                "Dairt,      Dairy,      1",   // substitution
                "Diary,      Dairy,      1",   // transposition
                "vegetabels, Vegetables, 1",   // transposition
                "Vegtables,  Vegetables, 1",
                "Fruites,    Fruits,     1",
                "Frutis,     Fruits,     1",
                "vegatabels, Vegetables, 2",   // two mistakes in a long word
                "Pakaged Goods, Packaged Goods, 1",
        })
        void correctsReliableSpellingMistakes(String input, String expected, int distance) {
            Match m = matcher.match(input);
            assertEquals(MatchType.FUZZY_MATCH, m.type(), m.message());
            assertEquals(expected, m.category());
            assertEquals(distance, m.editDistance());
            assertTrue(m.similarity() >= 0.75 && m.similarity() < 1.0);
            assertTrue(m.isAccepted());
        }

        @Test
        void aliasMatchIsSeparateFromSpellingCorrection() {
            Match m = matcher.match("Veggies");
            assertEquals(MatchType.ALIAS_MATCH, m.type());
            assertEquals("Vegetables", m.category());
            assertEquals(0, m.editDistance());
        }

        @Test
        void aliasesAreAlsoSpellingTargets() {
            Match m = matcher.match("vegies");
            assertEquals(MatchType.FUZZY_MATCH, m.type());
            assertEquals("Vegetables", m.category());
        }

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"   ", "\t"})
        void emptyInputIsUnmatchedNotDefaulted(String input) {
            Match m = matcher.match(input);
            assertEquals(MatchType.UNMATCHED, m.type());
            assertNull(m.category(), "an empty category must never silently become Other");
            assertFalse(m.isAccepted());
        }

        @ParameterizedTest
        @ValueSource(strings = {"Electronics", "qwertyuiop", "Stationery", "12345", "!!!", "Cars"})
        void unrelatedTextIsNeverAccepted(String input) {
            Match m = matcher.match(input);
            assertFalse(m.isAccepted(), input + " was accepted as " + m.category());
            assertNotEquals("Other", m.category());
        }

        @Test
        void clearlyUnrelatedTextHasNoSuggestion() {
            Match m = matcher.match("Electronics");
            assertEquals(MatchType.UNMATCHED, m.type());
            assertNull(m.category());
            assertTrue(m.message().contains("Electronics"));
        }

        @Test
        void shortInputIsSuggestedButNotCorrected() {
            Match m = matcher.match("Dar");
            assertEquals(MatchType.REVIEW_REQUIRED, m.type());
            assertEquals("Dairy", m.category());
            assertTrue(m.message().contains("too short"));
        }

        @Test
        void tooManyEditsGoesToReviewWithASuggestion() {
            Match m = matcher.match("Vgtbls");
            assertEquals(MatchType.REVIEW_REQUIRED, m.type());
            assertEquals("Vegetables", m.category());
            assertTrue(m.editDistance() > 2);
        }

        @Test
        void differentLengthsUseTheirOwnTolerance() {
            // Two edits are a small slip in a 10-letter word ...
            assertEquals(MatchType.FUZZY_MATCH, matcher.match("vegatabels").type());
            // ... but half of a 4-letter word.
            assertNotEquals(MatchType.FUZZY_MATCH, matcher.match("bxxd").type());
        }

        @Test
        void overlongInputIsRejectedWithoutComparison() {
            Match m = matcher.match("bread ".repeat(20));
            assertEquals(MatchType.UNMATCHED, m.type());
        }
    }

    @Nested
    class Ambiguity {

        @Test
        void tieBetweenTwoCategoriesRequiresReview() {
            CategoryMatcher matcher = matcherWith(category("Cakes"), category("Bakes"));
            Match m = matcher.match("Dakes");
            assertEquals(MatchType.REVIEW_REQUIRED, m.type());
            assertTrue(m.message().contains("Cakes") && m.message().contains("Bakes"), m.message());
        }

        @Test
        void nearTieWithinTheMarginRequiresReview() {
            // "Frozen Pas" is 1 edit from Frozen Peas and 2 from Frozen Pies -
            // both would be credible corrections, so it is too close to call.
            CategoryMatcher matcher = matcherWith(category("Frozen Peas"), category("Frozen Pies"));
            Match m = matcher.match("Frozen Pas");
            assertEquals(MatchType.REVIEW_REQUIRED, m.type());
            assertEquals("Frozen Peas", m.category(), "the closer category is still offered first");
        }

        @Test
        void aRunnerUpThatIsNotACredibleCorrectionDoesNotBlock() {
            // "Rices" is 2 edits from Spices, but only 67% similar - never a believable reading.
            CategoryMatcher matcher = matcherWith(category("Rice"), category("Spices"));
            Match m = matcher.match("Rices");
            assertEquals(MatchType.FUZZY_MATCH, m.type());
            assertEquals("Rice", m.category());
        }

        @Test
        void aClearWinnerIsStillAccepted() {
            CategoryMatcher matcher = matcherWith(category("Dairy"), category("Daily Specials"));
            assertEquals(MatchType.FUZZY_MATCH, matcher.match("Dairyy").type());
        }

        @Test
        void twoSpellingsOfTheSameCategoryAreNotATie() {
            // "fruit" and "fruits" both mean Fruits, so being close to both is not ambiguous.
            CategoryMatcher matcher = matcherWith(category("Fruits", "fruit"), category("Dairy"));
            Match m = matcher.match("Fruitt");
            assertEquals(MatchType.FUZZY_MATCH, m.type());
            assertEquals("Fruits", m.category());
        }

        @Test
        void marginIsConfigurable() {
            CategoryMatchingProperties properties = new CategoryMatchingProperties();
            properties.setDefinitions(new ArrayList<>(List.of(category("Frozen Peas"), category("Frozen Pies"))));
            properties.getMatching().setAmbiguityMargin(0);
            Match m = new CategoryMatcher(properties).match("Frozen Pas");
            assertEquals(MatchType.FUZZY_MATCH, m.type());
            assertEquals("Frozen Peas", m.category());
            assertEquals(MatchType.REVIEW_REQUIRED, new CategoryMatcher(properties).match("Frozen Pes").type(),
                    "an exact tie is still a tie with no margin");
        }
    }

    @Nested
    class Configuration {

        @Test
        void duplicateCategoryNamesAreRejected() {
            assertThrows(IllegalStateException.class, () -> matcherWith(category("Dairy"), category(" DAIRY ")));
        }

        @Test
        void anAliasCannotPointAtTwoCategories() {
            assertThrows(IllegalStateException.class,
                    () -> matcherWith(category("Dairy", "milk"), category("Beverages", "Milk")));
            assertThrows(IllegalStateException.class,
                    () -> matcherWith(category("Dairy"), category("Milk Products", "dairy")));
        }

        @Test
        void repeatedAliasForTheSameCategoryIsHarmless() {
            CategoryMatcher matcher = matcherWith(category("Vegetables", "veg", "VEG", "vegetables"));
            assertEquals(MatchType.ALIAS_MATCH, matcher.match("veg").type());
            assertEquals(MatchType.EXACT_MATCH, matcher.match("vegetables").type());
        }

        @Test
        void noCategoriesIsAConfigurationError() {
            assertThrows(IllegalStateException.class, () -> new CategoryMatcher(new CategoryMatchingProperties()));
        }

        @Test
        void thresholdsAreConfigurable() {
            CategoryMatchingProperties properties = new CategoryMatchingProperties();
            properties.setDefinitions(new ArrayList<>(List.of(category("Dairy"))));
            properties.getMatching().setAutoAcceptSimilarity(0.9);
            Match m = new CategoryMatcher(properties).match("Dary");
            assertEquals(MatchType.REVIEW_REQUIRED, m.type(), "0.8 similarity is below a 0.9 bar");
        }
    }

    /** The real categories and aliases the application runs with. */
    @Nested
    class ApplicationConfiguration {

        private final CategoryMatcher matcher = new CategoryMatcher(applicationYmlProperties());

        @Test
        void loadsTheSameCategoriesTheFrontendOffers() {
            assertEquals(List.of("Vegetables", "Dairy", "Bakery", "Cooked Meals", "Fruits", "Packaged Goods", "Other"),
                    matcher.categories());
        }

        @ParameterizedTest(name = "{0} -> {1} [{2}]")
        @CsvSource({
                "Bakery,          Bakery,         EXACT_MATCH",
                "cooked meals,    Cooked Meals,   EXACT_MATCH",
                "Bread,           Bakery,         ALIAS_MATCH",
                "veggies,         Vegetables,     ALIAS_MATCH",
                "Fruit,           Fruits,         ALIAS_MATCH",
                "Milk,            Dairy,          ALIAS_MATCH",
                "bred,            Bakery,         FUZZY_MATCH",
                "breadd,          Bakery,         FUZZY_MATCH",
                "Dary,            Dairy,          FUZZY_MATCH",
                "Diary,           Dairy,          FUZZY_MATCH",
                "vegetabels,      Vegetables,     FUZZY_MATCH",
                "Fruites,         Fruits,         FUZZY_MATCH",
                "Bakry,           Bakery,         FUZZY_MATCH",
                "Cooked Meels,    Cooked Meals,   FUZZY_MATCH",
                "Packaged Good,   Packaged Goods, FUZZY_MATCH",
                "Othr,            Other,          FUZZY_MATCH",
        })
        void resolvesRealWorldInput(String input, String expected, MatchType type) {
            Match m = matcher.match(input);
            assertEquals(type, m.type(), m.message());
            assertEquals(expected, m.category());
        }

        @ParameterizedTest
        @ValueSource(strings = {"egg", "eggs", "Electronics", "Toys", "Meat", "abc"})
        void doesNotGuessForUnknownCategories(String input) {
            Match m = matcher.match(input);
            assertFalse(m.isAccepted(), input + " was accepted as " + m.category() + " (" + m.message() + ")");
        }
    }
}
