package com.foodshare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import static com.foodshare.dto.RegisterRequestDTO.EMAIL_REGEX;

public class LoginRequestDTO {
    @NotBlank(message = "Email is required")
    @Pattern(regexp = EMAIL_REGEX, message = "Please enter a valid email address")
    private String email;

    @NotBlank
    private String password;

    public LoginRequestDTO() {
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
}
