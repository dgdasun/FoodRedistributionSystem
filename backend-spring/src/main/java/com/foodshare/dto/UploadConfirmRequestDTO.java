package com.foodshare.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Rows a bulk CSV upload held back because their category needed review,
 * sent back with the category the donor chose (POST /api/donations/upload/confirm).
 */
public class UploadConfirmRequestDTO {
    private String donorId;
    private List<Row> rows;

    public UploadConfirmRequestDTO() {
    }

    public String getDonorId() {
        return donorId;
    }

    public void setDonorId(String donorId) {
        this.donorId = donorId;
    }

    public List<Row> getRows() {
        return rows;
    }

    public void setRows(List<Row> rows) {
        this.rows = rows;
    }

    public static class Row {
        /** The spreadsheet line it came from, used only in error messages. */
        private Long rowNumber;
        private String name;
        /** What the CSV said, kept for the audit trail. */
        private String originalCategory;
        /** The canonical category the donor chose. */
        private String category;
        private String batchNumber;
        private Double quantityKg;
        private LocalDate expiryDate;
        /** kg | liters | items, as parsed from the CSV; null means kg. */
        private String unit;
        /** For items rows: one packet's size, in packUnit (kg or liters). */
        private Double packSize;
        private String packUnit;

        public Row() {
        }

        public String getUnit() {
            return unit;
        }

        public void setUnit(String unit) {
            this.unit = unit;
        }

        public Double getPackSize() {
            return packSize;
        }

        public void setPackSize(Double packSize) {
            this.packSize = packSize;
        }

        public String getPackUnit() {
            return packUnit;
        }

        public void setPackUnit(String packUnit) {
            this.packUnit = packUnit;
        }

        public Long getRowNumber() {
            return rowNumber;
        }

        public void setRowNumber(Long rowNumber) {
            this.rowNumber = rowNumber;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getOriginalCategory() {
            return originalCategory;
        }

        public void setOriginalCategory(String originalCategory) {
            this.originalCategory = originalCategory;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public String getBatchNumber() {
            return batchNumber;
        }

        public void setBatchNumber(String batchNumber) {
            this.batchNumber = batchNumber;
        }

        public Double getQuantityKg() {
            return quantityKg;
        }

        public void setQuantityKg(Double quantityKg) {
            this.quantityKg = quantityKg;
        }

        public LocalDate getExpiryDate() {
            return expiryDate;
        }

        public void setExpiryDate(LocalDate expiryDate) {
            this.expiryDate = expiryDate;
        }
    }
}
