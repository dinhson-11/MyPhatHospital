package com.hospital.hmsai.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueSummaryResponse {
    /** Tổng chi phí của hóa đơn đã thu trong kỳ (gồm phần BHYT). */
    private BigDecimal totalRevenue;
    /** Phần BHYT chi trả – khoản phải thu từ cơ quan BHXH. */
    private BigDecimal insuranceAmount;
    /** Tiền thực thu từ người bệnh. */
    private BigDecimal patientCollected;
    private long totalInvoices;
    private long paidInvoicesCount;
    private long pendingInvoicesCount;
    private long refundedInvoicesCount;
    private BigDecimal refundedAmount;
    private BigDecimal cashRevenue;
    private BigDecimal vietQrRevenue;
    private BigDecimal bankTransferRevenue;
    private BigDecimal cardRevenue;
    private List<DailyRevenueStat> dailyRevenues;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyRevenueStat {
        private LocalDate date;
        private BigDecimal amount;
        private long invoiceCount;
    }
}
