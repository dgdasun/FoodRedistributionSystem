package com.foodshare.service;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Renders a generated report (see ReportService) as a downloadable PDF, mirroring
 * the brand colors and simple bar-list charts used on the admin reports screen.
 */
@Service
public class ReportPdfService {

    private static final Color BRAND_GREEN = new Color(0x1E, 0x7B, 0x34);
    private static final Color TRACK = new Color(0xE8, 0xF6, 0xEC);
    private static final Color INK = new Color(0x0F, 0x17, 0x2A);
    private static final Color MUTED = new Color(0x64, 0x74, 0x8B);
    private static final Color BORDER = new Color(0xE2, 0xE8, 0xF0);

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 20, Font.BOLD, BRAND_GREEN);
    private static final Font SUBTITLE_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL, MUTED);
    private static final Font SECTION_FONT = new Font(Font.HELVETICA, 13, Font.BOLD, INK);
    private static final Font STAT_LABEL_FONT = new Font(Font.HELVETICA, 8.5f, Font.NORMAL, MUTED);
    private static final Font STAT_VALUE_FONT = new Font(Font.HELVETICA, 15, Font.BOLD, INK);
    private static final Font ROW_LABEL_FONT = new Font(Font.HELVETICA, 9, Font.NORMAL, INK);
    private static final Font ROW_VALUE_FONT = new Font(Font.HELVETICA, 9, Font.BOLD, INK);
    private static final Font TABLE_HEADER_FONT = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);
    private static final Font TABLE_CELL_FONT = new Font(Font.HELVETICA, 8.5f, Font.NORMAL, new Color(0x33, 0x41, 0x55));
    private static final Font EMPTY_FONT = new Font(Font.HELVETICA, 9, Font.ITALIC, MUTED);

    @SuppressWarnings("unchecked")
    public byte[] build(Map<String, Object> report) {
        Document document = new Document(PageSize.A4, 36, 36, 48, 40);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Map<String, Object> period = (Map<String, Object>) report.get("period");
            Map<String, Object> summary = (Map<String, Object>) report.get("summary");
            Map<String, Double> categoryBreakdown = (Map<String, Double>) report.get("categoryBreakdown");
            List<Map<String, Object>> trend = (List<Map<String, Object>>) report.get("trend");
            List<Map<String, Object>> donations = (List<Map<String, Object>>) report.get("donations");

            document.add(new Paragraph("Zero Waste - Admin Report", TITLE_FONT));
            document.add(new Paragraph(
                    "Period: " + period.get("startDate") + "  to  " + period.get("endDate")
                            + "    |    Generated " + LocalDate.now().format(DateTimeFormatter.ofPattern("MMM d, yyyy")),
                    SUBTITLE_FONT));
            document.add(new Paragraph(" "));

            addSummarySection(document, summary);
            addBarSection(document, "Donations by Category (kg)", categoryBreakdown, this::formatKg);
            addBarSection(document, "day".equals(period.get("groupedBy")) ? "Daily Trend (kg donated)" : "Monthly Trend (kg donated)",
                    trendToMap(trend), this::formatKg);
            addDonationsTable(document, donations);

            document.close();
        } catch (DocumentException e) {
            throw new RuntimeException("Failed to generate PDF report", e);
        }
        return out.toByteArray();
    }

    private java.util.LinkedHashMap<String, Double> trendToMap(List<Map<String, Object>> trend) {
        java.util.LinkedHashMap<String, Double> map = new java.util.LinkedHashMap<>();
        if (trend == null) return map;
        for (Map<String, Object> row : trend) {
            Object qty = row.get("quantityKg");
            map.put(String.valueOf(row.get("label")), qty instanceof Number ? ((Number) qty).doubleValue() : 0);
        }
        return map;
    }

    private void addSummarySection(Document document, Map<String, Object> summary) throws DocumentException {
        document.add(new Paragraph("Summary", SECTION_FONT));
        document.add(new Paragraph(" "));

        String[][] cells = {
                {"Total Donations", String.valueOf(summary.get("totalDonations"))},
                {"Total Quantity (kg)", String.valueOf(summary.get("totalQuantityKg"))},
                {"Tickets Issued", String.valueOf(summary.get("totalTickets"))},
                {"Collected (kg)", String.valueOf(summary.get("collectedKg"))},
                {"Requests Received", String.valueOf(summary.get("totalRequests"))},
                {"Beneficiaries Served", String.valueOf(summary.get("beneficiariesServed"))},
                {"Meals Provided (est.)", String.valueOf(summary.get("mealsProvided"))},
                {"CO2 Saved kg (est.)", String.valueOf(summary.get("co2SavedKg"))},
        };

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setSpacingAfter(16);
        for (String[] cell : cells) {
            PdfPCell c = new PdfPCell();
            c.setBorder(Rectangle.BOX);
            c.setBorderColor(BORDER);
            c.setPadding(10);
            c.setBackgroundColor(TRACK);
            Paragraph p = new Paragraph();
            p.add(new Chunk(cell[0] + "\n", STAT_LABEL_FONT));
            p.add(new Chunk(cell[1], STAT_VALUE_FONT));
            c.addElement(p);
            table.addCell(c);
        }
        document.add(table);
    }

    private void addBarSection(Document document, String title, Map<String, Double> data, java.util.function.DoubleFunction<String> formatter) throws DocumentException {
        document.add(new Paragraph(title, SECTION_FONT));
        document.add(new Paragraph(" "));

        if (data == null || data.isEmpty()) {
            document.add(new Paragraph("No data for this period.", EMPTY_FONT));
            document.add(new Paragraph(" "));
            return;
        }

        double max = data.values().stream().mapToDouble(v -> v == null ? 0 : v).max().orElse(1);
        if (max <= 0) max = 1;

        float trackWidth = 260f;
        for (Map.Entry<String, Double> entry : data.entrySet()) {
            double val = entry.getValue() == null ? 0 : entry.getValue();
            float fill = (float) Math.max(2, (val / max) * trackWidth);
            float rest = Math.max(1, trackWidth - fill);

            PdfPTable row = new PdfPTable(new float[]{110f, trackWidth, 55f});
            row.setWidthPercentage(100);
            row.setSpacingAfter(5);

            PdfPCell label = new PdfPCell(new Phrase(entry.getKey(), ROW_LABEL_FONT));
            label.setBorder(Rectangle.NO_BORDER);
            label.setVerticalAlignment(Element.ALIGN_MIDDLE);
            row.addCell(label);

            PdfPTable track = new PdfPTable(new float[]{fill, rest});
            track.setWidthPercentage(100);
            PdfPCell fillCell = new PdfPCell();
            fillCell.setFixedHeight(10);
            fillCell.setBackgroundColor(BRAND_GREEN);
            fillCell.setBorder(Rectangle.NO_BORDER);
            track.addCell(fillCell);
            PdfPCell restCell = new PdfPCell();
            restCell.setFixedHeight(10);
            restCell.setBackgroundColor(TRACK);
            restCell.setBorder(Rectangle.NO_BORDER);
            track.addCell(restCell);

            PdfPCell trackCell = new PdfPCell(track);
            trackCell.setBorder(Rectangle.NO_BORDER);
            trackCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            trackCell.setPadding(0);
            row.addCell(trackCell);

            PdfPCell value = new PdfPCell(new Phrase(formatter.apply(val), ROW_VALUE_FONT));
            value.setBorder(Rectangle.NO_BORDER);
            value.setHorizontalAlignment(Element.ALIGN_RIGHT);
            value.setVerticalAlignment(Element.ALIGN_MIDDLE);
            row.addCell(value);

            document.add(row);
        }
        document.add(new Paragraph(" "));
    }

    private void addDonationsTable(Document document, List<Map<String, Object>> donations) throws DocumentException {
        document.add(new Paragraph("Donation Records", SECTION_FONT));
        document.add(new Paragraph(" "));

        if (donations == null || donations.isEmpty()) {
            document.add(new Paragraph("No donation records for this period.", EMPTY_FONT));
            return;
        }

        PdfPTable table = new PdfPTable(new float[]{60f, 100f, 80f, 45f, 60f, 100f});
        table.setWidthPercentage(100);
        table.setHeaderRows(1);

        String[] headers = {"Date", "Item", "Category", "Qty (kg)", "Status", "Location"};
        for (String h : headers) {
            PdfPCell headerCell = new PdfPCell(new Phrase(h, TABLE_HEADER_FONT));
            headerCell.setBackgroundColor(BRAND_GREEN);
            headerCell.setPadding(6);
            headerCell.setBorderColor(BRAND_GREEN);
            table.addCell(headerCell);
        }

        boolean stripe = false;
        for (Map<String, Object> d : donations) {
            Color bg = stripe ? TRACK : Color.WHITE;
            stripe = !stripe;
            table.addCell(dataCell(String.valueOf(d.get("createdAt")), bg));
            table.addCell(dataCell(String.valueOf(d.get("name")), bg));
            table.addCell(dataCell(String.valueOf(d.get("category")), bg));
            table.addCell(dataCell(formatKg(toDouble(d.get("quantityKg"))), bg));
            table.addCell(dataCell(String.valueOf(d.get("status")), bg));
            table.addCell(dataCell(String.valueOf(d.get("pickupLocation")), bg));
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
        return (value == Math.floor(value) ? String.valueOf((long) value) : String.valueOf(value)) + " kg";
    }
}
