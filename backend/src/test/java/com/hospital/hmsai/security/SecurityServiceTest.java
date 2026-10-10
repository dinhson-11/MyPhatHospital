package com.hospital.hmsai.security;

import com.hospital.hmsai.appointment.repository.AppointmentRepository;
import com.hospital.hmsai.billing.repository.InvoiceRepository;
import com.hospital.hmsai.clinical.repository.LabOrderRepository;
import com.hospital.hmsai.clinical.repository.PrescriptionRepository;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.patient.repository.PatientRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SecurityServiceTest {

    @Mock
    private PatientRepository patientRepository;
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private VisitRepository visitRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private PrescriptionRepository prescriptionRepository;
    @Mock
    private LabOrderRepository labOrderRepository;

    @InjectMocks
    private SecurityService securityService;

    private static Authentication auth(String username, String... roles) {
        return new UsernamePasswordAuthenticationToken(username, "x",
                AuthorityUtils.createAuthorityList(java.util.Arrays.stream(roles).map(r -> "ROLE_" + r).toArray(String[]::new)));
    }

    @Test
    @DisplayName("Ownership: lượt khám, chỉ định CLS, đơn thuốc, lịch hẹn kiểm tra theo username đăng nhập")
    void ownershipChecks_DelegateToUsernameQueries() {
        Authentication patient = auth("benhnhan", "PATIENT");
        when(visitRepository.existsByIdAndPatient_User_UsernameIgnoreCase(5L, "benhnhan")).thenReturn(true);
        when(labOrderRepository.existsByIdAndVisit_Patient_User_UsernameIgnoreCase(6L, "benhnhan")).thenReturn(false);
        when(prescriptionRepository.existsByIdAndVisit_Patient_User_UsernameIgnoreCase(7L, "benhnhan")).thenReturn(true);
        when(appointmentRepository.existsByIdAndPatient_User_UsernameIgnoreCase(8L, "benhnhan")).thenReturn(true);

        assertTrue(securityService.isVisitPatient(5L, patient));
        assertFalse(securityService.isLabOrderPatient(6L, patient));
        assertTrue(securityService.isPrescriptionPatient(7L, patient));
        assertTrue(securityService.isAppointmentOwner(8L, patient));
    }

    @Test
    @DisplayName("Bác sĩ phụ trách lượt khám")
    void isVisitDoctor() {
        when(visitRepository.existsByIdAndDoctor_User_UsernameIgnoreCase(5L, "bacsi")).thenReturn(true);
        assertTrue(securityService.isVisitDoctor(5L, auth("bacsi", "DOCTOR")));
        assertFalse(securityService.isVisitDoctor(null, auth("bacsi", "DOCTOR")));
    }

    @Test
    @DisplayName("Người dùng ẩn danh / null luôn bị từ chối, không truy vấn DB")
    void anonymousOrNull_Denied() {
        Authentication anonymous = new AnonymousAuthenticationToken("key", "anonymousUser",
                AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS"));
        assertFalse(securityService.isVisitPatient(5L, anonymous));
        assertFalse(securityService.isLabOrderPatient(5L, null));
        assertNull(securityService.currentPatientId(null));
        verifyNoInteractions(visitRepository, labOrderRepository, patientRepository);
    }

    @Test
    @DisplayName("ID hồ sơ bệnh nhân của tài khoản đăng nhập")
    void currentPatientId() {
        when(patientRepository.findIdsByUsername("benhnhan")).thenReturn(List.of(42L));
        when(patientRepository.findIdsByUsername("chualienket")).thenReturn(List.of());

        assertEquals(42L, securityService.currentPatientId(auth("benhnhan", "PATIENT")));
        assertNull(securityService.currentPatientId(auth("chualienket", "PATIENT")));
    }

    @Test
    @DisplayName("Tiện ích vai trò: PATIENT thuần vs nhân viên kiêm nhiệm")
    void roleHelpers() {
        assertTrue(SecurityService.isPatientOnly(auth("bn", "PATIENT")));
        assertFalse(SecurityService.isPatientOnly(auth("bs", "PATIENT", "DOCTOR")));
        assertFalse(SecurityService.isPatientOnly(auth("lt", "RECEPTIONIST")));
        assertTrue(SecurityService.hasAnyRole(auth("bs", "DOCTOR"), "DOCTOR", "ADMIN"));
        assertFalse(SecurityService.hasAnyRole(auth("dd", "NURSE"), "DOCTOR", "ADMIN"));
        assertFalse(SecurityService.hasAnyRole(null, "ADMIN"));
    }
}
