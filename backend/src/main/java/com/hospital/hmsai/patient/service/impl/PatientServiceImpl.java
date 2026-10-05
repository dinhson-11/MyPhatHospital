package com.hospital.hmsai.patient.service.impl;

import com.hospital.hmsai.common.exception.DuplicateResourceException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.dto.*;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.patient.service.PatientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Implementation của PatientService.
 * Xử lý CRUD hồ sơ bệnh nhân, tự sinh mã BN, validate unique CCCD.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PatientServiceImpl implements PatientService {

    private final PatientRepository patientRepository;

    @Override
    @Transactional
    public PatientResponse create(CreatePatientRequest request) {
        log.info("Tạo hồ sơ bệnh nhân mới: {}", request.getFullName());

        // Kiểm tra trùng CCCD nếu có
        if (request.getNationalId() != null && !request.getNationalId().isBlank()) {
            if (patientRepository.existsByNationalId(request.getNationalId())) {
                throw new DuplicateResourceException("Bệnh nhân", "CCCD", request.getNationalId());
            }
        }

        Patient patient = Patient.builder()
                .patientCode(generatePatientCode())
                .fullName(request.getFullName())
                .dob(request.getDob())
                .gender(request.getGender())
                .nationalId(request.getNationalId())
                .address(request.getAddress())
                .phone(request.getPhone())
                .bloodType(blankToNull(request.getBloodType()))
                .build();

        Patient saved = patientRepository.save(patient);
        log.info("Đã tạo hồ sơ bệnh nhân: {} – mã: {}", saved.getFullName(), saved.getPatientCode());

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PatientResponse getById(Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh nhân", "id", id));
        return toResponse(patient);
    }

    @Override
    @Transactional(readOnly = true)
    public PatientResponse getByUserId(Long userId) {
        Patient patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ bệnh nhân", "userId", userId));
        return toResponse(patient);
    }

    @Override
    @Transactional
    public PatientResponse update(Long id, UpdatePatientRequest request) {
        log.info("Cập nhật hồ sơ bệnh nhân ID: {}", id);

        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh nhân", "id", id));

        // Kiểm tra trùng CCCD (nếu thay đổi)
        if (request.getNationalId() != null && !request.getNationalId().isBlank()
                && !request.getNationalId().equals(patient.getNationalId())) {
            if (patientRepository.existsByNationalId(request.getNationalId())) {
                throw new DuplicateResourceException("Bệnh nhân", "CCCD", request.getNationalId());
            }
        }

        updatePatientFields(patient, request);
        Patient saved = patientRepository.save(patient);
        log.info("Đã cập nhật hồ sơ bệnh nhân: {}", saved.getPatientCode());

        return toResponse(saved);
    }

    @Override
    @Transactional
    public PatientResponse updateMyProfile(Long userId, UpdatePatientRequest request) {
        log.info("Bệnh nhân tự cập nhật hồ sơ – userId: {}", userId);

        Patient patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ bệnh nhân", "userId", userId));

        // Kiểm tra trùng CCCD (nếu thay đổi)
        if (request.getNationalId() != null && !request.getNationalId().isBlank()
                && !request.getNationalId().equals(patient.getNationalId())) {
            if (patientRepository.existsByNationalId(request.getNationalId())) {
                throw new DuplicateResourceException("Bệnh nhân", "CCCD", request.getNationalId());
            }
        }

        updatePatientFields(patient, request);
        Patient saved = patientRepository.save(patient);
        log.info("Bệnh nhân đã cập nhật hồ sơ: {}", saved.getPatientCode());

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PatientResponse> search(String keyword, Pageable pageable) {
        log.info("Tìm kiếm bệnh nhân: keyword='{}', page={}", keyword, pageable.getPageNumber());

        if (keyword == null || keyword.isBlank()) {
            return patientRepository.findAll(pageable).map(this::toResponse);
        }
        return patientRepository.searchByKeyword(keyword.trim(), pageable).map(this::toResponse);
    }

    // ==================== Helper Methods ====================

    /**
     * Sinh mã bệnh nhân theo format: BN-YYMMDD-NNN
     * VD: BN-260928-042
     */
    private String generatePatientCode() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String randomPart = String.format("%03d", ThreadLocalRandom.current().nextInt(1000));
        String code = "BN-" + datePart + "-" + randomPart;

        // Đảm bảo unique (retry nếu trùng)
        int retries = 0;
        while (patientRepository.existsByPatientCode(code) && retries < 10) {
            randomPart = String.format("%03d", ThreadLocalRandom.current().nextInt(1000));
            code = "BN-" + datePart + "-" + randomPart;
            retries++;
        }

        return code;
    }

    /**
     * Cập nhật các trường của Patient từ UpdatePatientRequest.
     * Chỉ cập nhật field không null (partial update).
     */
    private void updatePatientFields(Patient patient, UpdatePatientRequest request) {
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            patient.setFullName(request.getFullName());
        }
        if (request.getDob() != null) {
            patient.setDob(request.getDob());
        }
        if (request.getGender() != null) {
            patient.setGender(request.getGender());
        }
        if (request.getNationalId() != null) {
            patient.setNationalId(request.getNationalId());
        }
        if (request.getAddress() != null) {
            patient.setAddress(request.getAddress());
        }
        if (request.getPhone() != null) {
            patient.setPhone(request.getPhone());
        }
        if (request.getBloodType() != null) {
            patient.setBloodType(blankToNull(request.getBloodType()));
        }
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    /**
     * Chuyển đổi Entity → Response DTO.
     */
    private PatientResponse toResponse(Patient patient) {
        return PatientResponse.builder()
                .id(patient.getId())
                .patientCode(patient.getPatientCode())
                .fullName(patient.getFullName())
                .dob(patient.getDob())
                .gender(patient.getGender())
                .nationalId(patient.getNationalId())
                .address(patient.getAddress())
                .phone(patient.getPhone())
                .bloodType(patient.getBloodType())
                .userId(patient.getUser() != null ? patient.getUser().getId() : null)
                .createdAt(patient.getCreatedAt())
                .updatedAt(patient.getUpdatedAt())
                .build();
    }
}
