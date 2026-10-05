package com.hospital.hmsai.billing.service.impl;

import com.hospital.hmsai.billing.dto.InvoiceResponse;
import com.hospital.hmsai.billing.dto.PayInvoiceRequest;
import com.hospital.hmsai.billing.entity.*;
import com.hospital.hmsai.billing.repository.InvoiceRepository;
import com.hospital.hmsai.billing.service.InvoiceService;
import com.hospital.hmsai.clinical.entity.LabOrder;
import com.hospital.hmsai.clinical.entity.Prescription;
import com.hospital.hmsai.clinical.entity.PrescriptionItem;
import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.repository.LabOrderRepository;
import com.hospital.hmsai.clinical.repository.PrescriptionRepository;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.pharmacy.entity.Drug;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final VisitRepository visitRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final LabOrderRepository labOrderRepository;

    private static final BigDecimal DEFAULT_CONSULTATION_FEE = new BigDecimal("150000.00"); // 150,000 VNĐ

    @Override
    @Transactional
    public InvoiceResponse generateInvoiceFromVisit(Long visitId) {
        log.info("Bắt đầu sinh hóa đơn tự động từ ca khám ID: {}", visitId);

        // 1. Kiểm tra nếu đã có hóa đơn PENDING hoặc PAID cho ca khám này
        var existingInvoiceOpt = invoiceRepository.findByVisitIdWithDetails(visitId);
        if (existingInvoiceOpt.isPresent() && existingInvoiceOpt.get().getStatus() != InvoiceStatus.CANCELLED) {
            log.info("Ca khám ID {} đã có hóa đơn ID: {}, trạng thái: {}", visitId, existingInvoiceOpt.get().getId(), existingInvoiceOpt.get().getStatus());
            return InvoiceResponse.fromEntity(existingInvoiceOpt.get());
        }

        // 2. Lấy thông tin ca khám
        Visit visit = visitRepository.findByIdWithDetails(visitId)
                .orElseThrow(() -> new ResourceNotFoundException("Lượt khám", "id", visitId));

        Invoice invoice = Invoice.builder()
                .patient(visit.getPatient())
                .visit(visit)
                .status(InvoiceStatus.PENDING)
                .totalAmount(BigDecimal.ZERO)
                .build();

        BigDecimal runningTotal = BigDecimal.ZERO;

        // 3. Khoản 1: Tiền công khám dịch vụ chuyên khoa (SERVICE)
        String doctorSpecialty = (visit.getDoctor() != null && visit.getDoctor().getSpecialty() != null)
                ? visit.getDoctor().getSpecialty()
                : "Khám chuyên khoa tiêu chuẩn";
        InvoiceItem serviceItem = InvoiceItem.builder()
                .itemType(InvoiceItemType.SERVICE)
                .refId(visit.getId())
                .description("Phí khám bệnh: " + doctorSpecialty)
                .amount(DEFAULT_CONSULTATION_FEE)
                .build();
        invoice.addItem(serviceItem);
        runningTotal = runningTotal.add(DEFAULT_CONSULTATION_FEE);

        // 4. Khoản 2: Tiền thuốc theo đơn (DRUG)
        List<Prescription> prescriptions = prescriptionRepository.findByVisitIdWithItems(visitId);
        for (Prescription prescription : prescriptions) {
            if (prescription.getItems() != null) {
                for (PrescriptionItem pItem : prescription.getItems()) {
                    Drug drug = pItem.getDrug();
                    int qty = pItem.getQuantity() != null ? pItem.getQuantity() : 1;
                    BigDecimal unitPrice = (drug != null && drug.getPrice() != null) ? drug.getPrice() : BigDecimal.ZERO;
                    BigDecimal drugCost = unitPrice.multiply(BigDecimal.valueOf(qty));

                    String drugName = drug != null ? drug.getName() : "Thuốc kê đơn";
                    String unit = drug != null ? drug.getUnit() : "đơn vị";

                    InvoiceItem drugInvoiceItem = InvoiceItem.builder()
                            .itemType(InvoiceItemType.DRUG)
                            .refId(drug != null ? drug.getId() : null)
                            .description(drugName + " (" + (pItem.getDosage() != null ? pItem.getDosage() + ", " : "") + "SL: " + qty + " " + unit + ")")
                            .amount(drugCost)
                            .build();
                    invoice.addItem(drugInvoiceItem);
                    runningTotal = runningTotal.add(drugCost);
                }
            }
        }

        // 5. Khoản 3: Tiền cận lâm sàng / xét nghiệm (LAB)
        List<LabOrder> labOrders = labOrderRepository.findByVisitId(visitId);
        for (LabOrder order : labOrders) {
            BigDecimal testPrice = calculateLabFee(order.getTestType());
            InvoiceItem labItem = InvoiceItem.builder()
                    .itemType(InvoiceItemType.LAB)
                    .refId(order.getId())
                    .description("Cận lâm sàng: " + order.getTestType())
                    .amount(testPrice)
                    .build();
            invoice.addItem(labItem);
            runningTotal = runningTotal.add(testPrice);
        }

        invoice.setTotalAmount(runningTotal);
        Invoice saved = invoiceRepository.save(invoice);
        log.info("Sinh hóa đơn tự động thành công ID: {}, tổng tiền: {}", saved.getId(), saved.getTotalAmount());

        return InvoiceResponse.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceById(Long id, Long currentUserId, boolean isPrivilegedUser) {
        log.info("Lấy chi tiết hóa đơn ID: {}", id);
        Invoice invoice = invoiceRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn", "id", id));

        // Kiểm tra phân quyền self-access: bệnh nhân chỉ được xem hóa đơn của chính mình
        if (!isPrivilegedUser && currentUserId != null) {
            if (invoice.getPatient() == null || invoice.getPatient().getUser() == null
                    || !currentUserId.equals(invoice.getPatient().getUser().getId())) {
                throw new BusinessException("Bạn không có quyền truy cập hóa đơn này.");
            }
        }

        return InvoiceResponse.fromEntity(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByVisitId(Long visitId) {
        log.info("Tra cứu hóa đơn của lượt khám ID: {}", visitId);
        Invoice invoice = invoiceRepository.findByVisitIdWithDetails(visitId)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn cho lượt khám", "visitId", visitId));
        return InvoiceResponse.fromEntity(invoice);
    }

    @Override
    @Transactional
    public InvoiceResponse payInvoice(Long id, PayInvoiceRequest request) {
        log.info("Xác nhận thanh toán hóa đơn ID: {}, phương thức: {}", id, request.getPaymentMethod());
        Invoice invoice = invoiceRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hóa đơn", "id", id));

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BusinessException("Hóa đơn ID " + id + " đã được thanh toán trước đó.");
        }
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new BusinessException("Không thể thanh toán hóa đơn đã bị hủy.");
        }

        String txnCode = request.getTransactionCode();
        if (txnCode == null || txnCode.isBlank()) {
            txnCode = "TXN-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        }

        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaymentMethod(request.getPaymentMethod());
        invoice.setTransactionCode(txnCode);
        invoice.setPaidAt(LocalDateTime.now());

        Invoice saved = invoiceRepository.save(invoice);
        log.info("Thanh toán thành công hóa đơn ID: {}, mã GD: {}", saved.getId(), saved.getTransactionCode());

        return InvoiceResponse.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InvoiceResponse> searchInvoices(String keyword, InvoiceStatus status, Pageable pageable) {
        log.info("Tìm kiếm danh sách hóa đơn: keyword='{}', status={}", keyword, status);
        Page<Invoice> page;
        if (keyword != null && !keyword.trim().isEmpty()) {
            page = invoiceRepository.searchByPatientKeyword(keyword.trim(), pageable);
        } else if (status != null) {
            page = invoiceRepository.findByStatus(status, pageable);
        } else {
            page = invoiceRepository.findAll(pageable);
        }
        return page.map(InvoiceResponse::fromEntity);
    }

    private BigDecimal calculateLabFee(String testType) {
        if (testType == null) return new BigDecimal("100000.00");
        String lower = testType.toLowerCase();
        if (lower.contains("huyết học") || lower.contains("máu") || lower.contains("blood")) {
            return new BigDecimal("80000.00");
        } else if (lower.contains("sinh hóa") || lower.contains("men gan") || lower.contains("đường huyết")) {
            return new BigDecimal("120000.00");
        } else if (lower.contains("x-quang") || lower.contains("xquang") || lower.contains("chụp")) {
            return new BigDecimal("150000.00");
        } else if (lower.contains("siêu âm") || lower.contains("ultrasound")) {
            return new BigDecimal("180000.00");
        } else if (lower.contains("ct") || lower.contains("mri")) {
            return new BigDecimal("500000.00");
        }
        return new BigDecimal("100000.00");
    }
}
