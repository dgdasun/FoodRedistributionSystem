package com.foodshare.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.LinkedHashMap;
import java.util.Map;

@Document(collection = "settings")
public class Settings {

    /** Stable keys for the food-category rule map. */
    public static final String CATEGORY_COOKED_BAKERY = "cooked_bakery";
    public static final String CATEGORY_PERISHABLE_DAIRY = "perishable_dairy";
    public static final String CATEGORY_PACKAGED_DRY = "packaged_dry";

    @Id
    private String id;

    /** Global fallback used when a donation's category doesn't match any configured rule. */
    private int expiryThresholdDays = 3;
    private int ticketCollectionWindowHours = 24;

    private Map<String, CategoryRule> categoryRules = defaultCategoryRules();

    public Settings() {
    }

    public static Map<String, CategoryRule> defaultCategoryRules() {
        Map<String, CategoryRule> rules = new LinkedHashMap<>();
        rules.put(CATEGORY_COOKED_BAKERY, new CategoryRule(4, 2));
        rules.put(CATEGORY_PERISHABLE_DAIRY, new CategoryRule(36, 12));
        rules.put(CATEGORY_PACKAGED_DRY, new CategoryRule(144, 36));
        return rules;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getExpiryThresholdDays() {
        return expiryThresholdDays;
    }

    public void setExpiryThresholdDays(int expiryThresholdDays) {
        this.expiryThresholdDays = expiryThresholdDays;
    }

    public int getTicketCollectionWindowHours() {
        return ticketCollectionWindowHours;
    }

    public void setTicketCollectionWindowHours(int ticketCollectionWindowHours) {
        this.ticketCollectionWindowHours = ticketCollectionWindowHours;
    }

    public Map<String, CategoryRule> getCategoryRules() {
        return categoryRules;
    }

    public void setCategoryRules(Map<String, CategoryRule> categoryRules) {
        this.categoryRules = categoryRules;
    }

    /** Per-category expiry threshold (hours) and QR ticket collection window (hours). */
    public static class CategoryRule {

        private int expiryThresholdHours;
        private int collectionWindowHours;

        public CategoryRule() {
        }

        public CategoryRule(int expiryThresholdHours, int collectionWindowHours) {
            this.expiryThresholdHours = expiryThresholdHours;
            this.collectionWindowHours = collectionWindowHours;
        }

        public int getExpiryThresholdHours() {
            return expiryThresholdHours;
        }

        public void setExpiryThresholdHours(int expiryThresholdHours) {
            this.expiryThresholdHours = expiryThresholdHours;
        }

        public int getCollectionWindowHours() {
            return collectionWindowHours;
        }

        public void setCollectionWindowHours(int collectionWindowHours) {
            this.collectionWindowHours = collectionWindowHours;
        }
    }
}
