package com.foodshare.util;

/**
 * Levenshtein edit distance, extended so that swapping two adjacent letters
 * ("vegetabels" for "vegetables") counts as one edit rather than two. This is
 * the "optimal string alignment" variant of Damerau-Levenshtein: insertions,
 * deletions, substitutions and adjacent transpositions each cost 1.
 *
 * Plain Levenshtein would charge a transposition as two substitutions, which
 * makes the most common typing slip look as bad as two unrelated mistakes.
 */
public final class EditDistance {

    private EditDistance() {
    }

    public static int between(String a, String b) {
        if (a == null || b == null) throw new IllegalArgumentException("Cannot compare null strings");
        int n = a.length();
        int m = b.length();
        if (n == 0) return m;
        if (m == 0) return n;

        // Three rolling rows instead of the full (n+1) x (m+1) matrix: a
        // transposition only ever looks two rows back.
        int[] twoBack = new int[m + 1];
        int[] prev = new int[m + 1];
        int[] curr = new int[m + 1];
        for (int j = 0; j <= m; j++) prev[j] = j;

        for (int i = 1; i <= n; i++) {
            curr[0] = i;
            char ca = a.charAt(i - 1);
            for (int j = 1; j <= m; j++) {
                char cb = b.charAt(j - 1);
                int cost = ca == cb ? 0 : 1;
                int best = Math.min(Math.min(prev[j] + 1, curr[j - 1] + 1), prev[j - 1] + cost);
                if (i > 1 && j > 1 && ca == b.charAt(j - 2) && a.charAt(i - 2) == cb) {
                    best = Math.min(best, twoBack[j - 2] + 1);
                }
                curr[j] = best;
            }
            int[] recycled = twoBack;
            twoBack = prev;
            prev = curr;
            curr = recycled;
        }
        return prev[m];
    }

    /** 1.0 for identical strings down to 0.0 for nothing in common, relative to the longer string. */
    public static double similarity(String a, String b, int distance) {
        int longer = Math.max(a.length(), b.length());
        return longer == 0 ? 1.0 : 1.0 - (double) distance / longer;
    }
}
