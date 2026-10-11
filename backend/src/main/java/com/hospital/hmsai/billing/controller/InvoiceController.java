package com.hospital.hmsai.billing.controller;

import com.hospital.hmsai.billing.dto.BillingShiftSummaryResponse;
import com.hospital.hmsai.billing.dto.InvoiceResponse;
import com.hospital.hmsai.billing.dto.PayInvoiceRequest;
import com.hospital.hmsai.billing.dto.PaymentQrResponse;
import com.hospital.hmsai.billing.dto.UninvoicedVisitResponse;
import com.hospital.hmsai.billing.dto.VoidInvoiceRequest;
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
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Viện phí & Hóa đơn", description = "Lập hóa đơn từ ca khám, BHYT, thu tiền đa phương thức, hủy / hoàn tiền, đối soát (FR-7)")
public class InvoiceController {

    /** Vai trò được xem mọi hóa đơn. Bác sĩ được xem để tư vấn chi phí cho người bệnh. */
    private static final Set<String> PRIVILEGED_VIEWERS = Set.of("ROLE_RECEPTIONIST", "ROLE_ADMIN", "ROLE_DOCTOR");

    private final InvoiceService invoiceService;

    @PostMapping("/generate/{visitId}")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'DOCTOR', 'ADMIN')")
    @Operation(summary = "Lập hóa đơn từ ca khám đã hoàn tất",
            description = "Tổng hợp phí khám, thuốc, cận lâm sàng và áp dụng BHYT. Trả về hóa đơn hiện có nếu ca khám đã có hóa đơn còn hiệu lực.")
    public ResponseEntity<ApiResponse<InvoiceResponse>> generateInvoice(@PathVariable Long visitId) {
        log.info("POST /api/v1/invoices/generate/{}", visitId);
        InvoiceResponse response = invoiceService.generateInvoiceFromVisit(visitId);
        return ResponseEntity.ok(ApiResponse.success(response, "Lập hóa đơn viện phí thành công"));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    @Operation(summary = "Hóa đơn của tôi", description = "Bệnh nhân xem các hóa đơn viện phí của chính mình")
    public ResponseEntity<ApiResponse<List<InvoiceResponse>>> getMyInvoices(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getMyInvoices(userDetails.getUserId())));
    }

    @GetMapping("/uninvoiced-visits")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
    @Operation(summary = "Hàng chờ lập hóa đơn", description = "Ca khám đã hoàn tất nhưng chưa có hóa đơn còn hiệu lực")
    public ResponseEntity<ApiResponse<List<UninvoicedVisitResponse>>> getUninvoicedVisits(
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getUninvoicedVisits(limit)));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
    @Operation(summary = "Tổng hợp thu ngân theo ngày", description = "Đối soát cuối ca: số đã thu theo phương thức, BHYT, hoàn tiền, chờ thu")
    public ResponseEntity<ApiResponse<BillingShiftSummaryResponse>> getShiftSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getShiftSummary(date)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN', 'DOCTOR', 'PATIENT')")
    @Operation(summary = "Xem chi tiết hóa đơn", description = "Bệnh nhân chỉ xem được hóa đơn của chính mình")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceById(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Authentication authentication) {
        InvoiceResponse response = invoiceService.getInvoiceById(id, userId(userDetails), isPrivileged(authentication));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/visit/{visitId}")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'DOCTOR', 'ADMIN', 'PATIENT')")
    @Operation(summary = "Lấy hóa đơn theo lượt khám", description = "Bệnh nhân chỉ xem được hóa đơn của chính mình")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceByVisitId(
            @PathVariable Long visitId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Authentication authentication) {
        InvoiceResponse response = invoiceService.getInvoiceByVisitId(visitId, userId(userDetails), isPrivileged(authentication));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}/payment-qr")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
    @Operation(summary = "Thông tin chuyển khoản VietQR", description = "Số tiền và nội dung chuyển khoản do máy chủ sinh từ hóa đơn")
    public ResponseEntity<ApiResponse<PaymentQrResponse>> getPaymentQr(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(invoiceService.getPaymentQr(id)));
    }

    @PostMapping("/{id}/recalculate")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
    @Operation(summary = "Tính lại hóa đơn chưa thu", description = "Dùng khi vừa cập nhật thẻ BHYT hoặc bảng giá")
    public ResponseEntity<ApiResponse<InvoiceResponse>> recalculate(@PathVariable Long id) {
        log.info("POST /api/v1/invoices/{}/recalculate", id);
        return ResponseEntity.ok(ApiResponse.success(invoiceService.recalculateInvoice(id), "Đã tính lại hóa đơn"));
    }

    @PutMapping("/{id}/pay")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
    @Operation(summary = "Xác nhận thu tiền viện phí",
            description = "Tiền mặt: bắt buộc tiền khách đưa ≥ số phải thu. VietQR / chuyển khoản / thẻ: bắt buộc mã giao dịch.")
    public ResponseEntity<ApiResponse<InvoiceResponse>> payInvoice(
            @PathVariable Long id,
            @Valid @RequestBody PayInvoiceRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("PUT /api/v1/invoices/{}/pay – method: {}", id, request.getPaymentMethod());
        InvoiceResponse response = invoiceService.payInvoice(id, request, userId(userDetails));
        return ResponseEntity.ok(ApiResponse.success(response, "Xác nhận thu tiền viện phí thành công"));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
    @Operation(summary = "Hủy hóa đơn chưa thu", description = "Bắt buộc ghi lý do; có thể lập lại hóa đơn cho ca khám sau khi hủy")
    public ResponseEntity<ApiResponse<InvoiceResponse>> cancelInvoice(
            @PathVariable Long id,
            @Valid @RequestBody VoidInvoiceRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("PATCH /api/v1/invoices/{}/cancel", id);
        InvoiceResponse response = invoiceService.cancelInvoice(id, request.getReason(), userId(userDetails));
        return ResponseEntity.ok(ApiResponse.success(response, "Đã hủy hóa đơn"));
    }

    @PatchMapping("/{id}/refund")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Hoàn tiền hóa đơn đã thu", description = "Chỉ Quản trị viên; bắt buộc ghi lý do")
    public ResponseEntity<ApiResponse<InvoiceResponse>> refundInvoice(
            @PathVariable Long id,
            @Valid @RequestBody VoidInvoiceRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("PATCH /api/v1/invoices/{}/refund", id);
        InvoiceResponse response = invoiceService.refundInvoice(id, request.getReason(), userId(userDetails));
        return ResponseEntity.ok(ApiResponse.success(response, "Đã hoàn tiền hóa đơn"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
    @Operation(summary = "Danh sách hóa đơn", description = "Phân trang, lọc theo trạng thái và từ khóa (tên, mã BN, mã hóa đơn) đồng thời")
    public ResponseEntity<ApiResponse<Page<InvoiceResponse>>> getInvoices(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) InvoiceStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<InvoiceResponse> page = invoiceService.searchInvoices(keyword, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(page));
    }

    private static Long userId(CustomUserDetails userDetails) {
        return userDetails != null ? userDetails.getUserId() : null;
    }

    private static boolean isPrivileged(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> PRIVILEGED_VIEWERS.contains(a.getAuthority()));
    }
}
