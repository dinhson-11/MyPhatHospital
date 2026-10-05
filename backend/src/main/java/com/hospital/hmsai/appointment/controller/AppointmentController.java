package com.hospital.hmsai.appointment.controller;

import com.hospital.hmsai.appointment.dto.*;
import com.hospital.hmsai.appointment.service.AppointmentService;
import com.hospital.hmsai.common.ApiResponse;
import com.hospital.hmsai.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * Controller quản lý lịch hẹn khám bệnh.
 * Hỗ trợ đặt lịch, hủy, xác nhận, kiểm tra trùng lịch và tra cứu khung giờ trống.
 */
@RestController
@RequestMapping("/api/v1/appointments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Lịch hẹn", description = "APIs đặt lịch khám, kiểm tra khung giờ trống và quản lý lịch hẹn")
public class AppointmentController {

    private final AppointmentService appointmentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('PATIENT', 'RECEPTIONIST', 'ADMIN')")
    @Operation(summary = "Đặt lịch khám mới", description = "Bệnh nhân hoặc lễ tân đặt lịch khám. Hệ thống tự kiểm tra trùng lịch bác sĩ.")
    public ResponseEntity<ApiResponse<AppointmentResponse>> create(
            @Valid @RequestBody CreateAppointmentRequest request) {
        log.info("POST /api/v1/appointments – patientId: {}, doctorId: {}, time: {}",
                request.getPatientId(), request.getDoctorId(), request.getScheduledAt());
        AppointmentResponse response = appointmentService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Đặt lịch khám thành công"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'DOCTOR', 'ADMIN')")
    @Operation(summary = "Danh sách tất cả lịch hẹn", description = "Lấy danh sách tất cả lịch hẹn, hỗ trợ phân trang và sắp xếp.")
    public ResponseEntity<ApiResponse<Page<AppointmentResponse>>> getAll(
            @PageableDefault(size = 20, sort = "scheduledAt", direction = Sort.Direction.DESC) Pageable pageable) {
        log.info("GET /api/v1/appointments – page: {}", pageable.getPageNumber());
        Page<AppointmentResponse> result = appointmentService.getAll(pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PATIENT', 'RECEPTIONIST', 'DOCTOR', 'ADMIN')")
    @Operation(summary = "Xem chi tiết lịch hẹn", description = "Lấy thông tin chi tiết của 1 lịch hẹn theo ID.")
    public ResponseEntity<ApiResponse<AppointmentResponse>> getById(@PathVariable Long id) {
        log.info("GET /api/v1/appointments/{}", id);
        AppointmentResponse response = appointmentService.getById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Xem lịch hẹn của tôi", description = "Bệnh nhân xem danh sách các lịch hẹn của chính mình.")
    public ResponseEntity<ApiResponse<Page<AppointmentResponse>>> getMyAppointments(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "scheduledAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Long userId = extractUserId(authentication);
        log.info("GET /api/v1/appointments/me – userId: {}, page: {}", userId, pageable.getPageNumber());
        Page<AppointmentResponse> result = appointmentService.getMyAppointments(userId, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'DOCTOR', 'ADMIN')")
    @Operation(summary = "Lịch hẹn theo bệnh nhân", description = "Lấy lịch hẹn của một bệnh nhân theo patientId.")
    public ResponseEntity<ApiResponse<Page<AppointmentResponse>>> getByPatientId(
            @PathVariable Long patientId,
            @PageableDefault(size = 20, sort = "scheduledAt", direction = Sort.Direction.DESC) Pageable pageable) {
        log.info("GET /api/v1/appointments/patient/{} – page: {}", patientId, pageable.getPageNumber());
        Page<AppointmentResponse> result = appointmentService.getByPatientId(patientId, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'RECEPTIONIST', 'ADMIN')")
    @Operation(summary = "Lịch hẹn theo bác sĩ", description = "Lấy danh sách lịch hẹn của bác sĩ theo doctorId.")
    public ResponseEntity<ApiResponse<Page<AppointmentResponse>>> getByDoctorId(
            @PathVariable Long doctorId,
            @PageableDefault(size = 20, sort = "scheduledAt", direction = Sort.Direction.DESC) Pageable pageable) {
        log.info("GET /api/v1/appointments/doctor/{} – page: {}", doctorId, pageable.getPageNumber());
        Page<AppointmentResponse> result = appointmentService.getByDoctorId(doctorId, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/available-slots")
    @PreAuthorize("hasAnyRole('PATIENT', 'RECEPTIONIST', 'DOCTOR', 'ADMIN')")
    @Operation(summary = "Khung giờ trống của bác sĩ", description = "Tra cứu danh sách các khung giờ trống và đã được đặt của bác sĩ trong 1 ngày cụ thể.")
    public ResponseEntity<ApiResponse<AvailableSlotsResponse>> getAvailableSlots(
            @Parameter(description = "ID bác sĩ (StaffProfile ID)") @RequestParam Long doctorId,
            @Parameter(description = "Ngày cần kiểm tra (YYYY-MM-DD)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.info("GET /api/v1/appointments/available-slots – doctorId: {}, date: {}", doctorId, date);
        AvailableSlotsResponse response = appointmentService.getAvailableSlots(doctorId, date);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'DOCTOR', 'ADMIN')")
    @Operation(summary = "Xác nhận lịch hẹn", description = "Lễ tân hoặc bác sĩ chuyển trạng thái lịch sang CONFIRMED.")
    public ResponseEntity<ApiResponse<AppointmentResponse>> confirm(@PathVariable Long id) {
        log.info("PATCH /api/v1/appointments/{}/confirm", id);
        AppointmentResponse response = appointmentService.confirm(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Xác nhận lịch hẹn thành công"));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('PATIENT', 'RECEPTIONIST', 'ADMIN')")
    @Operation(summary = "Hủy lịch hẹn", description = "Bệnh nhân hoặc nhân viên y tế hủy lịch hẹn kèm lý do.")
    public ResponseEntity<ApiResponse<AppointmentResponse>> cancel(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        log.info("PATCH /api/v1/appointments/{}/cancel – reason: {}", id, reason);
        AppointmentResponse response = appointmentService.cancel(id, reason);
        return ResponseEntity.ok(ApiResponse.success(response, "Hủy lịch hẹn thành công"));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Hoàn tất khám", description = "Bác sĩ hoàn tất khám chuyển trạng thái lịch sang COMPLETED.")
    public ResponseEntity<ApiResponse<AppointmentResponse>> complete(@PathVariable Long id) {
        log.info("PATCH /api/v1/appointments/{}/complete", id);
        AppointmentResponse response = appointmentService.complete(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Hoàn tất lịch hẹn thành công"));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'DOCTOR', 'ADMIN')")
    @Operation(summary = "Cập nhật trạng thái lịch hẹn", description = "Cập nhật trạng thái tổng quát (BOOKED, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW).")
    public ResponseEntity<ApiResponse<AppointmentResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAppointmentStatusRequest request) {
        log.info("PATCH /api/v1/appointments/{}/status – status: {}", id, request.getStatus());
        AppointmentResponse response = appointmentService.updateStatus(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật trạng thái thành công"));
    }

    // ==================== Helper ====================

    private Long extractUserId(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails userDetails) {
            return userDetails.getUserId();
        }
        throw new RuntimeException("Không thể xác định userId từ Authentication");
    }
}
