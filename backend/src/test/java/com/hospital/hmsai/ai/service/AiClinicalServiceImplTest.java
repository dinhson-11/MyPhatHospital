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
}
