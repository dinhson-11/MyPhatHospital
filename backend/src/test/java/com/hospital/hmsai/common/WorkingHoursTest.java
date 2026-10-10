package com.hospital.hmsai.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WorkingHoursTest {

    @Test
    @DisplayName("Mùa hè (01/04 – 31/10): sáng 07:00-11:00, chiều 13:00-17:30")
    void summerSlots() {
        List<LocalTime> slots = WorkingHours.slotStarts(LocalDate.of(2026, 7, 15));
        assertEquals(17, slots.size());
        assertEquals(LocalTime.of(7, 0), slots.get(0));
        assertEquals(LocalTime.of(10, 30), slots.get(7));   // ca sáng cuối kết thúc 11:00
        assertEquals(LocalTime.of(13, 0), slots.get(8));
        assertEquals(LocalTime.of(17, 0), slots.get(16));   // ca chiều cuối kết thúc 17:30
    }

    @Test
    @DisplayName("Mùa đông (01/11 – 31/03): lùi 30 phút, sáng 07:30-11:30, chiều 13:30-18:00")
    void winterSlots() {
        List<LocalTime> slots = WorkingHours.slotStarts(LocalDate.of(2026, 12, 15));
        assertEquals(17, slots.size());
        assertEquals(LocalTime.of(7, 30), slots.get(0));
        assertEquals(LocalTime.of(11, 0), slots.get(7));
        assertEquals(LocalTime.of(13, 30), slots.get(8));
        assertEquals(LocalTime.of(17, 30), slots.get(16));
    }

    @Test
    @DisplayName("Ranh giới mùa: 31/10 là mùa hè, 01/11 là mùa đông, 31/03 mùa đông, 01/04 mùa hè")
    void seasonBoundaries() {
        assertTrue(WorkingHours.isSummer(LocalDate.of(2026, 10, 31)));
        assertFalse(WorkingHours.isSummer(LocalDate.of(2026, 11, 1)));
        assertFalse(WorkingHours.isSummer(LocalDate.of(2027, 3, 31)));
        assertTrue(WorkingHours.isSummer(LocalDate.of(2027, 4, 1)));
    }

    @Test
    @DisplayName("Giờ ngoài khung hoặc giờ nghỉ trưa bị từ chối; Chủ nhật vẫn khám")
    void validSlotStart() {
        assertTrue(WorkingHours.isValidSlotStart(LocalDateTime.of(2026, 10, 11, 7, 0)));   // Chủ nhật, hè
        assertFalse(WorkingHours.isValidSlotStart(LocalDateTime.of(2026, 10, 12, 12, 0))); // nghỉ trưa
        assertFalse(WorkingHours.isValidSlotStart(LocalDateTime.of(2026, 10, 12, 17, 30))); // hết giờ
        assertFalse(WorkingHours.isValidSlotStart(LocalDateTime.of(2026, 12, 14, 7, 0)));  // mùa đông chưa mở
        assertTrue(WorkingHours.isValidSlotStart(LocalDateTime.of(2026, 12, 14, 7, 30)));
    }
}
