package com.hospital.hmsai.patient.service;

import com.hospital.hmsai.common.exception.DuplicateResourceException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.dto.CreatePatientRequest;
import com.hospital.hmsai.patient.dto.PatientResponse;
import com.hospital.hmsai.patient.dto.UpdatePatientRequest;
import com.hospital.hmsai.patient.entity.Gender;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.patient.service.impl.PatientServiceImpl;
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
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit test cho PatientServiceImpl.
 * Kiểm thử CRUD hồ sơ bệnh nhân, tìm kiếm, và xử lý lỗi.
 */
@ExtendWith(MockitoExtension.class)
class PatientServiceImplTest {

    @Mock
    private PatientRepository patientRepository;

    @InjectMocks
    private PatientServiceImpl patientService;

    // ==================== CREATE ====================

    @Test
    @DisplayName("Tạo bệnh nhân thành công – sinh mã BN tự động")
    void createPatient_Success() {
        // Given
        CreatePatientRequest request = CreatePatientRequest.builder()
                .fullName("Nguyễn Văn A")
                .phone("0901234567")
                .dob(LocalDate.of(1990, 5, 15))
                .gender(Gender.MALE)
                .nationalId("001234567890")
                .address("123 Trần Hưng Đạo, Hà Nội")
                .build();

        Patient savedPatient = Patient.builder()
                .id(1L)
                .patientCode("BN-260928-042")
                .fullName("Nguyễn Văn A")
                .phone("0901234567")
                .dob(LocalDate.of(1990, 5, 15))
                .gender(Gender.MALE)
                .nationalId("001234567890")
                .address("123 Trần Hưng Đạo, Hà Nội")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(patientRepository.existsByNationalId("001234567890")).thenReturn(false);
        when(patientRepository.existsByPatientCode(anyString())).thenReturn(false);
        when(patientRepository.save(any(Patient.class))).thenReturn(savedPatient);

        // When
        PatientResponse result = patientService.create(request);

        // Then
        assertNotNull(result);
        assertEquals("Nguyễn Văn A", result.getFullName());
        assertEquals("0901234567", result.getPhone());
        assertEquals(Gender.MALE, result.getGender());
        assertNotNull(result.getPatientCode());
        verify(patientRepository).save(any(Patient.class));
    }

    @Test
    @DisplayName("Tạo bệnh nhân trùng CCCD → throw DuplicateResourceException")
    void createPatient_DuplicateNationalId_ThrowsException() {
        // Given
        CreatePatientRequest request = CreatePatientRequest.builder()
                .fullName("Nguyễn Văn B")
                .nationalId("001234567890")
                .build();

        when(patientRepository.existsByNationalId("001234567890")).thenReturn(true);

        // When & Then
        assertThrows(DuplicateResourceException.class,
                () -> patientService.create(request));
        verify(patientRepository, never()).save(any());
    }

    // ==================== GET BY ID ====================

    @Test
    @DisplayName("Lấy bệnh nhân theo ID thành công")
    void getById_Success() {
        // Given
        Patient patient = Patient.builder()
                .id(1L)
                .patientCode("BN-260928-001")
                .fullName("Trần Thị C")
                .build();

        when(patientRepository.findById(1L)).thenReturn(Optional.of(patient));

        // When
        PatientResponse result = patientService.getById(1L);

        // Then
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("Trần Thị C", result.getFullName());
    }

    @Test
    @DisplayName("Lấy bệnh nhân không tồn tại → throw ResourceNotFoundException")
    void getById_NotFound_ThrowsException() {
        when(patientRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> patientService.getById(999L));
    }

    // ==================== UPDATE ====================

    @Test
    @DisplayName("Cập nhật hồ sơ bệnh nhân thành công – partial update")
    void updatePatient_Success() {
        // Given
        Patient existing = Patient.builder()
                .id(1L)
                .patientCode("BN-260928-001")
                .fullName("Lê Văn D")
                .phone("0911111111")
                .address("Cũ")
                .build();

        UpdatePatientRequest request = UpdatePatientRequest.builder()
                .address("456 Nguyễn Trãi, HCM")
                .phone("0922222222")
                .build();

        when(patientRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(patientRepository.save(any(Patient.class))).thenReturn(existing);

        // When
        PatientResponse result = patientService.update(1L, request);

        // Then
        assertNotNull(result);
        assertEquals("456 Nguyễn Trãi, HCM", existing.getAddress());
        assertEquals("0922222222", existing.getPhone());
        assertEquals("Lê Văn D", existing.getFullName()); // fullName giữ nguyên
        verify(patientRepository).save(existing);
    }

    // ==================== SEARCH ====================

    @Test
    @DisplayName("Tìm kiếm bệnh nhân theo keyword – có kết quả")
    void search_WithKeyword_ReturnsResults() {
        // Given
        Patient p1 = Patient.builder().id(1L).fullName("Nguyễn Văn A").patientCode("BN-001").build();
        Patient p2 = Patient.builder().id(2L).fullName("Nguyễn Thị B").patientCode("BN-002").build();
        Page<Patient> page = new PageImpl<>(List.of(p1, p2));
        Pageable pageable = PageRequest.of(0, 20);

        when(patientRepository.searchByKeyword("Nguyễn", pageable)).thenReturn(page);

        // When
        Page<PatientResponse> result = patientService.search("Nguyễn", pageable);

        // Then
        assertEquals(2, result.getTotalElements());
        verify(patientRepository).searchByKeyword("Nguyễn", pageable);
    }

    @Test
    @DisplayName("Tìm kiếm bệnh nhân – keyword rỗng → trả tất cả")
    void search_EmptyKeyword_ReturnsAll() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        Page<Patient> page = new PageImpl<>(List.of());

        when(patientRepository.findAll(pageable)).thenReturn(page);

        // When
        Page<PatientResponse> result = patientService.search("", pageable);

        // Then
        verify(patientRepository).findAll(pageable);
        verify(patientRepository, never()).searchByKeyword(anyString(), any());
    }

    // ==================== GET BY USER ID (self-access) ====================

    @Test
    @DisplayName("Lấy hồ sơ theo userId (endpoint /me) thành công")
    void getByUserId_Success() {
        // Given
        Patient patient = Patient.builder()
                .id(1L)
                .patientCode("BN-260928-001")
                .fullName("Bệnh nhân tự xem")
                .build();

        when(patientRepository.findByUserId(5L)).thenReturn(Optional.of(patient));

        // When
        PatientResponse result = patientService.getByUserId(5L);

        // Then
        assertNotNull(result);
        assertEquals("Bệnh nhân tự xem", result.getFullName());
    }

    @Test
    @DisplayName("Lấy hồ sơ theo userId không tồn tại → throw exception")
    void getByUserId_NotFound_ThrowsException() {
        when(patientRepository.findByUserId(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> patientService.getByUserId(999L));
    }
}
