package com.foodshare.service;

import com.foodshare.model.Donation;
import com.foodshare.repository.DonationRepository;
import com.foodshare.util.ExpiryUtil;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Text-Based Chatbot Module.
 * A lightweight rule/keyword-based FAQ assistant that also answers live
 * availability questions from the current surplus food inventory. In
 * production this could be backed by an NLP framework such as Dialogflow,
 * or by an LLM call from the Python AI service; a deterministic keyword
 * matcher keeps this reference implementation dependency-free and fully
 * offline. Available to guests and pending accounts alike — it never
 * surfaces donor identity, only what's listed, how much, and where.
 */
@Service
public class ChatbotService {

    private static final Pattern CITY_PATTERN = Pattern.compile("\\bin\\s+([a-z][a-z\\s]{1,30}?)\\s*[\\?\\.!]*$");

    private final Map<List<String>, String> faq = new LinkedHashMap<>();
    private final DonationRepository donationRepository;

    public ChatbotService(DonationRepository donationRepository) {
        this.donationRepository = donationRepository;

        faq.put(List.of("donate", "publish", "list food", "surplus"),
                "To publish a donation: go to \"My Donations\", upload your inventory via CSV or add an item manually, then click \"Publish\" once it is flagged as surplus.");
        faq.put(List.of("expiry", "expire", "threshold", "near-expiry"),
                "Items are automatically flagged as surplus once they fall within the administrator-configured expiry threshold (default: 3 days). Admins can change this under Settings.");
        faq.put(List.of("request", "reserve", "beneficiary", "ngo", "charity", "cooked"),
                "Anyone can browse \"Available Food\" — even without an account, including cooked meals, which are usually the most time-sensitive listings. To submit a request with quantity needed and urgency, log in (or register) as a verified NGO/charity/farm — our AI service then ranks requests by urgency, distance, and capacity.");
        faq.put(List.of("ticket", "qr", "collect", "pickup"),
                "Once a request is approved, a collection ticket with a unique QR code is generated automatically. Show the QR code at pickup for verification.");
        faq.put(List.of("register", "sign up", "verify", "verification"),
                "NGOs, charities and farms can register from the sign-up page. An administrator will review and verify your organization before you can submit requests — you can browse available food while you wait.");
        faq.put(List.of("predict", "forecast", "ai"),
                "The AI Surplus Prediction module (powered by our Python microservice) analyzes historical donation data to forecast upcoming surplus by category.");
        faq.put(List.of("co2", "impact", "environment"),
                "Your Impact dashboard shows meals provided, waste diverted (kg), and estimated CO2 emissions saved based on the food you've redistributed.");
        faq.put(List.of("expired", "compost", "farm", "livestock"),
                "Items that pass their expiry date are automatically redirected to registered farms/composting facilities instead of being discarded as waste.");
    }

    public String reply(String message) {
        if (message == null || message.isBlank()) {
            return "Hi! Ask me what food is available near you, how verification works, donating, requesting food, tickets, or your impact stats.";
        }
        String lower = message.toLowerCase().trim();

        if (isAvailabilityQuestion(lower)) {
            return describeAvailableFood(extractCity(lower));
        }

        for (Map.Entry<List<String>, String> entry : faq.entrySet()) {
            for (String keyword : entry.getKey()) {
                if (lower.contains(keyword)) return entry.getValue();
            }
        }
        return "I'm not sure about that yet, but you can reach our support team from Help & Support. Try asking about available food near you, donating, requesting food, tickets/QR codes, or verification.";
    }

    private boolean isAvailabilityQuestion(String lower) {
        return lower.contains("available") || lower.contains("what food") || lower.contains("what's on")
                || lower.contains("any food") || (lower.contains("food") && (lower.contains("today") || lower.contains("now")));
    }

    private String extractCity(String lower) {
        Matcher m = CITY_PATTERN.matcher(lower);
        if (!m.find()) return null;
        String city = m.group(1).trim();
        // Avoid mis-capturing phrases like "in the app" / "in stock" as a city.
        List<String> stopWords = List.of("the app", "stock", "my area", "general", "total");
        if (stopWords.contains(city)) return null;
        return city;
    }

    /** Builds a live summary from published, still-claimable surplus — never includes donor identity or contact details. */
    private String describeAvailableFood(String city) {
        List<Donation> items = donationRepository.findByPublishedOrderByCreatedAtDesc(true).stream()
                .filter(d -> !"expired".equals(d.getStatus()) && !"collected".equals(d.getStatus()) && !"reserved".equals(d.getStatus()))
                .filter(d -> city == null || (d.getPickupLocation() != null && d.getPickupLocation().toLowerCase().contains(city)))
                .sorted(Comparator.comparing(Donation::getExpiryDate))
                .limit(5)
                .toList();

        if (items.isEmpty()) {
            return city == null
                    ? "There's nothing published right now — check the \"Available Food\" page again soon, new listings are added as donors publish them."
                    : "I couldn't find any surplus food currently listed near \"" + city + "\". Try the \"Available Food\" page for the full list, or check back soon.";
        }

        String list = items.stream()
                .map(d -> "• " + d.getName() + " — " + formatQty(d.getQuantityKg(), d.getUnit()) + " at " + d.getPickupLocation()
                        + " (" + urgencyLabel(ExpiryUtil.daysUntil(d.getExpiryDate())) + ")")
                .collect(Collectors.joining("\n"));

        String intro = city == null
                ? "Here's what's currently available:\n"
                : "Here's what's currently available near \"" + city + "\":\n";

        return intro + list
                + "\n\nLog in as a verified Beneficiary/NGO to request any of these — pickup details are shared once your request is approved.";
    }

    private String formatQty(Double quantityKg, String unit) {
        if (quantityKg == null) return "some";
        String u = (unit == null || unit.isBlank()) ? "kg" : unit;
        return (quantityKg == Math.floor(quantityKg) ? String.valueOf(quantityKg.intValue()) : String.valueOf(quantityKg)) + " " + u;
    }

    private String urgencyLabel(long daysLeft) {
        if (daysLeft <= 0) return "expires today";
        if (daysLeft == 1) return "1 day left";
        return daysLeft + " days left";
    }
}
