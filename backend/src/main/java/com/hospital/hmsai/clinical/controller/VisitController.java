package com.hospital.hmsai.clinical.controller;

import com.hospital.hmsai.clinical.dto.*;
import com.hospital.hmsai.clinical.entity.VisitStatus;
import com.hospital.hmsai.clinical.service.VisitService;
import com.hospital.hmsai.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/visits")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Khám bệnh lâm sàng", description = "APIs quản lý ca khám bệnh, chẩn đoán, kê đơn và chỉ định cận lâm sàng")
public class VisitController {

    private final VisitService visitService;

    @PostMapping
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'DOCTOR', 'NURSE', 'ADMIN')")
    @Operation(summary = "Bắt đầu ca khám bệnh", description = "Bác sĩ hoặc điều dưỡng tạo lượt khám mới (từ lịch hẹn hoặc trực tiếp).")
    public ResponseEntity<ApiResponse<VisitResponse>> createVisit(
            @Valid @RequestBody CreateVisitRequest request) {
        log.info("POST /api/v1/visits – patientId: {}, doctorId: {}", request.getPatientId(), request.getDoctorId());
        VisitResponse response = visitService.createVisit(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Bắt đầu lượt khám bệnh thành công"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE', 'RECEPTIONIST', 'ADMIN')")
    @Operation(summary = "Danh sách ca khám bệnh", description = "Lấy danh sách các ca khám có lọc theo bác sĩ, bệnh nhân, trạng thái và phân trang.")
    public ResponseEntity<ApiResponse<Page<VisitResponse>>> getAllVisits(
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) Long patientId,
            @RequestParam(required = false) VisitStatus status,
            @PageableDefault(size = 20, sort = "visitTime", direction = Sort.Direction.DESC) Pageable pageable) {
        log.info("GET /api/v1/visits – doctorId: {}, patientId: {}, status: {}", doctorId, patientId, status);
        Page<VisitResponse> result = visitService.getAllVisits(doctorId, patientId, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE', 'RECEPTIONIST', 'ADMIN', 'PATIENT')")
    @Operation(summary = "Chi tiết ca khám bệnh", description = "Xem chi tiết ca khám kèm sinh hiệu, đơn thuốc và kết quả cận lâm sàng.")
    public ResponseEntity<ApiResponse<VisitResponse>> getVisitById(@PathVariable Long id) {
        log.info("GET /api/v1/visits/{}", id);
        VisitResponse response = visitService.getVisitById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE', 'ADMIN')")
    @Operation(summary = "Cập nhật sinh hiệu và chẩn đoán", description = "Bác sĩ cập nhật thông tin sinh hiệu, lý do khám, mã ICD-10 và ghi chú lâm sàng.")
    public ResponseEntity<ApiResponse<VisitResponse>> updateVisit(
            @PathVariable Long id,
            @Valid @RequestBody UpdateVisitRequest request) {
        log.info("PUT /api/v1/visits/{} – diagnosis: {}", id, request.getDiagnosisCode());
        VisitResponse response = visitService.updateVisit(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật thông tin ca khám thành công"));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Hoàn tất ca khám bệnh", description = "Bác sĩ xác nhận hoàn tất ca khám, cập nhật trạng thái COMPLETED và lưu vào bệnh án EMR.")
    public ResponseEntity<ApiResponse<VisitResponse>> completeVisit(@PathVariable Long id) {
        log.info("PATCH /api/v1/visits/{}/complete", id);
        VisitResponse response = visitService.completeVisit(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Hoàn tất ca khám bệnh thành công"));
    }

    @PostMapping("/{id}/prescriptions")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Kê đơn thuốc cho ca khám", description = "Bác sĩ thêm danh sách thuốc điều trị cho bệnh nhân kèm liều dùng và cách dùng.")
    public ResponseEntity<ApiResponse<PrescriptionResponse>> createPrescription(
            @PathVariable Long id,
            @Valid @RequestBody CreatePrescriptionRequest request) {
        log.info("POST /api/v1/visits/{}/prescriptions – items count: {}", id, request.getItems().size());
        PrescriptionResponse response = visitService.createPrescription(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Kê đơn thuốc thành công"));
    }

    @GetMapping("/{id}/prescriptions")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PHARMACIST', 'NURSE', 'RECEPTIONIST', 'ADMIN', 'PATIENT')")
    @Operation(summary = "Xem đơn thuốc của ca khám", description = "Lấy danh sách các đơn thuốc đã kê trong lượt khám này.")
    public ResponseEntity<ApiResponse<List<PrescriptionResponse>>> getPrescriptions(@PathVariable Long id) {
        log.info("GET /api/v1/visits/{}/prescriptions", id);
        List<PrescriptionResponse> result = visitService.getPrescriptionsByVisitId(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/{id}/lab-orders")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Chỉ định cận lâm sàng", description = "Bác sĩ chỉ định các xét nghiệm hoặc chẩn đoán hình ảnh cần thực hiện.")
    public ResponseEntity<ApiResponse<LabOrderResponse>> createLabOrder(
            @PathVariable Long id,
            @Valid @RequestBody CreateLabOrderRequest request) {
        log.info("POST /api/v1/visits/{}/lab-orders – type: {}", id, request.getTestType());
        LabOrderResponse response = visitService.createLabOrder(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Chỉ định cận lâm sàng thành công"));
    }

    @GetMapping("/{id}/lab-orders")
    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE', 'ADMIN', 'PATIENT')")
    @Operation(summary = "Danh sách cận lâm sàng của ca khám", description = "Lấy danh sách các xét nghiệm đã chỉ định kèm kết quả (nếu có).")
    public ResponseEntity<ApiResponse<List<LabOrderResponse>>> getLabOrders(@PathVariable Long id) {
        log.info("GET /api/v1/visits/{}/lab-orders", id);
        List<LabOrderResponse> result = visitService.getLabOrdersByVisitId(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
