package com.hospital.hmsai.ai.controller;

import com.hospital.hmsai.ai.dto.*;
import com.hospital.hmsai.ai.service.AiClinicalService;
import com.hospital.hmsai.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/ai/clinical")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AI Clinical Safety", description = "API Cảnh báo lâm sàng AI: Tương tác thuốc (FR-11.1), Dị ứng thuốc (FR-11.2) & Audit log (NFR-8)")
public class AiClinicalController {

    private final AiClinicalService aiClinicalService;

    @PostMapping("/check-interaction")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN', 'PHARMACIST')")
    @Operation(summary = "Kiểm tra tương tác giữa các thuốc trong đơn")
    public ResponseEntity<ApiResponse<InteractionCheckResponse>> checkInteraction(
            @Valid @RequestBody InteractionCheckRequest request) {
        log.info("API: Bác sĩ yêu cầu kiểm tra tương tác cho {} loại thuốc", request.getDrugs().size());
        InteractionCheckResponse response = aiClinicalService.checkInteractions(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Kiểm tra tương tác thuốc thành công"));
    }

    @PostMapping("/check-allergy")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN', 'PHARMACIST')")
    @Operation(summary = "Kiểm tra dị ứng thuốc & dị ứng chéo với tiền sử bệnh nhân")
    public ResponseEntity<ApiResponse<AllergyCheckResponse>> checkAllergy(
            @Valid @RequestBody AllergyCheckRequest request) {
        log.info("API: Bác sĩ yêu cầu kiểm tra dị ứng cho {} loại thuốc", request.getDrugs().size());
        AllergyCheckResponse response = aiClinicalService.checkAllergies(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Kiểm tra dị ứng thuốc thành công"));
    }

    @PostMapping("/check-safety")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN', 'PHARMACIST')")
    @Operation(summary = "Kiểm tra an toàn đơn thuốc tổng thể (tương tác + dị ứng)")
    public ResponseEntity<ApiResponse<PrescriptionSafetyResponse>> checkSafety(
            @Valid @RequestBody PrescriptionSafetyCheckRequest request) {
        log.info("API: Kiểm tra an toàn đơn thuốc tổng thể");
        PrescriptionSafetyResponse response = aiClinicalService.checkPrescriptionSafety(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Kiểm tra an toàn đơn thuốc thành công"));
    }

    @PostMapping("/visits/{visitId}/check-safety")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN', 'PHARMACIST')")
    @Operation(summary = "Kiểm tra an toàn đơn thuốc theo ca khám và lưu audit log AI (NFR-8)")
    public ResponseEntity<ApiResponse<PrescriptionSafetyResponse>> checkAndAuditVisitSafety(
            @PathVariable Long visitId,
            @RequestBody List<DrugItemDto> drugs) {
        log.info("API: Kiểm tra an toàn và ghi audit log AI cho ca khám ID: {}", visitId);
        PrescriptionSafetyResponse response = aiClinicalService.checkAndAuditPrescriptionSafety(visitId, drugs);
        return ResponseEntity.ok(ApiResponse.ok(response, "Đã phân tích an toàn đơn thuốc và lưu audit log AI"));
    }

    @GetMapping("/visits/{visitId}/suggestions")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN', 'NURSE', 'PHARMACIST')")
    @Operation(summary = "Lấy lịch sử audit log các cảnh báo/gợi ý AI của lượt khám")
    public ResponseEntity<ApiResponse<List<AiAuditLogResponse>>> getVisitAuditLogs(@PathVariable Long visitId) {
        log.info("API: Lấy lịch sử audit log AI cho lượt khám ID: {}", visitId);
        List<AiAuditLogResponse> logs = aiClinicalService.getAuditLogsByVisitId(visitId);
        return ResponseEntity.ok(ApiResponse.ok(logs, "Lấy lịch sử gợi ý AI thành công"));
    }
}
