package com.foodshare.service;

import com.foodshare.dto.PredictionRequestDTO;
import com.foodshare.dto.PredictionResponseDTO;
import com.foodshare.dto.PriorityRequestDTO;
import com.foodshare.dto.RecommendationDTO;
import com.foodshare.model.Donation;
import com.foodshare.model.FoodRequest;
import com.foodshare.model.HistoryPoint;
import com.foodshare.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * This is the integration point between the Java/Spring Boot backend and the
 * standalone Python AI/ML microservice (see /ai-service).
 *
 * Spring Boot owns all persistence (MongoDB) and business rules. Whenever an
 * AI decision is needed - ranking beneficiary requests or forecasting
 * surplus food - this service assembles the relevant data from MongoDB,
 * POSTs it to the Python service's REST API, and maps the JSON response back
 * into typed Java objects for the controllers to return to the frontend.
 *
 * The AI service's base URL is externalised via `foodshare.ai-service.base-url`
 * (see application.yml / AI_SERVICE_URL env var), so it can run on a
 * different host/container/port without any code changes here.
 */
@Service
public class AIClientService {

    private static final Logger log = LoggerFactory.getLogger(AIClientService.class);

    private final RestTemplate restTemplate;
    /** Retraining fits several models on the full dataset, well past the shared 10s read timeout. */
    private final RestTemplate trainingRestTemplate;
    private final String aiServiceBaseUrl;

    public AIClientService(RestTemplate restTemplate,
                            @Value("${foodshare.ai-service.base-url}") String aiServiceBaseUrl) {
        this.restTemplate = restTemplate;
        this.aiServiceBaseUrl = aiServiceBaseUrl;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(180_000);
        this.trainingRestTemplate = new RestTemplate(factory);
    }

    /**
     * AI-Assisted Beneficiary Recommendation / Priority-Based Smart Allocation.
     * Sends the item plus its pending requests and the requesting
     * organizations' profiles to the Python service, which returns a ranked
     * list scored by urgency, distance, organization size/capacity and
     * recent allocation history.
     */
    public List<RecommendationDTO> rankRequests(Donation item, List<FoodRequest> pendingRequests, List<User> beneficiaries) {
        List<Map<String, Object>> requestPayload = new ArrayList<>();
        for (FoodRequest r : pendingRequests) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("itemId", r.getItemId());
            m.put("beneficiaryId", r.getBeneficiaryId());
            m.put("quantityKg", r.getQuantityKg());
            m.put("urgency", r.getUrgency());
            m.put("distanceKm", r.getDistanceKm());
            m.put("status", r.getStatus());
            requestPayload.add(m);
        }

        List<Map<String, Object>> beneficiaryPayload = new ArrayList<>();
        for (User u : beneficiaries) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("organizationName", u.getOrganizationName());
            m.put("organizationSize", u.getOrganizationSize());
            m.put("handlingCapacityKg", u.getHandlingCapacityKg());
            m.put("allocationsLast30Days", u.getAllocationsLast30Days());
            beneficiaryPayload.add(m);
        }

        Map<String, Object> itemPayload = new HashMap<>();
        itemPayload.put("id", item.getId());
        itemPayload.put("name", item.getName());
        itemPayload.put("category", item.getCategory());

        PriorityRequestDTO payload = new PriorityRequestDTO(itemPayload, requestPayload, beneficiaryPayload);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                    aiServiceBaseUrl + "/recommend/priority", payload, Map.class);

            List<RecommendationDTO> ranking = new ArrayList<>();
            if (response != null && response.get("ranking") instanceof List<?> rawList) {
                for (Object o : rawList) {
                    if (o instanceof Map<?, ?> m) {
                        RecommendationDTO dto = new RecommendationDTO(
                                String.valueOf(m.get("requestId")),
                                String.valueOf(m.get("beneficiaryId")),
                                String.valueOf(m.get("beneficiaryName")),
                                m.get("score") == null ? 0.0 : Double.parseDouble(m.get("score").toString())
                        );
                        dto.setFactors(toDoubleMap(m.get("factors")));
                        dto.setWeights(toDoubleMap(m.get("weights")));
                        ranking.add(dto);
                    }
                }
            }
            addRequestContext(ranking, pendingRequests);
            return ranking;
        } catch (RestClientException e) {
            log.warn("AI service unreachable for priority ranking, falling back to first-come-first-served: {}", e.getMessage());
            List<RecommendationDTO> ranking = fallbackRanking(pendingRequests, beneficiaries);
            addRequestContext(ranking, pendingRequests);
            return ranking;
        }
    }

    /**
     * AI-Based Surplus Prediction Module.
     *
     * Step 1: try the TRAINED machine-learning model (RandomForest, trained on
     *         the Kaggle Store Item Demand dataset) via /predict/surplus-ml.
     * Step 2: if that is not available, fall back to the simple per-category
     *         Linear Regression trend model via /predict/surplus.
     *
     * The response format (PredictionResponseDTO) is the same either way, so
     * the frontend dashboard does not need any change.
     */
    public PredictionResponseDTO predictSurplus(List<HistoryPoint> history, int daysAhead) {
        PredictionResponseDTO result;
        try {
            result = predictSurplusWithTrainedModel(history, daysAhead);
        } catch (Exception e) {
            log.warn("Trained ML model unavailable, using simple trend model instead: {}", e.getMessage());
            result = predictSurplusSimpleTrend(history, daysAhead);
        }
        if (result != null) result.setPreviousPeriodKg(previousPeriodKg(history, daysAhead));
        return result;
    }

    /**
     * Surplus actually recorded over the last {@code days} days of history, so
     * the forecast can be shown as up or down against it. Counts the most
     * recent recorded days rather than the calendar days before today, so a
     * history that stopped a while ago still compares like with like. Null
     * when there are not enough days to compare.
     */
    private static Double previousPeriodKg(List<HistoryPoint> history, int days) {
        TreeSet<LocalDate> dates = new TreeSet<>();
        for (HistoryPoint h : history) dates.add(h.getDate());
        if (dates.size() < days) return null;
        LocalDate from = dates.descendingSet().stream().skip(days - 1L).findFirst().orElseThrow();
        double total = 0;
        for (HistoryPoint h : history) {
            if (!h.getDate().isBefore(from) && h.getQuantityKg() != null) total += h.getQuantityKg();
        }
        return Math.round(total * 100) / 100.0;
    }

    /** Which model is serving forecasts, its test error and when it was trained. */
    public Map<String, Object> modelInfo() {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> info = restTemplate.getForObject(aiServiceBaseUrl + "/model/info", Map.class);
            return info != null ? info : Map.of("available", false);
        } catch (RestClientException e) {
            log.warn("AI service unreachable for model info: {}", e.getMessage());
            return Map.of("available", false, "error", "AI service unavailable");
        }
    }

    /**
     * Whether the Python service answers its /health check. Offline is a
     * normal answer here, not an error: forecasts then come from the simple
     * trend fallback (or none at all), and the admin page says so.
     */
    public Map<String, Object> health() {
        long started = System.currentTimeMillis();
        try {
            Map<?, ?> body = restTemplate.getForObject(aiServiceBaseUrl + "/health", Map.class);
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("online", body != null && "ok".equals(String.valueOf(body.get("status"))));
            out.put("service", body == null ? null : body.get("service"));
            out.put("responseMs", System.currentTimeMillis() - started);
            out.put("url", aiServiceBaseUrl);
            return out;
        } catch (RestClientException e) {
            log.warn("AI service health check failed: {}", e.getMessage());
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("online", false);
            out.put("error", e.getMessage());
            out.put("url", aiServiceBaseUrl);
            return out;
        }
    }

    /** Retrains the surplus model on the AI service's dataset and returns the new model info. */
    public Map<String, Object> retrainModel() {
        @SuppressWarnings("unchecked")
        Map<String, Object> info = trainingRestTemplate.postForObject(aiServiceBaseUrl + "/model/retrain", null, Map.class);
        return info != null ? info : Map.of("available", false);
    }

    /** Calls the trained RandomForest model once per food category. */
    private PredictionResponseDTO predictSurplusWithTrainedModel(List<HistoryPoint> history, int daysAhead) {
        // 1) group the MongoDB history by category
        Map<String, List<HistoryPoint>> byCategory = new TreeMap<>();
        for (HistoryPoint h : history) {
            byCategory.computeIfAbsent(h.getCategory(), k -> new ArrayList<>()).add(h);
        }

        Map<String, Double> predictions = new LinkedHashMap<>();
        Map<String, List<Map<String, Object>>> daily = new LinkedHashMap<>();
        double total = 0;
        String modelName = "ML";

        for (Map.Entry<String, List<HistoryPoint>> entry : byCategory.entrySet()) {
            // 2) oldest -> newest daily quantities; several donors can record
            //    the same day, and the model expects one value per day
            Map<LocalDate, Double> perDay = new TreeMap<>();
            for (HistoryPoint h : entry.getValue()) {
                if (h.getQuantityKg() != null) perDay.merge(h.getDate(), h.getQuantityKg(), Double::sum);
            }
            if (perDay.isEmpty()) continue;
            List<Double> quantities = new ArrayList<>(perDay.values());

            // 3) ask the Python service
            Map<String, Object> body = new HashMap<>();
            body.put("category", entry.getKey());
            body.put("history", quantities);
            body.put("daysAhead", daysAhead);

            Map<?, ?> response = restTemplate.postForObject(
                    aiServiceBaseUrl + "/predict/surplus-ml", body, Map.class);
            if (response == null || !(response.get("totalKg") instanceof Number totalKg)) {
                throw new IllegalStateException("Empty response from /predict/surplus-ml");
            }
            if (response.get("model") != null) {
                modelName = String.valueOf(response.get("model"));
            }

            // 4) collect the result
            double kg = Math.round(totalKg.doubleValue() * 100) / 100.0;
            predictions.put(entry.getKey(), kg);
            total += kg;

            // 5) keep the day-by-day breakdown so donors can see WHEN surplus lands
            List<Map<String, Object>> days = new ArrayList<>();
            if (response.get("daily") instanceof List<?> rows) {
                for (Object row : rows) {
                    if (row instanceof Map<?, ?> r && r.get("quantityKg") instanceof Number q) {
                        Map<String, Object> day = new LinkedHashMap<>();
                        day.put("date", String.valueOf(r.get("date")));
                        day.put("quantityKg", q.doubleValue());
                        days.add(day);
                    }
                }
            }
            daily.put(entry.getKey(), days);
        }

        PredictionResponseDTO result = new PredictionResponseDTO();
        result.setPredictions(predictions);
        result.setDaily(daily);
        result.setTotalPredictedKg(Math.round(total * 100) / 100.0);
        result.setDaysAhead(daysAhead);
        result.setNote("Forecast by trained " + modelName + " model (Kaggle Store Item Demand dataset).");
        return result;
    }

    /** Original simple Linear Regression trend model - used as a backup. */
    private PredictionResponseDTO predictSurplusSimpleTrend(List<HistoryPoint> history, int daysAhead) {
        List<Map<String, Object>> historyPayload = new ArrayList<>();
        for (HistoryPoint h : history) {
            Map<String, Object> m = new HashMap<>();
            m.put("category", h.getCategory());
            m.put("date", h.getDate().toString());
            m.put("quantityKg", h.getQuantityKg());
            historyPayload.add(m);
        }

        PredictionRequestDTO payload = new PredictionRequestDTO(daysAhead, historyPayload);

        try {
            PredictionResponseDTO response = restTemplate.postForObject(
                    aiServiceBaseUrl + "/predict/surplus", payload, PredictionResponseDTO.class);
            return response;
        } catch (RestClientException e) {
            log.warn("AI service unreachable for surplus prediction: {}", e.getMessage());
            PredictionResponseDTO fallback = new PredictionResponseDTO();
            fallback.setPredictions(Map.of());
            fallback.setTotalPredictedKg(0);
            fallback.setDaysAhead(daysAhead);
            fallback.setNote("AI service unavailable - showing no forecast. Start the ai-service (see README) to enable predictions.");
            return fallback;
        }
    }

    /** Simple non-AI fallback so the platform still functions if the Python service is down. */
    private List<RecommendationDTO> fallbackRanking(List<FoodRequest> pendingRequests, List<User> beneficiaries) {
        Map<String, String> names = new HashMap<>();
        for (User u : beneficiaries) {
            names.put(u.getId(), u.getOrganizationName() != null ? u.getOrganizationName() : u.getName());
        }
        List<RecommendationDTO> ranking = new ArrayList<>();
        for (FoodRequest r : pendingRequests) {
            String name = names.get(r.getBeneficiaryId());
            ranking.add(new RecommendationDTO(r.getId(), r.getBeneficiaryId(), name != null ? name : "Unknown", 0.0));
        }
        return ranking;
    }

    /** Copies urgency, distance and quantity from each ranked request so the UI can show them alongside the score. */
    private void addRequestContext(List<RecommendationDTO> ranking, List<FoodRequest> pendingRequests) {
        Map<String, FoodRequest> byId = new HashMap<>();
        for (FoodRequest r : pendingRequests) {
            byId.put(r.getId(), r);
        }
        for (RecommendationDTO dto : ranking) {
            FoodRequest r = byId.get(dto.getRequestId());
            if (r == null) continue;
            dto.setUrgency(r.getUrgency());
            dto.setDistanceKm(r.getDistanceKm());
            dto.setQuantityKg(r.getQuantityKg());
        }
    }

    private static Map<String, Double> toDoubleMap(Object raw) {
        Map<String, Double> out = new HashMap<>();
        if (raw instanceof Map<?, ?> m) {
            m.forEach((k, v) -> {
                if (v instanceof Number n) out.put(String.valueOf(k), n.doubleValue());
            });
        }
        return out;
    }
}