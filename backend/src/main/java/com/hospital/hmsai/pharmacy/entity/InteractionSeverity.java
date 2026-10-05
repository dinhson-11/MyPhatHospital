package com.hospital.hmsai.pharmacy.entity;

/**
 * Mức độ nghiêm trọng của tương tác thuốc.
 */
public enum InteractionSeverity {
    MILD,       // Nhẹ – theo dõi
    MODERATE,   // Trung bình – cần thận trọng hoặc điều chỉnh liều
    SEVERE      // Nặng – chống chỉ định phối hợp
}
