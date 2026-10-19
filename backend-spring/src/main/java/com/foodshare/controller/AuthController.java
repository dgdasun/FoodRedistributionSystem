package com.foodshare.controller;

import com.foodshare.dto.LoginRequestDTO;
import com.foodshare.dto.RegisterRequestDTO;
import com.foodshare.model.User;
import com.foodshare.repository.UserRepository;
import com.foodshare.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequestDTO req) {
        User user = authService.login(req.getEmail(), req.getPassword())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));
        return Map.of("user", user);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> register(@Valid @RequestBody RegisterRequestDTO req) {
        User user = authService.register(req);
        return Map.of("user", user, "message", "Registered. Awaiting admin verification.");
    }

    @GetMapping("/me/{id}")
    public Map<String, Object> me(@PathVariable String id) {
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
        return Map.of("user", user);
    }
}
