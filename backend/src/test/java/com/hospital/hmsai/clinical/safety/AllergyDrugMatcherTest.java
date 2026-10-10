package com.hospital.hmsai.clinical.safety;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AllergyDrugMatcherTest {

    @Test
    @DisplayName("Chuẩn hóa: bỏ dấu tiếng Việt (kể cả đ), chữ thường, ký tự đặc biệt")
    void normalize_RemovesDiacritics() {
        assertEquals("di ung hai san", AllergyDrugMatcher.normalize("  Dị ứng HẢI-SẢN! "));
        assertEquals("duong", AllergyDrugMatcher.normalize("Đường"));
        assertEquals("", AllergyDrugMatcher.normalize(null));
    }

    @Test
    @DisplayName("Khớp trực tiếp tên dị ứng trong tên thuốc, không phân biệt hoa thường")
    void findMatch_DirectMatch() {
        assertTrue(AllergyDrugMatcher.findMatch("amoxicillin", "Amoxicillin 500mg").isPresent());
        assertTrue(AllergyDrugMatcher.findMatch("Penicillin", "Benzylpenicillin 1MUI").isPresent());
    }

    @Test
    @DisplayName("Khớp ngược: hoạt chất của thuốc nằm trong mô tả dị ứng")
    void findMatch_ReverseMatch() {
        assertTrue(AllergyDrugMatcher.findMatch("Dị ứng Aspirin khi dùng liều cao", "Aspirin 81mg").isPresent());
    }

    @Test
    @DisplayName("Dị ứng chéo cùng nhóm: penicillin, cephalosporin, NSAID, sulfa")
    void findMatch_ClassMatch() {
        assertTrue(AllergyDrugMatcher.findMatch("Penicillin", "Ampicillin 1g").isPresent());
        assertTrue(AllergyDrugMatcher.findMatch("Nhóm Cephalosporin", "Cefuroxime 500mg").isPresent());
        assertTrue(AllergyDrugMatcher.findMatch("NSAIDs", "Diclofenac 50mg").isPresent());
        assertTrue(AllergyDrugMatcher.findMatch("Thuốc sulfa", "Co-trimoxazole 480mg").isPresent());
        assertTrue(AllergyDrugMatcher.findMatch("Aspirin", "Ibuprofen 400mg").isPresent());
    }

    @Test
    @DisplayName("Không khớp nhầm: dị ứng quá ngắn, rỗng, chuỗi con của từ khác, dị ứng thức ăn")
    void findMatch_NoFalsePositives() {
        assertFalse(AllergyDrugMatcher.findMatch("", "Paracetamol 500mg").isPresent());
        assertFalse(AllergyDrugMatcher.findMatch("ab", "Abacavir").isPresent());
        assertFalse(AllergyDrugMatcher.findMatch("ace", "Paracetamol 500mg").isPresent());
        assertFalse(AllergyDrugMatcher.findMatch("Hải sản", "Paracetamol 500mg").isPresent());
        assertFalse(AllergyDrugMatcher.findMatch("Penicillin", "Paracetamol 500mg").isPresent());
        assertFalse(AllergyDrugMatcher.findMatch("Penicillin", "Cefuroxime 500mg").isPresent());
    }
}
