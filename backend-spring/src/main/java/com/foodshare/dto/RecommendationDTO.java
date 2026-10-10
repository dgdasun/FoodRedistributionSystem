package com.foodshare.dto;

public class RecommendationDTO {
    private String requestId;
    private String beneficiaryId;
    private String beneficiaryName;
    private double score;

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
}
