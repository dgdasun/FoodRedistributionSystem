package com.foodshare.dto;

import java.util.List;
import java.util.Map;

public class PredictionResponseDTO {
    private Map<String, Double> predictions;
    /**
     * Day-by-day forecast per category: category -> [{date, quantityKg}, ...].
     * Only the trained model produces this; null when the simple trend
     * fallback answered.
     */
    private Map<String, List<Map<String, Object>>> daily;
    private double totalPredictedKg;
    /** Surplus recorded over the same number of most recent history days; null without enough history. */
    private Double previousPeriodKg;
    private String note;
    private int daysAhead;

    public PredictionResponseDTO() {
    }

    public Map<String, Double> getPredictions() {
        return predictions;
    }

    public void setPredictions(Map<String, Double> predictions) {
        this.predictions = predictions;
    }

    public Map<String, List<Map<String, Object>>> getDaily() {
        return daily;
    }

    public void setDaily(Map<String, List<Map<String, Object>>> daily) {
        this.daily = daily;
    }

    public double getTotalPredictedKg() {
        return totalPredictedKg;
    }

    public void setTotalPredictedKg(double totalPredictedKg) {
        this.totalPredictedKg = totalPredictedKg;
    }

    public Double getPreviousPeriodKg() {
        return previousPeriodKg;
    }

    public void setPreviousPeriodKg(Double previousPeriodKg) {
        this.previousPeriodKg = previousPeriodKg;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public int getDaysAhead() {
        return daysAhead;
    }

    public void setDaysAhead(int daysAhead) {
        this.daysAhead = daysAhead;
    }
}
