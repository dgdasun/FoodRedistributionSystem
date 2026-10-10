package com.foodshare.controller;

import com.foodshare.dto.RecommendationDTO;
import com.foodshare.model.FoodRequest;
import com.foodshare.model.User;
import com.foodshare.repository.DonationRepository;
import com.foodshare.repository.UserRepository;
import com.foodshare.service.RequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/requests")
public class RequestController {

    private final RequestService requestService;
    private final DonationRepository donationRepository;
    private final UserRepository userRepository;

    public RequestController(RequestService requestService, DonationRepository donationRepository, UserRepository userRepository) {
        this.requestService = requestService;
        this.donationRepository = donationRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String beneficiaryId,
                                     @RequestParam(required = false) String itemId,
                                     @RequestParam(required = false) String donorId,
                                     @RequestParam(required = false) String status) {
        List<FoodRequest> requests;
        if (donorId != null) {
            requests = requestService.byDonor(donorId);
        } else if (beneficiaryId != null) {
            requests = requestService.byBeneficiary(beneficiaryId);
        } else if (itemId != null) {
            requests = requestService.byItem(itemId);
        } else {
            requests = List.of();
        }
        if (status != null) requests = requests.stream().filter(r -> status.equals(r.getStatus())).toList();

        List<Map<String, Object>> enriched = requests.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("itemId", r.getItemId());
            m.put("beneficiaryId", r.getBeneficiaryId());
            m.put("quantityKg", r.getQuantityKg());
            m.put("urgency", r.getUrgency());
            m.put("distanceKm", r.getDistanceKm());
            m.put("status", r.getStatus());
            m.put("approvedQuantityKg", r.getApprovedQuantityKg());
            m.put("rejectionReason", r.getRejectionReason());
            m.put("createdAt", r.getCreatedAt());
            m.put("item", donationRepository.findById(r.getItemId()).orElse(null));

            User beneficiary = userRepository.findById(r.getBeneficiaryId()).orElse(null);
            if (beneficiary != null) {
                Map<String, Object> b = new HashMap<>();
                b.put("id", beneficiary.getId());
                b.put("name", beneficiary.getName());
                b.put("organizationName", beneficiary.getOrganizationName());
                b.put("orgType", beneficiary.getOrgType());
                b.put("role", beneficiary.getRole());
                b.put("location", beneficiary.getLocation());
                b.put("verified", beneficiary.isVerified());
                m.put("beneficiary", b);
            }
            return m;
        }).toList();

        return Map.of("requests", enriched);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> submit(@Valid @RequestBody FoodRequest request) {
        return Map.of("request", requestService.submit(request));
    }

    @GetMapping("/recommendations/{itemId}")
    public Map<String, Object> recommendations(@PathVariable String itemId) {
        List<RecommendationDTO> ranking = requestService.recommendationsFor(itemId);
        return Map.of("itemId", itemId, "ranking", ranking);
    }

    @PatchMapping("/{id}")
    public Map<String, Object> updateStatus(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String status = (String) body.get("status");
        Object qty = body.get("approvedQuantityKg");
        Double approvedQuantityKg = qty instanceof Number ? ((Number) qty).doubleValue() : null;
        String reason = (String) body.get("reason");
        FoodRequest updated = requestService.updateStatus(id, status, approvedQuantityKg, reason);
        return Map.of("request", updated);
    }
}
