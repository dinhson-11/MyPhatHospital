package com.hospital.hmsai.billing.service;

import com.hospital.hmsai.billing.config.BillingProperties;
import com.hospital.hmsai.billing.dto.BillingShiftSummaryResponse;
import com.hospital.hmsai.billing.dto.InvoiceResponse;
import com.hospital.hmsai.billing.dto.PayInvoiceRequest;
import com.hospital.hmsai.billing.dto.PaymentQrResponse;
import com.hospital.hmsai.billing.entity.*;
import com.hospital.hmsai.billing.repository.InvoiceRepository;
import com.hospital.hmsai.billing.service.impl.InvoiceServiceImpl;
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
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.entity.User;
import com.hospital.hmsai.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceImplTest {

    @Mock private InvoiceRepository invoiceRepository;
    @Mock private VisitRepository visitRepository;
    @Mock private PrescriptionRepository prescriptionRepository;
    @Mock private LabOrderRepository labOrderRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private UserRepository userRepository;

    private BillingProperties billingProperties;
    private InvoiceServiceImpl invoiceService;

    private Visit visit;
    private Patient patient;
    private Prescription prescription;
    private LabOrder labOrder;
    private Invoice pendingInvoice;

    /** Một ngày thứ Hai trong tương lai gần – ngày khám BHYT hợp lệ. */
    private static final LocalDate MONDAY = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));

    @BeforeEach
    void setUp() {
        billingProperties = new BillingProperties();
        invoiceService = new InvoiceServiceImpl(invoiceRepository, visitRepository, prescriptionRepository,
                labOrderRepository, patientRepository, userRepository, billingProperties);

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
                .visitTime(MONDAY.atTime(9, 0))
                .diagnosisCode("I10")
                .status(VisitStatus.COMPLETED)
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
                .quantity(10) // 10 x 3.000 = 30.000
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
                .testType("Tổng phân tích tế bào máu ngoại vi (CBC 18 chỉ số)") // 80.000
                .build();

        pendingInvoice = Invoice.builder()
                .id(10L)
                .invoiceCode("HD261012000010")
                .patient(patient)
                .visit(visit)
                .totalAmount(new BigDecimal("260000.00"))
                .patientAmount(new BigDecimal("260000.00"))
                .status(InvoiceStatus.PENDING)
                .items(new ArrayList<>())
                .build();
    }

    private void stubVisitCharges() {
        stubVisitCharges(List.of());
    }

    private void stubVisitCharges(List<Invoice> existingInvoices) {
        when(invoiceRepository.findAllByVisitIdWithDetails(50L)).thenReturn(existingInvoices);
        when(visitRepository.findByIdWithDetails(50L)).thenReturn(Optional.of(visit));
        when(prescriptionRepository.findByVisitIdWithItems(50L)).thenReturn(List.of(prescription));
        when(labOrderRepository.findByVisitId(50L)).thenReturn(List.of(labOrder));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice inv = invocation.getArgument(0);
            inv.setId(10L);
            return inv;
        });
    }

    @Nested
    @DisplayName("Lập hóa đơn")
    class Generate {

        @Test
        @DisplayName("Đủ 3 nhóm chi phí, có số lượng và đơn giá, sinh mã hóa đơn")
        void generate_Full3Items_NoInsurance() {
            stubVisitCharges();

            InvoiceResponse response = invoiceService.generateInvoiceFromVisit(50L);

            assertEquals(InvoiceStatus.PENDING, response.getStatus());
            // Khám 150.000 + Thuốc 30.000 + CLS huyết học 80.000 = 260.000
            assertEquals(0, new BigDecimal("260000").compareTo(response.getTotalAmount()));
            assertEquals(0, new BigDecimal("260000").compareTo(response.getPatientAmount()));
            assertEquals(0, BigDecimal.ZERO.compareTo(response.getInsuranceAmount()));
            assertTrue(response.getInsuranceNote().contains("Không có thẻ BHYT"));
            assertEquals(3, response.getItems().size());
            assertEquals(10, response.getItems().get(1).getQuantity());
            assertEquals(0, new BigDecimal("3000").compareTo(response.getItems().get(1).getUnitPrice()));
            assertTrue(response.getInvoiceCode().matches("HD\\d{6}000010"));
        }

        @Test
        @DisplayName("Áp dụng BHYT 80% (mã thẻ mức hưởng 4) khi chi phí vượt ngưỡng 15% lương cơ sở")
        void generate_WithInsurance80Percent() {
            patient.setInsuranceNumber("GD4010123456789");
            patient.setInsuranceValidFrom(MONDAY.minusYears(1));
            patient.setInsuranceValidTo(MONDAY.plusYears(1));
            labOrder.setTestType("Chụp CT sọ não"); // 500.000 → tổng 680.000 > 351.000
            stubVisitCharges();

            InvoiceResponse response = invoiceService.generateInvoiceFromVisit(50L);

            assertEquals(0, new BigDecimal("680000").compareTo(response.getTotalAmount()));
            assertEquals(0, new BigDecimal("80").compareTo(response.getInsuranceRate()));
            assertEquals(0, new BigDecimal("544000").compareTo(response.getInsuranceAmount()));
            assertEquals(0, new BigDecimal("136000").compareTo(response.getPatientAmount()));
            assertEquals("GD4010123456789", response.getInsuranceNumber());
        }

        @Test
        @DisplayName("Chi phí thấp hơn 15% lương cơ sở → BHYT chi trả 100%")
        void generate_LowCostFullyCovered() {
            patient.setInsuranceNumber("GD4010123456789");
            patient.setInsuranceValidTo(MONDAY.plusYears(1));
            stubVisitCharges(); // 260.000 < 351.000

            InvoiceResponse response = invoiceService.generateInvoiceFromVisit(50L);

            assertEquals(0, new BigDecimal("100").compareTo(response.getInsuranceRate()));
            assertEquals(0, BigDecimal.ZERO.compareTo(response.getPatientAmount()));
        }

        @Test
        @DisplayName("Thẻ BHYT hết hạn → người bệnh tự chi trả, có ghi chú lý do")
        void generate_ExpiredInsurance() {
            patient.setInsuranceNumber("GD4010123456789");
            patient.setInsuranceValidTo(MONDAY.minusDays(1));
            stubVisitCharges();

            InvoiceResponse response = invoiceService.generateInvoiceFromVisit(50L);

            assertEquals(0, new BigDecimal("260000").compareTo(response.getPatientAmount()));
            assertNull(response.getInsuranceNumber());
            assertTrue(response.getInsuranceNote().contains("không còn hiệu lực"));
        }

        @Test
        @DisplayName("Chặn lập hóa đơn khi ca khám chưa hoàn tất")
        void generate_VisitInProgress_Throws() {
            visit.setStatus(VisitStatus.IN_PROGRESS);
            when(invoiceRepository.findAllByVisitIdWithDetails(50L)).thenReturn(List.of());
            when(visitRepository.findByIdWithDetails(50L)).thenReturn(Optional.of(visit));

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> invoiceService.generateInvoiceFromVisit(50L));
            assertTrue(ex.getMessage().contains("chưa hoàn tất"));
            verify(invoiceRepository, never()).save(any());
        }

        @Test
        @DisplayName("Ca khám đã có hóa đơn còn hiệu lực → trả về hóa đơn đó, kể cả khi có hóa đơn cũ đã hủy")
        void generate_ActiveInvoiceExists_ReturnsIt() {
            Invoice cancelled = Invoice.builder().id(9L).status(InvoiceStatus.CANCELLED).visit(visit)
                    .patient(patient).items(new ArrayList<>()).build();
            when(invoiceRepository.findAllByVisitIdWithDetails(50L)).thenReturn(List.of(pendingInvoice, cancelled));

            InvoiceResponse response = invoiceService.generateInvoiceFromVisit(50L);

            assertEquals(10L, response.getId());
            verify(invoiceRepository, never()).save(any());
        }

        @Test
        @DisplayName("Chỉ còn hóa đơn đã hủy → được lập hóa đơn mới")
        void generate_OnlyCancelled_CreatesNew() {
            Invoice cancelled = Invoice.builder().id(9L).status(InvoiceStatus.CANCELLED).visit(visit)
                    .patient(patient).items(new ArrayList<>()).build();
            stubVisitCharges(List.of(cancelled));

            InvoiceResponse response = invoiceService.generateInvoiceFromVisit(50L);

            assertEquals(InvoiceStatus.PENDING, response.getStatus());
            verify(invoiceRepository).save(any(Invoice.class));
        }
    }

    @Nested
    @DisplayName("Thu tiền")
    class Pay {

        @BeforeEach
        void stubLoad() {
            when(invoiceRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(pendingInvoice));
        }

        @Test
        @DisplayName("Tiền mặt: máy chủ tính tiền thừa, ghi thu ngân, tự sinh mã phiếu thu")
        void pay_Cash_ComputesChange() {
            when(invoiceRepository.existsByTransactionCodeAndIdNot(anyString(), anyLong())).thenReturn(false);
            when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));
            when(userRepository.findById(7L)).thenReturn(Optional.of(User.builder().id(7L).fullName("Kế toán A").build()));

            InvoiceResponse response = invoiceService.payInvoice(10L, PayInvoiceRequest.builder()
                    .paymentMethod(PaymentMethod.CASH)
                    .amountReceived(new BigDecimal("300000"))
                    .build(), 7L);

            assertEquals(InvoiceStatus.PAID, response.getStatus());
            assertEquals(0, new BigDecimal("40000").compareTo(response.getChangeAmount()));
            assertEquals("Kế toán A", response.getCashierName());
            assertTrue(response.getTransactionCode().startsWith("TM"));
            assertNotNull(response.getPaidAt());
        }

        @Test
        @DisplayName("Tiền mặt: chặn khi tiền khách đưa chưa đủ")
        void pay_Cash_Insufficient_Throws() {
            BusinessException ex = assertThrows(BusinessException.class, () ->
                    invoiceService.payInvoice(10L, PayInvoiceRequest.builder()
                            .paymentMethod(PaymentMethod.CASH)
                            .amountReceived(new BigDecimal("200000"))
                            .build(), 7L));
            assertTrue(ex.getMessage().contains("chưa đủ"));
            assertEquals(InvoiceStatus.PENDING, pendingInvoice.getStatus());
        }

        @Test
        @DisplayName("Tiền mặt: chặn khi chưa nhập tiền khách đưa")
        void pay_Cash_MissingAmount_Throws() {
            assertThrows(BusinessException.class, () ->
                    invoiceService.payInvoice(10L, PayInvoiceRequest.builder()
                            .paymentMethod(PaymentMethod.CASH)
                            .build(), 7L));
        }

        @Test
        @DisplayName("VietQR: bắt buộc mã giao dịch ngân hàng")
        void pay_VietQr_RequiresTransactionCode() {
            BusinessException ex = assertThrows(BusinessException.class, () ->
                    invoiceService.payInvoice(10L, PayInvoiceRequest.builder()
                            .paymentMethod(PaymentMethod.VIETQR)
                            .build(), 7L));
            assertTrue(ex.getMessage().contains("mã giao dịch"));
        }

        @Test
        @DisplayName("VietQR: thanh toán thành công với mã giao dịch thật")
        void pay_VietQr_Success() {
            when(invoiceRepository.existsByTransactionCodeAndIdNot("FT26283123456", 10L)).thenReturn(false);
            when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));

            InvoiceResponse response = invoiceService.payInvoice(10L, PayInvoiceRequest.builder()
                    .paymentMethod(PaymentMethod.VIETQR)
                    .transactionCode(" FT26283123456 ")
                    .build(), 7L);

            assertEquals(InvoiceStatus.PAID, response.getStatus());
            assertEquals("FT26283123456", response.getTransactionCode());
            assertEquals(0, new BigDecimal("260000").compareTo(response.getAmountReceived()));
        }

        @Test
        @DisplayName("Chặn dùng lại mã giao dịch đã ghi cho hóa đơn khác")
        void pay_DuplicateTransactionCode_Throws() {
            when(invoiceRepository.existsByTransactionCodeAndIdNot("FT26283123456", 10L)).thenReturn(true);

            assertThrows(DuplicateResourceException.class, () ->
                    invoiceService.payInvoice(10L, PayInvoiceRequest.builder()
                            .paymentMethod(PaymentMethod.BANK_TRANSFER)
                            .transactionCode("FT26283123456")
                            .build(), 7L));
        }

        @Test
        @DisplayName("Chặn thanh toán lại hóa đơn đã thanh toán")
        void pay_AlreadyPaid_Throws() {
            pendingInvoice.setStatus(InvoiceStatus.PAID);

            BusinessException ex = assertThrows(BusinessException.class, () ->
                    invoiceService.payInvoice(10L, PayInvoiceRequest.builder()
                            .paymentMethod(PaymentMethod.CASH)
                            .amountReceived(new BigDecimal("300000"))
                            .build(), 7L));
            assertTrue(ex.getMessage().contains("đã được thanh toán trước đó"));
        }

        @Test
        @DisplayName("BHYT chi trả 100%: thu 0 đồng bằng tiền mặt không cần nhập tiền khách đưa")
        void pay_ZeroDue_Allowed() {
            pendingInvoice.setPatientAmount(BigDecimal.ZERO);
            when(invoiceRepository.existsByTransactionCodeAndIdNot(anyString(), anyLong())).thenReturn(false);
            when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));

            InvoiceResponse response = invoiceService.payInvoice(10L, PayInvoiceRequest.builder()
                    .paymentMethod(PaymentMethod.CASH)
                    .build(), 7L);

            assertEquals(InvoiceStatus.PAID, response.getStatus());
            assertEquals(0, BigDecimal.ZERO.compareTo(response.getChangeAmount()));
        }
    }

    @Nested
    @DisplayName("Hủy / hoàn tiền")
    class VoidFlows {

        @BeforeEach
        void stubLoad() {
            when(invoiceRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(pendingInvoice));
        }

        @Test
        @DisplayName("Hủy hóa đơn chưa thu, lưu lý do và người hủy")
        void cancel_Pending_Success() {
            when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));
            when(userRepository.findById(7L)).thenReturn(Optional.of(User.builder().id(7L).fullName("Kế toán A").build()));

            InvoiceResponse response = invoiceService.cancelInvoice(10L, "Bệnh nhân chuyển viện", 7L);

            assertEquals(InvoiceStatus.CANCELLED, response.getStatus());
            assertEquals("Bệnh nhân chuyển viện", response.getVoidReason());
            assertEquals("Kế toán A", response.getVoidedBy());
            assertNotNull(response.getVoidedAt());
        }

        @Test
        @DisplayName("Không hủy được hóa đơn đã thu – phải hoàn tiền")
        void cancel_Paid_Throws() {
            pendingInvoice.setStatus(InvoiceStatus.PAID);
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> invoiceService.cancelInvoice(10L, "Nhập sai", 7L));
            assertTrue(ex.getMessage().contains("hoàn tiền"));
        }

        @Test
        @DisplayName("Hoàn tiền chỉ áp dụng cho hóa đơn đã thu")
        void refund_Pending_Throws() {
            assertThrows(BusinessException.class, () -> invoiceService.refundInvoice(10L, "Thu nhầm", 7L));
        }

        @Test
        @DisplayName("Hoàn tiền hóa đơn đã thu")
        void refund_Paid_Success() {
            pendingInvoice.setStatus(InvoiceStatus.PAID);
            when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));

            InvoiceResponse response = invoiceService.refundInvoice(10L, "Thu trùng hai lần", 7L);

            assertEquals(InvoiceStatus.REFUNDED, response.getStatus());
            assertEquals("Thu trùng hai lần", response.getVoidReason());
        }
    }

    @Nested
    @DisplayName("VietQR, phân quyền, đối soát")
    class Misc {

        @Test
        @DisplayName("Mã QR dùng số tiền người bệnh phải trả và mã hóa đơn, không chứa thông tin bệnh nhân")
        void paymentQr_UsesServerAmount() {
            billingProperties.getVietqr().setBankBin("970422");
            billingProperties.getVietqr().setAccountNo("1234567890");
            billingProperties.getVietqr().setAccountName("BENH VIEN MY PHAT");
            pendingInvoice.setPatientAmount(new BigDecimal("136000.00"));
            when(invoiceRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(pendingInvoice));

            PaymentQrResponse qr = invoiceService.getPaymentQr(10L);

            assertEquals(0, new BigDecimal("136000").compareTo(qr.getAmount()));
            assertEquals("MPH HD261012000010", qr.getTransferContent());
            assertTrue(qr.getQrImageUrl().startsWith("https://img.vietqr.io/image/970422-1234567890-compact2.png"));
            assertTrue(qr.getQrImageUrl().contains("amount=136000"));
            assertTrue(qr.getQrImageUrl().contains("addInfo=MPH%20HD261012000010"));
            assertFalse(qr.getQrImageUrl().contains("BN-2026"));
        }

        @Test
        @DisplayName("Chưa cấu hình tài khoản VietQR → báo lỗi rõ ràng thay vì dùng tài khoản giả")
        void paymentQr_NotConfigured_Throws() {
            when(invoiceRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(pendingInvoice));
            BusinessException ex = assertThrows(BusinessException.class, () -> invoiceService.getPaymentQr(10L));
            assertTrue(ex.getMessage().contains("Chưa cấu hình"));
        }

        @Test
        @DisplayName("Bệnh nhân khác không xem được hóa đơn")
        void getInvoiceById_OtherPatient_Forbidden() {
            when(invoiceRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(pendingInvoice));
            assertThrows(AccessDeniedException.class, () -> invoiceService.getInvoiceById(10L, 999L, false));
        }

        @Test
        @DisplayName("Bệnh nhân không xem được hóa đơn theo ca khám của người khác")
        void getInvoiceByVisit_OtherPatient_Forbidden() {
            when(invoiceRepository.findAllByVisitIdWithDetails(50L)).thenReturn(List.of(pendingInvoice));
            assertThrows(AccessDeniedException.class, () -> invoiceService.getInvoiceByVisitId(50L, 999L, false));
        }

        @Test
        @DisplayName("Bệnh nhân xem được hóa đơn của chính mình")
        void getInvoiceById_Owner_Allowed() {
            when(invoiceRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(pendingInvoice));
            assertEquals(10L, invoiceService.getInvoiceById(10L, 100L, false).getId());
        }

        @Test
        @DisplayName("Hàng chờ lập hóa đơn: báo trước ca khám có thẻ BHYT hợp lệ")
        void uninvoicedVisits() {
            patient.setInsuranceNumber("GD4010123456789");
            patient.setInsuranceValidTo(MONDAY.plusYears(1));
            when(invoiceRepository.findCompletedVisitsWithoutActiveInvoice(eq(VisitStatus.COMPLETED), any(), any()))
                    .thenReturn(List.of(visit));

            var queue = invoiceService.getUninvoicedVisits(50);

            assertEquals(1, queue.size());
            assertEquals(50L, queue.get(0).getVisitId());
            assertEquals("BS. Hoàng C", queue.get(0).getDoctorName());
            assertTrue(queue.get(0).isInsuranceEligible());
        }

        @Test
        @DisplayName("Đối soát ca: tổng thu theo phương thức, BHYT, hoàn tiền, chờ thu")
        void shiftSummary() {
            LocalDate day = LocalDate.now();
            Invoice cash = Invoice.builder().id(1L).status(InvoiceStatus.PAID).paymentMethod(PaymentMethod.CASH)
                    .totalAmount(new BigDecimal("200000")).insuranceAmount(BigDecimal.ZERO)
                    .patientAmount(new BigDecimal("200000")).paidAt(day.atTime(9, 0)).build();
            Invoice qr = Invoice.builder().id(2L).status(InvoiceStatus.REFUNDED).paymentMethod(PaymentMethod.VIETQR)
                    .totalAmount(new BigDecimal("500000")).insuranceAmount(new BigDecimal("400000"))
                    .patientAmount(new BigDecimal("100000")).paidAt(day.atTime(10, 0)).build();
            when(invoiceRepository.findByPaidAtBetween(any(), any())).thenReturn(List.of(cash, qr));
            when(invoiceRepository.findByStatusAndVoidedAtBetween(eq(InvoiceStatus.REFUNDED), any(), any())).thenReturn(List.of(qr));
            when(invoiceRepository.findByStatusAndVoidedAtBetween(eq(InvoiceStatus.CANCELLED), any(), any())).thenReturn(List.of());
            when(invoiceRepository.findByStatus(InvoiceStatus.PENDING)).thenReturn(List.of(pendingInvoice));

            BillingShiftSummaryResponse summary = invoiceService.getShiftSummary(day);

            assertEquals(2, summary.getPaidCount());
            assertEquals(0, new BigDecimal("300000").compareTo(summary.getCollectedAmount()));
            assertEquals(0, new BigDecimal("400000").compareTo(summary.getInsuranceAmount()));
            assertEquals(1, summary.getRefundedCount());
            assertEquals(0, new BigDecimal("100000").compareTo(summary.getRefundedAmount()));
            assertEquals(1, summary.getPendingCount());
            BillingShiftSummaryResponse.MethodTotal cashTotal = summary.getByMethod().stream()
                    .filter(m -> m.getMethod() == PaymentMethod.CASH).findFirst().orElseThrow();
            assertEquals(0, new BigDecimal("200000").compareTo(cashTotal.getAmount()));
        }
    }
}
