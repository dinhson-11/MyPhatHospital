package com.hospital.hmsai.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.hmsai.ai.dto.*;
import com.hospital.hmsai.ai.entity.AiClinicalSuggestion;
import com.hospital.hmsai.ai.entity.AiSuggestionType;
import com.hospital.hmsai.ai.repository.AiClinicalSuggestionRepository;
import com.hospital.hmsai.ai.service.impl.AiClinicalServiceImpl;
import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.repository.VisitRepository;
import com.hospital.hmsai.patient.entity.AllergySeverity;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.entity.PatientAllergy;
import com.hospital.hmsai.patient.repository.PatientAllergyRepository;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.pharmacy.entity.DrugInteraction;
import com.hospital.hmsai.pharmacy.entity.InteractionSeverity;
import com.hospital.hmsai.pharmacy.repository.DrugInteractionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiClinicalServiceImplTest {

    @Mock
    private RestTemplate restTemplate;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private VisitRepository visitRepository;

    @Mock
    private PatientAllergyRepository patientAllergyRepository;

    @Mock
    private DrugInteractionRepository drugInteractionRepository;

    @Mock
    private AiClinicalSuggestionRepository suggestionRepository;

    @InjectMocks
    private AiClinicalServiceImpl aiClinicalService;

    private Patient testPatient;
    private Visit testVisit;
    private Drug drugAspirin;
    private Drug drugWarfarin;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(aiClinicalService, "aiServiceBaseUrl", "http://localhost:8000");

        testPatient = Patient.builder().id(10L).fullName("Trần Thị Hoa").build();
        testVisit = Visit.builder().id(50L).patient(testPatient).build();

        drugAspirin = Drug.builder().id(3L).code("DRUG-ASP-81").name("Aspirin 81mg").build();
        drugWarfarin = Drug.builder().id(4L).code("DRUG-WAR-5").name("Warfarin 5mg").build();
    }

    @Test
    @DisplayName("Kiểm tra tương tác thuốc thành công qua FastAPI AI Service")
    void testCheckInteractions_AiServiceSuccess() {
        InteractionCheckRequest request = InteractionCheckRequest.builder()
                .drugs(List.of(
                        DrugItemDto.builder().id(3L).name("Aspirin 81mg").build(),
                        DrugItemDto.builder().id(4L).name("Warfarin 5mg").build()
                ))
                .build();

        InteractionCheckResponse mockResponse = InteractionCheckResponse.builder()
                .hasInteraction(true)
                .hasCritical(true)
                .totalInteractions(1)
                .interactions(List.of(
                        DrugInteractionWarningDto.builder()
                                .drugAName("Aspirin 81mg")
                                .drugBName("Warfarin 5mg")
                                .severity("CRITICAL")
                                .description("Nguy cơ xuất huyết tiêu hóa nghiêm trọng")
                                .recommendation("Tránh phối hợp")
                                .build()
                ))
                .disclaimer(PrescriptionSafetyResponse.DEFAULT_DISCLAIMER)
                .build();

        when(restTemplate.postForObject(contains("/check-interaction"), any(), eq(InteractionCheckResponse.class)))
                .thenReturn(mockResponse);

        InteractionCheckResponse response = aiClinicalService.checkInteractions(request);

        assertNotNull(response);
        assertTrue(response.getHasInteraction());
        assertTrue(response.getHasCritical());
        assertEquals(1, response.getTotalInteractions());
        assertEquals("CRITICAL", response.getInteractions().get(0).getSeverity());
        assertTrue(response.getDisclaimer().contains("tham khảo"));
    }

    @Test
    @DisplayName("Fallback local an toàn khi FastAPI AI Service bị lỗi hoặc timeout")
    void testCheckInteractions_FallbackToLocalDatabase() {
        InteractionCheckRequest request = InteractionCheckRequest.builder()
                .drugs(List.of(
                        DrugItemDto.builder().id(3L).name("Aspirin 81mg").build(),
                        DrugItemDto.builder().id(4L).name("Warfarin 5mg").build()
                ))
                .build();

        // AI service ném exception (timeout / connection refused)
        when(restTemplate.postForObject(contains("/check-interaction"), any(), eq(InteractionCheckResponse.class)))
                .thenThrow(new RestClientException("Connection timed out"));

        // Fallback tra cứu DB
        DrugInteraction dbInteraction = DrugInteraction.builder()
                .id(1L)
                .drugA(drugAspirin)
                .drugB(drugWarfarin)
                .severity(InteractionSeverity.SEVERE)
                .description("Tăng nguy cơ xuất huyết tiêu hóa")
                .build();

        when(drugInteractionRepository.findInteractionsAmongDrugs(anyCollection()))
                .thenReturn(List.of(dbInteraction));

        InteractionCheckResponse response = aiClinicalService.checkInteractions(request);

        assertNotNull(response);
        assertTrue(response.getHasInteraction());
        assertTrue(response.getHasCritical());
        assertEquals(1, response.getTotalInteractions());
        assertEquals("Aspirin 81mg", response.getInteractions().get(0).getDrugAName());
        assertTrue(response.getDisclaimer().contains("tham khảo"));
        verify(drugInteractionRepository).findInteractionsAmongDrugs(anyCollection());
    }

    @Test
    @DisplayName("Kiểm tra dị ứng thuốc thành công qua FastAPI AI Service")
    void testCheckAllergies_AiServiceSuccess() {
        AllergyCheckRequest request = AllergyCheckRequest.builder()
                .patientId(10L)
                .patientAllergies(List.of(
                        PatientAllergyItemDto.builder().allergen("Penicillin").severity("SEVERE").build()
                ))
                .drugs(List.of(
                        DrugItemDto.builder().id(5L).name("Amoxicillin 500mg").build()
                ))
                .build();

        AllergyCheckResponse mockResponse = AllergyCheckResponse.builder()
                .hasAllergyConflict(true)
                .hasCritical(true)
                .totalAlerts(1)
                .alerts(List.of(
                        AllergyWarningDto.builder()
                                .drugName("Amoxicillin 500mg")
                                .allergen("Penicillin")
                                .reactionType("DIRECT_MATCH")
                                .severity("CRITICAL")
                                .description("Nguy cơ sốc phản vệ")
                                .recommendation("Chống chỉ định tuyệt đối")
                                .build()
                ))
                .disclaimer(PrescriptionSafetyResponse.DEFAULT_DISCLAIMER)
                .build();

        when(restTemplate.postForObject(contains("/check-allergy"), any(), eq(AllergyCheckResponse.class)))
                .thenReturn(mockResponse);

        AllergyCheckResponse response = aiClinicalService.checkAllergies(request);

        assertNotNull(response);
        assertTrue(response.getHasAllergyConflict());
        assertTrue(response.getHasCritical());
        assertEquals("DIRECT_MATCH", response.getAlerts().get(0).getReactionType());
    }

    @Test
    @DisplayName("Kiểm tra an toàn đơn thuốc và lưu audit log vào ai_clinical_suggestions (NFR-8)")
    void testCheckAndAuditPrescriptionSafety_SavesAuditLog() {
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));

        PatientAllergy allergy = PatientAllergy.builder()
                .id(1L)
                .patient(testPatient)
                .allergen("Penicillin")
                .severity(AllergySeverity.SEVERE)
                .note("Dị ứng thời thơ ấu")
                .build();

        when(patientAllergyRepository.findByPatientId(10L)).thenReturn(List.of(allergy));

        PrescriptionSafetyResponse mockSafety = PrescriptionSafetyResponse.builder()
                .isSafe(false)
                .hasWarning(true)
                .hasCritical(true)
                .interactionCount(1)
                .allergyCount(1)
                .interactions(List.of(
                        DrugInteractionWarningDto.builder()
                                .drugAName("Aspirin 81mg")
                                .drugBName("Warfarin 5mg")
                                .severity("CRITICAL")
                                .description("Nguy cơ xuất huyết")
                                .recommendation("Tránh phối hợp")
                                .build()
                ))
                .allergyAlerts(List.of(
                        AllergyWarningDto.builder()
                                .drugName("Amoxicillin 500mg")
                                .allergen("Penicillin")
                                .severity("CRITICAL")
                                .description("Nguy cơ phản vệ")
                                .recommendation("Đổi nhóm thuốc")
                                .build()
                ))
                .confidenceScore(new BigDecimal("0.98"))
                .disclaimer(PrescriptionSafetyResponse.DEFAULT_DISCLAIMER)
                .build();

        when(restTemplate.postForObject(contains("/check-prescription-safety"), any(), eq(PrescriptionSafetyResponse.class)))
                .thenReturn(mockSafety);

        List<DrugItemDto> drugs = List.of(
                DrugItemDto.builder().id(3L).name("Aspirin 81mg").build(),
                DrugItemDto.builder().id(4L).name("Warfarin 5mg").build(),
                DrugItemDto.builder().id(5L).name("Amoxicillin 500mg").build()
        );

        PrescriptionSafetyResponse result = aiClinicalService.checkAndAuditPrescriptionSafety(50L, drugs);

        assertNotNull(result);
        assertFalse(result.getIsSafe());
        assertTrue(result.getHasWarning());
        assertEquals(1, result.getInteractionCount());
        assertEquals(1, result.getAllergyCount());

        // Kiểm tra NFR-8: Lưu audit log vào bảng ai_clinical_suggestions
        // Vì có cả tương tác thuốc và dị ứng -> save 2 bản ghi tương ứng
        verify(suggestionRepository, times(2)).save(any(AiClinicalSuggestion.class));
    }

    @Test
    @DisplayName("Lấy lịch sử audit log AI của ca khám")
    void testGetAuditLogsByVisitId() {
        AiClinicalSuggestion suggestion = AiClinicalSuggestion.builder()
                .id(100L)
                .visit(testVisit)
                .suggestionType(AiSuggestionType.DRUG_INTERACTION)
                .inputSnapshot("{\"drugs\":[]}")
                .outputContent("{\"interactions\":[]}")
                .confidenceScore(new BigDecimal("0.95"))
                .createdAt(LocalDateTime.now())
                .build();

        when(suggestionRepository.findByVisitIdOrderByCreatedAtDesc(50L))
                .thenReturn(List.of(suggestion));

        List<AiAuditLogResponse> logs = aiClinicalService.getAuditLogsByVisitId(50L);

        assertNotNull(logs);
        assertEquals(1, logs.size());
        assertEquals(100L, logs.get(0).getId());
        assertEquals(50L, logs.get(0).getVisitId());
        assertEquals(AiSuggestionType.DRUG_INTERACTION, logs.get(0).getSuggestionType());
    }

    // =========================================================================
    // Hợp nhất kết quả AI với bảng drug_interactions (AI bỏ sót không che mất cặp SEVERE)
    // =========================================================================
    private PrescriptionSafetyCheckRequest aspirinWarfarinRequest() {
        return PrescriptionSafetyCheckRequest.builder()
                .drugs(List.of(
                        DrugItemDto.builder().id(3L).name("Aspirin 81mg").build(),
                        DrugItemDto.builder().id(4L).name("Warfarin 5mg").build()))
                .build();
    }

    private DrugInteraction dbInteraction(InteractionSeverity severity) {
        return DrugInteraction.builder().id(1L).drugA(drugAspirin).drugB(drugWarfarin)
                .severity(severity).description("Tăng nguy cơ xuất huyết tiêu hóa").build();
    }

    private PrescriptionSafetyResponse aiSafetyResponse(List<DrugInteractionWarningDto> interactions) {
        return PrescriptionSafetyResponse.builder()
                .isSafe(interactions.isEmpty())
                .hasWarning(!interactions.isEmpty())
                .hasCritical(false)
                .interactionCount(interactions.size())
                .allergyCount(0)
                .interactions(interactions)
                .disclaimer(PrescriptionSafetyResponse.DEFAULT_DISCLAIMER)
                .build();
    }

    @Test
    @DisplayName("AI trả về an toàn nhưng DB có cặp SEVERE → kết quả vẫn CRITICAL, không an toàn")
    void testPrescriptionSafety_aiFalseNegative_dbSevereStillReported() {
        when(restTemplate.postForObject(contains("/check-prescription-safety"), any(), eq(PrescriptionSafetyResponse.class)))
                .thenReturn(aiSafetyResponse(List.of()));
        when(drugInteractionRepository.findInteractionsAmongDrugs(anyCollection()))
                .thenReturn(List.of(dbInteraction(InteractionSeverity.SEVERE)));

        PrescriptionSafetyResponse result = aiClinicalService.checkPrescriptionSafety(aspirinWarfarinRequest());

        assertFalse(result.getIsSafe());
        assertTrue(result.getHasWarning());
        assertTrue(result.getHasCritical());
        assertEquals(1, result.getInteractionCount());
        assertEquals("CRITICAL", result.getInteractions().get(0).getSeverity());
    }

    @Test
    @DisplayName("Cùng cặp thuốc (A-B / B-A) trong AI và DB → gộp 1 bản ghi, giữ mức nặng hơn")
    void testPrescriptionSafety_samePairDeduplicated_keepsHigherSeverity() {
        // AI trả cặp đảo chiều (Warfarin - Aspirin), không kèm id, mức WARNING; DB có SEVERE
        DrugInteractionWarningDto aiWarning = DrugInteractionWarningDto.builder()
                .drugAName("Warfarin 5mg").drugBName("Aspirin 81mg").severity("WARNING")
                .description("AI").recommendation("AI").build();
        when(restTemplate.postForObject(contains("/check-prescription-safety"), any(), eq(PrescriptionSafetyResponse.class)))
                .thenReturn(aiSafetyResponse(List.of(aiWarning)));
        when(drugInteractionRepository.findInteractionsAmongDrugs(anyCollection()))
                .thenReturn(List.of(dbInteraction(InteractionSeverity.SEVERE)));

        PrescriptionSafetyResponse result = aiClinicalService.checkPrescriptionSafety(aspirinWarfarinRequest());

        assertEquals(1, result.getInteractionCount());
        assertEquals("CRITICAL", result.getInteractions().get(0).getSeverity());
        assertTrue(result.getHasCritical());
    }

    @Test
    @DisplayName("AI đã có mức nặng hơn DB → giữ kết quả AI (nội dung chi tiết hơn)")
    void testCheckInteractions_aiMoreSevereThanDb_keepsAi() {
        DrugInteractionWarningDto aiCritical = DrugInteractionWarningDto.builder()
                .drugAId(3L).drugAName("Aspirin 81mg").drugBId(4L).drugBName("Warfarin 5mg")
                .severity("CRITICAL").description("AI").recommendation("AI").build();
        when(restTemplate.postForObject(contains("/check-interaction"), any(), eq(InteractionCheckResponse.class)))
                .thenReturn(InteractionCheckResponse.builder().hasInteraction(true).hasCritical(true)
                        .totalInteractions(1).interactions(List.of(aiCritical)).build());
        when(drugInteractionRepository.findInteractionsAmongDrugs(anyCollection()))
                .thenReturn(List.of(dbInteraction(InteractionSeverity.MODERATE)));

        InteractionCheckResponse result = aiClinicalService.checkInteractions(InteractionCheckRequest.builder()
                .drugs(aspirinWarfarinRequest().getDrugs()).build());

        assertEquals(1, result.getTotalInteractions());
        assertEquals("AI", result.getInteractions().get(0).getDescription());
        assertEquals("CRITICAL", result.getInteractions().get(0).getSeverity());
    }

    @Test
    @DisplayName("Fallback: chỉ có tương tác mức INFO (MILD) → đơn vẫn an toàn, không cảnh báo")
    void testPrescriptionSafety_infoOnly_isSafe() {
        when(restTemplate.postForObject(contains("/check-prescription-safety"), any(), eq(PrescriptionSafetyResponse.class)))
                .thenThrow(new RestClientException("Connection refused"));
        when(drugInteractionRepository.findInteractionsAmongDrugs(anyCollection()))
                .thenReturn(List.of(dbInteraction(InteractionSeverity.MILD)));

        PrescriptionSafetyResponse result = aiClinicalService.checkPrescriptionSafety(aspirinWarfarinRequest());

        assertEquals(1, result.getInteractionCount());
        assertEquals("INFO", result.getInteractions().get(0).getSeverity());
        assertTrue(result.getIsSafe());
        assertFalse(result.getHasWarning());
        assertFalse(result.getHasCritical());
    }

    @Test
    @DisplayName("Lỗi DB khi tra drug_interactions không làm hỏng kiểm tra an toàn")
    void testPrescriptionSafety_dbFailure_degradesGracefully() {
        when(restTemplate.postForObject(contains("/check-prescription-safety"), any(), eq(PrescriptionSafetyResponse.class)))
                .thenReturn(aiSafetyResponse(List.of()));
        when(drugInteractionRepository.findInteractionsAmongDrugs(anyCollection()))
                .thenThrow(new RuntimeException("DB down"));

        PrescriptionSafetyResponse result = aiClinicalService.checkPrescriptionSafety(aspirinWarfarinRequest());

        assertNotNull(result);
        assertTrue(result.getIsSafe());
    }

    // =========================================================================
    // Fallback dị ứng: chuẩn hóa, 2 chiều, họ thuốc, mức độ SEVERE
    // =========================================================================
    private AllergyCheckResponse checkAllergyWithAiDown(String allergen, String severity, String drugName) {
        // doThrow (không dùng when(...)) vì helper được gọi nhiều lần trong cùng một test
        doThrow(new RestClientException("Connection refused"))
                .when(restTemplate).postForObject(contains("/check-allergy"), any(), eq(AllergyCheckResponse.class));
        return aiClinicalService.checkAllergies(AllergyCheckRequest.builder()
                .patientAllergies(List.of(PatientAllergyItemDto.builder().allergen(allergen).severity(severity).build()))
                .drugs(List.of(DrugItemDto.builder().id(9L).name(drugName).build()))
                .build());
    }

    @Test
    @DisplayName("Fallback dị ứng: chính tả Việt hóa (Amoxicilin) vẫn khớp trực tiếp")
    void testAllergyFallback_vietnameseSpelling_directMatch() {
        AllergyCheckResponse res = checkAllergyWithAiDown("Amoxicilin", "MODERATE", "Amoxicillin 500mg");

        assertTrue(res.getHasCritical());
        assertEquals("DIRECT_MATCH", res.getAlerts().get(0).getReactionType());
    }

    @Test
    @DisplayName("Fallback dị ứng: Penicilin → Amoxicillin cùng họ = CRITICAL")
    void testAllergyFallback_penicillinClass() {
        AllergyCheckResponse res = checkAllergyWithAiDown("Penicilin", "MILD", "Amoxicillin 500mg");

        assertTrue(res.getHasCritical());
        assertEquals("CROSS_REACTIVITY", res.getAlerts().get(0).getReactionType());
    }

    @Test
    @DisplayName("Fallback dị ứng: Penicillin → Cephalosporin = WARNING, nâng CRITICAL khi dị ứng SEVERE")
    void testAllergyFallback_crossReactivity_escalatedWhenSevere() {
        AllergyCheckResponse moderate = checkAllergyWithAiDown("Penicillin", "MODERATE", "Ceftriaxon 1g");
        assertEquals("WARNING", moderate.getAlerts().get(0).getSeverity());
        assertFalse(moderate.getHasCritical());

        AllergyCheckResponse severe = checkAllergyWithAiDown("Penicillin", "SEVERE", "Ceftriaxon 1g");
        assertEquals("CRITICAL", severe.getAlerts().get(0).getSeverity());
        assertTrue(severe.getHasCritical());
    }

    @Test
    @DisplayName("Fallback dị ứng: NSAID → Naproxen; Sulfa → Cotrimoxazol")
    void testAllergyFallback_nsaidAndSulfaClasses() {
        assertTrue(checkAllergyWithAiDown("NSAID", "MILD", "Naproxen 250mg").getHasCritical());
        assertTrue(checkAllergyWithAiDown("Sulfa", "MILD", "Cotrimoxazol 480mg").getHasCritical());
    }

    @Test
    @DisplayName("Fallback dị ứng: 'Sulfa' KHÔNG khớp 'Magnesium sulfate'; dị nguyên rỗng/quá ngắn bị bỏ qua")
    void testAllergyFallback_noSubstringFalsePositives() {
        assertFalse(checkAllergyWithAiDown("Sulfa", "SEVERE", "Magnesium sulfate 15%").getHasAllergyConflict());
        assertFalse(checkAllergyWithAiDown("  ", "SEVERE", "Paracetamol 500mg").getHasAllergyConflict());
        assertFalse(checkAllergyWithAiDown("pa", "SEVERE", "Paracetamol 500mg").getHasAllergyConflict());
    }

    @Test
    @DisplayName("Fallback dị ứng: so khớp 2 chiều (dị nguyên dài chứa tên thuốc)")
    void testAllergyFallback_twoWayMatch() {
        AllergyCheckResponse res = checkAllergyWithAiDown("Panadol (paracetamol) – nổi mề đay", "MODERATE", "Panadol");

        assertTrue(res.getHasAllergyConflict());
        assertEquals("DIRECT_MATCH", res.getAlerts().get(0).getReactionType());
    }

    // =========================================================================
    // Không "đầu độc" transaction của caller (VisitServiceImpl.createPrescription)
    // =========================================================================
    @Test
    @DisplayName("checkAndAuditPrescriptionSafety chạy NOT_SUPPORTED (không tham gia transaction của caller)")
    void testCheckAndAudit_doesNotJoinCallerTransaction() throws Exception {
        org.springframework.transaction.annotation.Transactional tx = AiClinicalServiceImpl.class
                .getMethod("checkAndAuditPrescriptionSafety", Long.class, List.class)
                .getAnnotation(org.springframework.transaction.annotation.Transactional.class);

        assertNotNull(tx);
        assertEquals(org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED, tx.propagation());
    }

    @Test
    @DisplayName("Lỗi ghi audit log không làm checkAndAuditPrescriptionSafety ném exception")
    void testCheckAndAudit_auditFailure_isSwallowed() {
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        when(patientAllergyRepository.findByPatientId(10L)).thenReturn(List.of());
        when(restTemplate.postForObject(contains("/check-prescription-safety"), any(), eq(PrescriptionSafetyResponse.class)))
                .thenReturn(aiSafetyResponse(List.of()));
        when(suggestionRepository.save(any(AiClinicalSuggestion.class))).thenThrow(new RuntimeException("DB write failed"));

        PrescriptionSafetyResponse result = assertDoesNotThrow(() ->
                aiClinicalService.checkAndAuditPrescriptionSafety(50L, aspirinWarfarinRequest().getDrugs()));

        assertTrue(result.getIsSafe());
    }

    // ------------------------------------------------------------------
    // Fallback gợi ý chẩn đoán: khớp nguyên từ + dùng sinh hiệu
    // ------------------------------------------------------------------

    private DiagnosisSuggestionResponse fallbackDiagnosis(DiagnosisSuggestionRequest request) {
        when(restTemplate.postForObject(contains("suggest-diagnosis"), any(), eq(DiagnosisSuggestionResponse.class)))
                .thenThrow(new RestClientException("AI down"));
        return aiClinicalService.suggestDiagnosis(request);
    }

    private static List<String> codes(DiagnosisSuggestionResponse r) {
        return r.getSuggestions().stream().map(DiagnosisSuggestionItem::getCode).toList();
    }

    @Test
    @DisplayName("Fallback chẩn đoán: chữ 'huyết áp' đơn thuần KHÔNG gợi ý tăng huyết áp (I10)")
    void testDiagnosisFallback_bareBloodPressureWordDoesNotSuggestHypertension() {
        DiagnosisSuggestionResponse r = fallbackDiagnosis(DiagnosisSuggestionRequest.builder()
                .symptoms("Bệnh nhân hỏi về huyết áp của mình, khám định kỳ").build());
        assertFalse(codes(r).contains("I10"));
    }

    @Test
    @DisplayName("Fallback chẩn đoán: huyết áp đo được 85/55 → không gợi ý I10 dù mô tả chóng mặt")
    void testDiagnosisFallback_lowMeasuredBloodPressureExcludesI10() {
        DiagnosisSuggestionResponse r = fallbackDiagnosis(DiagnosisSuggestionRequest.builder()
                .symptoms("chóng mặt, hoa mắt khi đứng dậy")
                .vitalSigns(com.hospital.hmsai.clinical.dto.VitalSignsDto.builder()
                        .bloodPressureSystolic(85).bloodPressureDiastolic(55).build())
                .build());
        assertFalse(codes(r).contains("I10"));
        assertTrue(codes(r).contains("I20.9"));
    }

    @Test
    @DisplayName("Fallback chẩn đoán: huyết áp đo được 160/100 → gợi ý I10")
    void testDiagnosisFallback_highMeasuredBloodPressureSuggestsI10() {
        DiagnosisSuggestionResponse r = fallbackDiagnosis(DiagnosisSuggestionRequest.builder()
                .symptoms("chóng mặt, đau đầu")
                .vitalSigns(com.hospital.hmsai.clinical.dto.VitalSignsDto.builder()
                        .bloodPressureSystolic(160).bloodPressureDiastolic(100).build())
                .build());
        assertTrue(codes(r).contains("I10"));
    }

    @Test
    @DisplayName("Fallback chẩn đoán: 'ho' khớp nguyên từ, không khớp trong 'cho'/'khoa'")
    void testDiagnosisFallback_wholeWordMatching() {
        DiagnosisSuggestionResponse noMatch = fallbackDiagnosis(DiagnosisSuggestionRequest.builder()
                .symptoms("xin cho hỏi lịch khám khoa nhi").build());
        assertEquals(List.of("R69", "Z00.0"), codes(noMatch));

        DiagnosisSuggestionResponse match = fallbackDiagnosis(DiagnosisSuggestionRequest.builder()
                .symptoms("ho khan 3 ngày").build());
        assertTrue(codes(match).contains("J00"));
    }

    @Test
    @DisplayName("Chẩn đoán: Java chuyển sinh hiệu sang AI Service, và tự lấy sinh hiệu từ ca khám khi request thiếu")
    void testDiagnosis_forwardsVitalSignsFromVisit() {
        testVisit.setVitalSigns("{\"bloodPressureSystolic\":150,\"bloodPressureDiastolic\":95,\"pulse\":88}");
        when(visitRepository.findById(50L)).thenReturn(Optional.of(testVisit));
        DiagnosisSuggestionResponse ok = DiagnosisSuggestionResponse.builder()
                .suggestions(List.of(DiagnosisSuggestionItem.builder().code("I10").name("x").confidence(90.0).reason("r").build()))
                .totalSuggestions(1).build();
        org.mockito.ArgumentCaptor<Object> body = org.mockito.ArgumentCaptor.forClass(Object.class);
        when(restTemplate.postForObject(contains("suggest-diagnosis"), body.capture(), eq(DiagnosisSuggestionResponse.class)))
                .thenReturn(ok);

        aiClinicalService.suggestAndAuditDiagnosis(50L,
                DiagnosisSuggestionRequest.builder().symptoms("đau đầu chóng mặt").build());

        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> payload = (java.util.Map<String, Object>)
                ((org.springframework.http.HttpEntity<?>) body.getValue()).getBody();
        com.hospital.hmsai.clinical.dto.VitalSignsDto sent =
                (com.hospital.hmsai.clinical.dto.VitalSignsDto) payload.get("vital_signs");
        assertEquals(150, sent.getBloodPressureSystolic());
        assertEquals(88, sent.getPulse());
    }
}
