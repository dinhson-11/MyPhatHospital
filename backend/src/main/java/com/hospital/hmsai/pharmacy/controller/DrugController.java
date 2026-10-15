package com.hospital.hmsai.pharmacy.controller;

import com.hospital.hmsai.common.ApiResponse;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.pharmacy.dto.DrugImportPreviewRow;
import com.hospital.hmsai.pharmacy.dto.DrugImportRequest;
import com.hospital.hmsai.pharmacy.dto.DrugImportResult;
import com.hospital.hmsai.pharmacy.dto.DrugInteractionResponse;
import com.hospital.hmsai.pharmacy.dto.DrugResponse;
import com.hospital.hmsai.pharmacy.importer.DrugExcelFormat;
import com.hospital.hmsai.pharmacy.service.DrugImportService;
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
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/v1/drugs")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Nhà thuốc & Dược phẩm", description = "APIs tra cứu danh mục thuốc và danh mục tương tác thuốc")
public class DrugController {

    private static final MediaType XLSX =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final DrugService drugService;
    private final DrugImportService drugImportService;

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

    @PostMapping
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    @Operation(summary = "Thêm thuốc mới vào danh mục", description = "Tạo mới thuốc trong danh mục kho dược (FR-6.1)")
    public ResponseEntity<ApiResponse<DrugResponse>> createDrug(
            @jakarta.validation.Valid @RequestBody com.hospital.hmsai.pharmacy.dto.CreateDrugRequest request) {
        log.info("POST /api/v1/drugs – mã thuốc: {}", request.getCode());
        DrugResponse response = drugService.createDrug(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Thêm thuốc vào danh mục thành công"));
    }

    @GetMapping("/import/template")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    @Operation(summary = "Tải file Excel mẫu nhập thuốc", description = "File .xlsx gồm dòng tiêu đề và sheet hướng dẫn")
    public ResponseEntity<byte[]> downloadImportTemplate() {
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("mau-nhap-thuoc.xlsx", StandardCharsets.UTF_8).build().toString())
                .body(DrugExcelFormat.template());
    }

    @PostMapping(value = "/import/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    @Operation(summary = "Xem trước file Excel nhập thuốc",
            description = "Đọc và kiểm tra file, phân loại từng dòng: NEW (thuốc mới), EXISTS (mã đã có), INVALID (lỗi). Không ghi dữ liệu.")
    public ResponseEntity<ApiResponse<List<DrugImportPreviewRow>>> previewImport(
            @RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new BusinessException("Vui lòng chọn file Excel cần nhập");
        }
        log.info("POST /api/v1/drugs/import/preview – file: {}, {} bytes", file.getOriginalFilename(), file.getSize());
        try (InputStream in = file.getInputStream()) {
            return ResponseEntity.ok(ApiResponse.success(drugImportService.preview(in)));
        }
    }

    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    @Operation(summary = "Nhập thuốc từ Excel",
            description = "Lưu các dòng đã chọn sau bước xem trước: CREATE thêm thuốc mới, RESTOCK cộng tồn kho và cập nhật giá / hạn dùng. Lỗi ở bất kỳ dòng nào thì không lưu gì.")
    public ResponseEntity<ApiResponse<DrugImportResult>> importDrugs(
            @jakarta.validation.Valid @RequestBody DrugImportRequest request) {
        log.info("POST /api/v1/drugs/import – {} dòng", request.getItems().size());
        DrugImportResult result = drugImportService.importDrugs(request);
        return ResponseEntity.ok(ApiResponse.success(result, "Nhập thuốc từ Excel thành công"));
    }

    @PutMapping("/{id}/stock")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    @Operation(summary = "Cập nhật tồn kho thuốc", description = "Nhập kho, xuất kho hoặc điều chỉnh tồn kho (FR-6.1)")
    public ResponseEntity<ApiResponse<DrugResponse>> updateStock(
            @PathVariable Long id,
            @jakarta.validation.Valid @RequestBody com.hospital.hmsai.pharmacy.dto.UpdateStockRequest request) {
        log.info("PUT /api/v1/drugs/{}/stock – type: {}, qty: {}", id, request.getAdjustmentType(), request.getQuantity());
        DrugResponse response = drugService.updateStock(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật tồn kho thành công"));
    }

    @GetMapping("/expiring-soon")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    @Operation(summary = "Danh sách thuốc sắp hết hạn", description = "Lọc thuốc hết hạn trong N ngày tới (mặc định 30 ngày) - FR-6.3")
    public ResponseEntity<ApiResponse<List<DrugResponse>>> getExpiringSoon(
            @RequestParam(required = false, defaultValue = "30") int days) {
        log.info("GET /api/v1/drugs/expiring-soon – days: {}", days);
        List<DrugResponse> list = drugService.getExpiringSoonDrugs(days);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'ADMIN')")
    @Operation(summary = "Danh sách thuốc tồn kho thấp", description = "Lọc thuốc có số lượng tồn kho <= ngưỡng cảnh báo (mặc định 20) - FR-6.3")
    public ResponseEntity<ApiResponse<List<DrugResponse>>> getLowStock(
            @RequestParam(required = false, defaultValue = "20") int threshold) {
        log.info("GET /api/v1/drugs/low-stock – threshold: {}", threshold);
        List<DrugResponse> list = drugService.getLowStockDrugs(threshold);
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
