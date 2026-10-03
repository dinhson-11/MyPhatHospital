package com.hospital.hmsai.ai.service;

import com.hospital.hmsai.ai.dto.*;

import java.util.List;

/**
 * Service tích hợp AI Clinical (FR-11.1, FR-11.2, NFR-8):
 * - Tra cứu tương tác thuốc và dị ứng qua FastAPI AI Service
 * - Fallback cơ chế rule-based local an toàn nếu AI Service offline
 * - Tự động ghi audit log vào bảng ai_clinical_suggestions
 */
public interface AiClinicalService {

    /**
     * Kiểm tra tương tác giữa các thuốc.
     */
    InteractionCheckResponse checkInteractions(InteractionCheckRequest request);

    /**
     * Kiểm tra dị ứng thuốc của bệnh nhân.
     */
    AllergyCheckResponse checkAllergies(AllergyCheckRequest request);

    /**
     * Kiểm tra an toàn đơn thuốc tổng thể (tương tác + dị ứng).
     */
    PrescriptionSafetyResponse checkPrescriptionSafety(PrescriptionSafetyCheckRequest request);

    /**
     * Kiểm tra an toàn đơn thuốc cho một lượt khám cụ thể và tự động ghi log audit vào DB (NFR-8).
     */
    PrescriptionSafetyResponse checkAndAuditPrescriptionSafety(Long visitId, List<DrugItemDto> drugs);

    /**
     * Lấy danh sách lịch sử gợi ý/cảnh báo AI của một lượt khám.
     */
    List<AiAuditLogResponse> getAuditLogsByVisitId(Long visitId);

    /**
     * Gợi ý chẩn đoán ICD-10 từ triệu chứng (FR-11.3 – Sprint 6).
     */
    DiagnosisSuggestionResponse suggestDiagnosis(DiagnosisSuggestionRequest request);

    /**
     * Gợi ý chẩn đoán ICD-10 theo ca khám cụ thể và tự động ghi audit log (NFR-8).
     */
    DiagnosisSuggestionResponse suggestAndAuditDiagnosis(Long visitId, DiagnosisSuggestionRequest request);
}
