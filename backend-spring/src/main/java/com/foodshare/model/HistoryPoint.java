package com.foodshare.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

/**
 * Historical (dummy) inventory data used by the Python AI service
 * to forecast future surplus food generation per category.
 */
@Document(collection = "history")
public class HistoryPoint {

    @Id
    private String id;

    private String category;
    private LocalDate date;
    private Double quantityKg;

    public HistoryPoint() {
    }

    public HistoryPoint(String category, LocalDate date, Double quantityKg) {
        this.category = category;
        this.date = date;
        this.quantityKg = quantityKg;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public Double getQuantityKg() {
        return quantityKg;
    }

    public void setQuantityKg(Double quantityKg) {
        this.quantityKg = quantityKg;
    }
}
