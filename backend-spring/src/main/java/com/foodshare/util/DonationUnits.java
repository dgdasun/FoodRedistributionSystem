package com.foodshare.util;

import com.foodshare.model.Donation;

import java.util.List;
import java.util.Locale;

/**
 * The units a donor can list food in. Quantities in different units are never
 * added together - 5 kg and 5 liters are not 10 of anything.
 */
public final class DonationUnits {

    public static final String KG = "kg";
    public static final String LITERS = "liters";
    public static final String ITEMS = "items";

    /** Display order: weight, volume, count. */
    public static final List<String> ALL = List.of(KG, LITERS, ITEMS);

    private DonationUnits() {
    }

    /**
     * Maps what a client or CSV sends onto one of {@link #ALL}, accepting the
     * obvious spellings. Throws for anything else so a typo is never saved as a
     * silent fourth unit.
     */
    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Select a unit: kg, liters or items/packets.");
        }
        return switch (raw.trim().toLowerCase(Locale.ENGLISH)) {
            case "kg", "kgs", "kilogram", "kilograms" -> KG;
            case "l", "liter", "liters", "litre", "litres" -> LITERS;
            case "item", "items", "packet", "packets", "items/packets", "pcs", "pieces" -> ITEMS;
            default -> throw new IllegalArgumentException(
                    "Unknown unit '" + raw + "'. Use kg, liters or items/packets.");
        };
    }

    /**
     * Validates the size of one packet for an items/packets listing and stores
     * it on the donation; clears it for weight/volume listings, where it has no
     * meaning. The packet itself must be measured by weight or volume.
     */
    public static void applyPackSize(Donation d) {
        if (!ITEMS.equals(d.getUnit())) {
            d.setPackSize(null);
            d.setPackUnit(null);
            return;
        }
        if (d.getPackSize() == null || d.getPackSize() <= 0) {
            throw new IllegalArgumentException("Enter how much one packet holds (in kg or liters).");
        }
        String packUnit = normalize(d.getPackUnit());
        if (ITEMS.equals(packUnit)) {
            throw new IllegalArgumentException("Packet size must be in kg or liters.");
        }
        d.setPackUnit(packUnit);
    }

    /** Short label for messages: "kg", "L", "items". */
    public static String shortLabel(String unit) {
        return switch (of(unit)) {
            case LITERS -> "L";
            case ITEMS -> "items";
            default -> "kg";
        };
    }

    /** Records listed before units existed have no usable value and were always kilograms. */
    public static String of(String stored) {
        try {
            return normalize(stored);
        } catch (IllegalArgumentException e) {
            return KG;
        }
    }
}
