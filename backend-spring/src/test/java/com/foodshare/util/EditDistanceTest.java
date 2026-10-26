package com.foodshare.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EditDistanceTest {

    @Test
    void identicalAndEmptyStrings() {
        assertEquals(0, EditDistance.between("dairy", "dairy"));
        assertEquals(0, EditDistance.between("", ""));
        assertEquals(5, EditDistance.between("", "dairy"));
        assertEquals(5, EditDistance.between("dairy", ""));
    }

    @Test
    void eachSingleEditCostsOne() {
        assertEquals(1, EditDistance.between("bred", "bread"), "deletion");
        assertEquals(1, EditDistance.between("breadd", "bread"), "insertion");
        assertEquals(1, EditDistance.between("dairt", "dairy"), "substitution");
        assertEquals(1, EditDistance.between("vegetabels", "vegetables"), "adjacent transposition");
        assertEquals(1, EditDistance.between("diary", "dairy"), "adjacent transposition");
    }

    @Test
    void isSymmetric() {
        assertEquals(EditDistance.between("fruites", "fruits"), EditDistance.between("fruits", "fruites"));
        assertEquals(EditDistance.between("kitten", "sitting"), EditDistance.between("sitting", "kitten"));
    }

    @Test
    void classicLevenshteinCases() {
        assertEquals(3, EditDistance.between("kitten", "sitting"));
        assertEquals(3, EditDistance.between("saturday", "sunday"));
    }

    @Test
    void similarityIsRelativeToTheLongerString() {
        assertEquals(1.0, EditDistance.similarity("a", "a", 0));
        assertEquals(0.8, EditDistance.similarity("bred", "bread", 1), 1e-9);
        assertEquals(0.9, EditDistance.similarity("vegetabels", "vegetables", 1), 1e-9);
        assertEquals(1.0, EditDistance.similarity("", "", 0));
    }

    @Test
    void rejectsNull() {
        assertThrows(IllegalArgumentException.class, () -> EditDistance.between(null, "x"));
    }
}
