package com.hospital.hmsai.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Thông tin chuyển khoản VietQR cho một hóa đơn. Số tiền và nội dung do máy chủ quyết định,
 * giao diện chỉ hiển thị – tránh lệch số tiền giữa mã QR và hóa đơn.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentQrResponse {

    private Long invoiceId;
    private String invoiceCode;
    private String bankBin;
    private String bankName;
    private String accountNo;
    private String accountName;
    private BigDecimal amount;
    /** Nội dung chuyển khoản không dấu, dùng để đối soát, VD: "MPH HD261010000123". */
    private String transferContent;
    private String qrImageUrl;
    private boolean demo;
}
