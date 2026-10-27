package com.foodshare.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;

@Document(collection = "donations")
public class Donation {

    @Id
    private String id;

    private String donorId;
    private String name;
    private String category;
    /**
     * The category exactly as typed in a bulk upload, kept only when it was
     * corrected to a canonical one ("Dary" -> "Dairy"); null otherwise.
     */
    private String originalCategory;
    private String batchNumber;
    /**
     * Quantity still available, in {@link #unit} - despite the legacy name it is
     * not always kilograms. Requests reserve stock out of it, so it shrinks.
     */
    private Double quantityKg;

    /** kg | liters | items (see DonationUnits). Older records predate the field and read as kg. */
    private String unit = "kg";

    /**
     * What the donor originally listed, in {@link #unit}. Kept separately because
     * quantityKg drops as requests reserve stock; null on records listed before
     * this field existed.
     */
    private Double initialQuantity;

    /**
     * For unit "items" only: how much one packet holds, in {@link #packUnit}
     * (kg or liters). Lets beneficiaries judge how far the packets go - "20
     * items" alone says nothing about whether they feed 5 people or 50.
     */
    private Double packSize;

    /** kg | liters - the unit of {@link #packSize}; null unless unit is "items". */
    private String packUnit;
    private LocalDate expiryDate;
    private String pickupLocation;
    private Double latitude;
    private Double longitude;

    /** donation | expired */
    private String listingType = "donation";

    /**
     * surplus | expired | reserved | collected
     *
     * "fresh" is intentionally absent: this platform carries only near-expiry
     * surplus and expired stock, and DonationService refuses anything else at
     * the point of listing.
     */
    private String status = "surplus";

    private boolean published = false;

    private Instant createdAt = Instant.now();

    public Donation() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDonorId() {
        return donorId;
    }

    public void setDonorId(String donorId) {
        this.donorId = donorId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getOriginalCategory() {
        return originalCategory;
    }

    public void setOriginalCategory(String originalCategory) {
        this.originalCategory = originalCategory;
    }

    public String getBatchNumber() {
        return batchNumber;
    }

    public void setBatchNumber(String batchNumber) {
        this.batchNumber = batchNumber;
    }

    public Double getQuantityKg() {
        return quantityKg;
    }

    public void setQuantityKg(Double quantityKg) {
        this.quantityKg = quantityKg;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public Double getInitialQuantity() {
        return initialQuantity;
    }

    public void setInitialQuantity(Double initialQuantity) {
        this.initialQuantity = initialQuantity;
    }

    public Double getPackSize() {
        return packSize;
    }

    public void setPackSize(Double packSize) {
        this.packSize = packSize;
    }

    public String getPackUnit() {
        return packUnit;
    }

    public void setPackUnit(String packUnit) {
        this.packUnit = packUnit;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }

    public String getPickupLocation() {
        return pickupLocation;
    }

    public void setPickupLocation(String pickupLocation) {
        this.pickupLocation = pickupLocation;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getListingType() {
        return listingType;
    }

    public void setListingType(String listingType) {
        this.listingType = listingType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isPublished() {
        return published;
    }

    public void setPublished(boolean published) {
        this.published = published;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
