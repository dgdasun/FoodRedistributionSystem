package com.foodshare.dto;

import java.util.List;
import java.util.Map;

/** Payload sent to the Python AI service for surplus prediction. */
public class PredictionRequestDTO {
    private int daysAhead;
    private List<Map<String, Object>> history; // {category, date, quantityKg}

    public PredictionRequestDTO() {
    }

    public PredictionRequestDTO(int daysAhead, List<Map<String, Object>> history) {
        this.daysAhead = daysAhead;
        this.history = history;
    }

    public int getDaysAhead() {
        return daysAhead;
    }

    public void setDaysAhead(int daysAhead) {
        this.daysAhead = daysAhead;
    }

    public List<Map<String, Object>> getHistory() {
        return history;
    }

    public void setHistory(List<Map<String, Object>> history) {
        this.history = history;
    }
}
