package com.hospital.hmsai.ai.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.hmsai.ai.dto.*;
import com.hospital.hmsai.ai.entity.AiClinicalSuggestion;
import com.hospital.hmsai.ai.entity.AiSuggestionType;
import com.hospital.hmsai.ai.repository.AiClinicalSuggestionRepository;
import com.hospital.hmsai.ai.service.AiClinicalService;
import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.entity.PatientAllergy;
import com.hospital.hmsai.patient.repository.PatientAllergyRepository;
import com.hospital.hmsai.pharmacy.entity.DrugInteraction;
import com.hospital.hmsai.pharmacy.repository.DrugInteractionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiClinicalServiceImpl implements AiClinicalService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final VisitRepository visitRepository;
    private final PatientAllergyRepository patientAllergyRepository;
    private final DrugInteractionRepository drugInteractionRepository;
    private final AiClinicalSuggestionRepository suggestionRepository;

    @Value("${ai-service.base-url:http://localhost:8000}")
    private String aiServiceBaseUrl;

    @Override
    public InteractionCheckResponse checkInteractions(InteractionCheckRequest request) {
        if (request == null || request.getDrugs() == null || request.getDrugs().size() < 2) {
            return InteractionCheckResponse.builder()
                    .hasInteraction(false)
                    .hasCritical(false)
                    .totalInteractions(0)
                    .interactions(Collections.emptyList())
                    .build();
        }

        String url = aiServiceBaseUrl + "/api/v1/ai/clinical/check-interaction";
        try {
            log.info("Gọi AI Service kiểm tra tương tác thuốc tại: {}", url);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<InteractionCheckRequest> entity = new HttpEntity<>(request, headers);

            InteractionCheckResponse response = restTemplate.postForObject(url, entity, InteractionCheckResponse.class);
            if (response != null) {
                return response;
            }
        } catch (Exception e) {
            log.warn("AI Service check-interaction không phản hồi hoặc lỗi ({}), chuyển sang cơ chế fallback nội bộ", e.getMessage());
        }

        // Fallback local: Dựa trên bảng drug_interactions trong DB
        return fallbackCheckInteractions(request.getDrugs());
    }

    @Override
    public AllergyCheckResponse checkAllergies(AllergyCheckRequest request) {
        if (request == null || request.getDrugs() == null || request.getDrugs().isEmpty()
                || request.getPatientAllergies() == null || request.getPatientAllergies().isEmpty()) {
            return AllergyCheckResponse.builder()
                    .hasAllergyConflict(false)
                    .hasCritical(false)
                    .totalAlerts(0)
                    .alerts(Collections.emptyList())
                    .build();
        }

        String url = aiServiceBaseUrl + "/api/v1/ai/clinical/check-allergy";
        try {
            log.info("Gọi AI Service kiểm tra dị ứng tại: {}", url);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<AllergyCheckRequest> entity = new HttpEntity<>(request, headers);

            AllergyCheckResponse response = restTemplate.postForObject(url, entity, AllergyCheckResponse.class);
            if (response != null) {
                return response;
            }
        } catch (Exception e) {
            log.warn("AI Service check-allergy không phản hồi hoặc lỗi ({}), chuyển sang cơ chế fallback nội bộ", e.getMessage());
        }

        // Fallback local
        return fallbackCheckAllergies(request.getPatientAllergies(), request.getDrugs());
    }

    @Override
    public PrescriptionSafetyResponse checkPrescriptionSafety(PrescriptionSafetyCheckRequest request) {
        if (request == null || request.getDrugs() == null || request.getDrugs().isEmpty()) {
            return PrescriptionSafetyResponse.builder().build();
        }

        String url = aiServiceBaseUrl + "/api/v1/ai/clinical/check-prescription-safety";
        try {
            log.info("Gọi AI Service kiểm tra an toàn tổng hợp tại: {}", url);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<PrescriptionSafetyCheckRequest> entity = new HttpEntity<>(request, headers);

            PrescriptionSafetyResponse response = restTemplate.postForObject(url, entity, PrescriptionSafetyResponse.class);
            if (response != null) {
                return response;
            }
        } catch (Exception e) {
            log.warn("AI Service check-prescription-safety không phản hồi ({}), chuyển sang fallback tổng hợp", e.getMessage());
        }

        // Fallback tổng hợp
        InteractionCheckResponse interactionRes = fallbackCheckInteractions(request.getDrugs());
        AllergyCheckResponse allergyRes = fallbackCheckAllergies(request.getPatientAllergies(), request.getDrugs());

        boolean hasWarning = interactionRes.getHasInteraction() || allergyRes.getHasAllergyConflict();
        boolean hasCritical = interactionRes.getHasCritical() || allergyRes.getHasCritical();

        return PrescriptionSafetyResponse.builder()
                .isSafe(!hasWarning)
                .hasWarning(hasWarning)
                .hasCritical(hasCritical)
                .interactionCount(interactionRes.getTotalInteractions())
                .allergyCount(allergyRes.getTotalAlerts())
                .interactions(interactionRes.getInteractions())
                .allergyAlerts(allergyRes.getAlerts())
                .confidenceScore(new BigDecimal("0.90"))
                .disclaimer(PrescriptionSafetyResponse.DEFAULT_DISCLAIMER)
                .build();
    }

    @Override
    @Transactional
    public PrescriptionSafetyResponse checkAndAuditPrescriptionSafety(Long visitId, List<DrugItemDto> drugs) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new ResourceNotFoundException("Lượt khám", "id", visitId));

        Long patientId = visit.getPatient() != null ? visit.getPatient().getId() : null;

        // Lấy thông tin dị ứng từ DB
        List<PatientAllergyItemDto> allergyDtos = Collections.emptyList();
        if (patientId != null) {
            List<PatientAllergy> patientAllergies = patientAllergyRepository.findByPatientId(patientId);
            allergyDtos = patientAllergies.stream()
                    .map(a -> PatientAllergyItemDto.builder()
                            .id(a.getId())
                            .allergen(a.getAllergen())
                            .severity(a.getSeverity() != null ? a.getSeverity().name() : "MILD")
                            .note(a.getNote())
                            .build())
                    .toList();
        }

        PrescriptionSafetyCheckRequest safetyRequest = PrescriptionSafetyCheckRequest.builder()
                .visitId(visitId)
                .patientId(patientId)
                .patientAllergies(allergyDtos)
                .drugs(drugs)
                .build();

        PrescriptionSafetyResponse safetyResponse = checkPrescriptionSafety(safetyRequest);

        // NFR-8: Bắt buộc log mọi gợi ý / cảnh báo AI vào bảng ai_clinical_suggestions
        saveAuditLogs(visit, safetyRequest, safetyResponse);

        return safetyResponse;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AiAuditLogResponse> getAuditLogsByVisitId(Long visitId) {
        log.info("Lấy lịch sử audit log AI cho lượt khám ID: {}", visitId);
        return suggestionRepository.findByVisitIdOrderByCreatedAtDesc(visitId)
                .stream()
                .map(AiAuditLogResponse::fromEntity)
                .toList();
    }

    // =========================================================================
    // PRIVATE AUDIT LOGGING HELPER
    // =========================================================================
    private void saveAuditLogs(Visit visit, PrescriptionSafetyCheckRequest req, PrescriptionSafetyResponse res) {
        try {
            String inputJson = objectMapper.writeValueAsString(req);

            // 1. Log tương tác thuốc nếu phát hiện
            if (res.getInteractionCount() != null && res.getInteractionCount() > 0) {
                String outputJson = objectMapper.writeValueAsString(res.getInteractions());
                AiClinicalSuggestion interactionSuggestion = AiClinicalSuggestion.builder()
                        .visit(visit)
                        .suggestionType(AiSuggestionType.DRUG_INTERACTION)
                        .inputSnapshot(inputJson)
                        .outputContent(outputJson)
                        .confidenceScore(res.getConfidenceScore())
                        .build();
                suggestionRepository.save(interactionSuggestion);
                log.info("Đã lưu audit log DRUG_INTERACTION cho lượt khám ID: {}", visit.getId());
            }

            // 2. Log dị ứng thuốc nếu phát hiện
            if (res.getAllergyCount() != null && res.getAllergyCount() > 0) {
                String outputJson = objectMapper.writeValueAsString(res.getAllergyAlerts());
                AiClinicalSuggestion allergySuggestion = AiClinicalSuggestion.builder()
                        .visit(visit)
                        .suggestionType(AiSuggestionType.ALLERGY_ALERT)
                        .inputSnapshot(inputJson)
                        .outputContent(outputJson)
                        .confidenceScore(res.getConfidenceScore())
                        .build();
                suggestionRepository.save(allergySuggestion);
                log.info("Đã lưu audit log ALLERGY_ALERT cho lượt khám ID: {}", visit.getId());
            }

            // 3. Nếu đơn an toàn không có cảnh báo, vẫn lưu 1 bản ghi DRUG_INTERACTION với output rỗng để phục vụ audit
            if (!res.getHasWarning()) {
                String outputJson = objectMapper.writeValueAsString(Collections.singletonMap("status", "SAFE"));
                AiClinicalSuggestion safeSuggestion = AiClinicalSuggestion.builder()
                        .visit(visit)
                        .suggestionType(AiSuggestionType.DRUG_INTERACTION)
                        .inputSnapshot(inputJson)
                        .outputContent(outputJson)
                        .confidenceScore(res.getConfidenceScore())
                        .build();
                suggestionRepository.save(safeSuggestion);
            }
        } catch (Exception e) {
            log.error("Không thể ghi audit log AI vào bảng ai_clinical_suggestions: {}", e.getMessage(), e);
        }
    }

    // =========================================================================
    // LOCAL FALLBACK LOGIC
    // =========================================================================
    private InteractionCheckResponse fallbackCheckInteractions(List<DrugItemDto> drugs) {
        List<Long> drugIds = drugs.stream()
                .map(DrugItemDto::getId)
                .filter(Objects::nonNull)
                .toList();

        List<DrugInteractionWarningDto> warnings = new ArrayList<>();
        if (drugIds.size() >= 2) {
            List<DrugInteraction> interactions = drugInteractionRepository.findInteractionsAmongDrugs(drugIds);
            for (DrugInteraction di : interactions) {
                String sev = di.getSeverity() != null ? di.getSeverity().name() : "WARNING";
                warnings.add(DrugInteractionWarningDto.builder()
                        .drugAId(di.getDrugA().getId())
                        .drugAName(di.getDrugA().getName())
                        .drugBId(di.getDrugB().getId())
                        .drugBName(di.getDrugB().getName())
                        .severity(sev.equals("SEVERE") ? "CRITICAL" : (sev.equals("MODERATE") ? "WARNING" : "INFO"))
                        .mechanism("Tương tác giữa " + di.getDrugA().getName() + " và " + di.getDrugB().getName())
                        .description(di.getDescription())
                        .recommendation("Cân nhắc điều chỉnh hoặc đổi thuốc thay thế.")
                        .build());
            }
        }

        boolean hasInter = !warnings.isEmpty();
        boolean hasCrit = warnings.stream().anyMatch(w -> "CRITICAL".equals(w.getSeverity()));

        return InteractionCheckResponse.builder()
                .hasInteraction(hasInter)
                .hasCritical(hasCrit)
                .totalInteractions(warnings.size())
                .interactions(warnings)
                .confidenceScore(new BigDecimal("0.90"))
                .disclaimer(PrescriptionSafetyResponse.DEFAULT_DISCLAIMER)
                .build();
    }

    private AllergyCheckResponse fallbackCheckAllergies(List<PatientAllergyItemDto> allergies, List<DrugItemDto> drugs) {
        List<AllergyWarningDto> alerts = new ArrayList<>();

        for (DrugItemDto drug : drugs) {
            String drugName = (drug.getName() != null ? drug.getName() : "").toLowerCase();
            for (PatientAllergyItemDto allergy : allergies) {
                String allergen = (allergy.getAllergen() != null ? allergy.getAllergen() : "").toLowerCase().trim();
                if (!allergen.isEmpty() && drugName.contains(allergen)) {
                    alerts.add(AllergyWarningDto.builder()
                            .drugId(drug.getId())
                            .drugName(drug.getName())
                            .allergen(allergy.getAllergen())
                            .reactionType("DIRECT_MATCH")
                            .severity("CRITICAL")
                            .description("Bệnh nhân có tiền sử dị ứng trực tiếp với " + allergy.getAllergen())
                            .recommendation("Chống chỉ định thuốc này, chuyển sang nhóm thuốc thay thế.")
                            .build());
                }
            }
        }

        boolean hasConflict = !alerts.isEmpty();
        return AllergyCheckResponse.builder()
                .hasAllergyConflict(hasConflict)
                .hasCritical(hasConflict)
                .totalAlerts(alerts.size())
                .alerts(alerts)
                .confidenceScore(new BigDecimal("0.90"))
                .disclaimer(PrescriptionSafetyResponse.DEFAULT_DISCLAIMER)
                .build();
    }
}
