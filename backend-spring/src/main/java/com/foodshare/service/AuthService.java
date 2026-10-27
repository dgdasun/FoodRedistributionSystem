package com.foodshare.service;

import com.foodshare.dto.RegisterRequestDTO;
import com.foodshare.model.User;

import java.time.Instant;
import com.foodshare.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Optional<User> login(String email, String password) {
        return userRepository.findByEmailIgnoreCase(email)
                .filter(u -> u.getPasswordHash() != null && passwordEncoder.matches(password, u.getPasswordHash()));
    }

    public User register(RegisterRequestDTO req) {
        userRepository.findByEmailIgnoreCase(req.getEmail()).ifPresent(u -> {
            throw new IllegalStateException("An account with this email already exists");
        });

        List<String> storageTypes = req.getStorageTypes() == null ? List.of() : req.getStorageTypes().stream()
                .filter(t -> t != null && !t.isBlank())
                .map(String::trim)
                .distinct()
                .toList();
        if ("beneficiary".equals(req.getRole()) && storageTypes.isEmpty()) {
            throw new IllegalArgumentException("Please select at least one storage type");
        }

        String primaryDocumentType = req.getPrimaryDocumentType() == null ? null : req.getPrimaryDocumentType().trim();
        if (primaryDocumentType != null && !primaryDocumentType.isEmpty()
                && !RegisterRequestDTO.PRIMARY_DOCUMENT_TYPES.contains(primaryDocumentType)) {
            throw new IllegalArgumentException("Please select a valid primary verification document type");
        }
        // Document URLs normally come from the upload endpoint; only accept links to our own
        // document store so a client can't plant an arbitrary external link for admins to open.
        String primaryDocumentUrl = VerificationDocumentService.isDocumentUrl(req.getPrimaryDocumentUrl())
                ? req.getPrimaryDocumentUrl() : null;
        List<String> supportingDocumentUrls = req.getSupportingDocumentUrls() == null ? List.of()
                : req.getSupportingDocumentUrls().stream()
                .filter(VerificationDocumentService::isDocumentUrl)
                .distinct()
                .toList();

        User user = new User();
        user.setRole(req.getRole());
        user.setOrgType(req.getOrgType());
        user.setName(req.getName());
        user.setEmail(req.getEmail());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setOrganizationName(req.getOrganizationName());
        user.setOrganizationSize(req.getOrganizationSize() == null ? 0 : req.getOrganizationSize());
        user.setHandlingCapacityKg(req.getHandlingCapacityKg() == null ? 0.0 : req.getHandlingCapacityKg());
        user.setAllocationsLast30Days(0);
        user.setLocation(req.getLocation());
        user.setLatitude(req.getLatitude());
        user.setLongitude(req.getLongitude());
        user.setPhone(req.getPhone());
        user.setStorageTypes(storageTypes);
        user.setRegistrationNumber(req.getRegistrationNumber());
        if ("beneficiary".equals(req.getRole())) {
            user.setPrimaryDocumentType(primaryDocumentType == null || primaryDocumentType.isEmpty() ? null : primaryDocumentType);
            user.setPrimaryDocumentUrl(primaryDocumentUrl);
            user.setSupportingDocumentUrls(new ArrayList<>(supportingDocumentUrls));
        }
        user.setCreatedAt(Instant.now());
        user.setVerified(false); // Beneficiary Registration & Verification module
        user.setAvatar(req.getName().substring(0, 1).toUpperCase());

        return userRepository.save(user);
    }
}
