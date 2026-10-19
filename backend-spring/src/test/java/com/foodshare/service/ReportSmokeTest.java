package com.foodshare.service;

import org.junit.jupiter.api.Test;

import java.io.FileOutputStream;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Throwaway smoke test to exercise ReportPdfService without a live Mongo instance. */
class ReportSmokeTest {

    @Test
    void buildsValidPdfFromSampleReport() throws IOException {
        Map<String, Object> period = new LinkedHashMap<>();
        period.put("startDate", "2026-08-01");
        period.put("endDate", "2026-08-31");
        period.put("groupedBy", "day");

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalDonations", 6);
        summary.put("totalQuantityKg", 137.0);
        summary.put("totalTickets", 1);
        summary.put("collectedKg", 0.0);
        summary.put("totalRequests", 3);
        summary.put("beneficiariesServed", 2);
        summary.put("mealsProvided", 274L);
        summary.put("co2SavedKg", 342.5);

        Map<String, Double> categoryBreakdown = new LinkedHashMap<>();
        categoryBreakdown.put("Cooked Meals", 40.0);
        categoryBreakdown.put("Packaged Goods", 30.0);
        categoryBreakdown.put("Vegetables", 22.0);
        categoryBreakdown.put("Fruits", 18.0);
        categoryBreakdown.put("Bakery", 15.0);
        categoryBreakdown.put("Dairy", 12.0);

        List<Map<String, Object>> trend = List.of(
                Map.of("label", "Aug 1", "donations", 2, "quantityKg", 55.0),
                Map.of("label", "Aug 2", "donations", 0, "quantityKg", 0.0),
                Map.of("label", "Aug 3", "donations", 4, "quantityKg", 82.0)
        );

        List<Map<String, Object>> donations = List.of(
                rowOf("d-1001", "Cooked Rice & Curry", "Cooked Meals", 40.0, "surplus", "ABC Supermarket Hub, Colombo 05", "2026-08-01"),
                rowOf("d-1002", "Bread & Pastries", "Bakery", 15.0, "surplus", "City Bakery, Colombo 05", "2026-08-03"),
                rowOf("d-1004", "Dairy Yoghurt Cups", "Dairy", 12.0, "expired", "ABC Supermarket Hub, Colombo 05", "2026-08-03")
        );

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("period", period);
        report.put("summary", summary);
        report.put("categoryBreakdown", categoryBreakdown);
        report.put("statusBreakdown", Map.of("surplus", 2L, "expired", 1L));
        report.put("trend", trend);
        report.put("donations", donations);

        byte[] pdf = new ReportPdfService().build(report);

        assertTrue(pdf.length > 1000, "PDF should be a non-trivial size, was " + pdf.length + " bytes");
        assertEquals("%PDF", new String(pdf, 0, 4, java.nio.charset.StandardCharsets.US_ASCII));

        try (FileOutputStream fos = new FileOutputStream("target/smoke-report.pdf")) {
            fos.write(pdf);
        }
    }

    @Test
    void handlesEmptyReportWithoutThrowing() {
        Map<String, Object> period = new LinkedHashMap<>();
        period.put("startDate", "2026-08-01");
        period.put("endDate", "2026-08-01");
        period.put("groupedBy", "day");

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalDonations", 0);
        summary.put("totalQuantityKg", 0.0);
        summary.put("totalTickets", 0);
        summary.put("collectedKg", 0.0);
        summary.put("totalRequests", 0);
        summary.put("beneficiariesServed", 0);
        summary.put("mealsProvided", 0L);
        summary.put("co2SavedKg", 0.0);

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("period", period);
        report.put("summary", summary);
        report.put("categoryBreakdown", Map.of());
        report.put("statusBreakdown", Map.of());
        report.put("trend", List.of());
        report.put("donations", List.of());

        byte[] pdf = new ReportPdfService().build(report);
        assertTrue(pdf.length > 500);
    }

    private Map<String, Object> rowOf(String id, String name, String category, double kg, String status, String location, String createdAt) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("name", name);
        row.put("category", category);
        row.put("quantityKg", kg);
        row.put("status", status);
        row.put("pickupLocation", location);
        row.put("createdAt", createdAt);
        return row;
    }
}
