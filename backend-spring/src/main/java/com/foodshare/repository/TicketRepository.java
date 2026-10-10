package com.foodshare.repository;

import com.foodshare.model.Ticket;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends MongoRepository<Ticket, String> {
    List<Ticket> findByBeneficiaryIdOrderByCreatedAtDesc(String beneficiaryId);
    List<Ticket> findByItemIdInOrderByCreatedAtDesc(List<String> itemIds);
    List<Ticket> findByStatusOrderByCreatedAtDesc(String status);
    Optional<Ticket> findByQrCode(String qrCode);
}
