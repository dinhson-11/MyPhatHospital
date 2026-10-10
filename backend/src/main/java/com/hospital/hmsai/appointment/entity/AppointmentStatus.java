package com.hospital.hmsai.appointment.entity;

/**
 * Enum trạng thái lịch hẹn – khớp với ENUM trong V4 migration.
 * <p>
 * Luồng hợp lệ: BOOKED → {CONFIRMED, CANCELLED, NO_SHOW}; CONFIRMED → {COMPLETED, CANCELLED, NO_SHOW};
 * CANCELLED, COMPLETED, NO_SHOW là trạng thái cuối.
 */
public enum AppointmentStatus {
    BOOKED("Đã đặt"),
    CONFIRMED("Đã xác nhận"),
    CANCELLED("Đã hủy"),
    COMPLETED("Đã hoàn tất"),
    NO_SHOW("Vắng mặt");

    private final String label;

    AppointmentStatus(String label) {
        this.label = label;
    }

    /** Nhãn tiếng Việt dùng trong thông báo lỗi. */
    public String label() {
        return label;
    }
}
