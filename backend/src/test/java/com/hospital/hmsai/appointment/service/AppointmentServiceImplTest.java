package com.hospital.hmsai.appointment.service;

import com.hospital.hmsai.appointment.dto.AppointmentResponse;
import com.hospital.hmsai.appointment.dto.AvailableSlotsResponse;
import com.hospital.hmsai.appointment.dto.CreateAppointmentRequest;
import com.hospital.hmsai.appointment.dto.UpdateAppointmentStatusRequest;
import com.hospital.hmsai.appointment.entity.Appointment;
import com.hospital.hmsai.appointment.entity.AppointmentSource;
import com.hospital.hmsai.appointment.entity.AppointmentStatus;
import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.appointment.service.impl.AppointmentServiceImpl;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.user.entity.Department;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.entity.User;
import com.hospital.hmsai.user.repository.DepartmentRepository;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit test cho AppointmentServiceImpl.
 * Kiểm tra nghiệp vụ đặt lịch, kiểm tra trùng lịch, lấy khung giờ trống và chuyển đổi trạng thái.
 */
@ExtendWith(MockitoExtension.class)
class AppointmentServiceImplTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private StaffProfileRepository staffProfileRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @InjectMocks
    private AppointmentServiceImpl appointmentService;

    private Patient testPatient;
    private StaffProfile testDoctor;
    private Department testDept;
    private LocalDateTime testTime;

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

        testDept = Department.builder()
                .id(5L)
                .name("Khoa Tim mạch")
                .build();

        testDoctor = StaffProfile.builder()
                .id(1L)
                .user(doctorUser)
                .department(testDept)
                .specialty("Tim mạch")
                .build();

        testTime = LocalDateTime.of(2026, 10, 1, 8, 30);
    }

    // ==================== CREATE & CONFLICT CHECK ====================

    @Test
    @DisplayName("Đặt lịch thành công – không trùng lịch")
    void createAppointment_Success() {
        // Given
        CreateAppointmentRequest request = CreateAppointmentRequest.builder()
                .patientId(1L)
                .doctorId(1L)
                .departmentId(5L)
                .scheduledAt(testTime)
                .symptom("Đau thắt ngực nhẹ")
                .notes("Khám buổi sáng")
                .source(AppointmentSource.PATIENT)
                .build();

        when(patientRepository.findById(1L)).thenReturn(Optional.of(testPatient));
        when(staffProfileRepository.findById(1L)).thenReturn(Optional.of(testDoctor));
        when(departmentRepository.findById(5L)).thenReturn(Optional.of(testDept));
        when(appointmentRepository.existsByDoctorIdAndScheduledAtAndStatusNotCancelled(1L, testTime))
                .thenReturn(false);

        Appointment savedAppointment = Appointment.builder()
                .id(100L)
                .patient(testPatient)
                .doctor(testDoctor)
                .department(testDept)
                .scheduledAt(testTime)
                .status(AppointmentStatus.BOOKED)
                .source(AppointmentSource.PATIENT)
                .symptom("Đau thắt ngực nhẹ")
                .notes("Khám buổi sáng")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(appointmentRepository.save(any(Appointment.class))).thenReturn(savedAppointment);

        // When
        AppointmentResponse response = appointmentService.create(request);

        // Then
        assertNotNull(response);
        assertEquals(100L, response.getId());
        assertEquals(1L, response.getPatientId());
        assertEquals("Trần Đức Minh", response.getPatientName());
        assertEquals("BN-260928-001", response.getPatientCode());
        assertEquals("TS. BS. Nguyễn Văn Hùng", response.getDoctorName());
        assertEquals("Khoa Tim mạch", response.getDepartmentName());
        assertEquals(AppointmentStatus.BOOKED, response.getStatus());

        verify(appointmentRepository).save(any(Appointment.class));
    }

    @Test
    @DisplayName("Đặt lịch thất bại do bác sĩ đã có lịch (trùng giờ)")
    void createAppointment_DoctorConflict_ThrowsBusinessException() {
        // Given
        CreateAppointmentRequest request = CreateAppointmentRequest.builder()
                .patientId(1L)
                .doctorId(1L)
                .departmentId(5L)
                .scheduledAt(testTime)
                .build();

        when(patientRepository.findById(1L)).thenReturn(Optional.of(testPatient));
        when(staffProfileRepository.findById(1L)).thenReturn(Optional.of(testDoctor));
        when(departmentRepository.findById(5L)).thenReturn(Optional.of(testDept));
        when(appointmentRepository.existsByDoctorIdAndScheduledAtAndStatusNotCancelled(1L, testTime))
                .thenReturn(true);

        // When & Then
        BusinessException ex = assertThrows(BusinessException.class,
                () -> appointmentService.create(request));
        assertTrue(ex.getMessage().contains("Bác sĩ đã có lịch hẹn vào thời gian này"));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đặt lịch thất bại – Không tìm thấy bệnh nhân")
    void createAppointment_PatientNotFound_ThrowsException() {
        CreateAppointmentRequest request = CreateAppointmentRequest.builder()
                .patientId(999L)
                .doctorId(1L)
                .scheduledAt(testTime)
                .build();

        when(patientRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> appointmentService.create(request));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đặt lịch thất bại – Không tìm thấy bác sĩ")
    void createAppointment_DoctorNotFound_ThrowsException() {
        CreateAppointmentRequest request = CreateAppointmentRequest.builder()
                .patientId(1L)
                .doctorId(999L)
                .scheduledAt(testTime)
                .build();

        when(patientRepository.findById(1L)).thenReturn(Optional.of(testPatient));
        when(staffProfileRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> appointmentService.create(request));
        verify(appointmentRepository, never()).save(any());
    }

    // ==================== GET BY ID & MY APPOINTMENTS ====================

    @Test
    @DisplayName("Lấy chi tiết lịch hẹn theo ID thành công")
    void getById_Success() {
        Appointment appointment = Appointment.builder()
                .id(100L)
                .patient(testPatient)
                .doctor(testDoctor)
                .department(testDept)
                .scheduledAt(testTime)
                .status(AppointmentStatus.BOOKED)
                .build();

        when(appointmentRepository.findById(100L)).thenReturn(Optional.of(appointment));

        AppointmentResponse response = appointmentService.getById(100L);

        assertNotNull(response);
        assertEquals(100L, response.getId());
        assertEquals("Trần Đức Minh", response.getPatientName());
    }

    @Test
    @DisplayName("Lấy chi tiết lịch hẹn không tồn tại – ném lỗi 404")
    void getById_NotFound_ThrowsException() {
        when(appointmentRepository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> appointmentService.getById(999L));
    }

    @Test
    @DisplayName("Lấy danh sách lịch hẹn của bệnh nhân hiện tại qua userId")
    void getMyAppointments_Success() {
        Appointment appointment = Appointment.builder()
                .id(100L)
                .patient(testPatient)
                .doctor(testDoctor)
                .department(testDept)
                .scheduledAt(testTime)
                .status(AppointmentStatus.BOOKED)
                .build();

        Pageable pageable = PageRequest.of(0, 10);
        Page<Appointment> page = new PageImpl<>(List.of(appointment), pageable, 1);

        when(appointmentRepository.findByPatientUserId(eq(50L), eq(pageable))).thenReturn(page);

        Page<AppointmentResponse> result = appointmentService.getMyAppointments(50L, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(100L, result.getContent().get(0).getId());
    }

    // ==================== STATUS TRANSITIONS ====================

    @Test
    @DisplayName("Xác nhận lịch hẹn thành công (BOOKED -> CONFIRMED)")
    void confirmAppointment_Success() {
        Appointment appointment = Appointment.builder()
                .id(100L)
                .patient(testPatient)
                .doctor(testDoctor)
                .department(testDept)
                .scheduledAt(testTime)
                .status(AppointmentStatus.BOOKED)
                .build();

        when(appointmentRepository.findById(100L)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppointmentResponse response = appointmentService.confirm(100L);

        assertNotNull(response);
        assertEquals(AppointmentStatus.CONFIRMED, response.getStatus());
    }

    @Test
    @DisplayName("Xác nhận lịch hẹn thất bại nếu lịch đã bị hủy")
    void confirmAppointment_AlreadyCancelled_ThrowsException() {
        Appointment appointment = Appointment.builder()
                .id(100L)
                .status(AppointmentStatus.CANCELLED)
                .build();

        when(appointmentRepository.findById(100L)).thenReturn(Optional.of(appointment));

        assertThrows(BusinessException.class, () -> appointmentService.confirm(100L));
    }

    @Test
    @DisplayName("Hủy lịch hẹn thành công kèm lý do")
    void cancelAppointment_Success() {
        Appointment appointment = Appointment.builder()
                .id(100L)
                .patient(testPatient)
                .doctor(testDoctor)
                .scheduledAt(testTime)
                .status(AppointmentStatus.CONFIRMED)
                .notes("Ghi chú ban đầu")
                .build();

        when(appointmentRepository.findById(100L)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppointmentResponse response = appointmentService.cancel(100L, "Bận việc đột xuất");

        assertNotNull(response);
        assertEquals(AppointmentStatus.CANCELLED, response.getStatus());
        assertTrue(response.getNotes().contains("Lý do hủy: Bận việc đột xuất"));
    }

    @Test
    @DisplayName("Hủy lịch thất bại nếu lịch đã hoàn tất khám")
    void cancelAppointment_AlreadyCompleted_ThrowsException() {
        Appointment appointment = Appointment.builder()
                .id(100L)
                .status(AppointmentStatus.COMPLETED)
                .build();

        when(appointmentRepository.findById(100L)).thenReturn(Optional.of(appointment));

        assertThrows(BusinessException.class, () -> appointmentService.cancel(100L, "Muốn hủy"));
    }

    @Test
    @DisplayName("Hoàn tất lượt khám thành công (CONFIRMED -> COMPLETED)")
    void completeAppointment_Success() {
        Appointment appointment = Appointment.builder()
                .id(100L)
                .patient(testPatient)
                .doctor(testDoctor)
                .scheduledAt(testTime)
                .status(AppointmentStatus.CONFIRMED)
                .build();

        when(appointmentRepository.findById(100L)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppointmentResponse response = appointmentService.complete(100L);

        assertNotNull(response);
        assertEquals(AppointmentStatus.COMPLETED, response.getStatus());
    }

    @Test
    @DisplayName("Cập nhật trạng thái qua UpdateAppointmentStatusRequest")
    void updateStatus_ViaDto_Success() {
        Appointment appointment = Appointment.builder()
                .id(100L)
                .patient(testPatient)
                .doctor(testDoctor)
                .scheduledAt(testTime)
                .status(AppointmentStatus.BOOKED)
                .build();

        when(appointmentRepository.findById(100L)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateAppointmentStatusRequest req = UpdateAppointmentStatusRequest.builder()
                .status(AppointmentStatus.CONFIRMED)
                .build();

        AppointmentResponse response = appointmentService.updateStatus(100L, req);
        assertEquals(AppointmentStatus.CONFIRMED, response.getStatus());
    }

    // ==================== AVAILABLE SLOTS ====================

    @Test
    @DisplayName("Lấy khung giờ trống – lọc đúng ca đã được đặt")
    void getAvailableSlots_Success() {
        LocalDate checkDate = LocalDate.of(2026, 10, 5);

        when(staffProfileRepository.findById(1L)).thenReturn(Optional.of(testDoctor));

        // Giả sử bác sĩ đã có 1 lịch lúc 08:30
        Appointment bookedAppointment = Appointment.builder()
                .id(50L)
                .doctor(testDoctor)
                .scheduledAt(LocalDateTime.of(checkDate, LocalTime.of(8, 30)))
                .status(AppointmentStatus.CONFIRMED)
                .build();

        when(appointmentRepository.findByDoctorIdAndTimeRange(eq(1L), any(), any()))
                .thenReturn(List.of(bookedAppointment));

        AvailableSlotsResponse response = appointmentService.getAvailableSlots(1L, checkDate);

        assertNotNull(response);
        assertEquals(1L, response.getDoctorId());
        assertEquals("TS. BS. Nguyễn Văn Hùng", response.getDoctorName());
        assertEquals(checkDate, response.getDate());

        // 05/10/2026 là mùa hè: sáng 07:00-11:00 (8 ca) + chiều 13:00-17:30 (9 ca) = 17 khung giờ
        assertEquals(16, response.getAvailableSlots().size());
        assertEquals(1, response.getBookedSlots().size());

        // Khung giờ 08:30 phải nằm trong bookedSlots
        assertEquals(LocalTime.of(8, 30), response.getBookedSlots().get(0).getStartTime());
        assertFalse(response.getBookedSlots().get(0).isAvailable());
    }
}
