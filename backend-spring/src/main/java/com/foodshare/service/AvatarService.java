package com.foodshare.service;

import com.foodshare.model.User;
import com.foodshare.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

/**
 * Stores profile photos under `foodshare.avatars.dir`, one sub-folder per user.
 * Only the latest photo is kept: uploading a new one deletes the previous file.
 * The user's `avatar` field holds the public URL (see UserController), so the
 * frontend can drop it straight into an <img src>.
 */
@Service
public class AvatarService {

    private static final long MAX_BYTES = 5L * 1024 * 1024;

    /** Accepted content types mapped to the extension the file is stored with. */
    private static final Map<String, String> ALLOWED_TYPES = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif");

    private final UserRepository userRepository;
    private final Path baseDir;

    public AvatarService(UserRepository userRepository,
                         @Value("${foodshare.avatars.dir:uploads/avatars}") String avatarsDir) {
        this.userRepository = userRepository;
        this.baseDir = Paths.get(avatarsDir).toAbsolutePath().normalize();
    }

    public User setAvatar(String userId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No image was provided");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Profile photo must be 5MB or smaller");
        }
        String extension = ALLOWED_TYPES.get(file.getContentType());
        if (extension == null) {
            throw new IllegalArgumentException("Profile photo must be a JPG, PNG, WEBP or GIF image");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Path userDir = userDir(userId);
        Files.createDirectories(userDir);

        // Timestamped name so browsers never show a cached copy of the old photo.
        String storedName = "avatar-" + System.currentTimeMillis() + "." + extension;
        file.transferTo(userDir.resolve(storedName));

        deleteStoredFile(userId, user.getAvatar());
        user.setAvatar("/api/users/" + userId + "/avatar/" + storedName);
        return userRepository.save(user);
    }

    public User removeAvatar(String userId) throws IOException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        deleteStoredFile(userId, user.getAvatar());
        user.setAvatar(null);
        return userRepository.save(user);
    }

    public Resource loadAvatar(String userId, String filename) {
        Path userDir = userDir(userId);
        Path file = userDir.resolve(filename).normalize();
        if (!file.startsWith(userDir)) {
            throw new IllegalArgumentException("Invalid avatar path");
        }
        Resource resource = new FileSystemResource(file);
        if (!resource.exists() || !resource.isReadable()) {
            throw new IllegalArgumentException("Avatar not found");
        }
        return resource;
    }

    public String contentTypeOf(Resource resource) {
        try {
            String type = Files.probeContentType(resource.getFile().toPath());
            return type != null ? type : "application/octet-stream";
        } catch (IOException e) {
            return "application/octet-stream";
        }
    }

    private Path userDir(String userId) {
        Path userDir = baseDir.resolve(userId).normalize();
        if (!userDir.startsWith(baseDir) || userDir.equals(baseDir)) {
            throw new IllegalArgumentException("Invalid user id");
        }
        return userDir;
    }

    /** Removes the file behind a previously stored avatar URL; ignores legacy values such as seeded initials. */
    private void deleteStoredFile(String userId, String avatarUrl) throws IOException {
        String prefix = "/api/users/" + userId + "/avatar/";
        if (avatarUrl == null || !avatarUrl.startsWith(prefix)) return;
        Path userDir = userDir(userId);
        Path old = userDir.resolve(avatarUrl.substring(prefix.length())).normalize();
        if (old.startsWith(userDir)) {
            Files.deleteIfExists(old);
        }
    }
}
