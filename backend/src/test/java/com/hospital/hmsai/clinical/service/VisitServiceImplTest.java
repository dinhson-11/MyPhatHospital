package com.hospital.hmsai.clinical.service;

import com.hospital.hmsai.appointment.entity.Appointment;
import com.hospital.hmsai.appointment.entity.AppointmentStatus;
import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.clinical.dto.*;
import com.hospital.hmsai.clinical.entity.LabOrder;
import com.hospital.hmsai.clinical.entity.Prescription;
import com.hospital.hmsai.clinical.entity.PrescriptionItem;
import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.entity.VisitStatus;
import com.hospital.hmsai.clinical.repository.LabOrderRepository;
import com.hospital.hmsai.clinical.repository.PrescriptionRepository;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.clinical.safety.PrescriptionSafetyException;
import com.hospital.hmsai.clinical.service.impl.PrescriptionAiAuditor;
import com.hospital.hmsai.clinical.service.impl.VisitServiceImpl;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.entity.AllergySeverity;
import com.hospital.hmsai.patient.entity.MedicalRecord;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.entity.PatientAllergy;
import com.hospital.hmsai.patient.repository.MedicalRecordRepository;
import com.hospital.hmsai.patient.repository.PatientAllergyRepository;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.pharmacy.entity.DrugInteraction;
import com.hospital.hmsai.pharmacy.entity.InteractionSeverity;
import com.hospital.hmsai.pharmacy.repository.DrugInteractionRepository;
import com.hospital.hmsai.pharmacy.repository.DrugRepository;
import com.hospital.hmsai.user.entity.Role;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.entity.User;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

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
    private DrugInteractionRepository drugInteractionRepository;

    @Mock
    private PatientAllergyRepository patientAllergyRepository;

    @Mock
    private PrescriptionAiAuditor prescriptionAiAuditor;

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
                .username("bs.hung")
                .fullName("TS. BS. Nguyễn Văn Hùng")
                .roles(Set.of(Role.builder().id(2L).code("DOCTOR").name("Bác sĩ").build()))
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

    private void stubVisitStillInProgress() {
        when(visitRepository.touchIfStatus(eq(50L), eq(VisitStatus.IN_PROGRESS), any())).thenReturn(1);
    }

    private void stubSavePrescription(long id) {
        when(prescriptionRepository.save(any(Prescription.class))).thenAnswer(inv -> {
            Prescription p = inv.getArgument(0);
            p.setId(id);
            return p;
        });
    }

    private static PrescriptionItemRequest item(long drugId, int qty) {
        return PrescriptionItemRequest.builder().drugId(drugId).dosage("1 viên x 2 lần/ngày").quantity(qty).build();
    }

    private static Drug drug(long id, String name) {
        return Drug.builder().id(id).code("D-" + id).name(name).unit("Viên")
                .price(BigDecimal.valueOf(1000)).stockQuantity(100).build();
    }

    // ==================== CREATE VISIT ====================

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
                        .weight(70.0)
                        .height(170.0)
                        .build())
                .build();

        when(patientRepository.findById(1L)).thenReturn(Optional.of(testPatient));
        when(staffProfileRepository.findById(1L)).thenReturn(Optional.of(testDoctor));
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testAppointment));
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
        // BMI = 70 / 1.7² = 24.2 → Thừa cân (ngưỡng châu Á)
        assertEquals(24.2, response.getBmi());
        assertEquals("Thừa cân", response.getBmiCategory());

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
    @DisplayName("Tạo lượt khám thất bại khi nhân sự được chỉ định không có vai trò DOCTOR")
    void testCreateVisit_DoctorWithoutDoctorRole_Rejected() {
        testDoctor.getUser().setRoles(Set.of(Role.builder().code("NURSE").name("Điều dưỡng").build()));
        when(patientRepository.findById(1L)).thenReturn(Optional.of(testPatient));
        when(staffProfileRepository.findById(1L)).thenReturn(Optional.of(testDoctor));

        CreateVisitRequest request = CreateVisitRequest.builder().patientId(1L).doctorId(1L).build();

        BusinessException ex = assertThrows(BusinessException.class, () -> visitService.createVisit(request));
        assertTrue(ex.getMessage().contains("không phải bác sĩ"));
        verify(visitRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không bắt đầu khám từ lịch hẹn đã hủy")
    void testCreateVisit_CancelledAppointment_Rejected() {
        testAppointment.setStatus(AppointmentStatus.CANCELLED);
        when(patientRepository.findById(1L)).thenReturn(Optional.of(testPatient));
        when(staffProfileRepository.findById(1L)).thenReturn(Optional.of(testDoctor));
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testAppointment));

        CreateVisitRequest request = CreateVisitRequest.builder().patientId(1L).doctorId(1L).appointmentId(100L).build();

        assertThrows(BusinessException.class, () -> visitService.createVisit(request));
        verify(visitRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không bắt đầu khám khi bệnh nhân không khớp lịch hẹn")
    void testCreateVisit_PatientMismatch_Rejected() {
        Patient other = Patient.builder().id(2L).fullName("Người khác").build();
        when(patientRepository.findById(2L)).thenReturn(Optional.of(other));
        when(staffProfileRepository.findById(1L)).thenReturn(Optional.of(testDoctor));
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testAppointment));

        CreateVisitRequest request = CreateVisitRequest.builder().patientId(2L).doctorId(1L).appointmentId(100L).build();

        BusinessException ex = assertThrows(BusinessException.class, () -> visitService.createVisit(request));
        assertTrue(ex.getMessage().contains("Bệnh nhân không khớp"));
    }

    @Test
    @DisplayName("Không bắt đầu khám khi bác sĩ không khớp lịch hẹn")
    void testCreateVisit_DoctorMismatch_Rejected() {
        StaffProfile otherDoctor = StaffProfile.builder().id(2L).user(testDoctor.getUser()).build();
        when(patientRepository.findById(1L)).thenReturn(Optional.of(testPatient));
        when(staffProfileRepository.findById(2L)).thenReturn(Optional.of(otherDoctor));
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testAppointment));

        CreateVisitRequest request = CreateVisitRequest.builder().patientId(1L).doctorId(2L).appointmentId(100L).build();

        BusinessException ex = assertThrows(BusinessException.class, () -> visitService.createVisit(request));
        assertTrue(ex.getMessage().contains("Bác sĩ không khớp"));
    }

    @Test
    @DisplayName("Không tạo lượt khám thứ hai cho cùng một lịch hẹn")
    void testCreateVisit_SecondVisitForAppointment_Rejected() {
        when(patientRepository.findById(1L)).thenReturn(Optional.of(testPatient));
        when(staffProfileRepository.findById(1L)).thenReturn(Optional.of(testDoctor));
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(testAppointment));
        when(visitRepository.existsByAppointmentId(100L)).thenReturn(true);

        CreateVisitRequest request = CreateVisitRequest.builder().patientId(1L).doctorId(1L).appointmentId(100L).build();

        BusinessException ex = assertThrows(BusinessException.class, () -> visitService.createVisit(request));
        assertTrue(ex.getMessage().contains("đã có lượt khám"));
        assertEquals(AppointmentStatus.BOOKED, testAppointment.getStatus());
    }

    @Test
    @DisplayName("Không tạo lượt khám mới khi bệnh nhân còn lượt khám IN_PROGRESS")
    void testCreateVisit_PatientHasInProgressVisit_Rejected() {
        when(patientRepository.findById(1L)).thenReturn(Optional.of(testPatient));
        when(staffProfileRepository.findById(1L)).thenReturn(Optional.of(testDoctor));
        when(visitRepository.existsByPatientIdAndStatus(1L, VisitStatus.IN_PROGRESS)).thenReturn(true);

        CreateVisitRequest request = CreateVisitRequest.builder().patientId(1L).doctorId(1L).build();

        BusinessException ex = assertThrows(BusinessException.class, () -> visitService.createVisit(request));
        assertTrue(ex.getMessage().contains("chưa hoàn tất"));
        verify(visitRepository, never()).save(any());
    }

    // ==================== UPDATE VISIT ====================

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
    @DisplayName("Cập nhật sinh hiệu một phần giữ nguyên các chỉ số cũ (gộp, không ghi đè)")
    void testUpdateVisit_PartialVitals_MergedWithExisting() {
        testVisit.setVitalSigns("{\"pulse\":80,\"bloodPressureSystolic\":120,\"bloodPressureDiastolic\":80,\"temperature\":37.0}");
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(visitRepository.save(any(Visit.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateVisitRequest request = UpdateVisitRequest.builder()
                .vitalSigns(VitalSignsDto.builder().pulse(95).spO2(97).build())
                .build();

        VisitResponse response = visitService.updateVisit(50L, request, true);

        VitalSignsDto vitals = response.getVitalSigns();
        assertEquals(95, vitals.getPulse());
        assertEquals(97, vitals.getSpO2());
        assertEquals(120, vitals.getBloodPressureSystolic());
        assertEquals(80, vitals.getBloodPressureDiastolic());
        assertEquals(37.0, vitals.getTemperature());
    }

    @Test
    @DisplayName("Sinh hiệu sau khi gộp có tâm thu ≤ tâm trương bị từ chối")
    void testUpdateVisit_MergedBloodPressureInvalid_Rejected() {
        testVisit.setVitalSigns("{\"bloodPressureSystolic\":120,\"bloodPressureDiastolic\":80}");
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));

        UpdateVisitRequest request = UpdateVisitRequest.builder()
                .vitalSigns(VitalSignsDto.builder().bloodPressureDiastolic(130).build())
                .build();

        assertThrows(BusinessException.class, () -> visitService.updateVisit(50L, request));
        verify(visitRepository, never()).save(any());
    }

    @Test
    @DisplayName("Điều dưỡng (chỉ sinh hiệu) không được đổi chẩn đoán")
    void testUpdateVisit_VitalsOnly_ChangingDiagnosis_Denied() {
        testVisit.setDiagnosisCode("I10");
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));

        UpdateVisitRequest request = UpdateVisitRequest.builder().diagnosisCode("J00").build();

        assertThrows(AccessDeniedException.class, () -> visitService.updateVisit(50L, request, true));
        assertEquals("I10", testVisit.getDiagnosisCode());
        verify(visitRepository, never()).save(any());
    }

    @Test
    @DisplayName("Điều dưỡng gửi lại nguyên giá trị lâm sàng cũ kèm sinh hiệu – chấp nhận, chỉ lưu sinh hiệu")
    void testUpdateVisit_VitalsOnly_UnchangedClinicalFields_Allowed() {
        testVisit.setDiagnosisCode("I10");
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(visitRepository.save(any(Visit.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateVisitRequest request = UpdateVisitRequest.builder()
                .chiefComplaint("Đau ngực trái, hồi hộp")
                .diagnosisCode("I10")
                .vitalSigns(VitalSignsDto.builder().temperature(38.2).build())
                .build();

        VisitResponse response = visitService.updateVisit(50L, request, true);
        assertEquals(38.2, response.getVitalSigns().getTemperature());
        assertEquals("I10", response.getDiagnosisCode());
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

    // ==================== COMPLETE VISIT ====================

    @Test
    @DisplayName("Hoàn tất lượt khám – Cập nhật lịch hẹn và tạo tóm tắt EMR")
    void testCompleteVisit_Success() {
        testVisit.setDiagnosisCode("I20.9");
        testAppointment.setStatus(AppointmentStatus.CONFIRMED);
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        stubVisitStillInProgress();
        when(visitRepository.save(any(Visit.class))).thenAnswer(inv -> inv.getArgument(0));

        VisitResponse response = visitService.completeVisit(50L);

        assertNotNull(response);
        assertEquals(VisitStatus.COMPLETED, response.getStatus());
        assertEquals(AppointmentStatus.COMPLETED, testAppointment.getStatus());
        verify(appointmentRepository).save(testAppointment);
        verify(medicalRecordRepository).save(any(MedicalRecord.class));
    }

    @Test
    @DisplayName("Không hoàn tất lượt khám khi chưa có mã chẩn đoán")
    void testCompleteVisit_MissingDiagnosis_Rejected() {
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));

        BusinessException ex = assertThrows(BusinessException.class, () -> visitService.completeVisit(50L));
        assertTrue(ex.getMessage().contains("chẩn đoán"));
        assertEquals(VisitStatus.IN_PROGRESS, testVisit.getStatus());
        verify(medicalRecordRepository, never()).save(any());
    }

    @Test
    @DisplayName("Hoàn tất lượt khám không đổi trạng thái lịch hẹn ngoài CONFIRMED")
    void testCompleteVisit_AppointmentNotConfirmed_NotTouched() {
        testVisit.setDiagnosisCode("I10");
        testAppointment.setStatus(AppointmentStatus.CANCELLED);
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        stubVisitStillInProgress();
        when(visitRepository.save(any(Visit.class))).thenAnswer(inv -> inv.getArgument(0));

        visitService.completeVisit(50L);

        assertEquals(AppointmentStatus.CANCELLED, testAppointment.getStatus());
        verify(appointmentRepository, never()).save(any());
    }

    // ==================== PRESCRIPTION ====================

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
        stubVisitStillInProgress();
        stubSavePrescription(200L);

        PrescriptionResponse response = visitService.createPrescription(50L, request);

        assertNotNull(response);
        assertEquals(200L, response.getId());
        assertEquals(1, response.getItems().size());
        assertEquals("Paracetamol 500mg", response.getItems().get(0).getDrugName());
        assertEquals(10, response.getItems().get(0).getQuantity());
        // 10 * 1500 = 15000
        assertEquals(BigDecimal.valueOf(15000), response.getEstimatedTotalAmount());
        assertNull(response.getOverrideReason());
    }

    @Test
    @DisplayName("Kê đơn thuốc thất bại khi thuốc không tồn tại")
    void testCreatePrescription_DrugNotFound() {
        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder()
                .items(List.of(item(999L, 2)))
                .build();

        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(drugRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> visitService.createPrescription(50L, request));
        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không kê đơn cho lượt khám đã hoàn tất")
    void testCreatePrescription_CompletedVisit_Rejected() {
        testVisit.setStatus(VisitStatus.COMPLETED);
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));

        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder().items(List.of(item(1L, 1))).build();

        BusinessException ex = assertThrows(BusinessException.class, () -> visitService.createPrescription(50L, request));
        assertTrue(ex.getMessage().contains("đã hoàn tất"));
        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Lượt khám vừa được hoàn tất đồng thời → từ chối kê đơn (khóa dòng visits)")
    void testCreatePrescription_VisitCompletedConcurrently_Rejected() {
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(drugRepository.findById(1L)).thenReturn(Optional.of(testDrug));
        when(visitRepository.touchIfStatus(eq(50L), eq(VisitStatus.IN_PROGRESS), any())).thenReturn(0);

        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder().items(List.of(item(1L, 1))).build();

        assertThrows(BusinessException.class, () -> visitService.createPrescription(50L, request));
        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không cho phép một thuốc xuất hiện 2 dòng trong cùng đơn")
    void testCreatePrescription_DuplicateDrugLines_Rejected() {
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder()
                .items(List.of(item(1L, 5), item(1L, 5)))
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () -> visitService.createPrescription(50L, request));
        assertTrue(ex.getMessage().contains("lặp lại"));
        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Số lượng thuốc phải ≥ 1")
    void testCreatePrescription_ZeroQuantity_Rejected() {
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder().items(List.of(item(1L, 0))).build();

        assertThrows(BusinessException.class, () -> visitService.createPrescription(50L, request));
        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không kê thuốc đã hết hạn (hạn dùng ≤ hôm nay)")
    void testCreatePrescription_ExpiredDrug_Rejected() {
        testDrug.setExpiryDate(LocalDate.now());
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(drugRepository.findById(1L)).thenReturn(Optional.of(testDrug));

        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder().items(List.of(item(1L, 2))).build();

        BusinessException ex = assertThrows(BusinessException.class, () -> visitService.createPrescription(50L, request));
        assertTrue(ex.getMessage().contains("hết hạn"));
        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Tương tác thuốc SEVERE chưa có lý do xác nhận → chặn trước khi lưu (PRESCRIPTION_SAFETY_BLOCK)")
    void testCreatePrescription_SevereInteraction_BlockedWithoutOverride() {
        Drug aspirin = drug(3L, "Aspirin 81mg");
        Drug warfarin = drug(4L, "Warfarin 5mg");
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(drugRepository.findById(3L)).thenReturn(Optional.of(aspirin));
        when(drugRepository.findById(4L)).thenReturn(Optional.of(warfarin));
        when(drugInteractionRepository.findInteractionsAmongDrugs(any())).thenReturn(List.of(
                DrugInteraction.builder().drugA(aspirin).drugB(warfarin)
                        .severity(InteractionSeverity.SEVERE).description("Tăng nguy cơ xuất huyết").build()));

        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder()
                .items(List.of(item(3L, 10), item(4L, 10)))
                .build();

        PrescriptionSafetyException ex = assertThrows(PrescriptionSafetyException.class,
                () -> visitService.createPrescription(50L, request));
        assertEquals(1, ex.getWarnings().size());
        assertTrue(ex.getWarnings().get(0).contains("Aspirin 81mg"));
        assertTrue(ex.getWarnings().get(0).contains("Warfarin 5mg"));
        verify(prescriptionRepository, never()).save(any());
        verify(prescriptionAiAuditor, never()).checkAndAudit(any(), any());
    }

    @Test
    @DisplayName("Tương tác SEVERE có lý do xác nhận → lưu đơn kèm overrideReason")
    void testCreatePrescription_SevereInteraction_WithOverride_Saved() {
        Drug aspirin = drug(3L, "Aspirin 81mg");
        Drug warfarin = drug(4L, "Warfarin 5mg");
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(drugRepository.findById(3L)).thenReturn(Optional.of(aspirin));
        when(drugRepository.findById(4L)).thenReturn(Optional.of(warfarin));
        when(drugInteractionRepository.findInteractionsAmongDrugs(any())).thenReturn(List.of(
                DrugInteraction.builder().drugA(aspirin).drugB(warfarin).severity(InteractionSeverity.SEVERE).build()));
        stubVisitStillInProgress();
        stubSavePrescription(201L);

        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder()
                .items(List.of(item(3L, 10), item(4L, 10)))
                .overrideReason("  Đã hội chẩn, theo dõi INR hằng tuần  ")
                .build();

        PrescriptionResponse response = visitService.createPrescription(50L, request);

        ArgumentCaptor<Prescription> captor = ArgumentCaptor.forClass(Prescription.class);
        verify(prescriptionRepository).save(captor.capture());
        assertEquals("Đã hội chẩn, theo dõi INR hằng tuần", captor.getValue().getOverrideReason());
        assertEquals("Đã hội chẩn, theo dõi INR hằng tuần", response.getOverrideReason());
        assertTrue(response.getHasWarning());
    }

    @Test
    @DisplayName("Tương tác SEVERE với thuốc đã kê trước đó trong cùng lượt khám cũng bị chặn")
    void testCreatePrescription_InteractionWithExistingPrescription_Blocked() {
        Drug aspirin = drug(3L, "Aspirin 81mg");
        Drug warfarin = drug(4L, "Warfarin 5mg");
        Prescription existing = Prescription.builder().id(150L).visit(testVisit).items(new ArrayList<>()).build();
        existing.addItem(PrescriptionItem.builder().drug(aspirin).quantity(10).build());

        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(drugRepository.findById(4L)).thenReturn(Optional.of(warfarin));
        when(prescriptionRepository.findByVisitIdWithItems(50L)).thenReturn(List.of(existing));
        when(drugInteractionRepository.findInteractionsAmongDrugs(any())).thenReturn(List.of(
                DrugInteraction.builder().drugA(aspirin).drugB(warfarin).severity(InteractionSeverity.SEVERE).build()));

        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder().items(List.of(item(4L, 10))).build();

        assertThrows(PrescriptionSafetyException.class, () -> visitService.createPrescription(50L, request));
        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Tương tác mức MODERATE không chặn kê đơn")
    void testCreatePrescription_ModerateInteraction_NotBlocked() {
        Drug a = drug(3L, "Thuốc A");
        Drug b = drug(4L, "Thuốc B");
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(drugRepository.findById(3L)).thenReturn(Optional.of(a));
        when(drugRepository.findById(4L)).thenReturn(Optional.of(b));
        when(drugInteractionRepository.findInteractionsAmongDrugs(any())).thenReturn(List.of(
                DrugInteraction.builder().drugA(a).drugB(b).severity(InteractionSeverity.MODERATE).build()));
        stubVisitStillInProgress();
        stubSavePrescription(202L);

        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder()
                .items(List.of(item(3L, 1), item(4L, 1)))
                .build();

        assertEquals(202L, visitService.createPrescription(50L, request).getId());
    }

    @Test
    @DisplayName("Dị ứng Penicillin (SEVERE) – kê Amoxicillin bị chặn (dị ứng chéo cùng nhóm)")
    void testCreatePrescription_PenicillinAllergy_BlocksAmoxicillin() {
        Drug amoxicillin = drug(7L, "Amoxicillin 500mg");
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(drugRepository.findById(7L)).thenReturn(Optional.of(amoxicillin));
        when(patientAllergyRepository.findByPatientId(1L)).thenReturn(List.of(
                PatientAllergy.builder().id(1L).allergen("Penicillin").severity(AllergySeverity.SEVERE).build()));

        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder().items(List.of(item(7L, 14))).build();

        PrescriptionSafetyException ex = assertThrows(PrescriptionSafetyException.class,
                () -> visitService.createPrescription(50L, request));
        assertTrue(ex.getWarnings().get(0).contains("Penicillin"));
        assertTrue(ex.getWarnings().get(0).contains("Amoxicillin 500mg"));
        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Dị ứng ghi tiếng Việt có dấu/không dấu vẫn khớp tên thuốc (MODERATE → chặn)")
    void testCreatePrescription_DiacriticInsensitiveAllergyMatch_Blocked() {
        Drug ibuprofen = drug(8L, "Ibuprofen 400mg");
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(drugRepository.findById(8L)).thenReturn(Optional.of(ibuprofen));
        when(patientAllergyRepository.findByPatientId(1L)).thenReturn(List.of(
                PatientAllergy.builder().id(2L).allergen("Thuốc kháng viêm không steroid (NSAID)")
                        .severity(AllergySeverity.MODERATE).build()));

        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder().items(List.of(item(8L, 10))).build();

        assertThrows(PrescriptionSafetyException.class, () -> visitService.createPrescription(50L, request));
    }

    @Test
    @DisplayName("Dị ứng mức MILD chỉ mang tính tham khảo – không chặn kê đơn")
    void testCreatePrescription_MildAllergy_NotBlocked() {
        Drug amoxicillin = drug(7L, "Amoxicillin 500mg");
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(drugRepository.findById(7L)).thenReturn(Optional.of(amoxicillin));
        when(patientAllergyRepository.findByPatientId(1L)).thenReturn(List.of(
                PatientAllergy.builder().id(1L).allergen("Amoxicillin").severity(AllergySeverity.MILD).build()));
        stubVisitStillInProgress();
        stubSavePrescription(203L);

        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder().items(List.of(item(7L, 14))).build();

        assertEquals(203L, visitService.createPrescription(50L, request).getId());
    }

    @Test
    @DisplayName("Lỗi từ AI không làm hỏng việc kê đơn (lỗi được cô lập)")
    void testCreatePrescription_AiFailure_Contained() {
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(drugRepository.findById(1L)).thenReturn(Optional.of(testDrug));
        when(prescriptionAiAuditor.checkAndAudit(eq(50L), anyList())).thenThrow(new RuntimeException("AI service down"));
        stubVisitStillInProgress();
        stubSavePrescription(204L);

        CreatePrescriptionRequest request = CreatePrescriptionRequest.builder().items(List.of(item(1L, 2))).build();

        PrescriptionResponse response = visitService.createPrescription(50L, request);
        assertEquals(204L, response.getId());
        assertFalse(response.getHasWarning());
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
        stubVisitStillInProgress();
        stubSavePrescription(205L);

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

        when(prescriptionAiAuditor.checkAndAudit(eq(50L), anyList())).thenReturn(mockSafety);

        PrescriptionResponse response = visitService.createPrescription(50L, request);

        assertNotNull(response);
        assertEquals(205L, response.getId());
        assertTrue(response.getHasWarning());
        assertEquals(1, response.getInteractionWarnings().size());
        assertEquals("CRITICAL", response.getInteractionWarnings().get(0).getSeverity());
        assertNotNull(response.getAiDisclaimer());
        assertTrue(response.getAiDisclaimer().contains("tham khảo"));
        verify(prescriptionAiAuditor).checkAndAudit(eq(50L), anyList());
    }

    // ==================== LAB ORDER ====================

    @Test
    @DisplayName("Chỉ định cận lâm sàng thành công")
    void testCreateLabOrder_Success() {
        CreateLabOrderRequest request = CreateLabOrderRequest.builder()
                .testType("Điện tim 12 chuyển đạo (ECG)")
                .build();

        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        stubVisitStillInProgress();
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
    @DisplayName("Không chỉ định cận lâm sàng cho lượt khám đã hoàn tất")
    void testCreateLabOrder_CompletedVisit_Rejected() {
        testVisit.setStatus(VisitStatus.COMPLETED);
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));

        CreateLabOrderRequest request = CreateLabOrderRequest.builder().testType("Công thức máu").build();

        assertThrows(BusinessException.class, () -> visitService.createLabOrder(50L, request));
        verify(labOrderRepository, never()).save(any());
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
}
