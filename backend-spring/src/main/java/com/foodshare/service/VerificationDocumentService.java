package com.foodshare.service;

import com.foodshare.dto.RegisterRequestDTO;
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
import java.time.Instant;
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
    private final NotificationService notificationService;

    public VerificationDocumentService(UserRepository userRepository, NotificationService notificationService,
                                        @Value("${foodshare.uploads.dir:uploads/verification}") String uploadsDir) {
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.baseDir = Paths.get(uploadsDir).toAbsolutePath().normalize();
    }

    /** Path the document is served from (see BeneficiaryController#getDocument). */
    private static final String DOCUMENT_URL_PREFIX = "/api/beneficiaries/";

    public static String documentUrl(String userId, String storedName) {
        return DOCUMENT_URL_PREFIX + userId + "/documents/" + storedName;
    }

    /** True for a link into our own document store, as produced by documentUrl(). */
    public static boolean isDocumentUrl(String url) {
        return url != null && url.startsWith(DOCUMENT_URL_PREFIX) && url.contains("/documents/") && !url.contains("..");
    }

    public User addDocument(String userId, MultipartFile file) throws IOException {
        return addDocument(userId, file, null, null);
    }

    /**
     * @param category     "primary" (the mandatory verification document), "supporting"
     *                     (optional extra certificates) or null for a plain, unclassified upload
     * @param documentType for "primary": one of RegisterRequestDTO.PRIMARY_DOCUMENT_TYPES;
     *                     may be omitted when the user already has a type on record
     */
    public User addDocument(String userId, MultipartFile file, String category, String documentType) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file was provided");
        }
        if (category != null && !"primary".equals(category) && !"supporting".equals(category)) {
            throw new IllegalArgumentException("Unknown document category");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String primaryType = documentType != null && !documentType.isBlank() ? documentType.trim() : user.getPrimaryDocumentType();
        // primaryType == null check first: List.of(...).contains(null) throws.
        if ("primary".equals(category)
                && (primaryType == null || !RegisterRequestDTO.PRIMARY_DOCUMENT_TYPES.contains(primaryType))) {
            throw new IllegalArgumentException("Please select a valid primary verification document type");
        }

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
        user.setVerificationSubmittedAt(Instant.now());

        String url = documentUrl(userId, storedName);
        if ("primary".equals(category)) {
            user.setPrimaryDocumentType(primaryType);
            user.setPrimaryDocumentUrl(url);
        } else if ("supporting".equals(category)) {
            List<String> supporting = user.getSupportingDocumentUrls() == null
                    ? new ArrayList<>() : new ArrayList<>(user.getSupportingDocumentUrls());
            supporting.add(url);
            user.setSupportingDocumentUrls(supporting);
        }

        if ("rejected".equals(user.getVerificationStatus())) {
            user.setVerificationStatus("pending");
            user.setRejectionReason(null);
            user.setVerificationReviewedAt(null);
        }

        User saved = userRepository.save(user);
        String org = saved.getOrganizationName();
        String who = org != null && !org.isBlank() ? org : saved.getName();
        notificationService.notifyAdmins("verification",
                who + " uploaded a verification document (" + original + ") for review.");
        return saved;
    }

    /**
     * Lets the account owner withdraw a wrong upload. Only allowed while the account
     * is still awaiting review - once approved, the documents back that decision.
     */
    public User removeDocument(String userId, String filename) throws IOException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if ("approved".equals(user.getVerificationStatus())) {
            throw new IllegalStateException("Documents cannot be removed after the account has been approved");
        }

        List<String> docs = user.getVerificationDocuments() == null
                ? new ArrayList<>() : new ArrayList<>(user.getVerificationDocuments());
        if (!docs.remove(filename)) {
            throw new IllegalArgumentException("Document not found");
        }

        Path userDir = baseDir.resolve(userId).normalize();
        Path file = userDir.resolve(filename).normalize();
        if (!file.startsWith(userDir)) {
            throw new IllegalArgumentException("Invalid document path");
        }
        Files.deleteIfExists(file);

        user.setVerificationDocuments(docs);
        String url = documentUrl(userId, filename);
        if (url.equals(user.getPrimaryDocumentUrl())) {
            user.setPrimaryDocumentUrl(null);
        }
        if (user.getSupportingDocumentUrls() != null) {
            user.setSupportingDocumentUrls(new ArrayList<>(
                    user.getSupportingDocumentUrls().stream().filter(u -> !u.equals(url)).toList()));
        }
        if (docs.isEmpty()) {
            user.setVerificationSubmittedAt(null);
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
