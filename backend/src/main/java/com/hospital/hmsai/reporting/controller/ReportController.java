package com.hospital.hmsai.reporting.controller;

import com.hospital.hmsai.common.ApiResponse;
import com.hospital.hmsai.reporting.dto.KpiSummaryResponse;
import com.hospital.hmsai.reporting.dto.RevenueSummaryResponse;
import com.hospital.hmsai.reporting.dto.TopDiagnosisResponse;
import com.hospital.hmsai.reporting.dto.VisitsSummaryResponse;
import com.hospital.hmsai.reporting.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Báo cáo & Thống kê", description = "APIs báo cáo điều hành, thống kê lượt khám, doanh thu và bệnh lý phổ biến")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/visits-summary")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Thống kê lượt khám", description = "Báo cáo tổng số lượt khám, hoàn tất, đang khám và biểu đồ theo ngày.")
    public ResponseEntity<ApiResponse<VisitsSummaryResponse>> getVisitsSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("GET /api/v1/reports/visits-summary?from={}&to={}", from, to);
        VisitsSummaryResponse response = reportService.getVisitsSummary(from, to);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/revenue")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT')")
    @Operation(summary = "Thống kê doanh thu", description = "Báo cáo doanh thu viện phí theo mốc thời gian, tiền mặt và chuyển khoản VietQR.")
    public ResponseEntity<ApiResponse<RevenueSummaryResponse>> getRevenueSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        log.info("GET /api/v1/reports/revenue?from={}&to={}", from, to);
        RevenueSummaryResponse response = reportService.getRevenueSummary(from, to);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/top-diagnoses")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    @Operation(summary = "Thống kê bệnh lý phổ biến", description = "Danh sách top bệnh phổ biến theo mã ICD-10 và tỷ lệ phần trăm.")
    public ResponseEntity<ApiResponse<List<TopDiagnosisResponse>>> getTopDiagnoses(
            @RequestParam(defaultValue = "5") int limit) {
        log.info("GET /api/v1/reports/top-diagnoses?limit={}", limit);
        List<TopDiagnosisResponse> response = reportService.getTopDiagnoses(limit);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/kpi-summary")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Chỉ số KPI tổng thể", description = "Dashboard điều hành tổng quan cho ban giám đốc/quản trị viên.")
    public ResponseEntity<ApiResponse<KpiSummaryResponse>> getKpiSummary() {
        log.info("GET /api/v1/reports/kpi-summary");
        KpiSummaryResponse response = reportService.getKpiSummary();
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
