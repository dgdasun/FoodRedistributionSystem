package com.foodshare.service;

import com.foodshare.model.Donation;
import com.foodshare.model.FoodRequest;
import com.foodshare.model.Ticket;
import com.foodshare.model.User;
import com.foodshare.repository.DonationRepository;
import com.foodshare.repository.FoodRequestRepository;
import com.foodshare.repository.TicketRepository;
import com.foodshare.repository.UserRepository;
import com.foodshare.util.DonationUnits;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
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

    private static final Set<String> MEMBER_ROLES = Set.of("donor", "beneficiary", "farm");
    private static final int TOP_DONORS = 5;
    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("MMM d");
    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MMM yyyy");

    private final DonationRepository donationRepository;
    private final TicketRepository ticketRepository;
    private final FoodRequestRepository requestRepository;
    private final UserRepository userRepository;

    public ReportService(DonationRepository donationRepository, TicketRepository ticketRepository,
                          FoodRequestRepository requestRepository, UserRepository userRepository) {
        this.donationRepository = donationRepository;
        this.ticketRepository = ticketRepository;
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
    }

    /**
     * Dates are the admin's calendar days, so they're interpreted in the admin's
     * time zone - the server runs on UTC, which is a different date for part of
     * every day in Sri Lanka (UTC+05:30).
     */
    public Map<String, Object> generateReport(LocalDate startDate, LocalDate endDate, String timeZone) {
        ZoneId zone = resolveZone(timeZone);
        validateRange(startDate, endDate, zone);

        Instant rangeStart = startDate.atStartOfDay(zone).toInstant();
        Instant rangeEndExclusive = endDate.plusDays(1).atStartOfDay(zone).toInstant();

        // Only records people actually created count - the DataSeeder demo set
        // (see isRealRecord) would otherwise pad every report with sample data.
        List<Donation> donations = donationRepository.findAll().stream()
                .filter(d -> isRealRecord(d.getId()))
                .filter(d -> inRange(d.getCreatedAt(), rangeStart, rangeEndExclusive))
                .sorted(Comparator.comparing(Donation::getCreatedAt))
                .toList();

        // A ticket is real when the request it was issued for is real; approving
        // a demo request still produces a ticket, but for demo stock.
        List<Ticket> tickets = ticketRepository.findAll().stream()
                .filter(t -> isRealRecord(t.getRequestId()))
                .filter(t -> inRange(t.getCreatedAt(), rangeStart, rangeEndExclusive))
                .toList();

        List<FoodRequest> requests = requestRepository.findAll().stream()
                .filter(r -> isRealRecord(r.getId()))
                .filter(r -> inRange(r.getCreatedAt(), rangeStart, rangeEndExclusive))
                .toList();

        List<User> allUsers = userRepository.findAll();
        Map<String, User> usersById = allUsers.stream()
                .filter(u -> u.getId() != null)
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        List<User> joined = allUsers.stream()
                .filter(u -> isRealRecord(u.getId()))
                .filter(u -> MEMBER_ROLES.contains(u.getRole()))
                .filter(u -> inRange(u.getCreatedAt(), rangeStart, rangeEndExclusive))
                .sorted(Comparator.comparing(User::getCreatedAt).reversed())
                .toList();
        long donorsJoined = joined.stream().filter(u -> "donor".equals(u.getRole())).count();
        long beneficiariesJoined = joined.stream().filter(u -> "beneficiary".equals(u.getRole())).count();
        long farmsJoined = joined.stream().filter(u -> "farm".equals(u.getRole())).count();
        long joinedVerified = joined.stream().filter(u -> "approved".equals(u.getVerificationStatus())).count();
        long joinedPending = joined.stream().filter(u -> "pending".equals(u.getVerificationStatus())).count();
        long joinedRejected = joined.stream().filter(u -> "rejected".equals(u.getVerificationStatus())).count();

        List<Map<String, Object>> memberRows = joined.stream().map(u -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", u.getId());
            row.put("name", u.getName());
            row.put("organizationName", u.getOrganizationName());
            row.put("role", u.getRole());
            row.put("location", u.getLocation());
            row.put("verificationStatus", u.getVerificationStatus());
            row.put("joinedAt", u.getCreatedAt().atZone(zone).toLocalDate().toString());
            return row;
        }).toList();

        // Collected requests were approved first, and a counter-offer is still
        // waiting on the beneficiary, so both fold into the outcome they mean.
        Map<String, Long> requestOutcomes = new LinkedHashMap<>();
        requestOutcomes.put("approved", 0L);
        requestOutcomes.put("pending", 0L);
        requestOutcomes.put("rejected", 0L);
        requestOutcomes.put("cancelled", 0L);
        for (FoodRequest r : requests) {
            String s = r.getStatus() == null ? "pending" : r.getStatus();
            String outcome = switch (s) {
                case "approved", "collected" -> "approved";
                case "rejected" -> "rejected";
                case "cancelled" -> "cancelled";
                default -> "pending";
            };
            requestOutcomes.merge(outcome, 1L, Long::sum);
        }
        long decided = requestOutcomes.get("approved") + requestOutcomes.get("rejected");
        Integer approvalRate = decided == 0 ? null
                : (int) Math.round(requestOutcomes.get("approved") * 100.0 / decided);

        // Expired food sent to farms, kept apart by measure: kilograms and liters
        // are never added together. Packets count by what they hold; packets
        // listed without a size can't be weighed, so they're counted on their own.
        double expiredKg = 0, expiredLiters = 0, expiredUnsizedPackets = 0;
        for (Donation d : donations) {
            if (!"expired".equals(d.getStatus())) continue;
            double qty = kg(d);
            switch (DonationUnits.of(d.getUnit())) {
                case DonationUnits.LITERS -> expiredLiters += qty;
                case DonationUnits.ITEMS -> {
                    if (d.getPackSize() != null && d.getPackSize() > 0) {
                        if (DonationUnits.LITERS.equals(DonationUnits.of(d.getPackUnit()))) {
                            expiredLiters += qty * d.getPackSize();
                        } else {
                            expiredKg += qty * d.getPackSize();
                        }
                    } else {
                        expiredUnsizedPackets += qty;
                    }
                }
                default -> expiredKg += qty;
            }
        }

        Map<String, Double> donorTotals = new LinkedHashMap<>();
        for (Donation d : donations) {
            User donor = usersById.get(d.getDonorId());
            String label = donor == null ? "Unknown donor" : displayName(donor);
            donorTotals.merge(label, kg(d), Double::sum);
        }
        Map<String, Double> topDonors = donorTotals.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(TOP_DONORS)
                .collect(Collectors.toMap(Map.Entry::getKey, e -> round1(e.getValue()), (a, b) -> a, LinkedHashMap::new));
        long activeDonors = donations.stream().map(Donation::getDonorId).filter(Objects::nonNull).distinct().count();

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
        List<Map<String, Object>> trend = buildTrend(donations, startDate, endDate, groupByMonth, zone);

        List<Map<String, Object>> donationRows = donations.stream().map(d -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", d.getId());
            row.put("name", d.getName());
            row.put("category", d.getCategory());
            row.put("quantityKg", d.getQuantityKg());
            row.put("status", d.getStatus());
            row.put("pickupLocation", d.getPickupLocation());
            row.put("createdAt", d.getCreatedAt().atZone(zone).toLocalDate().toString());
            return row;
        }).sorted((a, b) -> ((String) b.get("createdAt")).compareTo((String) a.get("createdAt"))).toList();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("donorsJoined", donorsJoined);
        summary.put("beneficiariesJoined", beneficiariesJoined);
        summary.put("farmsJoined", farmsJoined);
        summary.put("membersJoined", joined.size());
        summary.put("joinedVerified", joinedVerified);
        summary.put("joinedPending", joinedPending);
        summary.put("joinedRejected", joinedRejected);
        summary.put("totalRequests", requests.size());
        summary.put("requestApprovalRate", approvalRate);
        summary.put("totalTickets", tickets.size());
        summary.put("activeDonors", activeDonors);
        summary.put("expiredKg", round1(expiredKg));
        summary.put("expiredLiters", round1(expiredLiters));
        summary.put("expiredUnsizedPackets", (long) expiredUnsizedPackets);

        Map<String, Object> period = new LinkedHashMap<>();
        period.put("startDate", startDate.toString());
        period.put("endDate", endDate.toString());
        period.put("groupedBy", groupByMonth ? "month" : "day");
        period.put("timeZone", zone.getId());
        period.put("generatedOn", LocalDate.now(zone).toString());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period", period);
        result.put("summary", summary);
        result.put("categoryBreakdown", categoryBreakdown);
        result.put("statusBreakdown", statusBreakdown);
        result.put("trend", trend);
        result.put("requestOutcomes", requestOutcomes);
        result.put("topDonors", topDonors);
        result.put("members", memberRows);
        result.put("donations", donationRows);
        return result;
    }

    private static String displayName(User u) {
        String org = u.getOrganizationName();
        return org != null && !org.isBlank() ? org : (u.getName() != null ? u.getName() : "Unnamed");
    }

    /**
     * Everything the app writes gets a MongoDB ObjectId, while DataSeeder's demo
     * records use readable ids ("u-donor-1", "d-1001", "r-3"). That makes the id
     * a reliable way to keep the sample dataset out of real reports.
     */
    private static boolean isRealRecord(String id) {
        return id != null && ObjectId.isValid(id);
    }

    private ZoneId resolveZone(String timeZone) {
        if (timeZone == null || timeZone.isBlank()) return ZoneOffset.UTC;
        try {
            return ZoneId.of(timeZone.trim());
        } catch (java.time.DateTimeException e) {
            throw new IllegalArgumentException("Unknown time zone: " + timeZone);
        }
    }

    private void validateRange(LocalDate startDate, LocalDate endDate, ZoneId zone) {
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("startDate and endDate are required (yyyy-MM-dd)");
        }
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("endDate cannot be before startDate");
        }
        LocalDate today = LocalDate.now(zone);
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

    private List<Map<String, Object>> buildTrend(List<Donation> donations, LocalDate startDate, LocalDate endDate,
                                                 boolean groupByMonth, ZoneId zone) {
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
            LocalDate created = d.getCreatedAt().atZone(zone).toLocalDate();
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
