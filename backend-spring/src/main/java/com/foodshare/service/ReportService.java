package com.foodshare.service;

import com.foodshare.model.Donation;
import com.foodshare.model.FoodRequest;
import com.foodshare.model.Ticket;
import com.foodshare.repository.DonationRepository;
import com.foodshare.repository.FoodRequestRepository;
import com.foodshare.repository.TicketRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Builds admin report data for an arbitrary date range (year/month/day granularity
 * is resolved into a start/end date on the frontend). Reports are limited to the
 * last two years so the underlying scans stay cheap on the demo dataset.
 */
@Service
public class ReportService {

    private static final double MEALS_PER_KG = 2.0;
    private static final double CO2_KG_SAVED_PER_KG_FOOD = 2.5;
    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("MMM d");
    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MMM yyyy");

    private final DonationRepository donationRepository;
    private final TicketRepository ticketRepository;
    private final FoodRequestRepository requestRepository;

    public ReportService(DonationRepository donationRepository, TicketRepository ticketRepository,
                          FoodRequestRepository requestRepository) {
        this.donationRepository = donationRepository;
        this.ticketRepository = ticketRepository;
        this.requestRepository = requestRepository;
    }

    public Map<String, Object> generateReport(LocalDate startDate, LocalDate endDate) {
        validateRange(startDate, endDate);

        Instant rangeStart = startDate.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant rangeEndExclusive = endDate.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        List<Donation> donations = donationRepository.findAll().stream()
                .filter(d -> inRange(d.getCreatedAt(), rangeStart, rangeEndExclusive))
                .sorted(Comparator.comparing(Donation::getCreatedAt))
                .toList();

        List<Ticket> tickets = ticketRepository.findAll().stream()
                .filter(t -> inRange(t.getCreatedAt(), rangeStart, rangeEndExclusive))
                .toList();

        List<FoodRequest> requests = requestRepository.findAll().stream()
                .filter(r -> inRange(r.getCreatedAt(), rangeStart, rangeEndExclusive))
                .toList();

        double totalQuantityKg = donations.stream().mapToDouble(this::kg).sum();
        double collectedKg = tickets.stream().filter(t -> "collected".equals(t.getStatus())).mapToDouble(this::kg).sum();
        Set<String> beneficiariesServed = tickets.stream()
                .map(Ticket::getBeneficiaryId).filter(Objects::nonNull).collect(Collectors.toSet());

        Map<String, Double> categoryBreakdown = new LinkedHashMap<>();
        for (Donation d : donations) {
            String cat = d.getCategory() != null ? d.getCategory() : "Other";
            categoryBreakdown.merge(cat, kg(d), Double::sum);
        }
        categoryBreakdown = categoryBreakdown.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .collect(Collectors.toMap(Map.Entry::getKey, e -> round1(e.getValue()), (a, b) -> a, LinkedHashMap::new));

        Map<String, Long> statusBreakdown = donations.stream()
                .collect(Collectors.groupingBy(d -> d.getStatus() == null ? "unknown" : d.getStatus(),
                        LinkedHashMap::new, Collectors.counting()));

        boolean groupByMonth = ChronoUnit.DAYS.between(startDate, endDate) + 1 > 31;
        List<Map<String, Object>> trend = buildTrend(donations, startDate, endDate, groupByMonth);

        List<Map<String, Object>> donationRows = donations.stream().map(d -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", d.getId());
            row.put("name", d.getName());
            row.put("category", d.getCategory());
            row.put("quantityKg", d.getQuantityKg());
            row.put("status", d.getStatus());
            row.put("pickupLocation", d.getPickupLocation());
            row.put("createdAt", d.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate().toString());
            return row;
        }).sorted((a, b) -> ((String) b.get("createdAt")).compareTo((String) a.get("createdAt"))).toList();

        double mealsProvided = Math.round(totalQuantityKg * MEALS_PER_KG);
        double co2SavedKg = round1(totalQuantityKg * CO2_KG_SAVED_PER_KG_FOOD);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalDonations", donations.size());
        summary.put("totalQuantityKg", round1(totalQuantityKg));
        summary.put("totalTickets", tickets.size());
        summary.put("collectedKg", round1(collectedKg));
        summary.put("totalRequests", requests.size());
        summary.put("beneficiariesServed", beneficiariesServed.size());
        summary.put("mealsProvided", (long) mealsProvided);
        summary.put("co2SavedKg", co2SavedKg);

        Map<String, Object> period = new LinkedHashMap<>();
        period.put("startDate", startDate.toString());
        period.put("endDate", endDate.toString());
        period.put("groupedBy", groupByMonth ? "month" : "day");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period", period);
        result.put("summary", summary);
        result.put("categoryBreakdown", categoryBreakdown);
        result.put("statusBreakdown", statusBreakdown);
        result.put("trend", trend);
        result.put("donations", donationRows);
        return result;
    }

    private void validateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("startDate and endDate are required (yyyy-MM-dd)");
        }
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("endDate cannot be before startDate");
        }
        LocalDate today = LocalDate.now();
        if (endDate.isAfter(today)) {
            throw new IllegalArgumentException("endDate cannot be in the future");
        }
        if (startDate.isBefore(today.minusYears(2))) {
            throw new IllegalArgumentException("Reports can only be generated for the last two years");
        }
    }

    private boolean inRange(Instant value, Instant startInclusive, Instant endExclusive) {
        return value != null && !value.isBefore(startInclusive) && value.isBefore(endExclusive);
    }

    private double kg(Donation d) {
        return d.getQuantityKg() != null ? d.getQuantityKg() : 0;
    }

    private double kg(Ticket t) {
        return t.getQuantityKg() != null ? t.getQuantityKg() : 0;
    }

    private double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }

    private List<Map<String, Object>> buildTrend(List<Donation> donations, LocalDate startDate, LocalDate endDate, boolean groupByMonth) {
        Map<String, double[]> buckets = new LinkedHashMap<>();
        if (groupByMonth) {
            YearMonth cursor = YearMonth.from(startDate);
            YearMonth end = YearMonth.from(endDate);
            while (!cursor.isAfter(end)) {
                buckets.put(cursor.atDay(1).format(MONTH_LABEL), new double[]{0, 0});
                cursor = cursor.plusMonths(1);
            }
        } else {
            LocalDate cursor = startDate;
            while (!cursor.isAfter(endDate)) {
                buckets.put(cursor.format(DAY_LABEL), new double[]{0, 0});
                cursor = cursor.plusDays(1);
            }
        }

        for (Donation d : donations) {
            LocalDate created = d.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate();
            String label = groupByMonth ? YearMonth.from(created).atDay(1).format(MONTH_LABEL) : created.format(DAY_LABEL);
            double[] bucket = buckets.get(label);
            if (bucket != null) {
                bucket[0] += 1;
                bucket[1] += kg(d);
            }
        }

        List<Map<String, Object>> trend = new ArrayList<>();
        for (Map.Entry<String, double[]> e : buckets.entrySet()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("label", e.getKey());
            row.put("donations", (int) e.getValue()[0]);
            row.put("quantityKg", round1(e.getValue()[1]));
            trend.add(row);
        }
        return trend;
    }
}
