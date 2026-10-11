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
    /**
     * Chuỗi nội dung mã VietQR (EMVCo/NAPAS 247) do máy chủ tự dựng: giao diện vẽ thẳng chuỗi này thành ảnh QR,
     * không cần Internet. Quét bằng app ngân hàng sẽ tự điền tài khoản, số tiền và nội dung.
     */
    private String qrPayload;
    /** Ảnh QR do img.vietqr.io vẽ – chỉ là phương án dự phòng khi không có {@link #qrPayload}. */
    private String qrImageUrl;
    private boolean demo;
}
