package com.foodshare.controller;

import com.foodshare.model.User;
import com.foodshare.service.AvatarService;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;

/** Self-service profile endpoints for any signed-in account (currently the profile photo). */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final AvatarService avatarService;

    public UserController(AvatarService avatarService) {
        this.avatarService = avatarService;
    }

    @PostMapping(value = "/{id}/avatar", consumes = "multipart/form-data")
    public Map<String, Object> uploadAvatar(@PathVariable String id, @RequestParam("file") MultipartFile file) throws IOException {
        User user = avatarService.setAvatar(id, file);
        return Map.of("user", user);
    }

    @DeleteMapping("/{id}/avatar")
    public Map<String, Object> removeAvatar(@PathVariable String id) throws IOException {
        User user = avatarService.removeAvatar(id);
        return Map.of("user", user);
    }

    @GetMapping("/{id}/avatar/{filename}")
    public ResponseEntity<Resource> getAvatar(@PathVariable String id, @PathVariable String filename) {
        Resource resource = avatarService.loadAvatar(id, filename);
        // Filenames are timestamped per upload, so each URL's content never changes.
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(avatarService.contentTypeOf(resource)))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(30)))
                .body(resource);
    }
}
