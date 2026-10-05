package com.hospital.hmsai.patient.service;

import com.hospital.hmsai.patient.dto.AllergyResponse;
import com.hospital.hmsai.patient.dto.CreateAllergyRequest;

import java.util.List;

/**
 * Service interface cho quản lý dị ứng bệnh nhân.
 * Dữ liệu đầu vào quan trọng cho AI cảnh báo dị ứng thuốc (FR-11.2).
 */
public interface PatientAllergyService {

    /**
     * Lấy danh sách dị ứng của bệnh nhân.
     */
    List<AllergyResponse> getAllByPatientId(Long patientId);

    /**
     * Thêm dị ứng mới cho bệnh nhân.
     */
    AllergyResponse create(Long patientId, CreateAllergyRequest request);

    /**
     * Xóa dị ứng của bệnh nhân.
     */
    void delete(Long patientId, Long allergyId);
}
