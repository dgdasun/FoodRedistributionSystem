package com.foodshare.controller;

import com.foodshare.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/{donorId}")
    public Map<String, Object> donorDashboard(@PathVariable String donorId) {
        return dashboardService.donorDashboard(donorId);
    }

    @GetMapping("/admin/overview")
    public Map<String, Object> adminOverview() {
        return dashboardService.adminOverview();
    }
}
