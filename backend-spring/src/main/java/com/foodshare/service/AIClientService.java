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
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
    private final String aiServiceBaseUrl;

    public AIClientService(RestTemplate restTemplate,
                            @Value("${foodshare.ai-service.base-url}") String aiServiceBaseUrl) {
        this.restTemplate = restTemplate;
        this.aiServiceBaseUrl = aiServiceBaseUrl;
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
                        ranking.add(new RecommendationDTO(
                                String.valueOf(m.get("requestId")),
                                String.valueOf(m.get("beneficiaryId")),
                                String.valueOf(m.get("beneficiaryName")),
                                m.get("score") == null ? 0.0 : Double.parseDouble(m.get("score").toString())
                        ));
                    }
                }
            }
            return ranking;
        } catch (RestClientException e) {
            log.warn("AI service unreachable for priority ranking, falling back to first-come-first-served: {}", e.getMessage());
            return fallbackRanking(pendingRequests);
        }
    }

    /**
     * AI-Based Surplus Prediction Module.
     * Sends recent (dummy) inventory history to the Python service, which
     * fits a lightweight per-category trend model (see ai-service/app/ml)
     * and returns forecasted surplus quantities for the requested horizon.
     */
    public PredictionResponseDTO predictSurplus(List<HistoryPoint> history, int daysAhead) {
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
    private List<RecommendationDTO> fallbackRanking(List<FoodRequest> pendingRequests) {
        List<RecommendationDTO> ranking = new ArrayList<>();
        for (FoodRequest r : pendingRequests) {
            ranking.add(new RecommendationDTO(r.getId(), r.getBeneficiaryId(), "Unknown", 0.0));
        }
        return ranking;
    }
}
