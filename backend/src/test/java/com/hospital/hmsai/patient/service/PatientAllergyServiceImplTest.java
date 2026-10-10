package com.hospital.hmsai.patient.service;

import com.hospital.hmsai.common.exception.DuplicateResourceException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.dto.AllergyResponse;
import com.hospital.hmsai.patient.dto.CreateAllergyRequest;
import com.hospital.hmsai.patient.entity.AllergySeverity;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.entity.PatientAllergy;
import com.hospital.hmsai.patient.repository.PatientAllergyRepository;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.patient.service.impl.PatientAllergyServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit test cho PatientAllergyServiceImpl.
 * Kiểm thử CRUD dị ứng bệnh nhân.
 */
@ExtendWith(MockitoExtension.class)
class PatientAllergyServiceImplTest {

    @Mock
    private PatientAllergyRepository allergyRepository;

    @Mock
    private PatientRepository patientRepository;

    @InjectMocks
    private PatientAllergyServiceImpl allergyService;

    // ==================== GET ALL ====================

    @Test
    @DisplayName("Lấy danh sách dị ứng thành công")
    void getAllByPatientId_Success() {
        // Given
        PatientAllergy a1 = PatientAllergy.builder()
                .id(1L).allergen("Penicillin").severity(AllergySeverity.SEVERE)
                .createdAt(LocalDateTime.now()).build();
        PatientAllergy a2 = PatientAllergy.builder()
                .id(2L).allergen("Hải sản").severity(AllergySeverity.MODERATE)
                .createdAt(LocalDateTime.now()).build();

        when(patientRepository.existsById(1L)).thenReturn(true);
        when(allergyRepository.findByPatientId(1L)).thenReturn(List.of(a1, a2));

        // When
        List<AllergyResponse> result = allergyService.getAllByPatientId(1L);

        // Then
        assertEquals(2, result.size());
        assertEquals("Penicillin", result.get(0).getAllergen());
        assertEquals(AllergySeverity.SEVERE, result.get(0).getSeverity());
    }

    @Test
    @DisplayName("Lấy dị ứng bệnh nhân không tồn tại → throw exception")
    void getAllByPatientId_PatientNotFound_ThrowsException() {
        when(patientRepository.existsById(999L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class,
                () -> allergyService.getAllByPatientId(999L));
    }

    // ==================== CREATE ====================

    @Test
    @DisplayName("Thêm dị ứng mới thành công")
    void createAllergy_Success() {
        // Given
        Patient patient = Patient.builder().id(1L).patientCode("BN-001").build();
        CreateAllergyRequest request = CreateAllergyRequest.builder()
                .allergen("Aspirin")
                .severity(AllergySeverity.MODERATE)
                .note("Phản ứng nổi mề đay")
                .build();

        PatientAllergy saved = PatientAllergy.builder()
                .id(1L)
                .patient(patient)
                .allergen("Aspirin")
                .severity(AllergySeverity.MODERATE)
                .note("Phản ứng nổi mề đay")
                .createdAt(LocalDateTime.now())
                .build();

        when(patientRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(allergyRepository.save(any(PatientAllergy.class))).thenReturn(saved);

        // When
        AllergyResponse result = allergyService.create(1L, request);

        // Then
        assertNotNull(result);
        assertEquals("Aspirin", result.getAllergen());
        assertEquals(AllergySeverity.MODERATE, result.getSeverity());
        assertEquals("Phản ứng nổi mề đay", result.getNote());
        verify(allergyRepository).save(any(PatientAllergy.class));
    }

    @Test
    @DisplayName("Thêm dị ứng không chỉ định severity → mặc định MILD")
    void createAllergy_DefaultSeverity() {
        // Given
        Patient patient = Patient.builder().id(1L).patientCode("BN-001").build();
        CreateAllergyRequest request = CreateAllergyRequest.builder()
                .allergen("Phấn hoa")
                .build();

        PatientAllergy saved = PatientAllergy.builder()
                .id(2L)
                .patient(patient)
                .allergen("Phấn hoa")
                .severity(AllergySeverity.MILD)
                .createdAt(LocalDateTime.now())
                .build();

        when(patientRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(allergyRepository.save(any(PatientAllergy.class))).thenReturn(saved);

        // When
        AllergyResponse result = allergyService.create(1L, request);

        // Then
        assertEquals(AllergySeverity.MILD, result.getSeverity());
    }

    @Test
    @DisplayName("Thêm dị ứng trùng tên (khác hoa/thường, dấu, khoảng trắng) → 409 DuplicateResourceException")
    void createAllergy_Duplicate_ThrowsDuplicateResource() {
        Patient patient = Patient.builder().id(1L).patientCode("BN-001").build();
        PatientAllergy existing = PatientAllergy.builder()
                .id(5L).patient(patient).allergen("Hải sản").severity(AllergySeverity.MODERATE).build();
        CreateAllergyRequest request = CreateAllergyRequest.builder()
                .allergen("  HAI SAN ")
                .severity(AllergySeverity.SEVERE)
                .build();

        when(patientRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(allergyRepository.findByPatientId(1L)).thenReturn(List.of(existing));

        assertThrows(DuplicateResourceException.class, () -> allergyService.create(1L, request));
        verify(allergyRepository, never()).save(any());
    }

    // ==================== DELETE ====================

    @Test
    @DisplayName("Xóa dị ứng thành công")
    void deleteAllergy_Success() {
        // Given
        PatientAllergy allergy = PatientAllergy.builder()
                .id(1L).allergen("Penicillin").build();

        when(allergyRepository.findByIdAndPatientId(1L, 1L))
                .thenReturn(Optional.of(allergy));

        // When
        allergyService.delete(1L, 1L);

        // Then
        verify(allergyRepository).delete(allergy);
    }

    @Test
    @DisplayName("Xóa dị ứng không tồn tại → throw exception")
    void deleteAllergy_NotFound_ThrowsException() {
        when(allergyRepository.findByIdAndPatientId(999L, 1L))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> allergyService.delete(1L, 999L));
    }
}
