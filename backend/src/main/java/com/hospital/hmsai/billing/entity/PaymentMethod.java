package com.hospital.hmsai.billing.entity;

public enum PaymentMethod {
    CASH,
    VIETQR,
    BANK_TRANSFER,
    CARD;

    /** Thanh toán không dùng tiền mặt bắt buộc có mã giao dịch để đối soát. */
    public boolean requiresTransactionCode() {
        return this != CASH;
    }
}
