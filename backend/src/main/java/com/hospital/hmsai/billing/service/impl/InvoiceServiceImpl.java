package com.hospital.hmsai.billing.service.impl;

import com.hospital.hmsai.billing.config.BillingProperties;
import com.hospital.hmsai.billing.dto.BillingShiftSummaryResponse;
import com.hospital.hmsai.billing.dto.InvoiceResponse;
import com.hospital.hmsai.billing.dto.PayInvoiceRequest;
import com.hospital.hmsai.billing.dto.PaymentQrResponse;
import com.hospital.hmsai.billing.dto.UninvoicedVisitResponse;
import com.hospital.hmsai.billing.entity.*;
import com.hospital.hmsai.billing.pricing.InsurancePolicy;
import com.hospital.hmsai.billing.pricing.LabFeeCatalog;
import com.hospital.hmsai.billing.repository.InvoiceRepository;
import com.hospital.hmsai.billing.service.InvoiceService;
import com.hospital.hmsai.clinical.entity.LabOrder;
import com.hospital.hmsai.clinical.entity.Prescription;
import com.hospital.hmsai.clinical.entity.PrescriptionItem;
import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.entity.VisitStatus;
import com.hospital.hmsai.clinical.repository.LabOrderRepository;
import com.hospital.hmsai.clinical.repository.PrescriptionRepository;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.DuplicateResourceException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.user.entity.User;
import com.hospital.hmsai.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/**
 * Nghiệp vụ viện phí (FR-7).
 * <ul>
 *   <li>Chỉ lập hóa đơn khi ca khám đã COMPLETED (đơn thuốc, chỉ định đã chốt).</li>
 *   <li>Mỗi ca khám chỉ có một hóa đơn PENDING/PAID; hóa đơn đã hủy / hoàn tiền cho phép lập lại.</li>
 *   <li>Áp dụng BHYT theo {@link InsurancePolicy}; thu ngân thu phần người bệnh cùng chi trả.</li>
 *   <li>Tiền mặt: bắt buộc tiền khách đưa ≥ số phải thu, máy chủ tính tiền thừa.
 *       Không dùng tiền mặt: bắt buộc mã giao dịch thật, mỗi mã chỉ dùng cho một hóa đơn.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceServiceImpl implements InvoiceService {

    private static final Set<InvoiceStatus> ACTIVE_STATUSES = EnumSet.of(InvoiceStatus.PENDING, InvoiceStatus.PAID);
    private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.ofPattern("yyMMdd");
    private static final DateTimeFormatter RECEIPT_TIME = DateTimeFormatter.ofPattern("yyMMddHHmmss");
    private static final int MIN_TRANSACTION_CODE_LENGTH = 4;

    private final InvoiceRepository invoiceRepository;
    private final VisitRepository visitRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabOrderRepository labOrderRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final BillingProperties billingProperties;

    // ==================== Lập / tính lại hóa đơn ====================

    @Override
    @Transactional
    public InvoiceResponse generateInvoiceFromVisit(Long visitId) {
        log.info("Lập hóa đơn từ ca khám ID: {}", visitId);

        Optional<Invoice> active = findActiveInvoice(visitId);
        if (active.isPresent()) {
            log.info("Ca khám ID {} đã có hóa đơn {} ({})", visitId, active.get().getInvoiceCode(), active.get().getStatus());
            return InvoiceResponse.fromEntity(active.get());
        }

        Visit visit = visitRepository.findByIdWithDetails(visitId)
                .orElseThrow(() -> new ResourceNotFoundException("Lượt khám", "id", visitId));
        if (visit.getStatus() != VisitStatus.COMPLETED) {
            throw new BusinessException("Ca khám #" + visitId + " chưa hoàn tất. Chỉ lập hóa đơn sau khi bác sĩ "
                    + "hoàn tất ca khám để đơn thuốc và chỉ định cận lâm sàng không còn thay đổi.");
        }

        Invoice invoice = Invoice.builder()
                .patient(visit.getPatient())
                .visit(visit)
                .status(InvoiceStatus.PENDING)
                .build();
        applyCharges(invoice, visit);

        Invoice saved = invoiceRepository.save(invoice);
        saved.setInvoiceCode(buildInvoiceCode(saved));
        log.info("Đã lập hóa đơn {} – tổng {} – BHYT {} – người bệnh trả {}",
                saved.getInvoiceCode(), saved.getTotalAmount(), saved.getInsuranceAmount(), saved.getPatientAmount());
        return InvoiceResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public InvoiceResponse recalculateInvoice(Long id) {
        Invoice invoice = loadInvoice(id);
        requirePending(invoice, "tính lại");

        Visit visit = visitRepository.findByIdWithDetails(invoice.getVisit().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Lượt khám", "id", invoice.getVisit().getId()));
        invoice.clearItems();
        applyCharges(invoice, visit);

        Invoice saved = invoiceRepository.save(invoice);
        log.info("Đã tính lại hóa đơn {} – người bệnh trả {}", saved.getInvoiceCode(), saved.getPatientAmount());
        return InvoiceResponse.fromEntity(saved);
    }

    /** Tổng hợp 3 nhóm chi phí (khám, thuốc, cận lâm sàng) rồi áp dụng BHYT. */
    private void applyCharges(Invoice invoice, Visit visit) {
        BigDecimal total = BigDecimal.ZERO;

        BigDecimal consultationFee = billingProperties.getConsultationFee().setScale(2, RoundingMode.HALF_UP);
        String specialty = (visit.getDoctor() != null && visit.getDoctor().getSpecialty() != null)
                ? visit.getDoctor().getSpecialty()
                : "Khám chuyên khoa tiêu chuẩn";
        invoice.addItem(InvoiceItem.builder()
                .itemType(InvoiceItemType.SERVICE)
                .refId(visit.getId())
                .description("Phí khám bệnh: " + specialty)
                .quantity(1)
                .unitPrice(consultationFee)
                .amount(consultationFee)
                .build());
        total = total.add(consultationFee);

        for (Prescription prescription : prescriptionRepository.findByVisitIdWithItems(visit.getId())) {
            if (prescription.getItems() == null) continue;
            for (PrescriptionItem pItem : prescription.getItems()) {
                Drug drug = pItem.getDrug();
                int qty = pItem.getQuantity() != null && pItem.getQuantity() > 0 ? pItem.getQuantity() : 1;
                BigDecimal unitPrice = (drug != null && drug.getPrice() != null)
                        ? drug.getPrice().setScale(2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO.setScale(2);
                BigDecimal lineAmount = unitPrice.multiply(BigDecimal.valueOf(qty));

                String drugName = drug != null ? drug.getName() : "Thuốc kê đơn";
                String unit = drug != null && drug.getUnit() != null ? drug.getUnit() : "đơn vị";
                String dosage = pItem.getDosage() != null && !pItem.getDosage().isBlank() ? " – " + pItem.getDosage() : "";
                invoice.addItem(InvoiceItem.builder()
                        .itemType(InvoiceItemType.DRUG)
                        .refId(drug != null ? drug.getId() : null)
                        .description(drugName + dosage + " (" + qty + " " + unit + ")")
                        .quantity(qty)
                        .unitPrice(unitPrice)
                        .amount(lineAmount)
                        .build());
                total = total.add(lineAmount);
            }
        }

        for (LabOrder order : labOrderRepository.findByVisitId(visit.getId())) {
            BigDecimal fee = LabFeeCatalog.feeFor(order.getTestType());
            invoice.addItem(InvoiceItem.builder()
                    .itemType(InvoiceItemType.LAB)
                    .refId(order.getId())
                    .description("Cận lâm sàng: " + order.getTestType())
                    .quantity(1)
                    .unitPrice(fee)
                    .amount(fee)
                    .build());
            total = total.add(fee);
        }

        Patient patient = visit.getPatient();
        LocalDate serviceDate = visit.getVisitTime() != null ? visit.getVisitTime().toLocalDate() : LocalDate.now();
        InsurancePolicy.Coverage coverage = InsurancePolicy.evaluate(
                patient != null ? patient.getInsuranceNumber() : null,
                patient != null ? patient.getInsuranceValidFrom() : null,
                patient != null ? patient.getInsuranceValidTo() : null,
                serviceDate,
                total,
                billingProperties.getInsurance().lowCostThreshold());

        invoice.setTotalAmount(total.setScale(2, RoundingMode.HALF_UP));
        invoice.setInsuranceNumber(coverage.applied() ? patient.getInsuranceNumber() : null);
        invoice.setInsuranceRate(coverage.rate());
        invoice.setInsuranceAmount(coverage.insuranceAmount());
        invoice.setInsuranceNote(coverage.note());
        invoice.setPatientAmount(coverage.patientAmount());
    }

    // ==================== Tra cứu ====================

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceById(Long id, Long currentUserId, boolean isPrivilegedUser) {
        Invoice invoice = loadInvoice(id);
        assertCanView(invoice, currentUserId, isPrivilegedUser);
        return InvoiceResponse.fromEntity(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByVisitId(Long visitId, Long currentUserId, boolean isPrivilegedUser) {
        List<Invoice> invoices = invoiceRepository.findAllByVisitIdWithDetails(visitId);
        Invoice invoice = invoices.stream()
                .filter(i -> ACTIVE_STATUSES.contains(i.getStatus()))
                .findFirst()
                .or(() -> invoices.stream().findFirst())
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn cho lượt khám", "visitId", visitId));
        assertCanView(invoice, currentUserId, isPrivilegedUser);
        return InvoiceResponse.fromEntity(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getMyInvoices(Long userId) {
        return patientRepository.findByUserId(userId)
                .map(p -> invoiceRepository.findByPatientIdOrderByCreatedAtDesc(p.getId()).stream()
                        .map(InvoiceResponse::fromEntity)
                        .toList())
                .orElse(List.of());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UninvoicedVisitResponse> getUninvoicedVisits(int limit) {
        int size = Math.min(Math.max(limit, 1), 200);
        return invoiceRepository.findCompletedVisitsWithoutActiveInvoice(
                        VisitStatus.COMPLETED, ACTIVE_STATUSES, PageRequest.of(0, size))
                .stream()
                .map(this::toUninvoicedVisit)
                .toList();
    }

    private UninvoicedVisitResponse toUninvoicedVisit(Visit visit) {
        Patient patient = visit.getPatient();
        LocalDate serviceDate = visit.getVisitTime() != null ? visit.getVisitTime().toLocalDate() : LocalDate.now();
        boolean eligible = patient != null && InsurancePolicy.evaluate(patient.getInsuranceNumber(),
                patient.getInsuranceValidFrom(), patient.getInsuranceValidTo(), serviceDate,
                BigDecimal.ONE, null).applied();
        String doctorName = visit.getDoctor() != null && visit.getDoctor().getUser() != null
                ? visit.getDoctor().getUser().getFullName() : null;
        return UninvoicedVisitResponse.builder()
                .visitId(visit.getId())
                .visitTime(visit.getVisitTime())
                .patientId(patient != null ? patient.getId() : null)
                .patientName(patient != null ? patient.getFullName() : null)
                .patientCode(patient != null ? patient.getPatientCode() : null)
                .doctorName(doctorName)
                .diagnosisCode(visit.getDiagnosisCode())
                .diagnosisNote(visit.getDiagnosisNote())
                .insuranceEligible(eligible)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InvoiceResponse> searchInvoices(String keyword, InvoiceStatus status, Pageable pageable) {
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        return invoiceRepository.search(kw, status, pageable).map(InvoiceResponse::fromEntity);
    }

    // ==================== Thu tiền / hủy / hoàn tiền ====================

    @Override
    @Transactional
    public InvoiceResponse payInvoice(Long id, PayInvoiceRequest request, Long cashierUserId) {
        Invoice invoice = loadInvoice(id);
        requirePending(invoice, "thanh toán");

        BigDecimal due = nz(invoice.getPatientAmount());
        PaymentMethod method = request.getPaymentMethod();
        String txnCode = trimToNull(request.getTransactionCode());

        if (method == PaymentMethod.CASH) {
            BigDecimal received = request.getAmountReceived();
            if (received == null) {
                if (due.signum() > 0) {
                    throw new BusinessException("Vui lòng nhập số tiền khách đưa");
                }
                received = BigDecimal.ZERO;
            }
            if (received.compareTo(due) < 0) {
                throw new BusinessException("Tiền khách đưa (" + vnd(received) + ") chưa đủ số tiền phải thu ("
                        + vnd(due) + ")");
            }
            invoice.setAmountReceived(received.setScale(2, RoundingMode.HALF_UP));
            invoice.setChangeAmount(received.subtract(due).setScale(2, RoundingMode.HALF_UP));
            if (txnCode == null) {
                txnCode = generateCashReceiptCode();
            }
        } else {
            if (txnCode == null || txnCode.length() < MIN_TRANSACTION_CODE_LENGTH) {
                throw new BusinessException("Vui lòng nhập mã giao dịch ngân hàng / mã chuẩn chi (tối thiểu "
                        + MIN_TRANSACTION_CODE_LENGTH + " ký tự) để đối soát");
            }
            invoice.setAmountReceived(due);
            invoice.setChangeAmount(BigDecimal.ZERO.setScale(2));
        }

        if (invoiceRepository.existsByTransactionCodeAndIdNot(txnCode, id)) {
            throw new DuplicateResourceException("Giao dịch", "mã giao dịch", txnCode);
        }

        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaymentMethod(method);
        invoice.setTransactionCode(txnCode);
        invoice.setPaidAt(LocalDateTime.now());
        invoice.setCashierId(cashierUserId);
        invoice.setCashierName(resolveUserName(cashierUserId));
        invoice.setNote(trimToNull(request.getNote()));

        Invoice saved = invoiceRepository.save(invoice);
        log.info("Đã thu hóa đơn {} – {} – {} – mã GD {}", saved.getInvoiceCode(), method, saved.getPatientAmount(),
                saved.getTransactionCode());
        return InvoiceResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public InvoiceResponse cancelInvoice(Long id, String reason, Long actorUserId) {
        Invoice invoice = loadInvoice(id);
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BusinessException("Hóa đơn đã thu tiền không thể hủy – hãy dùng chức năng hoàn tiền.");
        }
        requirePending(invoice, "hủy");
        voidInvoice(invoice, InvoiceStatus.CANCELLED, reason, actorUserId);
        log.info("Đã hủy hóa đơn {} – lý do: {}", invoice.getInvoiceCode(), reason);
        return InvoiceResponse.fromEntity(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional
    public InvoiceResponse refundInvoice(Long id, String reason, Long actorUserId) {
        Invoice invoice = loadInvoice(id);
        if (invoice.getStatus() != InvoiceStatus.PAID) {
            throw new BusinessException("Chỉ hoàn tiền được hóa đơn đã thu (trạng thái hiện tại: "
                    + statusLabel(invoice.getStatus()) + ").");
        }
        voidInvoice(invoice, InvoiceStatus.REFUNDED, reason, actorUserId);
        log.info("Đã hoàn tiền hóa đơn {} – {} – lý do: {}", invoice.getInvoiceCode(), invoice.getPatientAmount(), reason);
        return InvoiceResponse.fromEntity(invoiceRepository.save(invoice));
    }

    private void voidInvoice(Invoice invoice, InvoiceStatus status, String reason, Long actorUserId) {
        String trimmed = trimToNull(reason);
        if (trimmed == null) {
            throw new BusinessException("Vui lòng nhập lý do");
        }
        invoice.setStatus(status);
        invoice.setVoidReason(trimmed);
        invoice.setVoidedAt(LocalDateTime.now());
        invoice.setVoidedBy(resolveUserName(actorUserId));
    }

    // ==================== VietQR & đối soát ====================

    @Override
    @Transactional(readOnly = true)
    public PaymentQrResponse getPaymentQr(Long id) {
        Invoice invoice = loadInvoice(id);
        requirePending(invoice, "tạo mã QR cho");

        BillingProperties.VietQr qr = billingProperties.getVietqr();
        if (!qr.isConfigured()) {
            throw new BusinessException("Chưa cấu hình tài khoản nhận thanh toán VietQR. "
                    + "Vui lòng thu tiền mặt hoặc liên hệ quản trị viên (billing.vietqr.*).");
        }
        BigDecimal amount = nz(invoice.getPatientAmount()).setScale(0, RoundingMode.HALF_UP);
        if (amount.signum() <= 0) {
            throw new BusinessException("Hóa đơn không có khoản người bệnh phải trả – không cần mã QR.");
        }

        String content = "MPH " + invoice.getInvoiceCode();
        String url = "https://img.vietqr.io/image/" + qr.getBankBin() + "-" + qr.getAccountNo() + "-"
                + qr.getTemplate() + ".png"
                + "?amount=" + amount.toPlainString()
                + "&addInfo=" + urlEncode(content)
                + "&accountName=" + urlEncode(qr.getAccountName());

        return PaymentQrResponse.builder()
                .invoiceId(invoice.getId())
                .invoiceCode(invoice.getInvoiceCode())
                .bankBin(qr.getBankBin())
                .bankName(qr.getBankName())
                .accountNo(qr.getAccountNo())
                .accountName(qr.getAccountName())
                .amount(amount)
                .transferContent(content)
                .qrImageUrl(url)
                .demo(qr.isDemo())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public BillingShiftSummaryResponse getShiftSummary(LocalDate date) {
        LocalDate day = date != null ? date : LocalDate.now();
        LocalDateTime start = day.atStartOfDay();
        LocalDateTime end = day.plusDays(1).atStartOfDay().minusNanos(1);

        // Tiền đã thu trong ngày – gồm cả hóa đơn sau đó bị hoàn tiền (khoản hoàn ghi riêng bên dưới)
        List<Invoice> collected = invoiceRepository.findByPaidAtBetween(start, end).stream()
                .filter(i -> i.getStatus() == InvoiceStatus.PAID || i.getStatus() == InvoiceStatus.REFUNDED)
                .toList();
        List<Invoice> refunded = invoiceRepository.findByStatusAndVoidedAtBetween(InvoiceStatus.REFUNDED, start, end);
        List<Invoice> cancelled = invoiceRepository.findByStatusAndVoidedAtBetween(InvoiceStatus.CANCELLED, start, end);
        List<Invoice> pending = invoiceRepository.findByStatus(InvoiceStatus.PENDING);

        Map<PaymentMethod, List<Invoice>> byMethod = collected.stream()
                .filter(i -> i.getPaymentMethod() != null)
                .collect(Collectors.groupingBy(Invoice::getPaymentMethod, () -> new EnumMap<>(PaymentMethod.class),
                        Collectors.toList()));
        List<BillingShiftSummaryResponse.MethodTotal> methodTotals = Arrays.stream(PaymentMethod.values())
                .map(m -> {
                    List<Invoice> list = byMethod.getOrDefault(m, List.of());
                    return BillingShiftSummaryResponse.MethodTotal.builder()
                            .method(m)
                            .count(list.size())
                            .amount(sum(list, Invoice::getPatientAmount))
                            .build();
                })
                .toList();

        return BillingShiftSummaryResponse.builder()
                .date(day)
                .paidCount(collected.size())
                .grossAmount(sum(collected, Invoice::getTotalAmount))
                .insuranceAmount(sum(collected, Invoice::getInsuranceAmount))
                .collectedAmount(sum(collected, Invoice::getPatientAmount))
                .byMethod(methodTotals)
                .pendingCount(pending.size())
                .pendingAmount(sum(pending, Invoice::getPatientAmount))
                .cancelledCount(cancelled.size())
                .refundedCount(refunded.size())
                .refundedAmount(sum(refunded, Invoice::getPatientAmount))
                .build();
    }

    // ==================== Helpers ====================

    private Invoice loadInvoice(Long id) {
        return invoiceRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn", "id", id));
    }

    private Optional<Invoice> findActiveInvoice(Long visitId) {
        return invoiceRepository.findAllByVisitIdWithDetails(visitId).stream()
                .filter(i -> ACTIVE_STATUSES.contains(i.getStatus()))
                .findFirst();
    }

    private void requirePending(Invoice invoice, String action) {
        switch (invoice.getStatus()) {
            case PENDING -> {
            }
            case PAID -> throw new BusinessException("Hóa đơn " + displayCode(invoice)
                    + " đã được thanh toán trước đó, không thể " + action + ".");
            case CANCELLED -> throw new BusinessException("Không thể " + action + " hóa đơn đã bị hủy.");
            case REFUNDED -> throw new BusinessException("Không thể " + action + " hóa đơn đã hoàn tiền.");
        }
    }

    private void assertCanView(Invoice invoice, Long currentUserId, boolean isPrivilegedUser) {
        if (isPrivilegedUser) {
            return;
        }
        boolean owner = currentUserId != null
                && invoice.getPatient() != null
                && invoice.getPatient().getUser() != null
                && currentUserId.equals(invoice.getPatient().getUser().getId());
        if (!owner) {
            throw new AccessDeniedException("Bạn không có quyền truy cập hóa đơn này.");
        }
    }

    private String buildInvoiceCode(Invoice invoice) {
        LocalDateTime created = invoice.getCreatedAt() != null ? invoice.getCreatedAt() : LocalDateTime.now();
        return "HD" + created.format(CODE_DATE) + String.format("%06d", invoice.getId());
    }

    private String displayCode(Invoice invoice) {
        return invoice.getInvoiceCode() != null ? invoice.getInvoiceCode() : "ID " + invoice.getId();
    }

    private String generateCashReceiptCode() {
        return "TM" + LocalDateTime.now().format(RECEIPT_TIME) + "-"
                + String.format("%04X", ThreadLocalRandom.current().nextInt(0x10000));
    }

    private String resolveUserName(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).map(User::getFullName).orElse(null);
    }

    private static String statusLabel(InvoiceStatus status) {
        return switch (status) {
            case PENDING -> "chờ thu";
            case PAID -> "đã thu";
            case CANCELLED -> "đã hủy";
            case REFUNDED -> "đã hoàn tiền";
        };
    }

    private static BigDecimal sum(List<Invoice> invoices, java.util.function.Function<Invoice, BigDecimal> field) {
        return invoices.stream()
                .map(field)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static String trimToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private static String vnd(BigDecimal amount) {
        return NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(amount) + " đ";
    }
}
