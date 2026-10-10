package com.foodshare.controller;

import com.foodshare.model.User;
import com.foodshare.service.BeneficiaryService;
import com.foodshare.service.VerificationDocumentService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/beneficiaries")
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;
    private final VerificationDocumentService verificationDocumentService;

    public BeneficiaryController(BeneficiaryService beneficiaryService, VerificationDocumentService verificationDocumentService) {
        this.beneficiaryService = beneficiaryService;
        this.verificationDocumentService = verificationDocumentService;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) Boolean verified,
                                     @RequestParam(required = false) String role,
                                     @RequestParam(required = false) String status) {
        List<User> beneficiaries = beneficiaryService.list(verified, role, status);
        return Map.of("beneficiaries", beneficiaries);
    }

    @PatchMapping("/{id}/verify")
    public Map<String, Object> verify(@PathVariable String id, @RequestBody Map<String, Boolean> body) {
        User user = beneficiaryService.setVerified(id, Boolean.TRUE.equals(body.get("verified")));
        return Map.of("user", user);
    }

    @PatchMapping("/{id}/reject")
    public Map<String, Object> reject(@PathVariable String id, @RequestBody Map<String, String> body) {
        User user = beneficiaryService.reject(id, body.get("reason"));
        return Map.of("user", user);
    }

    @PostMapping(value = "/{id}/documents", consumes = "multipart/form-data")
    public Map<String, Object> uploadDocument(@PathVariable String id, @RequestParam("file") MultipartFile file) throws IOException {
        User user = verificationDocumentService.addDocument(id, file);
        return Map.of("user", user);
    }

    @GetMapping("/{id}/documents/{filename}")
    public ResponseEntity<Resource> getDocument(@PathVariable String id, @PathVariable String filename) {
        Resource resource = verificationDocumentService.loadDocument(id, filename);
        String contentType = verificationDocumentService.contentTypeOf(resource);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(resource);
    }
}
