package com.hospital.hmsai.clinical.entity;

/**
 * Trạng thái của chỉ định cận lâm sàng (Lab Order).
 */
public enum LabOrderStatus {
    ORDERED,   // Đã chỉ định, chờ xét nghiệm
    RESULTED   // Đã có kết quả xét nghiệm
}
