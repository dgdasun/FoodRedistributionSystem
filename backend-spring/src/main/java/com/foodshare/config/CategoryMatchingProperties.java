package com.foodshare.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

/**
 * The canonical donation categories, their verified aliases, and the
 * thresholds CategoryMatcher uses to correct misspelled categories in a bulk
 * CSV upload. Bound from foodshare.categories in application.yml.
 *
 * The category names must stay in step with CATEGORIES in the frontend's
 * MyDonations.jsx - those are the buttons a donor picks from when adding an
 * item by hand, and an uploaded row should land on the same names.
 */
@ConfigurationProperties(prefix = "foodshare.categories")
public class CategoryMatchingProperties {

    private List<Definition> definitions = new ArrayList<>();
    private Matching matching = new Matching();

    public List<Definition> getDefinitions() {
        return definitions;
    }

    public void setDefinitions(List<Definition> definitions) {
        this.definitions = definitions;
    }

    public Matching getMatching() {
        return matching;
    }

    public void setMatching(Matching matching) {
        this.matching = matching;
    }

    /** One canonical category, e.g. "Vegetables", and the other names donors verifiably use for it, e.g. "veggies". */
    public static class Definition {
        private String name;
        private List<String> aliases = new ArrayList<>();

        public Definition() {
        }

        public Definition(String name, List<String> aliases) {
            this.name = name;
            this.aliases = aliases;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public List<String> getAliases() {
            return aliases;
        }

        public void setAliases(List<String> aliases) {
            this.aliases = aliases;
        }
    }

    /** Thresholds for spelling correction. The defaults favour asking the donor over guessing. */
    public static class Matching {
        /** Inputs shorter than this are never auto-corrected: one edit changes too much of a 3-letter word. */
        private int minFuzzyLength = 4;
        /** Hard cap on edits for an automatic correction, however long the word. */
        private int maxEditDistance = 2;
        /** Similarity (1 - edits / longer length) an automatic correction needs. */
        private double autoAcceptSimilarity = 0.75;
        /** Below this similarity a candidate is not even worth suggesting. */
        private double reviewSimilarity = 0.5;
        /**
         * When the runner-up category is close enough to be corrected to as
         * well, and within this many edits of the best one, it is a tie and
         * the row goes to review.
         */
        private int ambiguityMargin = 1;
        /** Longer inputs are not compared at all - no category name is anywhere near this long. */
        private int maxInputLength = 60;

        public int getMinFuzzyLength() {
            return minFuzzyLength;
        }

        public void setMinFuzzyLength(int minFuzzyLength) {
            this.minFuzzyLength = minFuzzyLength;
        }

        public int getMaxEditDistance() {
            return maxEditDistance;
        }

        public void setMaxEditDistance(int maxEditDistance) {
            this.maxEditDistance = maxEditDistance;
        }

        public double getAutoAcceptSimilarity() {
            return autoAcceptSimilarity;
        }

        public void setAutoAcceptSimilarity(double autoAcceptSimilarity) {
            this.autoAcceptSimilarity = autoAcceptSimilarity;
        }

        public double getReviewSimilarity() {
            return reviewSimilarity;
        }

        public void setReviewSimilarity(double reviewSimilarity) {
            this.reviewSimilarity = reviewSimilarity;
        }

        public int getAmbiguityMargin() {
            return ambiguityMargin;
        }

        public void setAmbiguityMargin(int ambiguityMargin) {
            this.ambiguityMargin = ambiguityMargin;
        }

        public int getMaxInputLength() {
            return maxInputLength;
        }

        public void setMaxInputLength(int maxInputLength) {
            this.maxInputLength = maxInputLength;
        }
    }
}
