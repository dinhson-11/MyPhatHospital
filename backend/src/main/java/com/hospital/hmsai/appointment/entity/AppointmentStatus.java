package com.hospital.hmsai.appointment.entity;

/**
 * Enum trạng thái lịch hẹn – khớp với ENUM trong V4 migration.
 */
public enum AppointmentStatus {
    BOOKED,
    CONFIRMED,
    CANCELLED,
    COMPLETED,
    NO_SHOW
}
