package com.foodshare.service;

import com.foodshare.model.Settings;
import com.foodshare.model.Settings.CategoryRule;
import com.foodshare.repository.SettingsRepository;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;

@Service
public class SettingsService {

    private final SettingsRepository settingsRepository;

    public SettingsService(SettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
    }

    public Settings getSettings() {
        return settingsRepository.findAll().stream().findFirst().orElseGet(() -> settingsRepository.save(new Settings()));
    }

    public Settings updateSettings(Integer expiryThresholdDays, Integer ticketCollectionWindowHours) {
        Settings settings = getSettings();
        if (expiryThresholdDays != null) settings.setExpiryThresholdDays(expiryThresholdDays);
        if (ticketCollectionWindowHours != null) settings.setTicketCollectionWindowHours(ticketCollectionWindowHours);
        return settingsRepository.save(settings);
    }

    /** Replaces (merges into) the category-based rule map, e.g. from the admin Category Rules panel. */
    public Settings updateCategoryRules(Map<String, CategoryRule> categoryRules) {
        Settings settings = getSettings();
        if (categoryRules != null) settings.setCategoryRules(categoryRules);
        return settingsRepository.save(settings);
    }

    /**
     * Maps a free-text donation category (e.g. "Bakery", "Dairy", "Packaged Goods") to one of the
     * configured category-rule keys, or null if it should fall back to the global defaults.
     */
    public String resolveCategoryKey(String rawCategory) {
        if (rawCategory == null || rawCategory.isBlank()) return null;
        String c = rawCategory.toLowerCase(Locale.ROOT);

        if (c.contains("cook") || c.contains("bake") || c.contains("bread") || c.contains("meal") || c.contains("hot food")) {
            return Settings.CATEGORY_COOKED_BAKERY;
        }
        if (c.contains("dairy") || c.contains("milk") || c.contains("veg") || c.contains("fruit") || c.contains("produce") || c.contains("perishable")) {
            return Settings.CATEGORY_PERISHABLE_DAIRY;
        }
        if (c.contains("pack") || c.contains("dry") || c.contains("canned") || c.contains("ration") || c.contains("grain")) {
            return Settings.CATEGORY_PACKAGED_DRY;
        }
        return null;
    }

    /** Expiry threshold in whole days for the given donation category, falling back to the global default. */
    public int resolveExpiryThresholdDays(String rawCategory) {
        CategoryRule rule = ruleFor(rawCategory);
        if (rule == null) return getSettings().getExpiryThresholdDays();
        return Math.max(1, (int) Math.ceil(rule.getExpiryThresholdHours() / 24.0));
    }

    /** QR ticket collection window in hours for the given donation category, falling back to the global default. */
    public int resolveCollectionWindowHours(String rawCategory) {
        CategoryRule rule = ruleFor(rawCategory);
        if (rule == null) return getSettings().getTicketCollectionWindowHours();
        return rule.getCollectionWindowHours();
    }

    private CategoryRule ruleFor(String rawCategory) {
        String key = resolveCategoryKey(rawCategory);
        if (key == null) return null;
        Settings settings = getSettings();
        Map<String, CategoryRule> rules = settings.getCategoryRules();
        return rules == null ? null : rules.get(key);
    }
}
