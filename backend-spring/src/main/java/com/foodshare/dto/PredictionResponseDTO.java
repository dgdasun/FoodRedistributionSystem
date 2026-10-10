package com.foodshare.dto;

import java.util.Map;

public class PredictionResponseDTO {
    private Map<String, Double> predictions;
    private double totalPredictedKg;
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

    public double getTotalPredictedKg() {
        return totalPredictedKg;
    }

    public void setTotalPredictedKg(double totalPredictedKg) {
        this.totalPredictedKg = totalPredictedKg;
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
