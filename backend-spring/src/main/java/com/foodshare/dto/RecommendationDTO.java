package com.foodshare.dto;

import java.util.Map;

public class RecommendationDTO {
    private String requestId;
    private String beneficiaryId;
    private String beneficiaryName;
    private double score;
    // Context from the request itself, plus the AI's per-factor breakdown (empty when the AI service is down).
    private String urgency;
    private Double distanceKm;
    private Double quantityKg;
    private Map<String, Double> factors = Map.of();
    private Map<String, Double> weights = Map.of();

    public RecommendationDTO() {
    }

    public RecommendationDTO(String requestId, String beneficiaryId, String beneficiaryName, double score) {
        this.requestId = requestId;
        this.beneficiaryId = beneficiaryId;
        this.beneficiaryName = beneficiaryName;
        this.score = score;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public String getBeneficiaryId() {
        return beneficiaryId;
    }

    public void setBeneficiaryId(String beneficiaryId) {
        this.beneficiaryId = beneficiaryId;
    }

    public String getBeneficiaryName() {
        return beneficiaryName;
    }

    public void setBeneficiaryName(String beneficiaryName) {
        this.beneficiaryName = beneficiaryName;
    }

    public double getScore() {
        return score;
    }

    public void setScore(double score) {
        this.score = score;
    }

    public String getUrgency() {
        return urgency;
    }

    public void setUrgency(String urgency) {
        this.urgency = urgency;
    }

    public Double getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(Double distanceKm) {
        this.distanceKm = distanceKm;
    }

    public Double getQuantityKg() {
        return quantityKg;
    }

    public void setQuantityKg(Double quantityKg) {
        this.quantityKg = quantityKg;
    }

    public Map<String, Double> getFactors() {
        return factors;
    }

    public void setFactors(Map<String, Double> factors) {
        this.factors = factors;
    }

    public Map<String, Double> getWeights() {
        return weights;
    }

    public void setWeights(Map<String, Double> weights) {
        this.weights = weights;
    }
}
