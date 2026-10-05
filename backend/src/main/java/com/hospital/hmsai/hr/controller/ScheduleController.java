package com.hospital.hmsai.hr.controller;

import com.hospital.hmsai.common.ApiResponse;
import com.hospital.hmsai.hr.dto.BatchScheduleRequest;
import com.hospital.hmsai.hr.dto.ScheduleRequest;
import com.hospital.hmsai.hr.dto.ScheduleResponse;
import com.hospital.hmsai.hr.service.ScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Lịch trực nhân viên y tế", description = "APIs xếp và tra cứu lịch trực theo tuần/tháng (FR-8.2)")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Xếp lịch trực mới", description = "Admin xếp ca trực cho nhân viên y tế (có kiểm tra chống trùng ca/ngày)")
    public ResponseEntity<ApiResponse<ScheduleResponse>> createSchedule(
            @Valid @RequestBody ScheduleRequest request) {
        log.info("POST /api/v1/schedules – staff: {}, date: {}, shift: {}", request.getStaffId(), request.getWorkDate(), request.getShift());
        ScheduleResponse response = scheduleService.createSchedule(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Xếp lịch trực thành công"));
    }

    @PostMapping("/batch")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Xếp lịch trực hàng loạt", description = "Xếp lịch trực cho nhiều nhân viên/nhiều ngày trong tuần cùng lúc")
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> createBatchSchedules(
            @Valid @RequestBody BatchScheduleRequest request) {
        log.info("POST /api/v1/schedules/batch – số lượng: {}", request.getSchedules().size());
        List<ScheduleResponse> response = scheduleService.createBatchSchedules(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Xếp lịch trực hàng loạt thành công"));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Tra cứu lịch trực", description = "Lấy danh sách lịch trực theo nhân viên, theo khoa phòng hoặc theo khoảng thời gian")
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> getSchedules(
            @RequestParam(required = false) Long staffId,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("GET /api/v1/schedules – staff: {}, dept: {}, start: {}, end: {}", staffId, departmentId, startDate, endDate);
        List<ScheduleResponse> list = scheduleService.getSchedules(staffId, departmentId, startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Hủy ca trực", description = "Admin xóa bỏ một ca trực đã phân công")
    public ResponseEntity<ApiResponse<Void>> deleteSchedule(@PathVariable Long id) {
        log.info("DELETE /api/v1/schedules/{}", id);
        scheduleService.deleteSchedule(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Hủy ca trực thành công"));
    }
}
