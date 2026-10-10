package com.foodshare.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "requests")
public class FoodRequest {

    @Id
    private String id;

    private String itemId;
    private String beneficiaryId;
    private Double quantityKg;

    /** critical | high | medium | low */
    private String urgency = "medium";

    private Double distanceKm = 10.0;

    /** pending | counter_offer | approved | rejected | cancelled */
    private String status = "pending";

    /** Quantity the donor actually approved; null until the donor acts. Lower than quantityKg means a counter-offer. */
    private Double approvedQuantityKg;

    /** Donor-supplied reason shown to the beneficiary when the request is rejected. */
    private String rejectionReason;

    private Instant createdAt = Instant.now();

    public FoodRequest() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getItemId() {
        return itemId;
    }

    public void setItemId(String itemId) {
        this.itemId = itemId;
    }

    public String getBeneficiaryId() {
        return beneficiaryId;
    }

    public void setBeneficiaryId(String beneficiaryId) {
        this.beneficiaryId = beneficiaryId;
    }

    public Double getQuantityKg() {
        return quantityKg;
    }

    public void setQuantityKg(Double quantityKg) {
        this.quantityKg = quantityKg;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Double getApprovedQuantityKg() {
        return approvedQuantityKg;
    }

    public void setApprovedQuantityKg(Double approvedQuantityKg) {
        this.approvedQuantityKg = approvedQuantityKg;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }
}
