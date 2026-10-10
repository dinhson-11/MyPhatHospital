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
import com.hospital.hmsai.clinical.entity.VisitStatus;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.common.WorkingHours;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.user.entity.Department;
import com.hospital.hmsai.user.entity.Role;
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
import java.util.Set;

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

    @Mock
    private VisitRepository visitRepository;

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
                .roles(Set.of(Role.builder().id(2L).code("DOCTOR").name("Bác sĩ").build()))
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

        // Luôn là một khung giờ hợp lệ trong tương lai (08:30 hợp lệ cả mùa hè lẫn mùa đông)
        testTime = LocalDate.now().plusDays(7).atTime(8, 30);
    }

    private Appointment appointment(AppointmentStatus status, LocalDateTime scheduledAt) {
        return Appointment.builder()
                .id(100L)
                .patient(testPatient)
                .doctor(testDoctor)
                .department(testDept)
                .scheduledAt(scheduledAt)
                .status(status)
                .build();
    }

    private UpdateAppointmentStatusRequest statusRequest(AppointmentStatus status) {
        return UpdateAppointmentStatusRequest.builder().status(status).build();
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
        when(appointmentRepository.lockStaffProfileById(1L)).thenReturn(Optional.of(testDoctor));
        when(departmentRepository.findById(5L)).thenReturn(Optional.of(testDept));
        when(appointmentRepository.findActiveByDoctorAndScheduledAtForUpdate(1L, testTime)).thenReturn(List.of());

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
        when(appointmentRepository.lockStaffProfileById(1L)).thenReturn(Optional.of(testDoctor));
        when(departmentRepository.findById(5L)).thenReturn(Optional.of(testDept));
        when(appointmentRepository.findActiveByDoctorAndScheduledAtForUpdate(1L, testTime))
                .thenReturn(List.of(appointment(AppointmentStatus.BOOKED, testTime)));

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
        when(appointmentRepository.lockStaffProfileById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> appointmentService.create(request));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đặt lịch thất bại – thời điểm trong quá khứ")
    void createAppointment_PastTime_Rejected() {
        CreateAppointmentRequest request = CreateAppointmentRequest.builder()
                .patientId(1L).doctorId(1L)
                .scheduledAt(LocalDate.now().minusDays(1).atTime(8, 30))
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () -> appointmentService.create(request));
        assertTrue(ex.getMessage().contains("tương lai"));
        verifyNoInteractions(patientRepository);
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đặt lịch thất bại – ngoài khung giờ khám (12:00 nghỉ trưa)")
    void createAppointment_InvalidSlot_Rejected() {
        CreateAppointmentRequest request = CreateAppointmentRequest.builder()
                .patientId(1L).doctorId(1L)
                .scheduledAt(LocalDate.now().plusDays(3).atTime(12, 0))
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () -> appointmentService.create(request));
        assertTrue(ex.getMessage().contains("Giờ khám không hợp lệ"));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đặt lịch thất bại – nhân sự được chọn không phải bác sĩ")
    void createAppointment_NotADoctor_Rejected() {
        testDoctor.getUser().setRoles(Set.of(Role.builder().code("PHARMACIST").name("Dược sĩ").build()));
        CreateAppointmentRequest request = CreateAppointmentRequest.builder()
                .patientId(1L).doctorId(1L).scheduledAt(testTime).build();

        when(patientRepository.findById(1L)).thenReturn(Optional.of(testPatient));
        when(appointmentRepository.lockStaffProfileById(1L)).thenReturn(Optional.of(testDoctor));

        BusinessException ex = assertThrows(BusinessException.class, () -> appointmentService.create(request));
        assertTrue(ex.getMessage().contains("không phải bác sĩ"));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đặt lịch thất bại – bệnh nhân đã có lịch khác cùng thời điểm")
    void createAppointment_PatientDoubleBooked_Rejected() {
        CreateAppointmentRequest request = CreateAppointmentRequest.builder()
                .patientId(1L).doctorId(1L).scheduledAt(testTime).build();

        when(patientRepository.findById(1L)).thenReturn(Optional.of(testPatient));
        when(appointmentRepository.lockStaffProfileById(1L)).thenReturn(Optional.of(testDoctor));
        when(appointmentRepository.findActiveByDoctorAndScheduledAtForUpdate(1L, testTime)).thenReturn(List.of());
        when(appointmentRepository.existsByPatientIdAndScheduledAtAndStatusNot(1L, testTime, AppointmentStatus.CANCELLED))
                .thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () -> appointmentService.create(request));
        assertTrue(ex.getMessage().contains("Bệnh nhân đã có lịch hẹn khác"));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Lễ tân không gửi patientId → lỗi nghiệp vụ")
    void createAppointment_MissingPatientId_Rejected() {
        CreateAppointmentRequest request = CreateAppointmentRequest.builder().doctorId(1L).scheduledAt(testTime).build();
        assertThrows(BusinessException.class, () -> appointmentService.create(request));
    }

    // ==================== GET BY ID & MY APPOINTMENTS ====================

    @Test
    @DisplayName("Lấy chi tiết lịch hẹn theo ID thành công")
    void getById_Success() {
        when(appointmentRepository.findById(100L)).thenReturn(Optional.of(appointment(AppointmentStatus.BOOKED, testTime)));

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
        Pageable pageable = PageRequest.of(0, 10);
        Page<Appointment> page = new PageImpl<>(List.of(appointment(AppointmentStatus.BOOKED, testTime)), pageable, 1);

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
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(appointment(AppointmentStatus.BOOKED, testTime)));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppointmentResponse response = appointmentService.confirm(100L);

        assertNotNull(response);
        assertEquals(AppointmentStatus.CONFIRMED, response.getStatus());
    }

    @Test
    @DisplayName("Xác nhận lịch hẹn thất bại nếu lịch đã bị hủy")
    void confirmAppointment_AlreadyCancelled_ThrowsException() {
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(appointment(AppointmentStatus.CANCELLED, testTime)));

        assertThrows(BusinessException.class, () -> appointmentService.confirm(100L));
    }

    @Test
    @DisplayName("Không xác nhận lại lịch đã đánh dấu vắng mặt (NO_SHOW -> CONFIRMED)")
    void confirmAppointment_FromNoShow_Rejected() {
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(appointment(AppointmentStatus.NO_SHOW, testTime)));

        assertThrows(BusinessException.class, () -> appointmentService.confirm(100L));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Hủy lịch hẹn thành công kèm lý do")
    void cancelAppointment_Success() {
        Appointment appointment = appointment(AppointmentStatus.CONFIRMED, testTime);
        appointment.setNotes("Ghi chú ban đầu");

        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppointmentResponse response = appointmentService.cancel(100L, "Bận việc đột xuất");

        assertNotNull(response);
        assertEquals(AppointmentStatus.CANCELLED, response.getStatus());
        assertTrue(response.getNotes().contains("Lý do hủy: Bận việc đột xuất"));
    }

    @Test
    @DisplayName("Hủy lịch thất bại nếu lịch đã hoàn tất khám")
    void cancelAppointment_AlreadyCompleted_ThrowsException() {
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(appointment(AppointmentStatus.COMPLETED, testTime)));

        assertThrows(BusinessException.class, () -> appointmentService.cancel(100L, "Muốn hủy"));
    }

    @Test
    @DisplayName("Không hủy lịch đã đánh dấu vắng mặt (NO_SHOW -> CANCELLED)")
    void cancelAppointment_FromNoShow_Rejected() {
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(appointment(AppointmentStatus.NO_SHOW, testTime)));

        assertThrows(BusinessException.class, () -> appointmentService.cancel(100L, "Hủy"));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không hủy lịch khi bệnh nhân đang trong lượt khám (visit IN_PROGRESS)")
    void cancelAppointment_WithInProgressVisit_Rejected() {
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(appointment(AppointmentStatus.CONFIRMED, testTime)));
        when(visitRepository.existsByAppointmentIdAndStatus(100L, VisitStatus.IN_PROGRESS)).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () -> appointmentService.cancel(100L, "Hủy"));
        assertTrue(ex.getMessage().contains("đang trong lượt khám"));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Hoàn tất lịch hẹn thành công (CONFIRMED -> COMPLETED) khi lượt khám đã hoàn tất")
    void completeAppointment_Success() {
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(appointment(AppointmentStatus.CONFIRMED, testTime)));
        when(visitRepository.existsByAppointmentIdAndStatus(100L, VisitStatus.COMPLETED)).thenReturn(true);
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppointmentResponse response = appointmentService.complete(100L);

        assertNotNull(response);
        assertEquals(AppointmentStatus.COMPLETED, response.getStatus());
    }

    @Test
    @DisplayName("Không hoàn tất lịch hẹn khi chưa có lượt khám hoàn tất")
    void completeAppointment_WithoutCompletedVisit_Rejected() {
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(appointment(AppointmentStatus.CONFIRMED, testTime)));
        when(visitRepository.existsByAppointmentIdAndStatus(100L, VisitStatus.COMPLETED)).thenReturn(false);

        assertThrows(BusinessException.class, () -> appointmentService.complete(100L));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không hoàn tất trực tiếp lịch BOOKED / NO_SHOW")
    void completeAppointment_FromBookedOrNoShow_Rejected() {
        when(appointmentRepository.findByIdForUpdate(100L))
                .thenReturn(Optional.of(appointment(AppointmentStatus.BOOKED, testTime)))
                .thenReturn(Optional.of(appointment(AppointmentStatus.NO_SHOW, testTime)));

        assertThrows(BusinessException.class, () -> appointmentService.complete(100L));
        assertThrows(BusinessException.class, () -> appointmentService.complete(100L));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Cập nhật trạng thái qua UpdateAppointmentStatusRequest")
    void updateStatus_ViaDto_Success() {
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(appointment(AppointmentStatus.BOOKED, testTime)));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppointmentResponse response = appointmentService.updateStatus(100L, statusRequest(AppointmentStatus.CONFIRMED));
        assertEquals(AppointmentStatus.CONFIRMED, response.getStatus());
    }

    @Test
    @DisplayName("Không cho phép chuyển về BOOKED (hồi sinh lịch đã hủy/hoàn tất)")
    void updateStatus_ToBooked_Rejected() {
        assertThrows(BusinessException.class,
                () -> appointmentService.updateStatus(100L, statusRequest(AppointmentStatus.BOOKED)));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đánh dấu vắng mặt thành công sau giờ hẹn")
    void updateStatus_NoShow_AfterScheduledTime_Success() {
        Appointment past = appointment(AppointmentStatus.CONFIRMED, LocalDateTime.now().minusHours(2));
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(past));
        when(visitRepository.existsByAppointmentId(100L)).thenReturn(false);
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppointmentResponse response = appointmentService.updateStatus(100L, statusRequest(AppointmentStatus.NO_SHOW));
        assertEquals(AppointmentStatus.NO_SHOW, response.getStatus());
    }

    @Test
    @DisplayName("Không đánh dấu vắng mặt trước giờ hẹn")
    void updateStatus_NoShow_BeforeScheduledTime_Rejected() {
        when(appointmentRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(appointment(AppointmentStatus.BOOKED, testTime)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> appointmentService.updateStatus(100L, statusRequest(AppointmentStatus.NO_SHOW)));
        assertTrue(ex.getMessage().contains("sau thời điểm hẹn"));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không đánh dấu vắng mặt cho lịch đã hoàn tất")
    void updateStatus_NoShow_FromCompleted_Rejected() {
        when(appointmentRepository.findByIdForUpdate(100L))
                .thenReturn(Optional.of(appointment(AppointmentStatus.COMPLETED, LocalDateTime.now().minusDays(1))));

        assertThrows(BusinessException.class,
                () -> appointmentService.updateStatus(100L, statusRequest(AppointmentStatus.NO_SHOW)));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không đánh dấu vắng mặt khi bệnh nhân đã đến khám (đã có lượt khám)")
    void updateStatus_NoShow_WithVisit_Rejected() {
        when(appointmentRepository.findByIdForUpdate(100L))
                .thenReturn(Optional.of(appointment(AppointmentStatus.CONFIRMED, LocalDateTime.now().minusHours(1))));
        when(visitRepository.existsByAppointmentId(100L)).thenReturn(true);

        assertThrows(BusinessException.class,
                () -> appointmentService.updateStatus(100L, statusRequest(AppointmentStatus.NO_SHOW)));
        verify(appointmentRepository, never()).save(any());
    }

    // ==================== AVAILABLE SLOTS ====================

    @Test
    @DisplayName("Lấy khung giờ trống – lọc đúng ca đã được đặt")
    void getAvailableSlots_Success() {
        LocalDate checkDate = LocalDate.now().plusDays(7);
        int totalSlots = WorkingHours.slotStarts(checkDate).size();

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

        // Sáng 8 ca + chiều 9 ca = 17 khung giờ (cả mùa hè và mùa đông)
        assertEquals(17, totalSlots);
        assertEquals(16, response.getAvailableSlots().size());
        assertEquals(1, response.getBookedSlots().size());

        // Khung giờ 08:30 phải nằm trong bookedSlots
        assertEquals(LocalTime.of(8, 30), response.getBookedSlots().get(0).getStartTime());
        assertFalse(response.getBookedSlots().get(0).isAvailable());
    }

    @Test
    @DisplayName("Khung giờ đã qua không được trả về là còn trống")
    void getAvailableSlots_PastDate_NoAvailableSlots() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        when(staffProfileRepository.findById(1L)).thenReturn(Optional.of(testDoctor));
        when(appointmentRepository.findByDoctorIdAndTimeRange(eq(1L), any(), any())).thenReturn(List.of());

        AvailableSlotsResponse response = appointmentService.getAvailableSlots(1L, yesterday);

        assertTrue(response.getAvailableSlots().isEmpty());
    }

    @Test
    @DisplayName("Hôm nay: chỉ trả về các khung giờ sau thời điểm hiện tại")
    void getAvailableSlots_Today_OnlyFutureSlots() {
        LocalDate today = LocalDate.now();
        when(staffProfileRepository.findById(1L)).thenReturn(Optional.of(testDoctor));
        when(appointmentRepository.findByDoctorIdAndTimeRange(eq(1L), any(), any())).thenReturn(List.of());

        AvailableSlotsResponse response = appointmentService.getAvailableSlots(1L, today);

        LocalTime now = LocalTime.now();
        long expectedFuture = WorkingHours.slotStarts(today).stream().filter(t -> t.isAfter(now)).count();
        assertTrue(response.getAvailableSlots().stream().allMatch(s -> s.getStartTime().isAfter(now.minusMinutes(1))));
        assertTrue(Math.abs(response.getAvailableSlots().size() - expectedFuture) <= 1);
    }
}
