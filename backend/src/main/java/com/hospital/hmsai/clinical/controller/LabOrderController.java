package com.hospital.hmsai.clinical.controller;

import com.hospital.hmsai.clinical.dto.LabOrderResponse;
import com.hospital.hmsai.clinical.dto.LabResultResponse;
import com.hospital.hmsai.clinical.dto.UpdateLabResultRequest;
import com.hospital.hmsai.clinical.service.LabOrderService;
import com.hospital.hmsai.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/lab-orders")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Cận lâm sàng & Xét nghiệm", description = "APIs quản lý và cập nhật kết quả xét nghiệm cận lâm sàng")
public class LabOrderController {

    private final LabOrderService labOrderService;

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE', 'ADMIN') "
            + "or (hasRole('PATIENT') and @securityService.isLabOrderPatient(#id, authentication))")
    @Operation(summary = "Xem chi tiết chỉ định cận lâm sàng", description = "Tra cứu thông tin chỉ định xét nghiệm và kết quả theo ID.")
    public ResponseEntity<ApiResponse<LabOrderResponse>> getById(@PathVariable Long id) {
        log.info("GET /api/v1/lab-orders/{}", id);
        LabOrderResponse response = labOrderService.getOrderById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}/result")
    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE', 'ADMIN')")
    @Operation(summary = "Nhập kết quả cận lâm sàng", description = "Điều dưỡng hoặc kỹ thuật viên phòng Lab cập nhật kết luận xét nghiệm và đường dẫn file. "
            + "Mỗi chỉ định chỉ nhập kết quả một lần.")
    public ResponseEntity<ApiResponse<LabResultResponse>> submitLabResult(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLabResultRequest request) {
        log.info("PUT /api/v1/lab-orders/{}/result", id);
        LabResultResponse response = labOrderService.submitLabResult(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật kết quả xét nghiệm thành công"));
    }
}
