package com.hospital.hmsai.patient.controller;

import com.hospital.hmsai.common.ApiResponse;
import com.hospital.hmsai.patient.dto.*;
import com.hospital.hmsai.patient.service.PatientAllergyService;
import com.hospital.hmsai.patient.service.PatientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller quản lý hồ sơ bệnh nhân & dị ứng.
 * Phân quyền chi tiết theo role: RECEPTIONIST, DOCTOR, NURSE, ADMIN, PATIENT(self).
 */
@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Bệnh nhân", description = "APIs quản lý hồ sơ bệnh nhân, dị ứng và lịch sử khám")
public class PatientController {

    private final PatientService patientService;
    private final PatientAllergyService allergyService;

    // ==================== Hồ sơ bệnh nhân ====================

    @GetMapping
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'DOCTOR', 'ADMIN')")
    @Operation(summary = "Tìm kiếm bệnh nhân", description = "Tìm theo tên, SĐT hoặc mã bệnh nhân. Hỗ trợ phân trang.")
    public ResponseEntity<ApiResponse<Page<PatientResponse>>> search(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        log.info("GET /api/v1/patients – keyword: '{}', page: {}", keyword, pageable.getPageNumber());
        Page<PatientResponse> result = patientService.search(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
    @Operation(summary = "Tạo hồ sơ bệnh nhân", description = "Lễ tân hoặc admin tạo hồ sơ mới. Mã bệnh nhân tự sinh.")
    public ResponseEntity<ApiResponse<PatientResponse>> create(
            @Valid @RequestBody CreatePatientRequest request) {
        log.info("POST /api/v1/patients – fullName: {}", request.getFullName());
        PatientResponse response = patientService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Tạo hồ sơ bệnh nhân thành công"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'DOCTOR', 'ADMIN', 'PATIENT')")
    @Operation(summary = "Xem chi tiết hồ sơ", description = "Xem thông tin bệnh nhân theo ID. PATIENT chỉ xem được hồ sơ của mình.")
    public ResponseEntity<ApiResponse<PatientResponse>> getById(@PathVariable Long id) {
        log.info("GET /api/v1/patients/{}", id);
        PatientResponse response = patientService.getById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
    @Operation(summary = "Cập nhật hồ sơ bệnh nhân", description = "Lễ tân hoặc admin cập nhật thông tin bệnh nhân.")
    public ResponseEntity<ApiResponse<PatientResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePatientRequest request) {
        log.info("PUT /api/v1/patients/{}", id);
        PatientResponse response = patientService.update(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật hồ sơ thành công"));
    }

    // ==================== Self-access cho bệnh nhân ====================

    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Xem hồ sơ của tôi", description = "Bệnh nhân xem hồ sơ của chính mình.")
    public ResponseEntity<ApiResponse<PatientResponse>> getMyProfile(Authentication authentication) {
        Long userId = extractUserId(authentication);
        log.info("GET /api/v1/patients/me – userId: {}", userId);
        PatientResponse response = patientService.getByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Cập nhật hồ sơ của tôi", description = "Bệnh nhân tự cập nhật thông tin cá nhân.")
    public ResponseEntity<ApiResponse<PatientResponse>> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody UpdatePatientRequest request) {
        Long userId = extractUserId(authentication);
        log.info("PUT /api/v1/patients/me – userId: {}", userId);
        PatientResponse response = patientService.updateMyProfile(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật hồ sơ thành công"));
    }

    // ==================== Dị ứng bệnh nhân ====================

    @GetMapping("/{id}/allergies")
    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE', 'PATIENT')")
    @Operation(summary = "Danh sách dị ứng", description = "Lấy danh sách dị ứng của bệnh nhân. PATIENT chỉ xem được của mình.")
    public ResponseEntity<ApiResponse<List<AllergyResponse>>> getAllergies(@PathVariable Long id) {
        log.info("GET /api/v1/patients/{}/allergies", id);
        List<AllergyResponse> result = allergyService.getAllByPatientId(id);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/{id}/allergies")
    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE')")
    @Operation(summary = "Thêm dị ứng", description = "Bác sĩ hoặc y tá thêm thông tin dị ứng cho bệnh nhân.")
    public ResponseEntity<ApiResponse<AllergyResponse>> addAllergy(
            @PathVariable Long id,
            @Valid @RequestBody CreateAllergyRequest request) {
        log.info("POST /api/v1/patients/{}/allergies – allergen: {}", id, request.getAllergen());
        AllergyResponse response = allergyService.create(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Thêm dị ứng thành công"));
    }

    @DeleteMapping("/{id}/allergies/{allergyId}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'NURSE')")
    @Operation(summary = "Xóa dị ứng", description = "Bác sĩ hoặc y tá xóa thông tin dị ứng.")
    public ResponseEntity<ApiResponse<Void>> deleteAllergy(
            @PathVariable Long id,
            @PathVariable Long allergyId) {
        log.info("DELETE /api/v1/patients/{}/allergies/{}", id, allergyId);
        allergyService.delete(id, allergyId);
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa dị ứng thành công"));
    }

    // ==================== Helper ====================

    /**
     * Trích xuất userId từ Authentication principal.
     * Giả định principal chứa username, cần lookup userId.
     * Trong thực tế có thể cast sang custom UserDetails chứa userId.
     */
    private Long extractUserId(Authentication authentication) {
        // Cast principal sang UserDetails custom nếu có,
        // hoặc parse từ JWT claims. Tạm thời dùng name (username) rồi lookup.
        Object principal = authentication.getPrincipal();
        if (principal instanceof com.hospital.hmsai.security.CustomUserDetails userDetails) {
            return userDetails.getUserId();
        }
        throw new RuntimeException("Không thể xác định userId từ Authentication");
    }
}
