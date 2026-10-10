package com.hospital.hmsai.common;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Giờ làm việc khám bệnh của Mỹ Phát Hospital (Thứ 2 – Chủ nhật).
 * <ul>
 *   <li>Mùa hè (01/04 – 31/10): sáng 07:00 – 11:00, chiều 13:00 – 17:30</li>
 *   <li>Mùa đông (01/11 – 31/03): lùi 30 phút: sáng 07:30 – 11:30, chiều 13:30 – 18:00</li>
 * </ul>
 * Khám BHYT: Thứ 2 – Thứ 7. Cấp cứu và điều trị hoạt động liên tục 24/24, kể cả ngày lễ.
 * Mỗi khung khám kéo dài 30 phút.
 */
public final class WorkingHours {

    public static final int SLOT_MINUTES = 30;

    private WorkingHours() {
    }

    public static boolean isSummer(LocalDate date) {
        int month = date.getMonthValue();
        return month >= 4 && month <= 10;
    }

    /** Giờ bắt đầu từng khung khám 30 phút trong ngày (sáng + chiều). */
    public static List<LocalTime> slotStarts(LocalDate date) {
        LocalTime morningStart = isSummer(date) ? LocalTime.of(7, 0) : LocalTime.of(7, 30);
        LocalTime afternoonStart = isSummer(date) ? LocalTime.of(13, 0) : LocalTime.of(13, 30);
        List<LocalTime> slots = new ArrayList<>();
        addSlots(slots, morningStart, morningStart.plusHours(4));
        addSlots(slots, afternoonStart, afternoonStart.plusHours(4).plusMinutes(30));
        return slots;
    }

    public static boolean isValidSlotStart(LocalDateTime dateTime) {
        return slotStarts(dateTime.toLocalDate()).contains(dateTime.toLocalTime().withSecond(0).withNano(0));
    }

    public static String describe(LocalDate date) {
        return isSummer(date)
                ? "Sáng 07:00 – 11:00, chiều 13:00 – 17:30 (Thứ 2 – Chủ nhật)"
                : "Sáng 07:30 – 11:30, chiều 13:30 – 18:00 (Thứ 2 – Chủ nhật)";
    }

    private static void addSlots(List<LocalTime> slots, LocalTime from, LocalTime to) {
        for (LocalTime t = from; t.isBefore(to); t = t.plusMinutes(SLOT_MINUTES)) {
            slots.add(t);
        }
    }
}
