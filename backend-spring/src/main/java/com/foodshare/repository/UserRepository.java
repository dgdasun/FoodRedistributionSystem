package com.foodshare.repository;

import com.foodshare.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmailIgnoreCase(String email);
    List<User> findByRoleOrderByCreatedAtDesc(String role);
    List<User> findByRoleInAndVerifiedOrderByCreatedAtDesc(List<String> roles, boolean verified);
    List<User> findByRoleInAndVerificationStatusOrderByCreatedAtDesc(List<String> roles, String verificationStatus);
    List<User> findByRoleInOrderByCreatedAtDesc(List<String> roles);
}
