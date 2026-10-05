package com.hospital.hmsai.clinical.service;

import com.hospital.hmsai.appointment.entity.Appointment;
import com.hospital.hmsai.appointment.entity.AppointmentStatus;
import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.clinical.dto.*;
import com.hospital.hmsai.clinical.entity.LabOrder;
import com.hospital.hmsai.clinical.entity.Prescription;
import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.entity.VisitStatus;
import com.hospital.hmsai.clinical.repository.LabOrderRepository;
import com.hospital.hmsai.clinical.repository.PrescriptionRepository;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.clinical.service.impl.VisitServiceImpl;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.entity.MedicalRecord;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.MedicalRecordRepository;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.pharmacy.repository.DrugRepository;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.entity.User;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VisitServiceImplTest {

    @Mock
    private VisitRepository visitRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private StaffProfileRepository staffProfileRepository;

    @Mock
    private PrescriptionRepository prescriptionRepository;

    @Mock
    private LabOrderRepository labOrderRepository;

    @Mock
    private DrugRepository drugRepository;

    @Mock
    private MedicalRecordRepository medicalRecordRepository;

    @Mock
    private com.hospital.hmsai.ai.service.AiClinicalService aiClinicalService;

    @InjectMocks
    private VisitServiceImpl visitService;

    private Patient testPatient;
    private StaffProfile testDoctor;
    private Appointment testAppointment;
    private Visit testVisit;
    private Drug testDrug;

    @BeforeEach
    void setUp() {
        testPatient = Patient.builder()
                .id(1L)
                .patientCode("BN-260928-001")
                .fullName("Trần Đức Minh")
                .phone("0912345678")
                .build();

        User doctorUser = User.builder()
                .id(10L)
                .fullName("TS. BS. Nguyễn Văn Hùng")
                .build();

        testDoctor = StaffProfile.builder()
                .id(1L)
                .user(doctorUser)
                .specialty("Tim mạch")
                .build();

        testAppointment = Appointment.builder()
                .id(100L)
                .patient(testPatient)
                .doctor(testDoctor)
                .status(AppointmentStatus.BOOKED)
                .scheduledAt(LocalDateTime.now())
                .build();

        testVisit = Visit.builder()
                .id(50L)
                .patient(testPatient)
                .doctor(testDoctor)
                .appointment(testAppointment)
                .chiefComplaint("Đau ngực trái, hồi hộp")
                .status(VisitStatus.IN_PROGRESS)
                .visitTime(LocalDateTime.now())
                .build();

        testDrug = Drug.builder()
                .id(1L)
                .code("DRUG-PARA-500")
                .name("Paracetamol 500mg")
                .unit("Viên")
                .price(BigDecimal.valueOf(1500))
                .stockQuantity(100)
                .build();
    }

    @Test
    @DisplayName("Tạo lượt khám thành công từ lịch hẹn")
    void testCreateVisit_Success_WithAppointment() {
        CreateVisitRequest request = CreateVisitRequest.builder()
                .patientId(1L)
                .doctorId(1L)
                .appointmentId(100L)
                .chiefComplaint("Đau thắt ngực khi gắng sức")
                .vitalSigns(VitalSignsDto.builder()
                        .pulse(85)
                        .bloodPressureSystolic(130)
                        .bloodPressureDiastolic(85)
                        .temperature(36.8)
                        .spO2(98)
                        .build())
                .build();

        when(patientRepository.findById(1L)).thenReturn(Optional.of(testPatient));
        when(staffProfileRepository.findById(1L)).thenReturn(Optional.of(testDoctor));
        when(appointmentRepository.findById(100L)).thenReturn(Optional.of(testAppointment));
        when(visitRepository.save(any(Visit.class))).thenAnswer(inv -> {
            Visit v = inv.getArgument(0);
            v.setId(50L);
            return v;
        });

        VisitResponse response = visitService.createVisit(request);

        assertNotNull(response);
        assertEquals(50L, response.getId());
        assertEquals(1L, response.getPatientId());
        assertEquals(1L, response.getDoctorId());
        assertEquals(VisitStatus.IN_PROGRESS, response.getStatus());
        assertEquals(85, response.getVitalSigns().getPulse());
        assertEquals(130, response.getVitalSigns().getBloodPressureSystolic());

        // Lịch hẹn phải được cập nhật sang CONFIRMED
        assertEquals(AppointmentStatus.CONFIRMED, testAppointment.getStatus());
        verify(appointmentRepository).save(testAppointment);
    }

    @Test
    @DisplayName("Tạo lượt khám thất bại khi không tìm thấy bệnh nhân")
    void testCreateVisit_PatientNotFound() {
        CreateVisitRequest request = CreateVisitRequest.builder()
                .patientId(999L)
                .doctorId(1L)
                .build();

        when(patientRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> visitService.createVisit(request));
        verify(visitRepository, never()).save(any());
    }

    @Test
    @DisplayName("Cập nhật chẩn đoán và sinh hiệu ca khám")
    void testUpdateVisit_Success() {
        UpdateVisitRequest request = UpdateVisitRequest.builder()
                .chiefComplaint("Đau thắt ngực ổn định")
                .diagnosisCode("I20.9")
                .diagnosisNote("Cơn đau thắt ngực không đặc hiệu")
                .vitalSigns(VitalSignsDto.builder().pulse(78).build())
                .build();

        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(visitRepository.save(any(Visit.class))).thenAnswer(inv -> inv.getArgument(0));

        VisitResponse response = visitService.updateVisit(50L, request);

        assertNotNull(response);
        assertEquals("I20.9", response.getDiagnosisCode());
        assertEquals("Cơn đau thắt ngực không đặc hiệu", response.getDiagnosisNote());
        assertEquals("Đau thắt ngực ổn định", response.getChiefComplaint());
    }

    @Test
    @DisplayName("Cập nhật thất bại khi ca khám đã hoàn tất")
    void testUpdateVisit_AlreadyCompleted_ThrowsException() {
        testVisit.setStatus(VisitStatus.COMPLETED);
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));

        UpdateVisitRequest request = UpdateVisitRequest.builder()
                .diagnosisCode("I10")
                .build();

        assertThrows(BusinessException.class, () -> visitService.updateVisit(50L, request));
    }

    @Test
    @DisplayName("Hoàn tất lượt khám – Cập nhật lịch hẹn và tạo tóm tắt EMR")
    void testCompleteVisit_Success() {
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(visitRepository.save(any(Visit.class))).thenAnswer(inv -> inv.getArgument(0));

        VisitResponse response = visitService.completeVisit(50L);

        assertNotNull(response);
        assertEquals(VisitStatus.COMPLETED, response.getStatus());
        assertEquals(AppointmentStatus.COMPLETED, testAppointment.getStatus());
        verify(appointmentRepository).save(testAppointment);
        verify(medicalRecordRepository).save(any(MedicalRecord.class));
    }

    @Test
    @DisplayName("Kê đơn thuốc thành công cho ca khám")
    void testCreatePrescription_Success() {
        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder()
                .items(List.of(
                        PrescriptionItemRequest.builder()
                                .drugId(1L)
                                .dosage("500mg")
                                .quantity(10)
                                .instruction("Uống 1 viên khi sốt > 38.5 độ")
                                .build()
                ))
                .build();

        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(drugRepository.findById(1L)).thenReturn(Optional.of(testDrug));
        when(prescriptionRepository.save(any(Prescription.class))).thenAnswer(inv -> {
            Prescription p = inv.getArgument(0);
            p.setId(200L);
            return p;
        });

        PrescriptionResponse response = visitService.createPrescription(50L, request);

        assertNotNull(response);
        assertEquals(200L, response.getId());
        assertEquals(1, response.getItems().size());
        assertEquals("Paracetamol 500mg", response.getItems().get(0).getDrugName());
        assertEquals(10, response.getItems().get(0).getQuantity());
        // 10 * 1500 = 15000
        assertEquals(BigDecimal.valueOf(15000), response.getEstimatedTotalAmount());
    }

    @Test
    @DisplayName("Kê đơn thuốc thất bại khi thuốc không tồn tại")
    void testCreatePrescription_DrugNotFound() {
        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder()
                .items(List.of(
                        PrescriptionItemRequest.builder()
                                .drugId(999L)
                                .dosage("500mg")
                                .quantity(2)
                                .build()
                ))
                .build();

        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(drugRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> visitService.createPrescription(50L, request));
    }

    @Test
    @DisplayName("Chỉ định cận lâm sàng thành công")
    void testCreateLabOrder_Success() {
        CreateLabOrderRequest request = CreateLabOrderRequest.builder()
                .testType("Điện tim 12 chuyển đạo (ECG)")
                .build();

        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(labOrderRepository.save(any(LabOrder.class))).thenAnswer(inv -> {
            LabOrder lo = inv.getArgument(0);
            lo.setId(300L);
            return lo;
        });

        LabOrderResponse response = visitService.createLabOrder(50L, request);

        assertNotNull(response);
        assertEquals(300L, response.getId());
        assertEquals("Điện tim 12 chuyển đạo (ECG)", response.getTestType());
    }

    @Test
    @DisplayName("Lọc danh sách ca khám có phân trang")
    void testGetAllVisits() {
        Pageable pageable = PageRequest.of(0, 10);
        when(visitRepository.filterVisits(1L, null, VisitStatus.IN_PROGRESS, pageable))
                .thenReturn(new PageImpl<>(List.of(testVisit), pageable, 1));

        Page<VisitResponse> result = visitService.getAllVisits(1L, null, VisitStatus.IN_PROGRESS, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(50L, result.getContent().get(0).getId());
    }

    @Test
    @DisplayName("Kê đơn thuốc có cảnh báo tương tác thuốc và dị ứng AI (Sprint 5)")
    void testCreatePrescription_WithAiSafetyWarnings() {
        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder()
                .items(List.of(
                        PrescriptionItemRequest.builder().drugId(1L).dosage("500mg").quantity(10).build()
                ))
                .build();

        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(drugRepository.findById(1L)).thenReturn(Optional.of(testDrug));
        when(prescriptionRepository.save(any(Prescription.class))).thenAnswer(inv -> {
            Prescription p = inv.getArgument(0);
            p.setId(205L);
            return p;
        });

        com.hospital.hmsai.ai.dto.PrescriptionSafetyResponse mockSafety =
                com.hospital.hmsai.ai.dto.PrescriptionSafetyResponse.builder()
                        .isSafe(false)
                        .hasWarning(true)
                        .hasCritical(true)
                        .interactionCount(1)
                        .allergyCount(0)
                        .interactions(List.of(
                                com.hospital.hmsai.ai.dto.DrugInteractionWarningDto.builder()
                                        .drugAName("Aspirin")
                                        .drugBName("Warfarin")
                                        .severity("CRITICAL")
                                        .description("Nguy cơ xuất huyết tiêu hóa nặng")
                                        .recommendation("Tránh phối hợp")
                                        .build()
                        ))
                        .disclaimer("Kết quả do AI phân tích chỉ mang tính tham khảo, không thay thế phán đoán lâm sàng của bác sĩ.")
                        .build();

        when(aiClinicalService.checkAndAuditPrescriptionSafety(eq(50L), anyList())).thenReturn(mockSafety);

        PrescriptionResponse response = visitService.createPrescription(50L, request);

        assertNotNull(response);
        assertEquals(205L, response.getId());
        assertTrue(response.getHasWarning());
        assertEquals(1, response.getInteractionWarnings().size());
        assertEquals("CRITICAL", response.getInteractionWarnings().get(0).getSeverity());
        assertNotNull(response.getAiDisclaimer());
        assertTrue(response.getAiDisclaimer().contains("tham khảo"));
        verify(aiClinicalService).checkAndAuditPrescriptionSafety(eq(50L), anyList());
    }
}
