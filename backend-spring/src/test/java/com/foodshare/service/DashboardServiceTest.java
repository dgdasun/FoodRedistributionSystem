package com.foodshare.service;

import com.foodshare.model.User;
import com.foodshare.repository.DonationRepository;
import com.foodshare.repository.FoodRequestRepository;
import com.foodshare.repository.TicketRepository;
import com.foodshare.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DashboardServiceTest {

    @Test
    void accountStatusBreakdownMatchesAllUserStatuses() {
        DonationRepository donations = mock(DonationRepository.class);
        TicketRepository tickets = mock(TicketRepository.class);
        FoodRequestRepository requests = mock(FoodRequestRepository.class);
        UserRepository users = mock(UserRepository.class);

        when(donations.findAll()).thenReturn(List.of());
        when(tickets.findAll()).thenReturn(List.of());
        when(requests.findAll()).thenReturn(List.of());
        when(users.findAll()).thenReturn(List.of(
                user("donor", false, "rejected"),
                user("beneficiary", true, "pending"),
                user("farm", true, "pending"),
                user("beneficiary", true, "pending"),
                user("beneficiary", true, "pending"),
                user("donor", true, "pending"),
                user("admin", false, "pending")
        ));

        Map<String, Object> overview = new DashboardService(donations, tickets, requests, users).adminOverview();

        assertEquals(0L, overview.get("pendingVerifications"));
        assertEquals(7, overview.get("totalUsers"));
        assertEquals(Map.of("verified", 5L, "pending", 0L, "rejected", 1L, "active", 1L),
                overview.get("userStatusBreakdown"));
    }

    @Test
    void countsUnverifiedAccountsAwaitingReview() {
        DonationRepository donations = mock(DonationRepository.class);
        TicketRepository tickets = mock(TicketRepository.class);
        FoodRequestRepository requests = mock(FoodRequestRepository.class);
        UserRepository users = mock(UserRepository.class);

        when(donations.findAll()).thenReturn(List.of());
        when(tickets.findAll()).thenReturn(List.of());
        when(requests.findAll()).thenReturn(List.of());
        when(users.findAll()).thenReturn(List.of(
                user("beneficiary", false, "pending"),
                user("donor", false, null)
        ));

        Map<String, Object> overview = new DashboardService(donations, tickets, requests, users).adminOverview();

        assertEquals(2L, overview.get("pendingVerifications"));
    }

    private User user(String role, boolean verified, String verificationStatus) {
        User user = new User();
        user.setRole(role);
        user.setVerified(verified);
        user.setVerificationStatus(verificationStatus);
        return user;
    }
}
