package com.hospital.hmsai.hr.controller;

import com.hospital.hmsai.common.ApiResponse;
import com.hospital.hmsai.hr.dto.StaffResponse;
import com.hospital.hmsai.hr.service.StaffService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/staff")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Nhân sự y tế (HR)", description = "APIs danh bạ bác sĩ, điều dưỡng, dược sĩ, nhân viên y tế (FR-8.1)")
public class StaffController {

    private final StaffService staffService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'PHARMACIST', 'ACCOUNTANT')")
    @Operation(summary = "Danh sách nhân viên y tế", description = "Tra cứu danh sách nhân viên y tế theo chuyên khoa hoặc toàn bệnh viện")
    public ResponseEntity<ApiResponse<List<StaffResponse>>> getAllStaff(
            @RequestParam(required = false) Long departmentId) {
        log.info("GET /api/v1/staff – departmentId: {}", departmentId);
        List<StaffResponse> list = staffService.getAllStaff(departmentId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Chi tiết hồ sơ nhân viên y tế", description = "Lấy thông tin chi tiết một nhân viên y tế theo ID hồ sơ")
    public ResponseEntity<ApiResponse<StaffResponse>> getStaffById(@PathVariable Long id) {
        log.info("GET /api/v1/staff/{}", id);
        StaffResponse response = staffService.getStaffById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
