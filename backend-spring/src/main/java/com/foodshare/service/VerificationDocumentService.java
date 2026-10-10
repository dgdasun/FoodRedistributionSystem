package com.foodshare.service;

import com.foodshare.model.User;
import com.foodshare.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * Stores organization-verification documents (registration certificates, licenses, etc.)
 * that donor/beneficiary/farm accounts upload while awaiting admin approval (see AdminVerifications).
 * Files are kept on local disk under `foodshare.uploads.dir`, one sub-folder per user.
 */
@Service
public class VerificationDocumentService {

    private final UserRepository userRepository;
    private final Path baseDir;

    public VerificationDocumentService(UserRepository userRepository,
                                        @Value("${foodshare.uploads.dir:uploads/verification}") String uploadsDir) {
        this.userRepository = userRepository;
        this.baseDir = Paths.get(uploadsDir).toAbsolutePath().normalize();
    }

    public User addDocument(String userId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file was provided");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Path userDir = baseDir.resolve(userId).normalize();
        if (!userDir.startsWith(baseDir)) {
            throw new IllegalArgumentException("Invalid user id");
        }
        Files.createDirectories(userDir);

        String original = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "document");
        String safeName = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        String storedName = System.currentTimeMillis() + "-" + safeName;

        Path target = userDir.resolve(storedName).normalize();
        if (!target.startsWith(userDir)) {
            throw new IllegalArgumentException("Invalid file name");
        }
        file.transferTo(target);

        List<String> docs = user.getVerificationDocuments();
        if (docs == null) docs = new ArrayList<>();
        else docs = new ArrayList<>(docs);
        docs.add(storedName);
        user.setVerificationDocuments(docs);

        if ("rejected".equals(user.getVerificationStatus())) {
            user.setVerificationStatus("pending");
            user.setRejectionReason(null);
        }

        return userRepository.save(user);
    }

    public Resource loadDocument(String userId, String filename) {
        Path userDir = baseDir.resolve(userId).normalize();
        Path file = userDir.resolve(filename).normalize();
        if (!file.startsWith(userDir)) {
            throw new IllegalArgumentException("Invalid document path");
        }
        Resource resource = new FileSystemResource(file);
        if (!resource.exists() || !resource.isReadable()) {
            throw new IllegalArgumentException("Document not found");
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
}
