package com.foodshare.util;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Product Monitoring and Expiry Detection Module.
 * Classifies a food item as "fresh", "surplus" (near-expiry) or "expired"
 * based on an administrator-configurable threshold (in days).
 */
public class ExpiryUtil {

    private ExpiryUtil() {}

    public static long daysUntil(LocalDate expiryDate) {
        return ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);
    }

    /**
     * Full classification, including "fresh".
     *
     * "fresh" is a GATE value, not a state the system stores: it is what tells
     * {@code DonationService.create} to refuse a listing. This platform only
     * carries near-expiry surplus and expired stock, so nothing should ever be
     * saved with this status - use {@link #reListStatus} when deriving the
     * status of an item that is already in the system.
     */
    public static String classify(LocalDate expiryDate, int thresholdDays) {
        long diff = daysUntil(expiryDate);
        if (diff < 0) return "expired";
        if (diff <= thresholdDays) return "surplus";
        return "fresh";
    }

    /** True when an item is too far from expiry for this platform to carry it. */
    public static boolean isTooFresh(LocalDate expiryDate, int thresholdDays) {
        return "fresh".equals(classify(expiryDate, thresholdDays));
    }

    /**
     * Status for an item already accepted into the system. Never returns
     * "fresh": an item that qualified when it was listed stays listed as
     * surplus until it actually expires, even if an administrator later
     * shortens the threshold.
     */
    public static String reListStatus(LocalDate expiryDate, int thresholdDays) {
        String status = classify(expiryDate, thresholdDays);
        return "fresh".equals(status) ? "surplus" : status;
    }
}
