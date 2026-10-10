package com.foodshare.controller;

import com.foodshare.dto.PredictionResponseDTO;
import com.foodshare.model.HistoryPoint;
import com.foodshare.repository.HistoryPointRepository;
import com.foodshare.service.AIClientService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Thin proxy controller: the actual forecasting math runs in the Python
 * AI/ML microservice (see /ai-service). This controller fetches the
 * historical inventory data this instance owns from MongoDB and forwards it
 * to AIClientService, which talks to the Python service over HTTP.
 */
@RestController
@RequestMapping("/api/ai")
public class AIController {

    private final AIClientService aiClientService;
    private final HistoryPointRepository historyPointRepository;

    public AIController(AIClientService aiClientService, HistoryPointRepository historyPointRepository) {
        this.aiClientService = aiClientService;
        this.historyPointRepository = historyPointRepository;
    }

    @GetMapping("/predict")
    public PredictionResponseDTO predict(@RequestParam(defaultValue = "7") int daysAhead) {
        List<HistoryPoint> history = historyPointRepository.findAll();
        return aiClientService.predictSurplus(history, daysAhead);
    }

    @GetMapping("/history")
    public Map<String, Object> history() {
        return Map.of("history", historyPointRepository.findAll());
    }
}
