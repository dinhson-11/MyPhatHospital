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
    private BigDecimal totalRevenue;
    private long totalInvoices;
    private long paidInvoicesCount;
    private long pendingInvoicesCount;
    private BigDecimal cashRevenue;
    private BigDecimal vietQrRevenue;
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
