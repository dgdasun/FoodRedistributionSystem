package com.foodshare.controller;

import com.foodshare.model.Donation;
import com.foodshare.model.Ticket;
import com.foodshare.repository.DonationRepository;
import com.foodshare.service.SettingsService;
import com.foodshare.service.TicketService;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketService ticketService;
    private final DonationRepository donationRepository;
    private final SettingsService settingsService;

    public TicketController(TicketService ticketService, DonationRepository donationRepository, SettingsService settingsService) {
        this.ticketService = ticketService;
        this.donationRepository = donationRepository;
        this.settingsService = settingsService;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String beneficiaryId,
                                     @RequestParam(required = false) String donorId,
                                     @RequestParam(required = false) String status) {
        List<Ticket> tickets;
        if (donorId != null) tickets = ticketService.byDonor(donorId);
        else if (beneficiaryId != null) tickets = ticketService.byBeneficiary(beneficiaryId);
        else tickets = List.of();

        if (status != null) tickets = tickets.stream().filter(t -> status.equals(t.getStatus())).toList();

        List<Map<String, Object>> enriched = tickets.stream().map(t -> {
            Donation item = donationRepository.findById(t.getItemId()).orElse(null);
            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("requestId", t.getRequestId());
            m.put("itemId", t.getItemId());
            m.put("beneficiaryId", t.getBeneficiaryId());
            m.put("quantityKg", t.getQuantityKg());
            m.put("pickupLocation", t.getPickupLocation());
            m.put("pickupDate", t.getPickupDate());
            m.put("pickupTime", t.getPickupTime());
            m.put("status", t.getStatus());
            m.put("qrCode", t.getQrCode());
            m.put("createdAt", t.getCreatedAt());
            // Admin-configured QR collection window: when this ticket's pickup window closes, and its duration.
            m.put("expiresAt", t.getExpiresAt());
            m.put("collectionWindowHours",
                    settingsService.resolveCollectionWindowHours(item != null ? item.getCategory() : null));
            m.put("item", item);
            return m;
        }).toList();

        return Map.of("tickets", enriched);
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        Ticket t = ticketService.get(id);
        Donation item = donationRepository.findById(t.getItemId()).orElse(null);
        Map<String, Object> m = new HashMap<>();
        m.put("ticket", t);
        m.put("item", item);
        return m;
    }

    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Map<String, String> body) {
        return Map.of("ticket", ticketService.updateStatus(id, body.get("status")));
    }

    /** Donor scans (or manually enters) the beneficiary's QR code to complete the handoff. */
    @PostMapping("/scan")
    public Map<String, Object> scan(@RequestBody Map<String, String> body) {
        Ticket ticket = ticketService.completeByQrCode(body.get("qrCode"), body.get("donorId"));
        Donation item = donationRepository.findById(ticket.getItemId()).orElse(null);
        Map<String, Object> m = new HashMap<>();
        m.put("ticket", ticket);
        m.put("item", item);
        return m;
    }
}
