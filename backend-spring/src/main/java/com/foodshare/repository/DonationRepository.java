package com.foodshare.repository;

import com.foodshare.model.Donation;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DonationRepository extends MongoRepository<Donation, String> {
    List<Donation> findByDonorIdOrderByCreatedAtDesc(String donorId);
    List<Donation> findByPublishedOrderByCreatedAtDesc(boolean published);
    List<Donation> findByStatusOrderByCreatedAtDesc(String status);
    List<Donation> findByDonorIdAndStatusOrderByCreatedAtDesc(String donorId, String status);
}
