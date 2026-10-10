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
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;
import java.util.regex.Pattern;

import static com.hospital.hmsai.ai.util.VietnameseTextMatcher.normalize;
import static com.hospital.hmsai.ai.util.VietnameseTextMatcher.stripDiacritics;

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

        // Bảng drug_interactions (dữ liệu đã kiểm duyệt) LUÔN được tra cứu để AI bỏ sót không che mất cặp SEVERE
        List<DrugInteractionWarningDto> dbInteractions = findDbInteractions(request.getDrugs());

        String url = aiServiceBaseUrl + "/api/v1/ai/clinical/check-interaction";
        try {
            log.info("Gọi AI Service kiểm tra tương tác thuốc tại: {}", url);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<InteractionCheckRequest> entity = new HttpEntity<>(request, headers);

            InteractionCheckResponse response = restTemplate.postForObject(url, entity, InteractionCheckResponse.class);
            if (response != null) {
                List<DrugInteractionWarningDto> merged =
                        mergeInteractions(response.getInteractions(), dbInteractions, request.getDrugs());
                response.setInteractions(merged);
                response.setTotalInteractions(merged.size());
                response.setHasInteraction(!merged.isEmpty());
                response.setHasCritical(Boolean.TRUE.equals(response.getHasCritical()) || hasSeverity(merged, "CRITICAL"));
                return response;
            }
        } catch (Exception e) {
            log.warn("AI Service check-interaction không phản hồi hoặc lỗi ({}), chuyển sang cơ chế fallback nội bộ", e.getMessage());
        }

        // Fallback local: Dựa trên bảng drug_interactions trong DB
        return buildInteractionResponse(dbInteractions);
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

        // Bảng drug_interactions LUÔN được hợp nhất với kết quả AI (AI bỏ sót không che mất cặp SEVERE trong DB)
        List<DrugInteractionWarningDto> dbInteractions = findDbInteractions(request.getDrugs());

        String url = aiServiceBaseUrl + "/api/v1/ai/clinical/check-prescription-safety";
        try {
            log.info("Gọi AI Service kiểm tra an toàn tổng hợp tại: {}", url);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<PrescriptionSafetyCheckRequest> entity = new HttpEntity<>(request, headers);

            PrescriptionSafetyResponse response = restTemplate.postForObject(url, entity, PrescriptionSafetyResponse.class);
            if (response != null) {
                List<DrugInteractionWarningDto> merged =
                        mergeInteractions(response.getInteractions(), dbInteractions, request.getDrugs());
                List<AllergyWarningDto> allergyAlerts =
                        response.getAllergyAlerts() != null ? response.getAllergyAlerts() : List.of();
                boolean hasAllergyConflict = !allergyAlerts.isEmpty()
                        || (response.getAllergyCount() != null && response.getAllergyCount() > 0);
                // Tương tác mức INFO chỉ mang tính thông tin: không làm đơn "không an toàn"
                boolean hasWarning = hasActionableInteraction(merged) || hasAllergyConflict;
                boolean hasCritical = Boolean.TRUE.equals(response.getHasCritical())
                        || hasSeverity(merged, "CRITICAL")
                        || allergyAlerts.stream().anyMatch(a -> "CRITICAL".equals(a.getSeverity()));

                response.setInteractions(merged);
                response.setInteractionCount(merged.size());
                response.setHasWarning(hasWarning);
                response.setHasCritical(hasCritical);
                response.setIsSafe(!hasWarning);
                return response;
            }
        } catch (Exception e) {
            log.warn("AI Service check-prescription-safety không phản hồi ({}), chuyển sang fallback tổng hợp", e.getMessage());
        }

        // Fallback tổng hợp
        InteractionCheckResponse interactionRes = buildInteractionResponse(dbInteractions);
        AllergyCheckResponse allergyRes = fallbackCheckAllergies(request.getPatientAllergies(), request.getDrugs());

        boolean hasWarning = hasActionableInteraction(interactionRes.getInteractions()) || allergyRes.getHasAllergyConflict();
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

    /**
     * NOT_SUPPORTED: tạm treo transaction của caller (vd VisitServiceImpl.createPrescription) trong lúc gọi AI và
     * ghi audit log. Mỗi lần save audit chạy trong transaction riêng của repository, nên lỗi ở đây (kể cả lỗi
     * INSERT audit bị repository đánh dấu rollback-only) không thể "đầu độc" transaction lưu đơn thuốc của caller.
     * Lỗi ghi audit được bắt và log trong saveAuditLogs(); lỗi tra cứu DB tương tác được bắt trong findDbInteractions().
     */
    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
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
    private static final Map<String, Integer> SEVERITY_RANK = Map.of("CRITICAL", 3, "WARNING", 2, "INFO", 1);

    private static int severityRank(String severity) {
        return severity == null ? 0 : SEVERITY_RANK.getOrDefault(severity, 0);
    }

    private static boolean hasSeverity(List<DrugInteractionWarningDto> interactions, String severity) {
        return interactions != null && interactions.stream().anyMatch(w -> severity.equals(w.getSeverity()));
    }

    /** Có tương tác cần xử trí (CRITICAL / WARNING). Tương tác INFO không làm đơn "không an toàn". */
    private static boolean hasActionableInteraction(List<DrugInteractionWarningDto> interactions) {
        return interactions != null && interactions.stream().anyMatch(w -> severityRank(w.getSeverity()) >= 2);
    }

    /** Tra cứu bảng drug_interactions; lỗi DB không được làm hỏng luồng kiểm tra (trả danh sách rỗng). */
    private List<DrugInteractionWarningDto> findDbInteractions(List<DrugItemDto> drugs) {
        List<Long> drugIds = drugs.stream()
                .map(DrugItemDto::getId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<DrugInteractionWarningDto> warnings = new ArrayList<>();
        if (drugIds.size() < 2) {
            return warnings;
        }
        try {
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
        } catch (Exception e) {
            log.error("Không tra cứu được bảng drug_interactions: {}", e.getMessage(), e);
        }
        return warnings;
    }

    private InteractionCheckResponse buildInteractionResponse(List<DrugInteractionWarningDto> warnings) {
        List<DrugInteractionWarningDto> sorted = mergeInteractions(warnings, List.of(), List.of());
        return InteractionCheckResponse.builder()
                .hasInteraction(!sorted.isEmpty())
                .hasCritical(hasSeverity(sorted, "CRITICAL"))
                .totalInteractions(sorted.size())
                .interactions(sorted)
                .confidenceScore(new BigDecimal("0.90"))
                .disclaimer(PrescriptionSafetyResponse.DEFAULT_DISCLAIMER)
                .build();
    }

    /**
     * Hợp nhất tương tác từ AI với bảng drug_interactions theo cặp thuốc (không phân biệt thứ tự A-B / B-A).
     * Cặp đã có trong kết quả AI: giữ kết quả AI nếu mức độ ≥ DB, ngược lại thay bằng bản ghi DB (mức nặng hơn).
     * Kết quả được sắp xếp CRITICAL > WARNING > INFO.
     */
    static List<DrugInteractionWarningDto> mergeInteractions(List<DrugInteractionWarningDto> aiInteractions,
                                                             List<DrugInteractionWarningDto> dbInteractions,
                                                             List<DrugItemDto> requestDrugs) {
        Map<String, Long> idByName = new HashMap<>();
        if (requestDrugs != null) {
            for (DrugItemDto d : requestDrugs) {
                if (d.getId() != null && d.getName() != null) {
                    idByName.putIfAbsent(normalize(d.getName()), d.getId());
                }
            }
        }

        Map<String, List<DrugInteractionWarningDto>> byPair = new LinkedHashMap<>();
        if (aiInteractions != null) {
            for (DrugInteractionWarningDto w : aiInteractions) {
                byPair.computeIfAbsent(pairKey(w, idByName), k -> new ArrayList<>()).add(w);
            }
        }
        if (dbInteractions != null) {
            for (DrugInteractionWarningDto w : dbInteractions) {
                String key = pairKey(w, idByName);
                List<DrugInteractionWarningDto> existing = byPair.get(key);
                int existingMax = existing == null ? 0
                        : existing.stream().mapToInt(x -> severityRank(x.getSeverity())).max().orElse(0);
                if (existing == null || severityRank(w.getSeverity()) > existingMax) {
                    byPair.put(key, new ArrayList<>(List.of(w)));
                }
            }
        }

        List<DrugInteractionWarningDto> merged = new ArrayList<>();
        byPair.values().forEach(merged::addAll);
        merged.sort(Comparator.comparingInt((DrugInteractionWarningDto w) -> severityRank(w.getSeverity())).reversed());
        return merged;
    }

    private static String pairKey(DrugInteractionWarningDto w, Map<String, Long> idByName) {
        String a = drugKey(w.getDrugAId(), w.getDrugAName(), idByName);
        String b = drugKey(w.getDrugBId(), w.getDrugBName(), idByName);
        return a.compareTo(b) <= 0 ? a + "|" + b : b + "|" + a;
    }

    private static String drugKey(Long id, String name, Map<String, Long> idByName) {
        Long resolved = id != null ? id : idByName.get(normalize(name));
        return resolved != null ? "id:" + resolved : "name:" + normalize(name);
    }

    // -------------------------------------------------------------------------
    // Fallback dị ứng: chuẩn hóa (bỏ dấu, chính tả Việt hóa), so khớp 2 chiều theo NGUYÊN TỪ, họ thuốc
    // -------------------------------------------------------------------------
    private static final int MIN_ALLERGEN_LEN = 3;

    /** Họ dị ứng: dị nguyên thuộc họ -> thuốc cùng họ (nguy cơ cao) và thuốc dị ứng chéo (nguy cơ thấp hơn). */
    private record AllergyClass(String family, Pattern allergen, Pattern sameClassDrug, Pattern crossDrug) {
    }

    private static Pattern wordPattern(String alternatives) {
        return Pattern.compile("(?<![a-z0-9])(?:" + alternatives + ")(?![a-z0-9])");
    }

    // Mẫu viết ở dạng chính tắc canon(): bỏ dấu, ph->f, th->t, y->i, bỏ chữ đôi, bỏ 'e' cuối
    private static final String PENICILLIN = "\\w*cilin|augmentin|unasin|tazocin";
    private static final String CEPHALOSPORIN = "cef\\w*";
    private static final String CARBAPENEM = "\\w*penem";
    private static final String NSAID_NON_SELECTIVE =
            "nsaid|aspirin|acetilsalicilic|ibuprofen|diclofenac|naproxen|meloxicam|ketorolac|piroxicam|indometacin|ketoprofen";
    private static final String SULFONAMIDE =
            "sulfametoxazol|cotrimoxazol|bactrim|biseptol|sulfadiazin|sulfasalazin|sulfonamid|sulfamid";

    private static final List<AllergyClass> ALLERGY_CLASSES = List.of(
            new AllergyClass("Penicillin / Beta-lactam",
                    wordPattern(PENICILLIN + "|betalactam|clavulanat|clavulanic"),
                    wordPattern(PENICILLIN), wordPattern(CEPHALOSPORIN + "|" + CARBAPENEM)),
            new AllergyClass("Cephalosporin",
                    wordPattern(CEPHALOSPORIN + "|betalactam"),
                    wordPattern(CEPHALOSPORIN), wordPattern(PENICILLIN + "|" + CARBAPENEM)),
            new AllergyClass("NSAID / Aspirin",
                    wordPattern(NSAID_NON_SELECTIVE + "|celecoxib|etoricoxib|khang viem khong steroid"),
                    wordPattern(NSAID_NON_SELECTIVE), wordPattern("celecoxib|etoricoxib")),
            new AllergyClass("Sulfonamide (Sulfa)",
                    wordPattern(SULFONAMIDE + "|sulfa"),
                    wordPattern(SULFONAMIDE), null)
    );

    /** Dạng chính tắc tên thuốc (đồng bộ với _canon() trong ai-service/services/clinical_alert_service.py). */
    static String canonDrugText(String text) {
        String t = stripDiacritics(normalize(text)).replace("-", "");
        t = t.replace("ph", "f").replace("chl", "cl").replace("th", "t").replace("y", "i");
        t = t.replaceAll("([a-z])\\1+", "$1");
        return t.replaceAll("\\b([a-z]{4,})e\\b", "$1");
    }

    /** {@code needle} xuất hiện NGUYÊN TỪ trong {@code haystack} (cả hai đã canon). */
    private static boolean containsWord(String haystack, String needle) {
        if (needle.replace(" ", "").length() < MIN_ALLERGEN_LEN) {
            return false;
        }
        return Pattern.compile("(?<![a-z0-9])" + Pattern.quote(needle) + "(?![a-z0-9])").matcher(haystack).find();
    }

    private AllergyCheckResponse fallbackCheckAllergies(List<PatientAllergyItemDto> allergies, List<DrugItemDto> drugs) {
        List<AllergyWarningDto> alerts = new ArrayList<>();
        if (allergies == null) {
            allergies = List.of();
        }

        for (DrugItemDto drug : drugs) {
            String drugName = canonDrugText(drug.getName());
            String drugText = canonDrugText((drug.getName() != null ? drug.getName() : "") + " "
                    + (drug.getActiveIngredient() != null ? drug.getActiveIngredient() : ""));
            for (PatientAllergyItemDto allergy : allergies) {
                String allergen = canonDrugText(allergy.getAllergen());
                // Bỏ qua dị nguyên rỗng / quá ngắn (tránh khớp nhầm mọi thuốc)
                if (allergen.replace(" ", "").length() < MIN_ALLERGEN_LEN) {
                    continue;
                }
                boolean severe = "SEVERE".equalsIgnoreCase(allergy.getSeverity() != null ? allergy.getSeverity().trim() : "");

                AllergyWarningDto alert = null;
                // 1. Trùng trực tiếp, 2 chiều, theo nguyên từ ("Sulfa" KHÔNG khớp "Magnesium sulfate")
                if (containsWord(drugText, allergen) || containsWord(allergen, drugName)) {
                    alert = buildAllergyAlert(drug, allergy, "DIRECT_MATCH", "CRITICAL",
                            "Bệnh nhân có tiền sử dị ứng trực tiếp với " + allergy.getAllergen(),
                            "Chống chỉ định thuốc này, chuyển sang nhóm thuốc thay thế.");
                } else {
                    // 2. Theo họ thuốc
                    for (AllergyClass cls : ALLERGY_CLASSES) {
                        if (!cls.allergen().matcher(allergen).find()) {
                            continue;
                        }
                        if (cls.sameClassDrug().matcher(drugText).find()) {
                            alert = buildAllergyAlert(drug, allergy, "CROSS_REACTIVITY", "CRITICAL",
                                    "Thuốc cùng họ " + cls.family() + " với dị nguyên '" + allergy.getAllergen()
                                            + "' – nguy cơ dị ứng chéo cao.",
                                    "Chống chỉ định cả nhóm " + cls.family() + ", chọn nhóm thuốc khác.");
                            break;
                        }
                        if (cls.crossDrug() != null && cls.crossDrug().matcher(drugText).find()) {
                            alert = buildAllergyAlert(drug, allergy, "CROSS_REACTIVITY", severe ? "CRITICAL" : "WARNING",
                                    "Nguy cơ dị ứng chéo với họ " + cls.family() + " (dị nguyên '" + allergy.getAllergen() + "')"
                                            + (severe ? ". Tiền sử dị ứng mức độ NẶNG nên nâng lên mức nghiêm trọng." : "."),
                                    severe ? "Chống chỉ định do tiền sử dị ứng nặng; chọn nhóm thuốc khác."
                                            : "Thận trọng, cân nhắc test da hoặc chọn nhóm thuốc khác.");
                            break;
                        }
                    }
                }
                if (alert != null) {
                    alerts.add(alert);
                }
            }
        }

        alerts.sort(Comparator.comparingInt((AllergyWarningDto a) -> severityRank(a.getSeverity())).reversed());
        boolean hasConflict = !alerts.isEmpty();
        return AllergyCheckResponse.builder()
                .hasAllergyConflict(hasConflict)
                .hasCritical(alerts.stream().anyMatch(a -> "CRITICAL".equals(a.getSeverity())))
                .totalAlerts(alerts.size())
                .alerts(alerts)
                .confidenceScore(new BigDecimal("0.90"))
                .disclaimer(PrescriptionSafetyResponse.DEFAULT_DISCLAIMER)
                .build();
    }

    private static AllergyWarningDto buildAllergyAlert(DrugItemDto drug, PatientAllergyItemDto allergy, String reactionType,
                                                       String severity, String description, String recommendation) {
        return AllergyWarningDto.builder()
                .drugId(drug.getId())
                .drugName(drug.getName())
                .allergen(allergy.getAllergen())
                .reactionType(reactionType)
                .severity(severity)
                .description(description)
                .recommendation(recommendation)
                .build();
    }

    // =========================================================================
    // DIAGNOSIS SUGGESTION (FR-11.3 – Sprint 6)
    // =========================================================================

    @Override
    public DiagnosisSuggestionResponse suggestDiagnosis(DiagnosisSuggestionRequest request) {
        if (request == null || request.getSymptoms() == null || request.getSymptoms().trim().length() < 2) {
            return DiagnosisSuggestionResponse.builder()
                    .totalSuggestions(0)
                    .suggestions(Collections.emptyList())
                    .build();
        }

        String url = aiServiceBaseUrl + "/api/v1/ai/clinical/suggest-diagnosis";
        try {
            log.info("Gọi AI Service gợi ý chẩn đoán tại: {}", url);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Chuyển sang snake_case cho FastAPI
            Map<String, Object> payload = new HashMap<>();
            payload.put("symptoms", request.getSymptoms());
            if (request.getPatientAge() != null) payload.put("patient_age", request.getPatientAge());
            if (request.getPatientGender() != null) payload.put("patient_gender", request.getPatientGender());
            if (request.getMedicalHistory() != null) payload.put("medical_history", request.getMedicalHistory());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            DiagnosisSuggestionResponse response = restTemplate.postForObject(url, entity, DiagnosisSuggestionResponse.class);
            if (response != null && response.getSuggestions() != null && !response.getSuggestions().isEmpty()) {
                return response;
            }
        } catch (Exception e) {
            log.warn("AI Service suggest-diagnosis không phản hồi ({}), chuyển sang fallback nội bộ", e.getMessage());
        }

        // Fallback local
        return fallbackSuggestDiagnosis(request.getSymptoms());
    }

    /** Cùng lý do với checkAndAuditPrescriptionSafety: không tham gia (và không làm hỏng) transaction của caller. */
    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public DiagnosisSuggestionResponse suggestAndAuditDiagnosis(Long visitId, DiagnosisSuggestionRequest request) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new ResourceNotFoundException("Lượt khám", "id", visitId));

        DiagnosisSuggestionResponse response = suggestDiagnosis(request);

        // NFR-8: Ghi audit log DIAGNOSIS_SUGGESTION
        saveDiagnosisAuditLog(visit, request, response);

        return response;
    }

    private void saveDiagnosisAuditLog(Visit visit, DiagnosisSuggestionRequest request, DiagnosisSuggestionResponse response) {
        try {
            String inputJson = objectMapper.writeValueAsString(request);
            String outputJson = objectMapper.writeValueAsString(response.getSuggestions());

            AiClinicalSuggestion suggestion = AiClinicalSuggestion.builder()
                    .visit(visit)
                    .suggestionType(AiSuggestionType.DIAGNOSIS_SUGGESTION)
                    .inputSnapshot(inputJson)
                    .outputContent(outputJson)
                    .confidenceScore(response.getConfidenceScore())
                    .build();
            suggestionRepository.save(suggestion);
            log.info("Đã lưu audit log DIAGNOSIS_SUGGESTION cho lượt khám ID: {}", visit.getId());
        } catch (Exception e) {
            log.error("Không thể ghi audit log DIAGNOSIS_SUGGESTION: {}", e.getMessage(), e);
        }
    }

    /**
     * Fallback gợi ý chẩn đoán cục bộ khi AI Service không khả dụng.
     * Dùng rule-based keyword matching đơn giản.
     */
    private DiagnosisSuggestionResponse fallbackSuggestDiagnosis(String symptoms) {
        String lower = symptoms.toLowerCase();

        // Cơ sở tri thức rút gọn cho fallback
        Map<String[], List<DiagnosisSuggestionItem>> knowledgeBase = new LinkedHashMap<>();

        knowledgeBase.put(
                new String[]{"đau ngực", "tức ngực", "huyết áp", "hoa mắt", "chóng mặt", "khó thở"},
                List.of(
                        DiagnosisSuggestionItem.builder().code("I10").name("Tăng huyết áp vô căn (nguyên phát)").confidence(94.0).reason("Triệu chứng đau tức ngực, chóng mặt phù hợp với biến thiên huyết áp cao").build(),
                        DiagnosisSuggestionItem.builder().code("I20.9").name("Cơn đau thắt ngực, không đặc hiệu").confidence(85.0).reason("Cần theo dõi điện tim và men tim Troponin").build(),
                        DiagnosisSuggestionItem.builder().code("I25.1").name("Bệnh tim thiếu máu cục bộ xơ vữa").confidence(78.0).reason("Nguy cơ bệnh mạch vành mạn tính").build()
                )
        );

        knowledgeBase.put(
                new String[]{"ho", "sốt", "đờm", "rát họng", "viêm họng", "khàn tiếng"},
                List.of(
                        DiagnosisSuggestionItem.builder().code("J00").name("Viêm mũi họng cấp (Cảm lạnh)").confidence(96.0).reason("Hội chứng viêm long đường hô hấp trên cấp tính").build(),
                        DiagnosisSuggestionItem.builder().code("J02.9").name("Viêm họng cấp, không đặc hiệu").confidence(88.0).reason("Đau rát họng tăng khi nuốt kèm sung huyết niêm mạc").build(),
                        DiagnosisSuggestionItem.builder().code("J20.9").name("Viêm phế quản cấp, không đặc hiệu").confidence(82.0).reason("Ho khan chuyển ho đờm kèm sốt nhẹ").build()
                )
        );

        knowledgeBase.put(
                new String[]{"đau bụng", "dạ dày", "ợ chua", "buồn nôn", "thượng vị"},
                List.of(
                        DiagnosisSuggestionItem.builder().code("K29.7").name("Viêm dạ dày, không đặc hiệu").confidence(95.0).reason("Đau quặn vùng thượng vị, ợ hơi ợ chua sau ăn").build(),
                        DiagnosisSuggestionItem.builder().code("K21.9").name("Bệnh trào ngược dạ dày - thực quản").confidence(89.0).reason("Ợ nóng rát sau xương ức và đắng miệng").build(),
                        DiagnosisSuggestionItem.builder().code("K58.9").name("Hội chứng ruột kích thích (IBS)").confidence(76.0).reason("Rối loạn tiêu hóa mạn tính liên quan stress").build()
                )
        );

        knowledgeBase.put(
                new String[]{"đái tháo đường", "tiểu đường", "khát nước", "sụt cân", "tiểu nhiều"},
                List.of(
                        DiagnosisSuggestionItem.builder().code("E11.9").name("Đái tháo đường typ 2 không biến chứng").confidence(93.0).reason("Bộ ba: ăn nhiều, uống nhiều, tiểu nhiều kèm sụt cân").build(),
                        DiagnosisSuggestionItem.builder().code("E14.9").name("Đái tháo đường không đặc hiệu").confidence(84.0).reason("Cần xét nghiệm HbA1c và đường huyết lúc đói").build()
                )
        );

        knowledgeBase.put(
                new String[]{"vai gáy", "cột sống", "đau lưng", "thoái hóa", "tê bì"},
                List.of(
                        DiagnosisSuggestionItem.builder().code("M54.2").name("Đau cổ gáy (Cervicalgia)").confidence(92.0).reason("Co cứng cơ cạnh cột sống cổ và đau mỏi vai gáy").build(),
                        DiagnosisSuggestionItem.builder().code("M47.8").name("Thoái hóa cột sống khác").confidence(86.0).reason("Đau âm ỉ cột sống tăng khi vận động").build(),
                        DiagnosisSuggestionItem.builder().code("M54.5").name("Đau thắt lưng (Low back pain)").confidence(80.0).reason("Hạn chế tầm vận động thắt lưng").build()
                )
        );

        // Match
        for (Map.Entry<String[], List<DiagnosisSuggestionItem>> entry : knowledgeBase.entrySet()) {
            for (String keyword : entry.getKey()) {
                if (lower.contains(keyword)) {
                    List<DiagnosisSuggestionItem> suggestions = entry.getValue();
                    return DiagnosisSuggestionResponse.builder()
                            .suggestions(suggestions.size() > 3 ? suggestions.subList(0, 3) : suggestions)
                            .totalSuggestions(Math.min(suggestions.size(), 3))
                            .confidenceScore(new BigDecimal("0.90"))
                            .disclaimer(DiagnosisSuggestionResponse.DEFAULT_DISCLAIMER)
                            .build();
                }
            }
        }

        // Default: không khớp
        List<DiagnosisSuggestionItem> defaultSuggestions = List.of(
                DiagnosisSuggestionItem.builder().code("R69").name("Nguyên nhân gây bệnh chưa xác định").confidence(70.0)
                        .reason("Triệu chứng chưa đủ đặc hiệu để gợi ý chẩn đoán cụ thể. Cần chỉ định thêm cận lâm sàng.").build(),
                DiagnosisSuggestionItem.builder().code("Z00.0").name("Khám sức khỏe tổng quát định kỳ").confidence(65.0)
                        .reason("Tầm soát đánh giá chức năng các cơ quan.").build()
        );

        return DiagnosisSuggestionResponse.builder()
                .suggestions(defaultSuggestions)
                .totalSuggestions(defaultSuggestions.size())
                .confidenceScore(new BigDecimal("0.70"))
                .disclaimer(DiagnosisSuggestionResponse.DEFAULT_DISCLAIMER)
                .build();
    }
}
