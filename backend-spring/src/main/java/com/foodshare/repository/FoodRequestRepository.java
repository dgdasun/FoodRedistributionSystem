package com.foodshare.repository;

import com.foodshare.model.FoodRequest;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface FoodRequestRepository extends MongoRepository<FoodRequest, String> {
    List<FoodRequest> findByBeneficiaryIdOrderByCreatedAtDesc(String beneficiaryId);
    List<FoodRequest> findByItemIdOrderByCreatedAtDesc(String itemId);
    List<FoodRequest> findByItemIdAndStatusOrderByCreatedAtDesc(String itemId, String status);
    List<FoodRequest> findByStatusOrderByCreatedAtDesc(String status);
    List<FoodRequest> findByItemIdInOrderByCreatedAtDesc(List<String> itemIds);
}
