package com.foodshare.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Document(collection = "tickets")
public class Ticket {

    @Id
    private String id;

    private String requestId;
    private String itemId;
    private String beneficiaryId;
    private Double quantityKg;
    private String pickupLocation;
    private LocalDate pickupDate;
    private String pickupTime;

    /** pending | collected | expired */
    private String status = "pending";

    private String qrCode;

    private Instant createdAt = Instant.now();
    private Instant updatedAt;

    /** When this ticket's QR collection window closes, derived from the item's category rule at creation time. */
    private Instant expiresAt;

    public Ticket() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
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

    public String getPickupLocation() {
        return pickupLocation;
    }

    public void setPickupLocation(String pickupLocation) {
        this.pickupLocation = pickupLocation;
    }

    // Tickets used to be stamped with a placeholder "tomorrow, 10:00 AM". The
    // real deadline is the end of the collection window, so whenever that is
    // known it wins - which also corrects tickets saved with the placeholder.
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH);

    public LocalDate getPickupDate() {
        return expiresAt != null ? LocalDate.ofInstant(expiresAt, ZoneId.systemDefault()) : pickupDate;
    }

    public void setPickupDate(LocalDate pickupDate) {
        this.pickupDate = pickupDate;
    }

    public String getPickupTime() {
        return expiresAt != null ? TIME_FORMAT.format(expiresAt.atZone(ZoneId.systemDefault())) : pickupTime;
    }

    public void setPickupTime(String pickupTime) {
        this.pickupTime = pickupTime;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getQrCode() {
        return qrCode;
    }

    public void setQrCode(String qrCode) {
        this.qrCode = qrCode;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    /**
     * Older (seeded) tickets have no window end; without one they would stay
     * "active" forever, so their window closes at the end of the pickup day.
     */
    public Instant getExpiresAt() {
        if (expiresAt != null || pickupDate == null) return expiresAt;
        return pickupDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }
}
