package com.foodshare.controller;

import com.foodshare.model.User;
import com.foodshare.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.data.domain.Sort;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Every account in the system, for the admin Users table.
 *
 * This is deliberately separate from {@code /api/beneficiaries}: that endpoint
 * restricts itself to the donor / beneficiary / farm roles because it drives
 * the verification queue, so administrators never appear in it. The admin
 * table has to show the whole directory, admins included.
 *
 * {@code passwordHash} is annotated {@code @JsonIgnore} on the model, so it is
 * never serialised here.
 */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt");

    private final UserRepository userRepository;

    public AdminUserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * @param role   optional exact role filter (donor, beneficiary, farm, admin)
     * @param status optional verification status (pending, verified, rejected)
     */
    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String role,
                                    @RequestParam(required = false) String status) {
        List<User> users = (role != null && !role.isBlank())
                ? userRepository.findByRoleOrderByCreatedAtDesc(role)
                : userRepository.findAll(NEWEST_FIRST);

        // Newest account first; name only breaks ties between the backfilled
        // accounts, which all share one timestamp.
        List<User> filtered = users.stream()
                .filter(u -> status == null || status.isBlank() || status.equalsIgnoreCase(u.getVerificationStatus()))
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(User::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();

        return Map.of("users", filtered, "total", filtered.size());
    }
}
