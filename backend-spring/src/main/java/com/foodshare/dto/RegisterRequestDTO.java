package com.foodshare.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public class RegisterRequestDTO {
    // @Email alone accepts "a@b"; require a dotted domain with an alphabetic TLD.
    // Kept in sync with EMAIL_REGEX in frontend/src/utils/validation.js.
    public static final String EMAIL_REGEX =
            "^[A-Za-z0-9_%+-]+(\\.[A-Za-z0-9_%+-]+)*@([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\\.)+[A-Za-z]{2,}$";

    // Kept in sync with PASSWORD_MIN_LENGTH in frontend/src/utils/validation.js.
    public static final int PASSWORD_MIN_LENGTH = 5;

    // Kept in sync with PHONE_REGEX in frontend/src/utils/validation.js.
    public static final String PHONE_REGEX = "^[0-9]{10}$";

    // Accepted kinds of primary verification document for beneficiaries.
    // Kept in sync with PRIMARY_DOCUMENT_TYPES in frontend/src/components/BeneficiaryVerificationUpload.jsx.
    public static final List<String> PRIMARY_DOCUMENT_TYPES = List.of(
            "Official Registration Certificate (BR / NGO)",
            "Grama Niladhari / Local Authority Endorsement Letter",
            "Past 3 Months Bank Statement / Financial Summary",
            "Organization Head's NIC + Signed Affidavit"
    );

    @NotBlank
    private String role; // beneficiary | farm

    private String orgType;

    @NotBlank
    private String name;

    @NotBlank(message = "Email address is required")
    @Email(message = "Please enter a valid email address")
    @Pattern(regexp = EMAIL_REGEX, message = "Please enter a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = PASSWORD_MIN_LENGTH, message = "Password must be at least 5 characters")
    private String password;

    @NotBlank
    private String organizationName;

    private Integer organizationSize;
    private Double handlingCapacityKg;
    private String location;
    private Double latitude;
    private Double longitude;

    @Pattern(regexp = PHONE_REGEX, message = "Phone number must be exactly 10 digits")
    private String phone;
    private List<String> storageTypes; // required (at least one) for beneficiaries, see AuthService
    private String registrationNumber;

    // Beneficiary verification documents. The files themselves are uploaded right after
    // registration (POST /api/beneficiaries/{id}/documents), which fills in the URLs.
    private String primaryDocumentType; // one of PRIMARY_DOCUMENT_TYPES, see AuthService
    private String primaryDocumentUrl;
    private List<String> supportingDocumentUrls;

    public RegisterRequestDTO() {
    }

    public String getPrimaryDocumentType() {
        return primaryDocumentType;
    }

    public void setPrimaryDocumentType(String primaryDocumentType) {
        this.primaryDocumentType = primaryDocumentType;
    }

    public String getPrimaryDocumentUrl() {
        return primaryDocumentUrl;
    }

    public void setPrimaryDocumentUrl(String primaryDocumentUrl) {
        this.primaryDocumentUrl = primaryDocumentUrl;
    }

    public List<String> getSupportingDocumentUrls() {
        return supportingDocumentUrls;
    }

    public void setSupportingDocumentUrls(List<String> supportingDocumentUrls) {
        this.supportingDocumentUrls = supportingDocumentUrls;
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

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getOrganizationName() {
        return organizationName;
    }

    public void setOrganizationName(String organizationName) {
        this.organizationName = organizationName;
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

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public List<String> getStorageTypes() {
        return storageTypes;
    }

    public void setStorageTypes(List<String> storageTypes) {
        this.storageTypes = storageTypes;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public void setRegistrationNumber(String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }
}
