package com.hospital.hmsai.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpiSummaryResponse {
    private long totalPatients;
    private long todayAppointments;
    private long todayVisits;
    private BigDecimal todayRevenue;
    private long activeStaffCount;
    private long lowStockDrugsCount;
    private long aiAlertsCount;
}
