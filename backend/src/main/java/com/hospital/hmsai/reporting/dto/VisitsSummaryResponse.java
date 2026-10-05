package com.hospital.hmsai.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisitsSummaryResponse {
    private long totalVisits;
    private long completedVisits;
    private long inProgressVisits;
    private long waitingVisits;
    private long cancelledAppointments;
    private List<DailyVisitStat> dailyStats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyVisitStat {
        private LocalDate date;
        private long total;
        private long completed;
    }
}
