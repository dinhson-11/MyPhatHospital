package com.hospital.hmsai.reporting.service;

import com.hospital.hmsai.ai.repository.AiClinicalSuggestionRepository;
import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.appointment.entity.AppointmentStatus;
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
        when(visitRepository.countWithDiagnosis()).thenReturn(3L);
        when(visitRepository.findTopDiagnosisCounts(any())).thenReturn(List.of(
                diagnosisCount("I10", 2), diagnosisCount("E11", 1)));
        when(visitRepository.findLatestNotesByDiagnosisCode(eq("I10"), any())).thenReturn(List.of("Tăng huyết áp vô căn"));
        when(visitRepository.findLatestNotesByDiagnosisCode(eq("E11"), any())).thenReturn(List.of());

        List<TopDiagnosisResponse> top = reportService.getTopDiagnoses(5);

        assertThat(top).hasSize(2);
        assertThat(top.get(0).getIcd10Code()).isEqualTo("I10");
        assertThat(top.get(0).getCount()).isEqualTo(2);
        assertThat(top.get(1).getIcd10Code()).isEqualTo("E11");
        assertThat(top.get(1).getCount()).isEqualTo(1);
        assertThat(top.get(0).getDiseaseName()).isEqualTo("Tăng huyết áp vô căn");
        assertThat(top.get(0).getPercentage()).isEqualTo(66.7);
        assertThat(top.get(1).getDiseaseName()).isEqualTo("E11"); // chưa có ghi chú → dùng mã
    }

    @Test
    @DisplayName("Top bệnh lý: chỉ truy vấn tổng hợp trong DB, không nạp toàn bộ ca khám; limit được truyền xuống DB")
    void testTopDiagnoses_AggregatesInDatabase() {
        when(visitRepository.countWithDiagnosis()).thenReturn(0L);
        assertThat(reportService.getTopDiagnoses(3)).isEmpty();

        when(visitRepository.countWithDiagnosis()).thenReturn(10L);
        when(visitRepository.findTopDiagnosisCounts(any())).thenReturn(List.of());
        reportService.getTopDiagnoses(3);

        org.mockito.ArgumentCaptor<org.springframework.data.domain.Pageable> page =
                org.mockito.ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
        org.mockito.Mockito.verify(visitRepository).findTopDiagnosisCounts(page.capture());
        assertThat(page.getValue().getPageSize()).isEqualTo(3);
        org.mockito.Mockito.verify(visitRepository, org.mockito.Mockito.never()).findAll();
    }

    private static VisitRepository.DiagnosisCount diagnosisCount(String code, long count) {
        return new VisitRepository.DiagnosisCount() {
            @Override public String getCode() { return code; }
            @Override public long getCnt() { return count; }
        };
    }

    @Test
    @DisplayName("KPI tổng quan phản ánh chính xác các số liệu điều hành")
    void testKpiSummary_Success() {
        when(patientRepository.count()).thenReturn(150L);
        when(appointmentRepository.countByScheduledAtBetweenAndStatusNot(any(), any(), eq(AppointmentStatus.CANCELLED)))
                .thenReturn(7L);
        when(visitRepository.countByVisitTimeBetween(any(), any())).thenReturn(15L);
        when(invoiceRepository.findByStatusAndPaidAtBetween(any(), any(), any())).thenReturn(Collections.emptyList());
        when(staffProfileRepository.count()).thenReturn(12L);
        when(drugRepository.findByStockQuantityLessThanEqualOrderByStockQuantityAsc(20))
                .thenReturn(List.of(Drug.builder().id(1L).build()));
        when(aiClinicalSuggestionRepository.count()).thenReturn(45L);

        KpiSummaryResponse kpi = reportService.getKpiSummary();

        assertThat(kpi.getTotalPatients()).isEqualTo(150);
        assertThat(kpi.getTodayAppointments()).isEqualTo(7);
        assertThat(kpi.getTodayVisits()).isEqualTo(15);
        assertThat(kpi.getActiveStaffCount()).isEqualTo(12);
        assertThat(kpi.getLowStockDrugsCount()).isEqualTo(1);
        assertThat(kpi.getAiAlertsCount()).isEqualTo(45);
    }

    @Test
    @DisplayName("KPI lịch hẹn hôm nay chỉ đếm lịch trong ngày, không đếm lịch đã hủy")
    void testKpiTodayAppointments_OnlyToday() {
        reportService.getKpiSummary();

        org.mockito.ArgumentCaptor<LocalDateTime> from = org.mockito.ArgumentCaptor.forClass(LocalDateTime.class);
        org.mockito.ArgumentCaptor<LocalDateTime> to = org.mockito.ArgumentCaptor.forClass(LocalDateTime.class);
        org.mockito.Mockito.verify(appointmentRepository)
                .countByScheduledAtBetweenAndStatusNot(from.capture(), to.capture(), eq(AppointmentStatus.CANCELLED));
        assertThat(from.getValue()).isEqualTo(LocalDate.now().atStartOfDay());
        assertThat(to.getValue().toLocalDate()).isEqualTo(LocalDate.now());
        org.mockito.Mockito.verify(appointmentRepository, org.mockito.Mockito.never()).count();
    }

    @Test
    @DisplayName("KPI doanh thu hôm nay là tiền thực thu từ người bệnh, không gồm phần BHYT")
    void testKpiTodayRevenue_UsesPatientAmount() {
        Invoice a = new Invoice();
        a.setTotalAmount(new BigDecimal("1000000"));
        a.setInsuranceAmount(new BigDecimal("800000"));
        a.setPatientAmount(new BigDecimal("200000"));
        Invoice b = new Invoice();
        b.setTotalAmount(new BigDecimal("300000"));
        b.setInsuranceAmount(BigDecimal.ZERO);
        b.setPatientAmount(new BigDecimal("300000"));
        when(invoiceRepository.findByStatusAndPaidAtBetween(eq(InvoiceStatus.PAID), any(), any()))
                .thenReturn(List.of(a, b));

        KpiSummaryResponse kpi = reportService.getKpiSummary();

        assertThat(kpi.getTodayRevenue()).isEqualByComparingTo("500000");
    }
}
