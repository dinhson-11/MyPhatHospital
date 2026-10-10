package com.hospital.hmsai.publicapi;

import com.hospital.hmsai.appointment.dto.AppointmentResponse;
import com.hospital.hmsai.appointment.dto.CreateAppointmentRequest;
import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.appointment.service.AppointmentService;
import com.hospital.hmsai.common.exception.BusinessException;
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
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PublicPortalServiceTest {

    @Mock
    private StaffProfileRepository staffProfileRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private AppointmentService appointmentService;

    @Mock
    private AppointmentRepository appointmentRepository;

    @InjectMocks
    private PublicPortalService portalService;

    private Department department;
    private StaffProfile doctorA;
    private StaffProfile doctorB;
    private LocalDateTime slot;

    @BeforeEach
    void setUp() {
        department = Department.builder().id(3L).name("Nội tổng quát").build();
        Role doctorRole = Role.builder().id(2L).code("DOCTOR").name("Bác sĩ").build();
        doctorA = StaffProfile.builder().id(11L).department(department)
                .user(User.builder().id(101L).username("bs.a").fullName("BS A").roles(Set.of(doctorRole)).build()).build();
        doctorB = StaffProfile.builder().id(12L).department(department)
                .user(User.builder().id(102L).username("bs.b").fullName("BS B").roles(Set.of(doctorRole)).build()).build();
        slot = LocalDate.now().plusDays(5).atTime(9, 0);
    }

    private PublicBookingRequest request() {
        return PublicBookingRequest.builder()
                .fullName("Nguyễn Văn Khách")
                .phone("0909123456")
                .departmentId(3L)
                .scheduledAt(slot)
                .build();
    }

    @Test
    @DisplayName("Tự phân công: bỏ qua bác sĩ đã kín khung giờ, chọn bác sĩ đầu tiên còn trống")
    void book_AutoAssign_PicksFirstFreeDoctor() {
        when(departmentRepository.findById(3L)).thenReturn(Optional.of(department));
        when(staffProfileRepository.findByDepartmentId(3L)).thenReturn(List.of(doctorB, doctorA));
        when(appointmentRepository.existsByDoctorIdAndScheduledAtAndStatusNotCancelled(11L, slot)).thenReturn(true);
        when(appointmentRepository.existsByDoctorIdAndScheduledAtAndStatusNotCancelled(12L, slot)).thenReturn(false);
        when(patientRepository.findFirstByPhoneAndFullNameIgnoreCase("0909123456", "Nguyễn Văn Khách"))
                .thenReturn(Optional.of(Patient.builder().id(7L).fullName("Nguyễn Văn Khách").build()));
        when(appointmentService.create(any())).thenReturn(AppointmentResponse.builder().id(1L).build());

        portalService.book(request());

        ArgumentCaptor<CreateAppointmentRequest> captor = ArgumentCaptor.forClass(CreateAppointmentRequest.class);
        verify(appointmentService).create(captor.capture());
        assertEquals(12L, captor.getValue().getDoctorId());
        assertEquals(7L, captor.getValue().getPatientId());
    }

    @Test
    @DisplayName("Tự phân công: tất cả bác sĩ của khoa đã kín khung giờ → báo lỗi rõ ràng")
    void book_AutoAssign_AllBusy_Rejected() {
        when(departmentRepository.findById(3L)).thenReturn(Optional.of(department));
        when(staffProfileRepository.findByDepartmentId(3L)).thenReturn(List.of(doctorA, doctorB));
        when(appointmentRepository.existsByDoctorIdAndScheduledAtAndStatusNotCancelled(any(), any())).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () -> portalService.book(request()));
        assertTrue(ex.getMessage().contains("kín lịch"));
        verify(appointmentService, never()).create(any());
    }

    @Test
    @DisplayName("Tạo hồ sơ mới từ đặt lịch công khai dùng bộ sinh mã bệnh nhân chung")
    void book_NewPatient_UsesSharedCodeGenerator() {
        when(departmentRepository.findById(3L)).thenReturn(Optional.of(department));
        when(staffProfileRepository.findByDepartmentId(3L)).thenReturn(List.of(doctorA));
        when(appointmentRepository.existsByDoctorIdAndScheduledAtAndStatusNotCancelled(11L, slot)).thenReturn(false);
        when(patientRepository.findFirstByPhoneAndFullNameIgnoreCase(any(), any())).thenReturn(Optional.empty());
        when(patientRepository.existsByPatientCode(any())).thenReturn(false);
        when(patientRepository.save(any(Patient.class))).thenAnswer(inv -> {
            Patient p = inv.getArgument(0);
            p.setId(8L);
            return p;
        });
        when(appointmentService.create(any())).thenReturn(AppointmentResponse.builder().id(2L).build());

        portalService.book(request());

        ArgumentCaptor<Patient> captor = ArgumentCaptor.forClass(Patient.class);
        verify(patientRepository).save(captor.capture());
        assertTrue(captor.getValue().getPatientCode().matches("^BN-\\d{6}-\\d{3}$"));
    }
}
