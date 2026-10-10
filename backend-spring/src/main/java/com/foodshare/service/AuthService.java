package com.foodshare.service;

import com.foodshare.dto.RegisterRequestDTO;
import com.foodshare.model.User;

import java.time.Instant;
import com.foodshare.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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
        user.setStorageCapacity(req.getStorageCapacity());
        user.setRegistrationNumber(req.getRegistrationNumber());
        user.setCreatedAt(Instant.now());
        user.setVerified(false); // Beneficiary Registration & Verification module
        user.setAvatar(req.getName().substring(0, 1).toUpperCase());

        return userRepository.save(user);
    }
}
