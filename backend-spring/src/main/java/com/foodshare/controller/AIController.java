package com.foodshare.controller;

import com.foodshare.dto.PredictionResponseDTO;
import com.foodshare.model.HistoryPoint;
import com.foodshare.model.User;
import com.foodshare.repository.HistoryPointRepository;
import com.foodshare.repository.UserRepository;
import com.foodshare.service.AIClientService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * Thin proxy controller: the actual forecasting math runs in the Python
 * AI/ML microservice (see /ai-service). This controller fetches the
 * historical inventory data this instance owns from MongoDB and forwards it
 * to AIClientService, which talks to the Python service over HTTP.
 *
 * A donor's forecast is built from their own history only; without a
 * donorId the forecast covers every donor, which is the admin's view.
 */
@RestController
@RequestMapping("/api/ai")
public class AIController {

    private final AIClientService aiClientService;
    private final HistoryPointRepository historyPointRepository;
    private final UserRepository userRepository;

    public AIController(AIClientService aiClientService, HistoryPointRepository historyPointRepository,
                        UserRepository userRepository) {
        this.aiClientService = aiClientService;
        this.historyPointRepository = historyPointRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/predict")
    public PredictionResponseDTO predict(@RequestParam(defaultValue = "7") int daysAhead,
                                         @RequestParam(required = false) String donorId) {
        List<HistoryPoint> history = donorId != null
                ? historyPointRepository.findByDonorId(donorId)
                : historyPointRepository.findAll();
        return aiClientService.predictSurplus(history, daysAhead);
    }

    @GetMapping("/history")
    public Map<String, Object> history(@RequestParam(required = false) String donorId) {
        return Map.of("history", donorId != null
                ? historyPointRepository.findByDonorId(donorId)
                : historyPointRepository.findAll());
    }

    /**
     * Platform-wide planning view for admins: the combined forecast, which
     * donors it comes from (so pickups can be planned), and how it compares
     * day by day with what verified beneficiaries can take in.
     */
    @GetMapping("/admin/overview")
    public Map<String, Object> adminOverview(@RequestParam(defaultValue = "7") int daysAhead) {
        List<HistoryPoint> all = historyPointRepository.findAll();
        PredictionResponseDTO forecast = aiClientService.predictSurplus(all, daysAhead);

        Map<String, User> users = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        Map<String, List<HistoryPoint>> byDonor = new TreeMap<>();
        for (HistoryPoint h : all) {
            if (h.getDonorId() != null) byDonor.computeIfAbsent(h.getDonorId(), k -> new ArrayList<>()).add(h);
        }
        List<Map<String, Object>> donors = new ArrayList<>();
        for (Map.Entry<String, List<HistoryPoint>> e : byDonor.entrySet()) {
            PredictionResponseDTO f = aiClientService.predictSurplus(e.getValue(), daysAhead);
            Map<String, Double> perDay = dailyTotals(f);
            Map.Entry<String, Double> peak = perDay.entrySet().stream()
                    .max(Map.Entry.comparingByValue()).orElse(null);
            String topCategory = f.getPredictions() == null ? null : f.getPredictions().entrySet().stream()
                    .max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(null);

            User u = users.get(e.getKey());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("donorId", e.getKey());
            row.put("name", u == null ? "Unknown donor"
                    : u.getOrganizationName() != null ? u.getOrganizationName() : u.getName());
            row.put("location", u == null ? null : u.getLocation());
            row.put("totalKg", f.getTotalPredictedKg());
            row.put("previousPeriodKg", f.getPreviousPeriodKg());
            row.put("topCategory", topCategory);
            row.put("peakDate", peak == null ? null : peak.getKey());
            row.put("peakKg", peak == null ? null : round(peak.getValue()));
            donors.add(row);
        }
        donors.sort(Comparator.comparingDouble((Map<String, Object> r) -> (Double) r.get("totalKg")).reversed());

        // Daily intake each verified beneficiary says it can handle, summed.
        List<User> beneficiaries = userRepository
                .findByRoleInAndVerifiedOrderByCreatedAtDesc(List.of("beneficiary"), true);
        double capacity = beneficiaries.stream()
                .mapToDouble(u -> u.getHandlingCapacityKg() == null ? 0 : u.getHandlingCapacityKg()).sum();
        List<Map<String, Object>> days = new ArrayList<>();
        dailyTotals(forecast).forEach((date, kg) -> {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("date", date);
            d.put("surplusKg", round(kg));
            d.put("capacityKg", round(capacity));
            d.put("shortfallKg", round(Math.max(0, kg - capacity)));
            days.add(d);
        });

        Map<String, Object> capacityView = new LinkedHashMap<>();
        capacityView.put("dailyCapacityKg", round(capacity));
        capacityView.put("organizations", beneficiaries.size());
        capacityView.put("days", days);

        // What the priority engine sees as "recently served": it lowers the
        // score of organizations with more allocations in the last 30 days.
        List<Map<String, Object>> fairness = new ArrayList<>();
        for (User u : beneficiaries) {
            Map<String, Object> f = new LinkedHashMap<>();
            f.put("id", u.getId());
            f.put("name", u.getOrganizationName() != null ? u.getOrganizationName() : u.getName());
            f.put("allocationsLast30Days", u.getAllocationsLast30Days() == null ? 0 : u.getAllocationsLast30Days());
            fairness.add(f);
        }
        fairness.sort(Comparator.comparingInt((Map<String, Object> f) -> (Integer) f.get("allocationsLast30Days")).reversed());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("forecast", forecast);
        body.put("donors", donors);
        body.put("donorCount", donors.size());
        body.put("capacity", capacityView);
        body.put("fairness", fairness);
        return body;
    }

    /* Admin AI Insights > Model tab. /model and /model/retrain below stay for existing callers. */

    @GetMapping("/admin/model-info")
    public Map<String, Object> adminModelInfo() {
        return aiClientService.modelInfo();
    }

    @GetMapping("/admin/health")
    public Map<String, Object> adminHealth() {
        return aiClientService.health();
    }

    @PostMapping("/admin/retrain")
    public ResponseEntity<Map<String, Object>> adminRetrain() {
        try {
            return ResponseEntity.ok(aiClientService.retrainModel());
        } catch (RestClientException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "error", "Retraining failed: the AI service is offline or returned an error. Forecasts keep using the current model."));
        }
    }

    @GetMapping("/model")
    public Map<String, Object> model() {
        return aiClientService.modelInfo();
    }

    @PostMapping("/model/retrain")
    public Map<String, Object> retrain() {
        return aiClientService.retrainModel();
    }

    /** date -> kg across all categories, in date order. Empty when only category totals are known. */
    private static Map<String, Double> dailyTotals(PredictionResponseDTO f) {
        Map<String, Double> out = new TreeMap<>();
        if (f == null || f.getDaily() == null) return out;
        for (List<Map<String, Object>> rows : f.getDaily().values()) {
            for (Map<String, Object> r : rows) {
                if (r.get("quantityKg") instanceof Number q) out.merge(String.valueOf(r.get("date")), q.doubleValue(), Double::sum);
            }
        }
        return out;
    }

    private static double round(double v) {
        return Math.round(v * 100) / 100.0;
    }
}
