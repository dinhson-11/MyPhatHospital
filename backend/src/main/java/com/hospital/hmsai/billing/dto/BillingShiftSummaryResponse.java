package com.hospital.hmsai.billing.dto;

import com.hospital.hmsai.billing.entity.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Tổng hợp thu ngân theo ngày – phục vụ đối soát cuối ca.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingShiftSummaryResponse {

    private LocalDate date;

    /** Số hóa đơn đã thu trong ngày. */
    private long paidCount;
    /** Tổng chi phí của các hóa đơn đã thu (trước BHYT). */
    private BigDecimal grossAmount;
    /** Phần BHYT chi trả (khoản phải thu từ cơ quan BHXH). */
    private BigDecimal insuranceAmount;
    /** Tiền thực thu từ người bệnh. */
    private BigDecimal collectedAmount;
    private List<MethodTotal> byMethod;

    private long pendingCount;
    private BigDecimal pendingAmount;

    private long cancelledCount;
    private long refundedCount;
    private BigDecimal refundedAmount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MethodTotal {
        private PaymentMethod method;
        private long count;
        private BigDecimal amount;
    }
}
