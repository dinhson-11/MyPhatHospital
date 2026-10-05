package com.hospital.hmsai.reporting.service.impl;

import com.hospital.hmsai.ai.repository.AiClinicalSuggestionRepository;
import com.hospital.hmsai.appointment.entity.AppointmentStatus;
import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.billing.entity.Invoice;
import com.hospital.hmsai.billing.entity.InvoiceStatus;
import com.hospital.hmsai.billing.entity.PaymentMethod;
import com.hospital.hmsai.billing.repository.InvoiceRepository;
import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.entity.VisitStatus;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.pharmacy.repository.DrugRepository;
import com.hospital.hmsai.reporting.dto.KpiSummaryResponse;
import com.hospital.hmsai.reporting.dto.RevenueSummaryResponse;
import com.hospital.hmsai.reporting.dto.TopDiagnosisResponse;
import com.hospital.hmsai.reporting.dto.VisitsSummaryResponse;
import com.hospital.hmsai.reporting.service.ReportService;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    private final VisitRepository visitRepository;
    private final InvoiceRepository invoiceRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final DrugRepository drugRepository;
    private final AiClinicalSuggestionRepository aiClinicalSuggestionRepository;

    @Override
    public VisitsSummaryResponse getVisitsSummary(LocalDate fromDate, LocalDate toDate) {
        LocalDate start = fromDate != null ? fromDate : LocalDate.now().minusDays(6);
        LocalDate end = toDate != null ? toDate : LocalDate.now();

        LocalDateTime startDt = start.atStartOfDay();
        LocalDateTime endDt = end.atTime(23, 59, 59);

        log.info("Lấy thống kê lượt khám từ {} đến {}", startDt, endDt);

        List<Visit> visits = visitRepository.findByVisitTimeBetween(startDt, endDt);

        long completedCount = visits.stream().filter(v -> v.getStatus() == VisitStatus.COMPLETED).count();
        long inProgressCount = visits.stream().filter(v -> v.getStatus() == VisitStatus.IN_PROGRESS).count();
        long waitingAppointments = appointmentRepository.countByStatus(AppointmentStatus.CONFIRMED);
        long cancelledAppointments = appointmentRepository.countByStatus(AppointmentStatus.CANCELLED);

        // Group by Date for chart
        Map<LocalDate, List<Visit>> groupedByDate = visits.stream()
                .filter(v -> v.getVisitTime() != null)
                .collect(Collectors.groupingBy(v -> v.getVisitTime().toLocalDate()));

        List<VisitsSummaryResponse.DailyVisitStat> dailyStats = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            List<Visit> dayVisits = groupedByDate.getOrDefault(d, Collections.emptyList());
            long dayTotal = dayVisits.size();
            long dayCompleted = dayVisits.stream().filter(v -> v.getStatus() == VisitStatus.COMPLETED).count();

            dailyStats.add(VisitsSummaryResponse.DailyVisitStat.builder()
                    .date(d)
                    .total(dayTotal)
                    .completed(dayCompleted)
                    .build());
        }

        return VisitsSummaryResponse.builder()
                .totalVisits(visits.size())
                .completedVisits(completedCount)
                .inProgressVisits(inProgressCount)
                .waitingVisits(waitingAppointments)
                .cancelledAppointments(cancelledAppointments)
                .dailyStats(dailyStats)
                .build();
    }

    @Override
    public RevenueSummaryResponse getRevenueSummary(LocalDate fromDate, LocalDate toDate) {
        LocalDate start = fromDate != null ? fromDate : LocalDate.now().minusDays(6);
        LocalDate end = toDate != null ? toDate : LocalDate.now();

        LocalDateTime startDt = start.atStartOfDay();
        LocalDateTime endDt = end.atTime(23, 59, 59);

        log.info("Lấy thống kê doanh thu từ {} đến {}", startDt, endDt);

        List<Invoice> invoices = invoiceRepository.findByCreatedAtBetween(startDt, endDt);

        List<Invoice> paidInvoices = invoices.stream()
                .filter(i -> i.getStatus() == InvoiceStatus.PAID)
                .toList();

        BigDecimal totalRevenue = paidInvoices.stream()
                .map(Invoice::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long paidCount = paidInvoices.size();
        long pendingCount = invoices.stream().filter(i -> i.getStatus() == InvoiceStatus.PENDING).count();

        BigDecimal cashRevenue = paidInvoices.stream()
                .filter(i -> i.getPaymentMethod() == PaymentMethod.CASH)
                .map(Invoice::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal vietQrRevenue = paidInvoices.stream()
                .filter(i -> i.getPaymentMethod() == PaymentMethod.VIETQR)
                .map(Invoice::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Group by Date for chart
        Map<LocalDate, List<Invoice>> groupedByDate = paidInvoices.stream()
                .filter(i -> i.getCreatedAt() != null)
                .collect(Collectors.groupingBy(i -> i.getCreatedAt().toLocalDate()));

        List<RevenueSummaryResponse.DailyRevenueStat> dailyRevenues = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            List<Invoice> dayInvoices = groupedByDate.getOrDefault(d, Collections.emptyList());
            BigDecimal dayAmount = dayInvoices.stream()
                    .map(Invoice::getTotalAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            dailyRevenues.add(RevenueSummaryResponse.DailyRevenueStat.builder()
                    .date(d)
                    .amount(dayAmount)
                    .invoiceCount(dayInvoices.size())
                    .build());
        }

        return RevenueSummaryResponse.builder()
                .totalRevenue(totalRevenue)
                .totalInvoices(invoices.size())
                .paidInvoicesCount(paidCount)
                .pendingInvoicesCount(pendingCount)
                .cashRevenue(cashRevenue)
                .vietQrRevenue(vietQrRevenue)
                .dailyRevenues(dailyRevenues)
                .build();
    }

    @Override
    public List<TopDiagnosisResponse> getTopDiagnoses(int limit) {
        int max = limit > 0 ? limit : 5;
        log.info("Lấy top {} bệnh lý chẩn đoán phổ biến", max);

        List<Visit> visits = visitRepository.findAllWithDiagnosis();
        if (visits.isEmpty()) {
            return Collections.emptyList();
        }

        long totalWithDiagnosis = visits.size();

        Map<String, List<Visit>> groupedByCode = visits.stream()
                .collect(Collectors.groupingBy(Visit::getDiagnosisCode));

        return groupedByCode.entrySet().stream()
                .map(entry -> {
                    String code = entry.getKey();
                    List<Visit> list = entry.getValue();
                    String diseaseName = list.get(0).getDiagnosisNote() != null ? list.get(0).getDiagnosisNote() : code;
                    long count = list.size();
                    double percentage = Math.round((count * 100.0 / totalWithDiagnosis) * 10.0) / 10.0;

                    return TopDiagnosisResponse.builder()
                            .icd10Code(code)
                            .diseaseName(diseaseName)
                            .count(count)
                            .percentage(percentage)
                            .build();
                })
                .sorted(Comparator.comparingLong(TopDiagnosisResponse::getCount).reversed())
                .limit(max)
                .collect(Collectors.toList());
    }

    @Override
    public KpiSummaryResponse getKpiSummary() {
        log.info("Lấy tổng hợp chỉ số KPI điều hành bệnh viện");

        long totalPatients = patientRepository.count();

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(23, 59, 59);

        long todayVisits = visitRepository.countByVisitTimeBetween(todayStart, todayEnd);

        List<Invoice> todayPaidInvoices = invoiceRepository.findByStatusAndPaidAtBetween(
                InvoiceStatus.PAID, todayStart, todayEnd);
        BigDecimal todayRevenue = todayPaidInvoices.stream()
                .map(Invoice::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long todayAppointments = appointmentRepository.count();
        long activeStaffCount = staffProfileRepository.count();
        long lowStockDrugsCount = drugRepository.findByStockQuantityLessThanEqualOrderByStockQuantityAsc(20).size();
        long aiAlertsCount = aiClinicalSuggestionRepository.count();

        return KpiSummaryResponse.builder()
                .totalPatients(totalPatients)
                .todayAppointments(todayAppointments)
                .todayVisits(todayVisits)
                .todayRevenue(todayRevenue)
                .activeStaffCount(activeStaffCount)
                .lowStockDrugsCount(lowStockDrugsCount)
                .aiAlertsCount(aiAlertsCount)
                .build();
    }
}
