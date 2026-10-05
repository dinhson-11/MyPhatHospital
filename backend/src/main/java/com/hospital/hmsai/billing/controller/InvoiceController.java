package com.hospital.hmsai.billing.controller;

import com.hospital.hmsai.billing.dto.InvoiceResponse;
import com.hospital.hmsai.billing.dto.PayInvoiceRequest;
import com.hospital.hmsai.billing.entity.InvoiceStatus;
import com.hospital.hmsai.billing.service.InvoiceService;
import com.hospital.hmsai.common.ApiResponse;
import com.hospital.hmsai.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Viện phí & Hóa đơn", description = "APIs tự động sinh hóa đơn từ ca khám và thanh toán viện phí (FR-7)")
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping("/generate/{visitId}")
    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'DOCTOR', 'ADMIN')")
    @Operation(summary = "Tự động sinh hóa đơn từ lượt khám", description = "Tự động tổng hợp 3 nhóm chi phí: Khám dịch vụ, Đơn thuốc, Cận lâm sàng (FR-7.1)")
    public ResponseEntity<ApiResponse<InvoiceResponse>> generateInvoice(@PathVariable Long visitId) {
        log.info("POST /api/v1/invoices/generate/{}", visitId);
        InvoiceResponse response = invoiceService.generateInvoiceFromVisit(visitId);
        return ResponseEntity.ok(ApiResponse.success(response, "Sinh hóa đơn viện phí thành công"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'ADMIN', 'PATIENT')")
    @Operation(summary = "Xem chi tiết hóa đơn", description = "Lấy chi tiết bảng kê viện phí theo ID (hỗ trợ kiểm tra self-access cho bệnh nhân)")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceById(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Authentication authentication) {
        Long userId = userDetails != null ? userDetails.getUserId() : null;
        boolean isStaffOrAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ACCOUNTANT") || a.getAuthority().equals("ROLE_ADMIN"));

        log.info("GET /api/v1/invoices/{} – user: {}, isPrivileged: {}", id, userId, isStaffOrAdmin);
        InvoiceResponse response = invoiceService.getInvoiceById(id, userId, isStaffOrAdmin);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/visit/{visitId}")
    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'DOCTOR', 'ADMIN', 'PATIENT')")
    @Operation(summary = "Lấy hóa đơn theo lượt khám", description = "Tra cứu hóa đơn viện phí gắn với một ca khám bệnh")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceByVisitId(@PathVariable Long visitId) {
        log.info("GET /api/v1/invoices/visit/{}", visitId);
        InvoiceResponse response = invoiceService.getInvoiceByVisitId(visitId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}/pay")
    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'ADMIN')")
    @Operation(summary = "Xác nhận thanh toán viện phí", description = "Xác nhận đã thu tiền viện phí (tiền mặt / VietQR) và cập nhật trạng thái PAID (FR-7.2)")
    public ResponseEntity<ApiResponse<InvoiceResponse>> payInvoice(
            @PathVariable Long id,
            @Valid @RequestBody PayInvoiceRequest request) {
        log.info("PUT /api/v1/invoices/{}/pay – method: {}", id, request.getPaymentMethod());
        InvoiceResponse response = invoiceService.payInvoice(id, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Xác nhận thanh toán viện phí thành công"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'ADMIN')")
    @Operation(summary = "Danh sách hóa đơn", description = "Tra cứu danh sách hóa đơn viện phí, hỗ trợ phân trang và lọc theo trạng thái/từ khóa")
    public ResponseEntity<ApiResponse<Page<InvoiceResponse>>> getInvoices(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) InvoiceStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        log.info("GET /api/v1/invoices – keyword: {}, status: {}, page: {}", keyword, status, pageable.getPageNumber());
        Page<InvoiceResponse> page = invoiceService.searchInvoices(keyword, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(page));
    }
}
