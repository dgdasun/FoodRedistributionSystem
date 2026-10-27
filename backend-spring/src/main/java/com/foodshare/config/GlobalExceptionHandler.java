package com.foodshare.config;

import com.foodshare.dto.ApiError;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleNotFoundOrBadRequest(IllegalArgumentException e) {
        HttpStatus status = e.getMessage() != null && e.getMessage().toLowerCase().contains("not found")
                ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
        return ResponseEntity.status(status).body(new ApiError(e.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiError> handleConflict(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError(e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException e) {
        String message = "Invalid request";
        if (!e.getBindingResult().getFieldErrors().isEmpty()) {
            // Violation order is unspecified; a blank field also fails @Pattern, so
            // report "is required" ahead of format errors.
            FieldError fe = e.getBindingResult().getFieldErrors().stream()
                    .filter(err -> "NotBlank".equals(err.getCode()))
                    .findFirst()
                    .orElse(e.getBindingResult().getFieldErrors().get(0));
            String msg = fe.getDefaultMessage();
            // Custom messages are full sentences ("Please enter a valid email address");
            // built-in ones are fragments ("must not be blank") that need the field name.
            message = msg != null && !msg.isEmpty() && Character.isUpperCase(msg.charAt(0))
                    ? msg
                    : fe.getField() + " " + msg;
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiError(message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ApiError("Unexpected error: " + e.getMessage()));
    }
}
