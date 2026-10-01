package com.hospital.hmsai.pharmacy.controller;

import com.hospital.hmsai.common.ApiResponse;
import com.hospital.hmsai.pharmacy.dto.DrugInteractionResponse;
import com.hospital.hmsai.pharmacy.dto.DrugResponse;
import com.hospital.hmsai.pharmacy.service.DrugService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/drugs")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Nhà thuốc & Dược phẩm", description = "APIs tra cứu danh mục thuốc và danh mục tương tác thuốc")
public class DrugController {

    private final DrugService drugService;

    @GetMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'PHARMACIST', 'RECEPTIONIST', 'ADMIN', 'NURSE', 'PATIENT')")
    @Operation(summary = "Tìm kiếm danh mục thuốc", description = "Tìm kiếm thuốc theo tên hoặc mã code, hỗ trợ phân trang.")
    public ResponseEntity<ApiResponse<Page<DrugResponse>>> searchDrugs(
            @Parameter(description = "Từ khóa tìm kiếm (tên thuốc hoặc mã)")
            @RequestParam(required = false, defaultValue = "") String keyword,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        log.info("GET /api/v1/drugs – keyword: {}, page: {}", keyword, pageable.getPageNumber());
        Page<DrugResponse> result = drugService.searchDrugs(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PHARMACIST', 'ADMIN', 'NURSE')")
    @Operation(summary = "Lấy danh sách thuốc nhanh", description = "Lấy danh sách thuốc không phân trang để chọn nhanh trên giao diện.")
    public ResponseEntity<ApiResponse<List<DrugResponse>>> getAllDrugsList(
            @RequestParam(required = false, defaultValue = "") String keyword) {
        log.info("GET /api/v1/drugs/all – keyword: {}", keyword);
        List<DrugResponse> result = drugService.searchDrugsList(keyword);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PHARMACIST', 'ADMIN', 'NURSE')")
    @Operation(summary = "Chi tiết thuốc", description = "Xem chi tiết một loại thuốc theo ID.")
    public ResponseEntity<ApiResponse<DrugResponse>> getById(@PathVariable Long id) {
        log.info("GET /api/v1/drugs/{}", id);
        DrugResponse response = drugService.getById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/interactions")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PHARMACIST', 'ADMIN', 'NURSE')")
    @Operation(summary = "Danh sách tương tác thuốc", description = "Lấy toàn bộ danh sách cặp tương tác thuốc được lưu trong hệ thống.")
    public ResponseEntity<ApiResponse<List<DrugInteractionResponse>>> getAllInteractions() {
        log.info("GET /api/v1/drugs/interactions");
        List<DrugInteractionResponse> result = drugService.getAllInteractions();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/interactions/check")
    @PreAuthorize("hasAnyRole('DOCTOR', 'PHARMACIST', 'ADMIN')")
    @Operation(summary = "Kiểm tra tương tác thuốc giữa danh sách thuốc", description = "Truyền danh sách ID các thuốc kê đơn để kiểm tra có cặp tương tác nào không.")
    public ResponseEntity<ApiResponse<List<DrugInteractionResponse>>> checkInteractions(
            @RequestBody List<Long> drugIds) {
        log.info("POST /api/v1/drugs/interactions/check – drugIds: {}", drugIds);
        List<DrugInteractionResponse> result = drugService.checkInteractionsAmongDrugs(drugIds);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
