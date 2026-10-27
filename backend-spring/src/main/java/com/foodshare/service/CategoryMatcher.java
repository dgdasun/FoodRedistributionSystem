package com.foodshare.service;

import com.foodshare.config.CategoryMatchingProperties;
import com.foodshare.config.CategoryMatchingProperties.Definition;
import com.foodshare.config.CategoryMatchingProperties.Matching;
import com.foodshare.util.EditDistance;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Resolves the free-text category on an uploaded inventory row to one of the
 * canonical donation categories, correcting spelling mistakes ("Dary",
 * "vegetabels") where that can be done reliably.
 *
 * Runs in order: exact name, verified alias ("veggies"), then spelling
 * correction by edit distance. A correction is only made automatically when
 * the input is long enough, close enough, and clearly closer to one category
 * than to any other - otherwise the row is marked for the donor to review,
 * because silently filing food under the wrong category changes its expiry
 * rule and where NGOs see it. Nothing is ever defaulted to "Other".
 *
 * Purely local and deterministic: no AI service call is involved.
 */
@Service
public class CategoryMatcher {

    public enum MatchType { EXACT_MATCH, ALIAS_MATCH, FUZZY_MATCH, REVIEW_REQUIRED, UNMATCHED }

    /**
     * @param category the canonical category for an accepted match, the suggestion for
     *                 REVIEW_REQUIRED, or null when UNMATCHED
     * @param message  a donor-facing explanation; null for an exact match
     */
    public record Match(MatchType type, String input, String category,
                        Integer editDistance, Double similarity, String message) {

        public boolean isAccepted() {
            return type == MatchType.EXACT_MATCH || type == MatchType.ALIAS_MATCH || type == MatchType.FUZZY_MATCH;
        }
    }

    /** A spelling the fuzzy step compares against: a category name or one of its aliases. */
    private record Term(String text, String category) {
    }

    private record Candidate(String category, String term, int distance, double similarity) {
    }

    private static final Pattern WHITESPACE = Pattern.compile("[\\s_]+");
    private static final Comparator<Candidate> CLOSEST_FIRST = Comparator
            .comparingInt(Candidate::distance)
            .thenComparing(Comparator.comparingDouble(Candidate::similarity).reversed());

    private final Matching thresholds;
    private final List<String> categories = new ArrayList<>();
    private final Map<String, String> categoryByName = new HashMap<>();
    private final Map<String, String> categoryByAlias = new HashMap<>();
    private final List<Term> fuzzyTerms = new ArrayList<>();

    public CategoryMatcher(CategoryMatchingProperties properties) {
        this.thresholds = properties.getMatching();
        // Precomputed once: every row of every upload compares against the same normalized terms.
        for (Definition definition : properties.getDefinitions()) {
            String name = definition.getName() == null ? "" : definition.getName().trim();
            String key = normalize(name);
            if (key.isEmpty()) throw new IllegalStateException("A donation category has no name");
            if (categoryByName.containsKey(key) || categoryByAlias.containsKey(key)) {
                throw new IllegalStateException("Donation category '" + name + "' is defined more than once");
            }
            categories.add(name);
            categoryByName.put(key, name);
            addFuzzyTerm(key, name);
        }
        for (Definition definition : properties.getDefinitions()) {
            String name = definition.getName().trim();
            if (definition.getAliases() == null) continue;
            for (String alias : definition.getAliases()) {
                String key = normalize(alias);
                if (key.isEmpty() || key.equals(normalize(name))) continue;
                String existing = categoryByName.containsKey(key) ? categoryByName.get(key) : categoryByAlias.get(key);
                if (existing != null && !existing.equals(name)) {
                    throw new IllegalStateException("Category alias '" + alias + "' would mean both '"
                            + existing + "' and '" + name + "'");
                }
                if (existing == null) {
                    categoryByAlias.put(key, name);
                    addFuzzyTerm(key, name);
                }
            }
        }
        if (categories.isEmpty()) throw new IllegalStateException("No donation categories are configured");
    }

    private void addFuzzyTerm(String key, String category) {
        // A short term is matched exactly or not at all - "veg" is one edit from "egg".
        if (key.length() >= thresholds.getMinFuzzyLength()) fuzzyTerms.add(new Term(key, category));
    }

    /** The canonical category names, in configured order. */
    public List<String> categories() {
        return List.copyOf(categories);
    }

    /**
     * Unicode-normalizes, lower-cases, trims and collapses runs of whitespace
     * (and underscores) to one space. Never null.
     */
    public static String normalize(String raw) {
        if (raw == null) return "";
        String text = Normalizer.normalize(raw, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
        return WHITESPACE.matcher(text).replaceAll(" ").trim();
    }

    public Match match(String raw) {
        String input = normalize(raw);
        if (input.isEmpty()) {
            return new Match(MatchType.UNMATCHED, raw, null, null, null, "No category was given.");
        }

        String exact = categoryByName.get(input);
        if (exact != null) return new Match(MatchType.EXACT_MATCH, raw, exact, 0, 1.0, null);

        String alias = categoryByAlias.get(input);
        if (alias != null) {
            return new Match(MatchType.ALIAS_MATCH, raw, alias, 0, 1.0,
                    "'" + raw.trim() + "' is filed under " + alias + ".");
        }

        if (input.length() > thresholds.getMaxInputLength()) {
            return new Match(MatchType.UNMATCHED, raw, null, null, null,
                    "'" + abbreviate(raw.trim()) + "' is not a known category.");
        }
        return matchBySpelling(raw, input);
    }

    private Match matchBySpelling(String raw, String input) {
        List<Candidate> ranked = closestPerCategory(input);
        String shown = raw.trim();
        if (ranked.isEmpty() || ranked.get(0).similarity() < thresholds.getReviewSimilarity()) {
            return new Match(MatchType.UNMATCHED, raw, null, null, null,
                    "'" + shown + "' is not a known category, and no category is close enough to suggest.");
        }

        Candidate best = ranked.get(0);
        // A tie only counts when the runner-up would have been a believable
        // correction in its own right: "Bakry" is 2 edits from Dairy, but Dairy
        // was never a credible reading of it, so it does not block Bakery.
        Candidate rival = ranked.size() > 1 ? ranked.get(1) : null;
        boolean ambiguous = rival != null
                && isCloseEnoughToCorrect(rival)
                && rival.distance() - best.distance() <= thresholds.getAmbiguityMargin();

        String reason = null;
        if (ambiguous) {
            reason = "'" + shown + "' is about as close to " + best.category() + " as to " + rival.category()
                    + ", so it was not changed automatically.";
        } else if (input.length() < thresholds.getMinFuzzyLength()) {
            reason = "'" + shown + "' is too short to correct automatically. Did you mean " + best.category() + "?";
        } else if (!isCloseEnoughToCorrect(best)) {
            reason = "'" + shown + "' may be " + best.category() + ", but is not close enough to change automatically.";
        }
        if (reason != null) {
            return new Match(MatchType.REVIEW_REQUIRED, raw, best.category(), best.distance(), round(best.similarity()), reason);
        }

        return new Match(MatchType.FUZZY_MATCH, raw, best.category(), best.distance(), round(best.similarity()),
                "Corrected the spelling '" + shown + "' to " + best.category() + ".");
    }

    private boolean isCloseEnoughToCorrect(Candidate candidate) {
        return candidate.distance() <= thresholds.getMaxEditDistance()
                && candidate.similarity() >= thresholds.getAutoAcceptSimilarity();
    }

    /** One candidate per category - its closest spelling - sorted closest first. */
    private List<Candidate> closestPerCategory(String input) {
        Map<String, Candidate> best = new LinkedHashMap<>();
        for (Term term : fuzzyTerms) {
            int distance = EditDistance.between(input, term.text());
            Candidate candidate = new Candidate(term.category(), term.text(), distance,
                    EditDistance.similarity(input, term.text(), distance));
            best.merge(term.category(), candidate, (a, b) -> CLOSEST_FIRST.compare(a, b) <= 0 ? a : b);
        }
        return best.values().stream().sorted(CLOSEST_FIRST).toList();
    }

    private static double round(double similarity) {
        return Math.round(similarity * 1000) / 1000.0;
    }

    private static String abbreviate(String text) {
        return text.length() <= 30 ? text : text.substring(0, 30) + "…";
    }
}
