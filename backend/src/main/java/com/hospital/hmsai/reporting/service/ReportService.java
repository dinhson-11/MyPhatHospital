package com.hospital.hmsai.reporting.service;

import com.hospital.hmsai.reporting.dto.KpiSummaryResponse;
import com.hospital.hmsai.reporting.dto.RevenueSummaryResponse;
import com.hospital.hmsai.reporting.dto.TopDiagnosisResponse;
import com.hospital.hmsai.reporting.dto.VisitsSummaryResponse;

import java.time.LocalDate;
import java.util.List;

public interface ReportService {

    VisitsSummaryResponse getVisitsSummary(LocalDate fromDate, LocalDate toDate);

    RevenueSummaryResponse getRevenueSummary(LocalDate fromDate, LocalDate toDate);

    List<TopDiagnosisResponse> getTopDiagnoses(int limit);

    KpiSummaryResponse getKpiSummary();
}
