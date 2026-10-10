package com.hospital.hmsai.billing.service;

import com.hospital.hmsai.billing.dto.BillingShiftSummaryResponse;
import com.hospital.hmsai.billing.dto.InvoiceResponse;
import com.hospital.hmsai.billing.dto.PayInvoiceRequest;
import com.hospital.hmsai.billing.dto.PaymentQrResponse;
import com.hospital.hmsai.billing.dto.UninvoicedVisitResponse;
import com.hospital.hmsai.billing.entity.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public interface InvoiceService {

    /** Lập hóa đơn cho ca khám đã hoàn tất; nếu đã có hóa đơn còn hiệu lực thì trả về hóa đơn đó. */
    InvoiceResponse generateInvoiceFromVisit(Long visitId);

    InvoiceResponse getInvoiceById(Long id, Long currentUserId, boolean isPrivilegedUser);

    InvoiceResponse getInvoiceByVisitId(Long visitId, Long currentUserId, boolean isPrivilegedUser);

    List<InvoiceResponse> getMyInvoices(Long userId);

    /** Hàng chờ lập hóa đơn: ca khám đã hoàn tất nhưng chưa có hóa đơn còn hiệu lực. */
    List<UninvoicedVisitResponse> getUninvoicedVisits(int limit);

    /** Tính lại chi phí và BHYT cho hóa đơn chưa thu (VD: vừa cập nhật thẻ BHYT). */
    InvoiceResponse recalculateInvoice(Long id);

    InvoiceResponse payInvoice(Long id, PayInvoiceRequest request, Long cashierUserId);

    /** Hủy hóa đơn chưa thu (PENDING → CANCELLED). */
    InvoiceResponse cancelInvoice(Long id, String reason, Long actorUserId);

    /** Hoàn tiền hóa đơn đã thu (PAID → REFUNDED). */
    InvoiceResponse refundInvoice(Long id, String reason, Long actorUserId);

    PaymentQrResponse getPaymentQr(Long id);

    BillingShiftSummaryResponse getShiftSummary(LocalDate date);

    Page<InvoiceResponse> searchInvoices(String keyword, InvoiceStatus status, Pageable pageable);
}
