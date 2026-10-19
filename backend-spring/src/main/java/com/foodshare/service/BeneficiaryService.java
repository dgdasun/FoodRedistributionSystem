package com.foodshare.service;

import com.foodshare.model.User;
import com.foodshare.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class BeneficiaryService {

    private final UserRepository userRepository;

    public BeneficiaryService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> list(Boolean verified, String role, String status) {
        List<String> roles = role != null ? List.of(role) : List.of("beneficiary", "farm", "donor");
        if (status != null) {
            return userRepository.findByRoleInAndVerificationStatusOrderByCreatedAtDesc(roles, status);
        }
        if (verified != null) {
            return userRepository.findByRoleInAndVerifiedOrderByCreatedAtDesc(roles, verified);
        }
        return userRepository.findByRoleInOrderByCreatedAtDesc(roles);
    }

    public User setVerified(String id, boolean verified) {
        User u = get(id);
        if (verified) {
            List<String> docs = u.getVerificationDocuments();
            if (docs == null || docs.isEmpty()) {
                throw new IllegalStateException("Verification document required for approval");
            }
            u.setVerificationStatus("approved");
        } else {
            u.setVerificationStatus("pending");
        }
        u.setRejectionReason(null);
        u.setVerified(verified);
        u.setVerificationReviewedAt(verified ? Instant.now() : null);
        return userRepository.save(u);
    }

    public User reject(String id, String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("A rejection reason is required");
        }
        User u = get(id);
        u.setVerified(false);
        u.setVerificationStatus("rejected");
        u.setRejectionReason(reason.trim());
        u.setVerificationReviewedAt(Instant.now());
        return userRepository.save(u);
    }

    private User get(String id) {
        return userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Beneficiary not found"));
    }
}
