package com.hospital.hmsai.pharmacy.controller;

import com.hospital.hmsai.common.ApiResponse;
import com.hospital.hmsai.pharmacy.dto.DispenseRequest;
import com.hospital.hmsai.pharmacy.dto.DispenseResponse;
import com.hospital.hmsai.pharmacy.service.DispenseService;
import com.hospital.hmsai.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/prescriptions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Cấp phát thuốc Nhà thuốc", description = "APIs cấp phát thuốc theo đơn, trừ tồn kho tự động (FR-6.2)")
public class DispenseController {

    private final DispenseService dispenseService;

    @PostMapping("/{id}/dispense")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    @Operation(summary = "Cấp phát thuốc theo đơn", description = "Kiểm tra tồn kho và tự động trừ kho cho tất cả thuốc trong đơn")
    public ResponseEntity<ApiResponse<DispenseResponse>> dispensePrescription(
            @PathVariable Long id,
            @RequestBody(required = false) DispenseRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Long userId = userDetails != null ? userDetails.getUserId() : null;
        log.info("POST /api/v1/prescriptions/{}/dispense – bởi user: {}", id, userId);
        DispenseResponse response = dispenseService.dispensePrescription(id, request, userId);
        return ResponseEntity.ok(ApiResponse.success(response, "Cấp phát thuốc và cập nhật kho thành công"));
    }

    @GetMapping("/{id}/dispense")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'DOCTOR', 'ADMIN', 'PATIENT', 'NURSE')")
    @Operation(summary = "Xem thông tin cấp phát đơn thuốc", description = "Lấy chi tiết lượt cấp phát của đơn thuốc theo ID")
    public ResponseEntity<ApiResponse<DispenseResponse>> getDispenseByPrescriptionId(@PathVariable Long id) {
        log.info("GET /api/v1/prescriptions/{}/dispense", id);
        DispenseResponse response = dispenseService.getDispenseByPrescriptionId(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}/is-dispensed")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'DOCTOR', 'ADMIN', 'PATIENT', 'NURSE')")
    @Operation(summary = "Kiểm tra trạng thái đã cấp phát", description = "Trả về true nếu đơn thuốc đã được cấp phát")
    public ResponseEntity<ApiResponse<Boolean>> isDispensed(@PathVariable Long id) {
        log.info("GET /api/v1/prescriptions/{}/is-dispensed", id);
        boolean isDispensed = dispenseService.isDispensed(id);
        return ResponseEntity.ok(ApiResponse.success(isDispensed));
    }

    @GetMapping("/dispenses")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    @Operation(summary = "Lịch sử cấp phát thuốc", description = "Danh sách các lượt cấp phát thuốc gần đây của nhà thuốc")
    public ResponseEntity<ApiResponse<List<DispenseResponse>>> getAllDispenses() {
        log.info("GET /api/v1/prescriptions/dispenses");
        List<DispenseResponse> list = dispenseService.getAllDispenses();
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
