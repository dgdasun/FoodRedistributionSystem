package com.foodshare.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "users")
public class User {

    @Id
    private String id;

    /** donor | beneficiary | farm | admin */
    private String role;

    /** NGO | Charity | Farm (only relevant for beneficiary/farm roles) */
    private String orgType;

    private String name;
    private String email;

    /** BCrypt hash - never serialized back to clients. */
    private String passwordHash;

    private String organizationName;
    private String location;
    private Double latitude;
    private Double longitude;

    /** Approx. number of people the organization serves */
    private Integer organizationSize = 0;

    /** How many kg of food the organization can realistically handle */
    private Double handlingCapacityKg = 0.0;

    /** Used by the AI priority engine to keep allocations fair over time */
    private Integer allocationsLast30Days = 0;

    /** Official phone / mobile number for the organization contact */
    private String phone;

    /** AMBIENT | COLD | FREEZER - what kind of donations this beneficiary can safely accept */
    private String storageCapacity;

    /** NGO Reg No. / Trust ID printed on the organization's verification document */
    private String registrationNumber;

    /** Beneficiary/farm accounts require admin approval before requesting food */
    private boolean verified = false;

    /** pending | approved | rejected - tracks the admin verification workflow (see AdminVerifications) */
    private String verificationStatus = "pending";

    /** Reason given by an admin when rejecting this account's verification request */
    private String rejectionReason;

    private String avatar;

    /** Stored filenames of documents uploaded to prove the organization's legitimacy (see VerificationDocumentService). */
    private List<String> verificationDocuments = new ArrayList<>();

    /**
     * When the account was created, so listings can show newest accounts first.
     *
     * Deliberately NOT initialised to Instant.now() the way the other documents
     * do it: accounts written before this field existed have no value stored,
     * and an initialiser would hand them a fresh "now" on every single read,
     * which would make the ordering jump around. Left null instead, set
     * explicitly on registration, and backfilled once by DataSeeder.
     */
    private Instant createdAt;

    /** When the most recent verification document was uploaded - shown as "Submitted X ago" in AdminVerifications. */
    private Instant verificationSubmittedAt;

    /** When an admin last approved or rejected this account - shown as "Approved/Rejected X ago". */
    private Instant verificationReviewedAt;

    public User() {
    }

    public Instant getVerificationSubmittedAt() {
        return verificationSubmittedAt;
    }

    public void setVerificationSubmittedAt(Instant verificationSubmittedAt) {
        this.verificationSubmittedAt = verificationSubmittedAt;
    }

    public Instant getVerificationReviewedAt() {
        return verificationReviewedAt;
    }

    public void setVerificationReviewedAt(Instant verificationReviewedAt) {
        this.verificationReviewedAt = verificationReviewedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getOrgType() {
        return orgType;
    }

    public void setOrgType(String orgType) {
        this.orgType = orgType;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    @JsonIgnore
    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getOrganizationName() {
        return organizationName;
    }

    public void setOrganizationName(String organizationName) {
        this.organizationName = organizationName;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
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

    public Integer getOrganizationSize() {
        return organizationSize;
    }

    public void setOrganizationSize(Integer organizationSize) {
        this.organizationSize = organizationSize;
    }

    public Double getHandlingCapacityKg() {
        return handlingCapacityKg;
    }

    public void setHandlingCapacityKg(Double handlingCapacityKg) {
        this.handlingCapacityKg = handlingCapacityKg;
    }

    public Integer getAllocationsLast30Days() {
        return allocationsLast30Days;
    }

    public void setAllocationsLast30Days(Integer allocationsLast30Days) {
        this.allocationsLast30Days = allocationsLast30Days;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public String getVerificationStatus() {
        return verificationStatus;
    }

    public void setVerificationStatus(String verificationStatus) {
        this.verificationStatus = verificationStatus;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getStorageCapacity() {
        return storageCapacity;
    }

    public void setStorageCapacity(String storageCapacity) {
        this.storageCapacity = storageCapacity;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public void setRegistrationNumber(String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    public List<String> getVerificationDocuments() {
        return verificationDocuments;
    }

    public void setVerificationDocuments(List<String> verificationDocuments) {
        this.verificationDocuments = verificationDocuments;
    }
}
