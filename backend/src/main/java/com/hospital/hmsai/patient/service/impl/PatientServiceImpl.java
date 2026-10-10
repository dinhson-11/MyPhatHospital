package com.hospital.hmsai.patient.service.impl;

import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.DuplicateResourceException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.dto.*;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.PatientCodeGenerator;
import com.hospital.hmsai.patient.repository.PatientRepository;
import com.hospital.hmsai.patient.service.PatientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

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

        // Kiểm tra trùng CCCD nếu có (CCCD rỗng lưu NULL)
        String nationalId = blankToNull(request.getNationalId());
        if (nationalId != null && patientRepository.existsByNationalId(nationalId)) {
            throw new DuplicateResourceException("Bệnh nhân", "CCCD", nationalId);
        }

        validateInsuranceDates(request.getInsuranceValidFrom(), request.getInsuranceValidTo());

        Patient patient = Patient.builder()
                .patientCode(generatePatientCode())
                .fullName(request.getFullName())
                .dob(request.getDob())
                .gender(request.getGender())
                .nationalId(nationalId)
                .address(request.getAddress())
                .phone(request.getPhone())
                .bloodType(blankToNull(request.getBloodType()))
                .insuranceNumber(normalizeInsuranceNumber(request.getInsuranceNumber()))
                .insuranceValidFrom(request.getInsuranceValidFrom())
                .insuranceValidTo(request.getInsuranceValidTo())
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
        assertNationalIdAvailable(request.getNationalId(), patient);

        updatePatientFields(patient, request);
        updateInsuranceFields(patient, request);
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
        assertNationalIdAvailable(request.getNationalId(), patient);

        // Thẻ BHYT do lễ tân đối chiếu thẻ thật / VssID rồi cập nhật, bệnh nhân không tự khai
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
     * Sinh mã bệnh nhân theo format: BN-YYMMDD-NNN (VD: BN-260928-042), dùng bộ sinh mã chung
     * với cổng đặt lịch công khai – không bao giờ trả về mã trùng.
     */
    private String generatePatientCode() {
        return PatientCodeGenerator.generate(patientRepository::existsByPatientCode);
    }

    /**
     * CCCD mới (khác CCCD hiện tại, không rỗng) không được trùng hồ sơ khác.
     */
    private void assertNationalIdAvailable(String requestedNationalId, Patient patient) {
        String nationalId = blankToNull(requestedNationalId);
        if (nationalId != null && !nationalId.equals(patient.getNationalId())
                && patientRepository.existsByNationalId(nationalId)) {
            throw new DuplicateResourceException("Bệnh nhân", "CCCD", nationalId);
        }
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
            // Gửi CCCD rỗng để xóa: lưu NULL thay vì chuỗi rỗng
            patient.setNationalId(blankToNull(request.getNationalId()));
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

    /**
     * Cập nhật thẻ BHYT (chỉ nhân viên). Gửi insuranceNumber rỗng để gỡ thẻ khỏi hồ sơ.
     */
    private void updateInsuranceFields(Patient patient, UpdatePatientRequest request) {
        if (request.getInsuranceNumber() != null) {
            String number = normalizeInsuranceNumber(request.getInsuranceNumber());
            patient.setInsuranceNumber(number);
            if (number == null) {
                patient.setInsuranceValidFrom(null);
                patient.setInsuranceValidTo(null);
                return;
            }
        }
        if (request.getInsuranceValidFrom() != null) {
            patient.setInsuranceValidFrom(request.getInsuranceValidFrom());
        }
        if (request.getInsuranceValidTo() != null) {
            patient.setInsuranceValidTo(request.getInsuranceValidTo());
        }
        validateInsuranceDates(patient.getInsuranceValidFrom(), patient.getInsuranceValidTo());
    }

    private void validateInsuranceDates(LocalDate validFrom, LocalDate validTo) {
        if (validFrom != null && validTo != null && validTo.isBefore(validFrom)) {
            throw new BusinessException("Hạn thẻ BHYT không hợp lệ: ngày hết hạn trước ngày bắt đầu");
        }
    }

    private String normalizeInsuranceNumber(String value) {
        String trimmed = blankToNull(value);
        return trimmed == null ? null : trimmed.toUpperCase();
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
                .insuranceNumber(patient.getInsuranceNumber())
                .insuranceValidFrom(patient.getInsuranceValidFrom())
                .insuranceValidTo(patient.getInsuranceValidTo())
                .userId(patient.getUser() != null ? patient.getUser().getId() : null)
                .createdAt(patient.getCreatedAt())
                .updatedAt(patient.getUpdatedAt())
                .build();
    }
}
