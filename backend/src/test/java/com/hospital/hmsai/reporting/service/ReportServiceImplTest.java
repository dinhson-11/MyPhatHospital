package com.hospital.hmsai.reporting.service;

import com.hospital.hmsai.ai.repository.AiClinicalSuggestionRepository;
import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.billing.entity.Invoice;
import com.hospital.hmsai.billing.entity.InvoiceStatus;
import com.hospital.hmsai.billing.entity.PaymentMethod;
import com.hospital.hmsai.billing.repository.InvoiceRepository;
import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.entity.VisitStatus;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.pharmacy.repository.DrugRepository;
import com.hospital.hmsai.reporting.dto.KpiSummaryResponse;
import com.hospital.hmsai.reporting.dto.RevenueSummaryResponse;
import com.hospital.hmsai.reporting.dto.TopDiagnosisResponse;
import com.hospital.hmsai.reporting.dto.VisitsSummaryResponse;
import com.hospital.hmsai.reporting.service.impl.ReportServiceImpl;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceImplTest {

    @Mock
    private VisitRepository visitRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private StaffProfileRepository staffProfileRepository;

    @Mock
    private DrugRepository drugRepository;

    @Mock
    private AiClinicalSuggestionRepository aiClinicalSuggestionRepository;

    @InjectMocks
    private ReportServiceImpl reportService;

    @Test
    @DisplayName("Thống kê lượt khám tính toán đúng tổng và số lượng theo trạng thái")
    void testVisitsSummary_Success() {
        LocalDate from = LocalDate.now().minusDays(3);
        LocalDate to = LocalDate.now();

        Visit v1 = Visit.builder().id(1L).status(VisitStatus.COMPLETED).visitTime(LocalDateTime.now()).build();
        Visit v2 = Visit.builder().id(2L).status(VisitStatus.IN_PROGRESS).visitTime(LocalDateTime.now()).build();

        when(visitRepository.findByVisitTimeBetween(any(), any())).thenReturn(List.of(v1, v2));
        when(appointmentRepository.countByStatus(any())).thenReturn(1L);

        VisitsSummaryResponse res = reportService.getVisitsSummary(from, to);

        assertThat(res.getTotalVisits()).isEqualTo(2);
        assertThat(res.getCompletedVisits()).isEqualTo(1);
        assertThat(res.getInProgressVisits()).isEqualTo(1);
        assertThat(res.getCancelledAppointments()).isEqualTo(1);
        assertThat(res.getDailyStats()).isNotEmpty();
    }

    @Test
    @DisplayName("Doanh thu tính theo ngày thu tiền, tách BHYT và tiền người bệnh trả theo phương thức")
    void testRevenueSummary_Success() {
        LocalDate from = LocalDate.now().minusDays(2);
        LocalDate to = LocalDate.now();

        // Lập hóa đơn từ tuần trước nhưng thu tiền hôm nay → vẫn tính vào doanh thu hôm nay
        Invoice i1 = Invoice.builder()
                .id(1L)
                .status(InvoiceStatus.PAID)
                .totalAmount(new BigDecimal("150000"))
                .patientAmount(new BigDecimal("150000"))
                .paymentMethod(PaymentMethod.CASH)
                .createdAt(LocalDateTime.now().minusDays(7))
                .paidAt(LocalDateTime.now())
                .build();

        // BHYT 80%: tổng 350.000, BHYT 280.000, người bệnh trả 70.000
        Invoice i2 = Invoice.builder()
                .id(2L)
                .status(InvoiceStatus.PAID)
                .totalAmount(new BigDecimal("350000"))
                .insuranceAmount(new BigDecimal("280000"))
                .patientAmount(new BigDecimal("70000"))
                .paymentMethod(PaymentMethod.VIETQR)
                .createdAt(LocalDateTime.now())
                .paidAt(LocalDateTime.now())
                .build();

        Invoice i3 = Invoice.builder()
                .id(3L)
                .status(InvoiceStatus.PENDING)
                .totalAmount(new BigDecimal("200000"))
                .createdAt(LocalDateTime.now())
                .build();

        when(invoiceRepository.findByStatusAndPaidAtBetween(eq(InvoiceStatus.PAID), any(), any())).thenReturn(List.of(i1, i2));
        when(invoiceRepository.findByCreatedAtBetween(any(), any())).thenReturn(List.of(i2, i3));
        when(invoiceRepository.findByStatusAndVoidedAtBetween(eq(InvoiceStatus.REFUNDED), any(), any())).thenReturn(List.of());

        RevenueSummaryResponse res = reportService.getRevenueSummary(from, to);

        assertThat(res.getTotalRevenue()).isEqualByComparingTo(new BigDecimal("500000"));
        assertThat(res.getInsuranceAmount()).isEqualByComparingTo(new BigDecimal("280000"));
        assertThat(res.getPatientCollected()).isEqualByComparingTo(new BigDecimal("220000"));
        assertThat(res.getPaidInvoicesCount()).isEqualTo(2);
        assertThat(res.getPendingInvoicesCount()).isEqualTo(1);
        assertThat(res.getCashRevenue()).isEqualByComparingTo(new BigDecimal("150000"));
        assertThat(res.getVietQrRevenue()).isEqualByComparingTo(new BigDecimal("70000"));
        assertThat(res.getDailyRevenues().get(res.getDailyRevenues().size() - 1).getAmount())
                .isEqualByComparingTo(new BigDecimal("500000"));
    }

    @Test
    @DisplayName("Top bệnh lý ICD-10 xếp hạng theo tần suất xuất hiện giảm dần")
    void testTopDiagnoses_Success() {
        Visit v1 = Visit.builder().diagnosisCode("I10").diagnosisNote("Tăng huyết áp vô căn").build();
        Visit v2 = Visit.builder().diagnosisCode("I10").diagnosisNote("Tăng huyết áp vô căn").build();
        Visit v3 = Visit.builder().diagnosisCode("E11").diagnosisNote("Đái tháo đường type 2").build();

        when(visitRepository.findAllWithDiagnosis()).thenReturn(List.of(v1, v2, v3));

        List<TopDiagnosisResponse> top = reportService.getTopDiagnoses(5);

        assertThat(top).hasSize(2);
        assertThat(top.get(0).getIcd10Code()).isEqualTo("I10");
        assertThat(top.get(0).getCount()).isEqualTo(2);
        assertThat(top.get(1).getIcd10Code()).isEqualTo("E11");
        assertThat(top.get(1).getCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("KPI tổng quan phản ánh chính xác các số liệu điều hành")
    void testKpiSummary_Success() {
        when(patientRepository.count()).thenReturn(150L);
        when(appointmentRepository.count()).thenReturn(20L);
        when(visitRepository.countByVisitTimeBetween(any(), any())).thenReturn(15L);
        when(invoiceRepository.findByStatusAndPaidAtBetween(any(), any(), any())).thenReturn(Collections.emptyList());
        when(staffProfileRepository.count()).thenReturn(12L);
        when(drugRepository.findByStockQuantityLessThanEqualOrderByStockQuantityAsc(20))
                .thenReturn(List.of(Drug.builder().id(1L).build()));
        when(aiClinicalSuggestionRepository.count()).thenReturn(45L);

        KpiSummaryResponse kpi = reportService.getKpiSummary();

        assertThat(kpi.getTotalPatients()).isEqualTo(150);
        assertThat(kpi.getTodayAppointments()).isEqualTo(20);
        assertThat(kpi.getTodayVisits()).isEqualTo(15);
        assertThat(kpi.getActiveStaffCount()).isEqualTo(12);
        assertThat(kpi.getLowStockDrugsCount()).isEqualTo(1);
        assertThat(kpi.getAiAlertsCount()).isEqualTo(45);
    }
}
