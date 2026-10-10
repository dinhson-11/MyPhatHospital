package com.hospital.hmsai.billing.dto;

import com.hospital.hmsai.billing.entity.PaymentMethod;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayInvoiceRequest {

    @NotNull(message = "Phương thức thanh toán không được để trống")
    private PaymentMethod paymentMethod;

    /** Tiền khách đưa – bắt buộc khi thanh toán tiền mặt. */
    @PositiveOrZero(message = "Số tiền khách đưa không được âm")
    @Digits(integer = 10, fraction = 0, message = "Số tiền khách đưa phải là số nguyên VNĐ")
    private BigDecimal amountReceived;

    /** Mã giao dịch ngân hàng / mã chuẩn chi POS – bắt buộc với VietQR, chuyển khoản, thẻ. */
    @Size(max = 100, message = "Mã giao dịch tối đa 100 ký tự")
    @Pattern(regexp = "^[A-Za-z0-9._/-]*$", message = "Mã giao dịch chỉ gồm chữ, số và . _ / -")
    private String transactionCode;

    @Size(max = 255, message = "Ghi chú tối đa 255 ký tự")
    private String note;
}
