package com.foodshare.dto;

import java.util.List;
import java.util.Map;

/** Payload sent to the Python AI service for beneficiary ranking. */
public class PriorityRequestDTO {
    private Map<String, Object> item;
    private List<Map<String, Object>> requests;
    private List<Map<String, Object>> beneficiaries;

    public PriorityRequestDTO() {
    }

    public PriorityRequestDTO(Map<String, Object> item, List<Map<String, Object>> requests, List<Map<String, Object>> beneficiaries) {
        this.item = item;
        this.requests = requests;
        this.beneficiaries = beneficiaries;
    }

    public Map<String, Object> getItem() {
        return item;
    }

    public void setItem(Map<String, Object> item) {
        this.item = item;
    }

    public List<Map<String, Object>> getRequests() {
        return requests;
    }

    public void setRequests(List<Map<String, Object>> requests) {
        this.requests = requests;
    }

    public List<Map<String, Object>> getBeneficiaries() {
        return beneficiaries;
    }

    public void setBeneficiaries(List<Map<String, Object>> beneficiaries) {
        this.beneficiaries = beneficiaries;
    }
}
