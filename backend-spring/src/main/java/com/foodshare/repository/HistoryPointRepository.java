package com.foodshare.repository;

import com.foodshare.model.HistoryPoint;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface HistoryPointRepository extends MongoRepository<HistoryPoint, String> {
    List<HistoryPoint> findAll();
    List<HistoryPoint> findByDonorId(String donorId);
    List<HistoryPoint> findByDonorIdIsNull();
}
