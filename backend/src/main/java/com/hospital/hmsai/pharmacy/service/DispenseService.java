package com.hospital.hmsai.pharmacy.service;

import com.hospital.hmsai.pharmacy.dto.DispenseRequest;
import com.hospital.hmsai.pharmacy.dto.DispenseResponse;

import java.util.List;

/**
 * Service quản lý cấp phát thuốc theo đơn và trừ tồn kho (FR-6.2).
 */
public interface DispenseService {

    DispenseResponse dispensePrescription(Long prescriptionId, DispenseRequest request, Long currentUserId);

    DispenseResponse getDispenseByPrescriptionId(Long prescriptionId);

    boolean isDispensed(Long prescriptionId);

    /** Lịch sử cấp phát gần nhất, tối đa {@code limit} dòng (giới hạn trần ở tầng dịch vụ). */
    List<DispenseResponse> getAllDispenses(int limit);
}
