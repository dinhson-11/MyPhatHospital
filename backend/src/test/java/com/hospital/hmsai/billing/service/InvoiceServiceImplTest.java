package com.hospital.hmsai.billing.service;

import com.hospital.hmsai.billing.dto.InvoiceResponse;
import com.hospital.hmsai.billing.dto.PayInvoiceRequest;
import com.hospital.hmsai.billing.entity.*;
import com.hospital.hmsai.billing.repository.InvoiceRepository;
import com.hospital.hmsai.billing.service.impl.InvoiceServiceImpl;
import com.hospital.hmsai.clinical.entity.LabOrder;
import com.hospital.hmsai.clinical.entity.Prescription;
import com.hospital.hmsai.clinical.entity.PrescriptionItem;
import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.repository.LabOrderRepository;
import com.hospital.hmsai.clinical.repository.PrescriptionRepository;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceImplTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private VisitRepository visitRepository;

    @Mock
    private PrescriptionRepository prescriptionRepository;

    @Mock
    private LabOrderRepository labOrderRepository;

    @InjectMocks
    private InvoiceServiceImpl invoiceService;

    private Visit visit;
    private Patient patient;
    private Prescription prescription;
    private LabOrder labOrder;
    private Invoice existingInvoice;

    @BeforeEach
    void setUp() {
        User patientUser = User.builder().id(100L).build();
        patient = Patient.builder()
                .id(1L)
                .user(patientUser)
                .fullName("Trần Văn B")
                .patientCode("BN-2026-0002")
                .build();

        User doctorUser = User.builder().id(10L).fullName("BS. Hoàng C").build();
        StaffProfile doctor = StaffProfile.builder().id(2L).user(doctorUser).specialty("Tim mạch").build();

        visit = Visit.builder()
                .id(50L)
                .patient(patient)
                .doctor(doctor)
                .visitTime(LocalDateTime.now())
                .diagnosisCode("I10")
                .build();

        Drug drug = Drug.builder()
                .id(1L)
                .name("Amlodipine 5mg")
                .unit("Viên")
                .price(new BigDecimal("3000.00"))
                .build();

        PrescriptionItem pItem = PrescriptionItem.builder()
                .id(1L)
                .drug(drug)
                .quantity(10) // 10 x 3000 = 30,000
                .dosage("1 viên/ngày")
                .build();

        prescription = Prescription.builder()
                .id(1L)
                .visit(visit)
                .items(List.of(pItem))
                .build();

        labOrder = LabOrder.builder()
                .id(1L)
                .visit(visit)
                .testType("Tổng phân tích tế bào máu ngoại vi (huyết học)") // 80,000 VNĐ
                .build();

        existingInvoice = Invoice.builder()
                .id(10L)
                .patient(patient)
                .visit(visit)
                .totalAmount(new BigDecimal("260000.00"))
                .status(InvoiceStatus.PENDING)
                .items(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("Tự động sinh hóa đơn đủ 3 khoản chi phí (Khám + Thuốc + Cận lâm sàng)")
    void generateInvoiceFromVisit_Full3Items_Success() {
        when(invoiceRepository.findByVisitIdWithDetails(50L)).thenReturn(Optional.empty());
        when(visitRepository.findByIdWithDetails(50L)).thenReturn(Optional.of(visit));
        when(prescriptionRepository.findByVisitIdWithItems(50L)).thenReturn(List.of(prescription));
        when(labOrderRepository.findByVisitId(50L)).thenReturn(List.of(labOrder));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice inv = invocation.getArgument(0);
            inv.setId(10L);
            return inv;
        });

        InvoiceResponse response = invoiceService.generateInvoiceFromVisit(50L);

        assertNotNull(response);
        assertEquals(InvoiceStatus.PENDING, response.getStatus());
        // Tổng: Khám (150,000) + Thuốc (30,000) + CLS máu (80,000) = 260,000 VNĐ
        assertEquals(new BigDecimal("260000.00"), response.getTotalAmount());
        assertEquals(3, response.getItems().size());
        assertEquals("Trần Văn B", response.getPatientName());

        verify(invoiceRepository).save(any(Invoice.class));
    }

    @Test
    @DisplayName("Nếu hóa đơn chưa hủy đã tồn tại cho ca khám thì trả về hóa đơn hiện có")
    void generateInvoiceFromVisit_AlreadyExists_ReturnsExisting() {
        when(invoiceRepository.findByVisitIdWithDetails(50L)).thenReturn(Optional.of(existingInvoice));

        InvoiceResponse response = invoiceService.generateInvoiceFromVisit(50L);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals(new BigDecimal("260000.00"), response.getTotalAmount());
        verify(invoiceRepository, never()).save(any(Invoice.class));
    }

    @Test
    @DisplayName("Xác nhận thanh toán viện phí thành công chuyển trạng thái PAID")
    void payInvoice_Success() {
        when(invoiceRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(existingInvoice));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PayInvoiceRequest request = PayInvoiceRequest.builder()
                .paymentMethod(PaymentMethod.VIETQR)
                .transactionCode("VQR-2026-9999")
                .build();

        InvoiceResponse response = invoiceService.payInvoice(10L, request);

        assertNotNull(response);
        assertEquals(InvoiceStatus.PAID, response.getStatus());
        assertEquals(PaymentMethod.VIETQR, response.getPaymentMethod());
        assertEquals("VQR-2026-9999", response.getTransactionCode());
        assertNotNull(response.getPaidAt());

        verify(invoiceRepository).save(existingInvoice);
    }

    @Test
    @DisplayName("Chặn thanh toán khi hóa đơn đã được thanh toán trước đó")
    void payInvoice_AlreadyPaid_ThrowsBusinessException() {
        existingInvoice.setStatus(InvoiceStatus.PAID);
        when(invoiceRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(existingInvoice));

        PayInvoiceRequest request = PayInvoiceRequest.builder()
                .paymentMethod(PaymentMethod.CASH)
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                invoiceService.payInvoice(10L, request));
        assertTrue(ex.getMessage().contains("đã được thanh toán trước đó"));
    }

    @Test
    @DisplayName("Kiểm tra bảo mật self-access: bệnh nhân khác không xem được hóa đơn")
    void getInvoiceById_PatientSelfAccess_Forbidden() {
        when(invoiceRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(existingInvoice));

        // User ID 999 khác với patient user ID 100
        BusinessException ex = assertThrows(BusinessException.class, () ->
                invoiceService.getInvoiceById(10L, 999L, false));
        assertTrue(ex.getMessage().contains("không có quyền truy cập"));
    }
}
