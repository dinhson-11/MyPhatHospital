package com.hospital.hmsai.billing.entity;

/**
 * Vòng đời hóa đơn: PENDING → PAID → REFUNDED, hoặc PENDING → CANCELLED.
 */
public enum InvoiceStatus {
    PENDING,
    PAID,
    CANCELLED,
    REFUNDED
}
