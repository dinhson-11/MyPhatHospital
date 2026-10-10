package com.hospital.hmsai.clinical.service.impl;

import com.hospital.hmsai.ai.dto.DrugItemDto;
import com.hospital.hmsai.ai.dto.PrescriptionSafetyResponse;
import com.hospital.hmsai.ai.service.AiClinicalService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Gọi kiểm tra an toàn AI + ghi audit log (NFR-8) trong một transaction RIÊNG.
 * <p>
 * Nếu phía AI ném lỗi, chỉ transaction riêng này bị rollback; transaction kê đơn của bác sĩ không bị
 * đánh dấu rollback-only (trước đây lỗi AI bị nuốt trong cùng transaction dẫn tới
 * UnexpectedRollbackException khi commit). Kết quả AI chỉ mang tính tham khảo – việc chặn đơn thuốc
 * nguy hiểm do kiểm tra tất định trong VisitServiceImpl đảm nhiệm.
 * <p>
 * Lưu ý: phải gọi TRƯỚC khi transaction kê đơn giữ khóa ghi trên dòng visits, vì audit log có khóa
 * ngoại tới visits.
 */
@Component
@RequiredArgsConstructor
public class PrescriptionAiAuditor {

    private final AiClinicalService aiClinicalService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PrescriptionSafetyResponse checkAndAudit(Long visitId, List<DrugItemDto> drugs) {
        return aiClinicalService.checkAndAuditPrescriptionSafety(visitId, drugs);
    }
}
