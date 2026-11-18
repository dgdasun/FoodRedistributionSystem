package com.foodshare.service;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfTemplate;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Renders a generated report (see ReportService) as a readable, downloadable PDF.
 */
@Service
public class ReportPdfService {

    private static final Color BRAND_GREEN = new Color(0x16, 0x5B, 0x36);
    private static final Color ACCENT_GREEN = new Color(0x2F, 0x9A, 0x59);
    private static final Color TRACK = new Color(0xE8, 0xF3, 0xEC);
    private static final Color INK = new Color(0x0F, 0x17, 0x2A);
    private static final Color MUTED = new Color(0x64, 0x74, 0x8B);
    private static final Color BORDER = new Color(0xE2, 0xE8, 0xF0);
    private static final Color PALE_GREEN = new Color(0xF3, 0xF8, 0xF4);
    private static final Color PALE_BLUE = new Color(0xF1, 0xF5, 0xFA);
    private static final Color PALE_VIOLET = new Color(0xF5, 0xF2, 0xFA);
    private static final Color AMBER = new Color(0xC2, 0x7A, 0x16);
    private static final Color RED = new Color(0xC2, 0x4B, 0x4B);
    private static final Color NEUTRAL = new Color(0x94, 0xA3, 0xB8);

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 23, Font.BOLD, Color.WHITE);
    private static final Font SUBTITLE_FONT = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(0xDF, 0xED, 0xE3));
    private static final Font SECTION_FONT = new Font(Font.HELVETICA, 13, Font.BOLD, INK);
    private static final Font STAT_LABEL_FONT = new Font(Font.HELVETICA, 8, Font.NORMAL, MUTED);
    private static final Font STAT_VALUE_FONT = new Font(Font.HELVETICA, 17, Font.BOLD, INK);
    private static final Font ROW_LABEL_FONT = new Font(Font.HELVETICA, 8.5f, Font.NORMAL, INK);
    private static final Font ROW_VALUE_FONT = new Font(Font.HELVETICA, 8.5f, Font.BOLD, INK);
    private static final Font TABLE_HEADER_FONT = new Font(Font.HELVETICA, 8.5f, Font.BOLD, Color.WHITE);
    private static final Font TABLE_CELL_FONT = new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(0x33, 0x41, 0x55));
    private static final Font EMPTY_FONT = new Font(Font.HELVETICA, 9, Font.ITALIC, MUTED);
    private static final Font FOOTER_FONT = new Font(Font.HELVETICA, 8, Font.NORMAL, MUTED);
    private static final Font AXIS_FONT = new Font(Font.HELVETICA, 6.5f, Font.NORMAL, MUTED);
    private static final Font BAR_VALUE_FONT = new Font(Font.HELVETICA, 7, Font.BOLD, INK);
    private static final Font TREND_NOTE_FONT = new Font(Font.HELVETICA, 9, Font.NORMAL, MUTED);
    private static final Font DONUT_TOTAL_FONT = new Font(Font.HELVETICA, 16, Font.BOLD, INK);

    @SuppressWarnings("unchecked")
    public byte[] build(Map<String, Object> report) {
        Document document = new Document(PageSize.A4.rotate(), 32, 32, 34, 38);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new ReportPageFooter());
            document.open();

            Map<String, Object> period = (Map<String, Object>) report.get("period");
            Map<String, Object> summary = (Map<String, Object>) report.get("summary");
            Map<String, Double> categoryBreakdown = (Map<String, Double>) report.get("categoryBreakdown");
            Map<String, Long> statusBreakdown = (Map<String, Long>) report.get("statusBreakdown");
            List<Map<String, Object>> trend = (List<Map<String, Object>>) report.get("trend");
            List<Map<String, Object>> donations = (List<Map<String, Object>>) report.get("donations");
            List<Map<String, Object>> members = (List<Map<String, Object>>) report.get("members");
            Map<String, Long> requestOutcomes = (Map<String, Long>) report.get("requestOutcomes");
            Map<String, Double> topDonors = (Map<String, Double>) report.get("topDonors");

            addReportHeader(document, period);
            addSummarySection(document, summary);
            addHighlights(document, summary);
            // Sections follow the same order as the Generate Reports page.
            addMembersTable(document, members);
            addTrendChart(document, writer,
                    "day".equals(period.get("groupedBy")) ? "Daily trend" : "Monthly trend", trend);
            addBreakdownSections(document,
                    barSectionCell("Donations by category", categoryBreakdown, this::formatKg),
                    donutSectionCell(writer, "Donation status", statusToMap(statusBreakdown), "donations"));
            addBreakdownSections(document,
                    donutSectionCell(writer, "Request outcomes", statusToMap(requestOutcomes), "requests"),
                    barSectionCell("Top donors (kg listed)", topDonors, this::formatKg));
            addDonationsTable(document, donations);

            document.close();
        } catch (DocumentException e) {
            throw new RuntimeException("Failed to generate PDF report", e);
        }
        return out.toByteArray();
    }

    private java.util.LinkedHashMap<String, Double> trendToMap(List<Map<String, Object>> trend) {
        LinkedHashMap<String, Double> map = new LinkedHashMap<>();
        if (trend == null) return map;
        for (Map<String, Object> row : trend) {
            Object qty = row.get("quantityKg");
            double quantity = qty instanceof Number ? ((Number) qty).doubleValue() : 0;
            if (quantity > 0) {
                map.put(String.valueOf(row.get("label")), quantity);
            }
        }
        return map;
    }

    /** Total and peak - the same facts the page shows as chips beside its trend chart. */
    private String trendNote(Map<String, Double> activePeriods) {
        if (activePeriods.isEmpty()) return null;
        double total = activePeriods.values().stream().mapToDouble(Double::doubleValue).sum();
        Map.Entry<String, Double> peak = activePeriods.entrySet().stream()
                .max(Map.Entry.comparingByValue()).orElseThrow();
        return formatKg(total) + " total  |  Peak: " + peak.getKey() + " (" + formatKg(peak.getValue()) + ")";
    }

    /**
     * Column chart of kg listed per period, every period shown (zeros included),
     * mirroring the page's trend chart rather than a list of non-empty rows.
     */
    private void addTrendChart(Document document, PdfWriter writer, String title,
                               List<Map<String, Object>> trend) throws DocumentException {
        Map<String, Double> active = trendToMap(trend);
        String note = trendNote(active);

        if (trend == null || trend.isEmpty() || active.isEmpty()) {
            addSectionTitle(document, title);
            document.add(new Paragraph("No donations were listed in this period.", EMPTY_FONT));
            document.add(new Paragraph(" "));
            return;
        }

        float width = document.right() - document.left();
        float height = 190;
        float left = 44, right = 8, bottom = 26, top = 16;
        float plotW = width - left - right;
        float plotH = height - bottom - top;

        double max = active.values().stream().mapToDouble(Double::doubleValue).max().orElse(1);
        double axisMax = niceCeiling(max);

        PdfTemplate t = writer.getDirectContent().createTemplate(width, height);

        // Gridlines with kg labels on the left axis.
        int ticks = 4;
        t.setLineWidth(0.5f);
        for (int i = 0; i <= ticks; i++) {
            float y = bottom + plotH * i / ticks;
            t.setColorStroke(i == 0 ? MUTED : BORDER);
            t.moveTo(left, y);
            t.lineTo(width - right, y);
            t.stroke();
            ColumnText.showTextAligned(t, Element.ALIGN_RIGHT,
                    new Phrase(formatNumber(axisMax * i / ticks), AXIS_FONT), left - 5, y - 2.5f, 0);
        }

        int n = trend.size();
        float slot = plotW / n;
        float barW = Math.min(42f, slot * 0.62f);
        // Keep x labels from colliding on long daily ranges.
        int labelEvery = slot < 20 ? 2 : 1;
        for (int i = 0; i < n; i++) {
            Map<String, Object> row = trend.get(i);
            double v = toDouble(row.get("quantityKg"));
            float cx = left + slot * i + slot / 2;
            float h = (float) (v / axisMax * plotH);
            if (h > 0) {
                t.setColorFill(ACCENT_GREEN);
                t.rectangle(cx - barW / 2, bottom, barW, h);
                t.fill();
                ColumnText.showTextAligned(t, Element.ALIGN_CENTER,
                        new Phrase(formatNumber(v), BAR_VALUE_FONT), cx, bottom + h + 3, 0);
            }
            if (i % labelEvery == 0) {
                ColumnText.showTextAligned(t, Element.ALIGN_CENTER,
                        new Phrase(String.valueOf(row.get("label")), AXIS_FONT), cx, bottom - 11, 0);
            }
        }
        ColumnText.showTextAligned(t, Element.ALIGN_LEFT, new Phrase("kg", AXIS_FONT), 2, height - 10, 0);

        // Heading and chart in one unbreakable table so the title never strands at a page foot.
        PdfPTable holder = new PdfPTable(1);
        holder.setWidthPercentage(100);
        holder.setSpacingAfter(12);
        holder.setKeepTogether(true);

        Paragraph heading = new Paragraph();
        heading.add(new com.lowagie.text.Chunk(title, SECTION_FONT));
        heading.add(new com.lowagie.text.Chunk("     " + note, TREND_NOTE_FONT));
        PdfPCell headingCell = new PdfPCell(heading);
        headingCell.setBorder(Rectangle.NO_BORDER);
        headingCell.setPaddingLeft(0);
        headingCell.setPaddingBottom(7);
        holder.addCell(headingCell);

        PdfPCell cell = new PdfPCell(Image.getInstance(t), false);
        cell.setBorderColor(BORDER);
        cell.setPadding(6);
        holder.addCell(cell);
        document.add(holder);
    }

    private double niceCeiling(double value) {
        if (value <= 0) return 1;
        double magnitude = Math.pow(10, Math.floor(Math.log10(value)));
        for (double step : new double[]{1, 2, 2.5, 5, 10}) {
            if (step * magnitude >= value) return step * magnitude;
        }
        return 10 * magnitude;
    }

    /** A donut with a total in the middle and a labelled legend, like the page's StatusDonut. */
    private PdfPCell donutSectionCell(PdfWriter writer, String title, Map<String, Double> data, String unit)
            throws DocumentException {
        PdfPCell cell = new PdfPCell();
        cell.setBorderColor(BORDER);
        cell.setBackgroundColor(PALE_GREEN);
        cell.setPadding(10);

        Paragraph heading = new Paragraph(title, SECTION_FONT);
        heading.setSpacingAfter(7);
        cell.addElement(heading);

        double total = data == null ? 0 : data.values().stream().mapToDouble(v -> v == null ? 0 : v).sum();
        if (total <= 0) {
            cell.addElement(new Paragraph("Nothing recorded in this period.", EMPTY_FONT));
            return cell;
        }

        float size = 132;
        float cx = size / 2, cy = size / 2, outer = 62, inner = 39;
        PdfTemplate t = writer.getDirectContent().createTemplate(size, size);

        double angle = 90; // start at 12 o'clock and run clockwise
        for (Map.Entry<String, Double> e : data.entrySet()) {
            double v = e.getValue() == null ? 0 : e.getValue();
            if (v <= 0) continue;
            double sweep = v / total * 360;
            t.setColorFill(statusColor(e.getKey()));
            t.moveTo(cx, cy);
            int steps = Math.max(2, (int) Math.ceil(sweep / 3));
            for (int s = 0; s <= steps; s++) {
                double a = Math.toRadians(angle - sweep * s / steps);
                t.lineTo(cx + (float) (outer * Math.cos(a)), cy + (float) (outer * Math.sin(a)));
            }
            t.closePath();
            t.fill();
            angle -= sweep;
        }
        // Thin white seams between slices, then punch out the hole.
        if (data.values().stream().filter(v -> v != null && v > 0).count() > 1) {
            angle = 90;
            t.setColorStroke(PALE_GREEN);
            t.setLineWidth(1.5f);
            for (Double v : data.values()) {
                if (v == null || v <= 0) continue;
                double a = Math.toRadians(angle);
                t.moveTo(cx, cy);
                t.lineTo(cx + (float) (outer * Math.cos(a)), cy + (float) (outer * Math.sin(a)));
                t.stroke();
                angle -= v / total * 360;
            }
        }
        t.setColorFill(PALE_GREEN);
        t.circle(cx, cy, inner);
        t.fill();
        ColumnText.showTextAligned(t, Element.ALIGN_CENTER,
                new Phrase(formatCount(total), DONUT_TOTAL_FONT), cx, cy - 1, 0);
        ColumnText.showTextAligned(t, Element.ALIGN_CENTER,
                new Phrase("total " + unit, AXIS_FONT), cx, cy - 13, 0);

        PdfPTable layout = new PdfPTable(new float[]{140f, 200f});
        layout.setWidthPercentage(100);
        PdfPCell chartCell = new PdfPCell(Image.getInstance(t), false);
        chartCell.setBorder(Rectangle.NO_BORDER);
        chartCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        layout.addCell(chartCell);

        PdfPTable legend = new PdfPTable(new float[]{10f, 90f, 40f, 40f});
        legend.setWidthPercentage(100);
        for (Map.Entry<String, Double> e : data.entrySet()) {
            double v = e.getValue() == null ? 0 : e.getValue();
            PdfPCell swatch = new PdfPCell();
            swatch.setFixedHeight(8);
            swatch.setBackgroundColor(statusColor(e.getKey()));
            swatch.setBorder(Rectangle.NO_BORDER);
            swatch.setPaddingTop(4);
            PdfPCell swatchHolder = new PdfPCell(nested(swatch));
            swatchHolder.setBorder(Rectangle.NO_BORDER);
            swatchHolder.setVerticalAlignment(Element.ALIGN_MIDDLE);
            swatchHolder.setPadding(3);
            legend.addCell(swatchHolder);
            legend.addCell(legendCell(titleCase(e.getKey()), ROW_LABEL_FONT, Element.ALIGN_LEFT));
            legend.addCell(legendCell(formatCount(v), ROW_VALUE_FONT, Element.ALIGN_RIGHT));
            legend.addCell(legendCell(Math.round(v / total * 100) + "%", ROW_LABEL_FONT, Element.ALIGN_RIGHT));
        }
        PdfPCell legendHolder = new PdfPCell(legend);
        legendHolder.setBorder(Rectangle.NO_BORDER);
        legendHolder.setVerticalAlignment(Element.ALIGN_MIDDLE);
        layout.addCell(legendHolder);

        cell.addElement(layout);
        return cell;
    }

    private PdfPTable nested(PdfPCell only) {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);
        t.addCell(only);
        return t;
    }

    private PdfPCell legendCell(String text, Font font, int align) {
        PdfPCell c = new PdfPCell(new Phrase(text, font));
        c.setBorder(Rectangle.NO_BORDER);
        c.setHorizontalAlignment(align);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        c.setPaddingTop(4);
        c.setPaddingBottom(4);
        return c;
    }

    private LinkedHashMap<String, Double> statusToMap(Map<String, Long> statusBreakdown) {
        LinkedHashMap<String, Double> map = new LinkedHashMap<>();
        if (statusBreakdown != null) {
            statusBreakdown.forEach((status, count) -> map.put(status, count == null ? 0 : count.doubleValue()));
        }
        return map;
    }

    private void addReportHeader(Document document, Map<String, Object> period) throws DocumentException {
        PdfPTable header = new PdfPTable(new float[]{3f, 1f});
        header.setWidthPercentage(100);
        header.setSpacingAfter(18);

        PdfPCell titleCell = new PdfPCell();
        titleCell.setBackgroundColor(BRAND_GREEN);
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleCell.setPadding(18);
        titleCell.addElement(new Paragraph("Zero Waste Activity Report", TITLE_FONT));
        long days = java.time.temporal.ChronoUnit.DAYS.between(
                LocalDate.parse(String.valueOf(period.get("startDate"))),
                LocalDate.parse(String.valueOf(period.get("endDate")))) + 1;
        titleCell.addElement(new Paragraph(
                formatDate(period.get("startDate")) + "  -  " + formatDate(period.get("endDate"))
                        + "   |   " + days + " day" + (days == 1 ? "" : "s")
                        + "  |  grouped by " + period.get("groupedBy"),
                SUBTITLE_FONT));
        header.addCell(titleCell);

        PdfPCell generatedCell = new PdfPCell();
        generatedCell.setBackgroundColor(BRAND_GREEN);
        generatedCell.setBorder(Rectangle.NO_BORDER);
        generatedCell.setPadding(18);
        generatedCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        generatedCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        Paragraph generated = new Paragraph();
        generated.setAlignment(Element.ALIGN_RIGHT);
        generated.add(new com.lowagie.text.Chunk("REPORT GENERATED\n",
                new Font(Font.HELVETICA, 7.5f, Font.BOLD, new Color(0xB8, 0xD5, 0xC2))));
        generated.add(new com.lowagie.text.Chunk(
                formatDate(period.getOrDefault("generatedOn", LocalDate.now().toString())),
                new Font(Font.HELVETICA, 11, Font.BOLD, Color.WHITE)));
        generatedCell.addElement(generated);
        header.addCell(generatedCell);

        document.add(header);
    }

    private void addSummarySection(Document document, Map<String, Object> summary) throws DocumentException {
        addSectionTitle(document, "Summary");
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1, 1, 1, 1});
        // No gap: the row below continues the same grid.
        table.addCell(metricCell("DONORS JOINED", formatCount(toDouble(summary.get("donorsJoined"))), PALE_GREEN));
        table.addCell(metricCell("BENEFICIARIES JOINED", formatCount(toDouble(summary.get("beneficiariesJoined"))), PALE_BLUE));
        table.addCell(metricCell("FARMS JOINED", formatCount(toDouble(summary.get("farmsJoined"))), PALE_VIOLET));
        table.addCell(metricCell("NEW MEMBERS (TOTAL)", formatCount(toDouble(summary.get("membersJoined"))), PALE_GREEN));
        document.add(table);

        PdfPTable activity = new PdfPTable(3);
        activity.setWidthPercentage(100);
        activity.setWidths(new float[]{1, 1, 1});
        activity.setSpacingAfter(12);
        activity.addCell(metricCell("REQUESTS RECEIVED", formatCount(toDouble(summary.get("totalRequests"))), Color.WHITE));
        Object rate = summary.get("requestApprovalRate");
        activity.addCell(metricCell("REQUEST APPROVAL RATE", rate == null ? "-" : formatCount(toDouble(rate)) + "%", Color.WHITE));
        activity.addCell(metricCell("PICKUP TICKETS ISSUED", formatCount(toDouble(summary.get("totalTickets"))), Color.WHITE));
        document.add(activity);
    }

    private PdfPCell metricCell(String label, String value, Color background) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.BOX);
        cell.setBorderColor(BORDER);
        cell.setPadding(11);
        cell.setMinimumHeight(61);
        cell.setBackgroundColor(background);
        cell.addElement(new Paragraph(label, STAT_LABEL_FONT));
        Paragraph amount = new Paragraph(value, STAT_VALUE_FONT);
        amount.setSpacingBefore(4);
        cell.addElement(amount);
        return cell;
    }

    private void addHighlights(Document document, Map<String, Object> summary) throws DocumentException {
        PdfPCell impact = new PdfPCell();
        impact.setBackgroundColor(BRAND_GREEN);
        impact.setBorder(Rectangle.NO_BORDER);
        impact.setPadding(12);
        Paragraph text = new Paragraph();
        text.add(new com.lowagie.text.Chunk(
                formatCount(toDouble(summary.get("membersJoined"))) + " new members joined",
                new Font(Font.HELVETICA, 11, Font.BOLD, Color.WHITE)));
        text.add(new com.lowagie.text.Chunk(
                "  |  " + formatCount(toDouble(summary.get("joinedVerified"))) + " verified, "
                        + formatCount(toDouble(summary.get("joinedPending"))) + " awaiting review, "
                        + formatCount(toDouble(summary.get("joinedRejected"))) + " rejected"
                        + "  |  " + plural(toDouble(summary.get("activeDonors")), "donor") + " listed food in this period",
                new Font(Font.HELVETICA, 10, Font.NORMAL, Color.WHITE)));
        impact.addElement(text);

        PdfPTable banner = new PdfPTable(1);
        banner.setWidthPercentage(100);
        banner.setSpacingAfter(13);
        banner.addCell(impact);
        document.add(banner);
    }

    private void addBreakdownSections(Document document, PdfPCell left, PdfPCell right) throws DocumentException {
        PdfPTable columns = new PdfPTable(new float[]{1, 1});
        columns.setWidthPercentage(100);
        columns.setWidths(new float[]{1, 1});
        columns.setSpacingAfter(12);
        // Keep each chart pair together rather than splitting a donut across pages.
        columns.setKeepTogether(true);
        columns.addCell(left);
        columns.addCell(right);
        document.add(columns);
    }

    private void addMembersTable(Document document, List<Map<String, Object>> members) throws DocumentException {
        addSectionTitle(document, "New members joined");

        if (members == null || members.isEmpty()) {
            document.add(new Paragraph("No donors, beneficiaries or farms joined in this period.", EMPTY_FONT));
            document.add(new Paragraph(" "));
            return;
        }

        PdfPTable table = new PdfPTable(new float[]{72f, 130f, 170f, 80f, 190f, 90f});
        table.setWidthPercentage(100);
        table.setHeaderRows(1);
        table.setSplitRows(true);
        table.setSpacingAfter(12);

        String[] headers = {"DATE JOINED", "NAME", "ORGANIZATION", "ROLE", "LOCATION", "VERIFICATION"};
        for (String h : headers) {
            PdfPCell headerCell = new PdfPCell(new Phrase(h, TABLE_HEADER_FONT));
            headerCell.setBackgroundColor(BRAND_GREEN);
            headerCell.setPadding(8);
            headerCell.setBorderColor(BRAND_GREEN);
            table.addCell(headerCell);
        }

        boolean stripe = false;
        for (Map<String, Object> m : members) {
            Color bg = stripe ? PALE_GREEN : Color.WHITE;
            stripe = !stripe;
            table.addCell(dataCell(formatDate(m.get("joinedAt")), bg));
            table.addCell(dataCell(textOrDash(m.get("name")), bg));
            table.addCell(dataCell(textOrDash(m.get("organizationName")), bg));
            table.addCell(dataCell(titleCase(textOrDash(m.get("role"))), bg));
            table.addCell(dataCell(textOrDash(m.get("location")), bg));
            table.addCell(dataCell(titleCase(textOrDash(m.get("verificationStatus"))), bg));
        }
        document.add(table);
    }

    private PdfPCell barSectionCell(String title, Map<String, Double> data,
                                    java.util.function.DoubleFunction<String> formatter) {
        PdfPCell cell = new PdfPCell();
        cell.setBorderColor(BORDER);
        cell.setBackgroundColor(PALE_GREEN);
        cell.setPadding(10);

        Paragraph heading = new Paragraph(title, SECTION_FONT);
        heading.setSpacingAfter(7);
        cell.addElement(heading);
        if (data == null || data.isEmpty()) {
            cell.addElement(new Paragraph("Nothing recorded in this period.", EMPTY_FONT));
            return cell;
        }
        cell.addElement(createBars(data, formatter));
        return cell;
    }

    private void addSectionTitle(Document document, String title) throws DocumentException {
        Paragraph heading = new Paragraph(title, SECTION_FONT);
        heading.setSpacingBefore(2);
        heading.setSpacingAfter(7);
        document.add(heading);
    }

    private PdfPTable createBars(Map<String, Double> data, java.util.function.DoubleFunction<String> formatter) {
        double max = data.values().stream().mapToDouble(v -> v == null ? 0 : v).max().orElse(1);
        if (max <= 0) max = 1;

        float trackWidth = 160f;
        PdfPTable rows = new PdfPTable(new float[]{110f, trackWidth, 55f});
        rows.setWidthPercentage(100);
        for (Map.Entry<String, Double> entry : data.entrySet()) {
            double val = entry.getValue() == null ? 0 : entry.getValue();
            float fill = val <= 0 ? 0.01f : (float) Math.min(trackWidth, (val / max) * trackWidth);
            float rest = Math.max(0.01f, trackWidth - fill);

            PdfPCell label = new PdfPCell(new Phrase(entry.getKey(), ROW_LABEL_FONT));
            label.setBorder(Rectangle.NO_BORDER);
            label.setVerticalAlignment(Element.ALIGN_MIDDLE);
            rows.addCell(label);

            PdfPTable track = new PdfPTable(new float[]{fill, rest});
            track.setWidthPercentage(100);
            PdfPCell fillCell = new PdfPCell();
            fillCell.setFixedHeight(9);
            fillCell.setBackgroundColor(ACCENT_GREEN);
            fillCell.setBorder(Rectangle.NO_BORDER);
            track.addCell(fillCell);
            PdfPCell restCell = new PdfPCell();
            restCell.setFixedHeight(9);
            restCell.setBackgroundColor(TRACK);
            restCell.setBorder(Rectangle.NO_BORDER);
            track.addCell(restCell);

            PdfPCell trackCell = new PdfPCell(track);
            trackCell.setBorder(Rectangle.NO_BORDER);
            trackCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            trackCell.setPadding(0);
            rows.addCell(trackCell);

            PdfPCell value = new PdfPCell(new Phrase(formatter.apply(val), ROW_VALUE_FONT));
            value.setBorder(Rectangle.NO_BORDER);
            value.setHorizontalAlignment(Element.ALIGN_RIGHT);
            value.setVerticalAlignment(Element.ALIGN_MIDDLE);
            rows.addCell(value);
        }
        return rows;
    }

    private void addDonationsTable(Document document, List<Map<String, Object>> donations) throws DocumentException {
        addSectionTitle(document, "Donation records");

        if (donations == null || donations.isEmpty()) {
            document.add(new Paragraph("No donation records for this period.", EMPTY_FONT));
            return;
        }

        PdfPTable table = new PdfPTable(new float[]{72f, 170f, 100f, 60f, 80f, 230f});
        table.setWidthPercentage(100);
        table.setHeaderRows(1);
        table.setSplitRows(true);

        String[] headers = {"DATE", "DONATED ITEM", "CATEGORY", "QUANTITY", "STATUS", "PICKUP LOCATION"};
        for (String h : headers) {
            PdfPCell headerCell = new PdfPCell(new Phrase(h, TABLE_HEADER_FONT));
            headerCell.setBackgroundColor(BRAND_GREEN);
            headerCell.setPadding(8);
            headerCell.setBorderColor(BRAND_GREEN);
            table.addCell(headerCell);
        }

        boolean stripe = false;
        for (Map<String, Object> d : donations) {
            Color bg = stripe ? PALE_GREEN : Color.WHITE;
            stripe = !stripe;
            table.addCell(dataCell(formatDate(d.get("createdAt")), bg));
            table.addCell(dataCell(textOrDash(d.get("name")), bg));
            table.addCell(dataCell(textOrDash(d.get("category")), bg));
            table.addCell(dataCell(formatKg(toDouble(d.get("quantityKg"))), bg));
            table.addCell(dataCell(titleCase(textOrDash(d.get("status"))), bg));
            table.addCell(dataCell(textOrDash(d.get("pickupLocation")), bg));
        }
        document.add(table);
    }

    private PdfPCell dataCell(String text, Color bg) {
        PdfPCell cell = new PdfPCell(new Phrase(text, TABLE_CELL_FONT));
        cell.setPadding(5);
        cell.setBackgroundColor(bg);
        cell.setBorderColor(BORDER);
        return cell;
    }

    private double toDouble(Object o) {
        return o instanceof Number ? ((Number) o).doubleValue() : 0;
    }

    private String formatKg(double value) {
        return formatNumber(value) + " kg";
    }

    private String formatCount(double value) {
        return NumberFormat.getIntegerInstance(Locale.US).format(Math.round(value));
    }

    private String plural(double count, String noun) {
        return formatCount(count) + " " + noun + (Math.round(count) == 1 ? "" : "s");
    }

    private String formatNumber(double value) {
        NumberFormat formatter = NumberFormat.getNumberInstance(Locale.US);
        formatter.setMaximumFractionDigits(1);
        return formatter.format(value);
    }

    private String formatDate(Object value) {
        String date = textOrDash(value);
        if ("-".equals(date)) return date;
        try {
            return LocalDate.parse(date).format(DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH));
        } catch (java.time.format.DateTimeParseException e) {
            return date;
        }
    }

    private String textOrDash(Object value) {
        return value == null || String.valueOf(value).isBlank() ? "-" : String.valueOf(value);
    }

    private String titleCase(String value) {
        if (value.isEmpty() || "-".equals(value)) return value;
        String readable = value.replace('_', ' ').replace('-', ' ');
        return readable.substring(0, 1).toUpperCase(Locale.ENGLISH) + readable.substring(1).toLowerCase(Locale.ENGLISH);
    }

    /** Same tones as the page's donuts: good / warning / critical, everything else neutral. */
    private Color statusColor(String status) {
        return switch (status.toLowerCase(Locale.ENGLISH)) {
            case "collected", "approved" -> ACCENT_GREEN;
            case "surplus", "pending" -> AMBER;
            case "expired", "rejected" -> RED;
            default -> NEUTRAL;
        };
    }

    private class ReportPageFooter extends PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte canvas = writer.getDirectContent();
            float footerY = document.bottom() - 12;
            canvas.saveState();
            canvas.setRGBColorStroke(BORDER.getRed(), BORDER.getGreen(), BORDER.getBlue());
            canvas.setLineWidth(0.6f);
            canvas.moveTo(document.left(), footerY);
            canvas.lineTo(document.right(), footerY);
            canvas.stroke();
            ColumnText.showTextAligned(canvas, Element.ALIGN_LEFT,
                    new Phrase("Zero Waste  |  Activity report", FOOTER_FONT), document.left(), footerY - 13, 0);
            ColumnText.showTextAligned(canvas, Element.ALIGN_RIGHT,
                    new Phrase("Page " + writer.getPageNumber(), FOOTER_FONT), document.right(), footerY - 13, 0);
            canvas.restoreState();
        }
    }
}
