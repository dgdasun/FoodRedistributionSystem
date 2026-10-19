package com.foodshare.controller;

import com.foodshare.model.Settings;
import com.foodshare.model.Settings.CategoryRule;
import com.foodshare.service.SettingsService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public Map<String, Object> get() {
        return Map.of("settings", settingsService.getSettings());
    }

    @PatchMapping
    public Map<String, Object> update(@RequestBody Map<String, Integer> body) {
        Settings updated = settingsService.updateSettings(body.get("expiryThresholdDays"), body.get("ticketCollectionWindowHours"));
        return Map.of("settings", updated);
    }

    @PatchMapping("/category-rules")
    public Map<String, Object> updateCategoryRules(@RequestBody Map<String, CategoryRule> categoryRules) {
        Settings updated = settingsService.updateCategoryRules(categoryRules);
        return Map.of("settings", updated);
    }
}
