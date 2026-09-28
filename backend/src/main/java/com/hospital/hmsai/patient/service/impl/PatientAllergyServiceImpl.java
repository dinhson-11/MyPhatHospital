package com.hospital.hmsai.patient.service.impl;

import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.dto.AllergyResponse;
import com.hospital.hmsai.patient.dto.CreateAllergyRequest;
import com.hospital.hmsai.patient.entity.AllergySeverity;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.entity.PatientAllergy;
import com.hospital.hmsai.patient.repository.PatientAllergyRepository;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.patient.service.PatientAllergyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Implementation của PatientAllergyService.
 * Quản lý thông tin dị ứng – dữ liệu đầu vào cho AI cảnh báo (FR-11.2).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PatientAllergyServiceImpl implements PatientAllergyService {

    private final PatientAllergyRepository allergyRepository;
    private final PatientRepository patientRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AllergyResponse> getAllByPatientId(Long patientId) {
        // Kiểm tra bệnh nhân tồn tại
        if (!patientRepository.existsById(patientId)) {
            throw new ResourceNotFoundException("Bệnh nhân", "id", patientId);
        }

        return allergyRepository.findByPatientId(patientId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public AllergyResponse create(Long patientId, CreateAllergyRequest request) {
        log.info("Thêm dị ứng cho bệnh nhân ID {}: {}", patientId, request.getAllergen());

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh nhân", "id", patientId));

        PatientAllergy allergy = PatientAllergy.builder()
                .patient(patient)
                .allergen(request.getAllergen())
                .severity(request.getSeverity() != null ? request.getSeverity() : AllergySeverity.MILD)
                .note(request.getNote())
                .build();

        PatientAllergy saved = allergyRepository.save(allergy);
        log.info("Đã thêm dị ứng '{}' cho bệnh nhân {}", saved.getAllergen(), patient.getPatientCode());

        return toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long patientId, Long allergyId) {
        log.info("Xóa dị ứng ID {} của bệnh nhân ID {}", allergyId, patientId);

        PatientAllergy allergy = allergyRepository.findByIdAndPatientId(allergyId, patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Dị ứng", "id", allergyId));

        allergyRepository.delete(allergy);
        log.info("Đã xóa dị ứng '{}' của bệnh nhân ID {}", allergy.getAllergen(), patientId);
    }

    /**
     * Chuyển đổi Entity → Response DTO.
     */
    private AllergyResponse toResponse(PatientAllergy allergy) {
        return AllergyResponse.builder()
                .id(allergy.getId())
                .allergen(allergy.getAllergen())
                .severity(allergy.getSeverity())
                .note(allergy.getNote())
                .createdAt(allergy.getCreatedAt())
                .build();
    }
}
