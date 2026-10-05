package com.hospital.hmsai.patient.service;

import com.hospital.hmsai.patient.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service interface cho quản lý hồ sơ bệnh nhân.
 */
public interface PatientService {

    /**
     * Tạo hồ sơ bệnh nhân mới (lễ tân/admin tạo).
     * Tự động sinh patient_code theo format: BN-YYMMDD-NNN.
     */
    PatientResponse create(CreatePatientRequest request);

    /**
     * Lấy hồ sơ bệnh nhân theo ID.
     */
    PatientResponse getById(Long id);

    /**
     * Lấy hồ sơ bệnh nhân theo user_id (dùng cho /patients/me).
     */
    PatientResponse getByUserId(Long userId);

    /**
     * Cập nhật hồ sơ bệnh nhân (lễ tân/admin).
     */
    PatientResponse update(Long id, UpdatePatientRequest request);

    /**
     * Bệnh nhân tự cập nhật hồ sơ của mình.
     */
    PatientResponse updateMyProfile(Long userId, UpdatePatientRequest request);

    /**
     * Tìm kiếm bệnh nhân theo keyword (tên, SĐT, mã), phân trang.
     */
    Page<PatientResponse> search(String keyword, Pageable pageable);
}
