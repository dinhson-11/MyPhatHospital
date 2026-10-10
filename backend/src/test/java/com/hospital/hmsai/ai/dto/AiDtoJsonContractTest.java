package com.hospital.hmsai.ai.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Hợp đồng JSON giữa backend Java và FastAPI AI Service (snake_case – xem ai-service/models/*.py).
 */
class AiDtoJsonContractTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("DrugItemDto gửi sang AI dùng 'active_ingredient' và vẫn nhận 'activeIngredient' từ client cũ")
    void drugItem_activeIngredient_snakeCase() throws Exception {
        String json = mapper.writeValueAsString(DrugItemDto.builder().id(1L).name("Klacid").activeIngredient("Clarithromycin").build());
        assertThat(json).contains("\"active_ingredient\":\"Clarithromycin\"").doesNotContain("activeIngredient");

        assertThat(mapper.readValue("{\"name\":\"Klacid\",\"activeIngredient\":\"Clarithromycin\"}", DrugItemDto.class)
                .getActiveIngredient()).isEqualTo("Clarithromycin");
        assertThat(mapper.readValue("{\"name\":\"Klacid\",\"active_ingredient\":\"Clarithromycin\"}", DrugItemDto.class)
                .getActiveIngredient()).isEqualTo("Clarithromycin");
    }

    @Test
    @DisplayName("DiagnosisSuggestionResponse đọc được total_suggestions / confidence_score từ Python")
    void diagnosisResponse_snakeCase() throws Exception {
        String python = "{\"suggestions\":[{\"code\":\"I10\",\"name\":\"THA\",\"confidence\":94.0,\"reason\":\"r\"}],"
                + "\"total_suggestions\":1,\"confidence_score\":0.94,\"disclaimer\":\"d\"}";
        DiagnosisSuggestionResponse res = mapper.readValue(python, DiagnosisSuggestionResponse.class);

        assertThat(res.getTotalSuggestions()).isEqualTo(1);
        assertThat(res.getConfidenceScore()).isEqualByComparingTo("0.94");
        assertThat(res.getSuggestions()).hasSize(1);
        // Frontend (aiAlertService.js) cũng đọc total_suggestions
        assertThat(mapper.writeValueAsString(res)).contains("\"total_suggestions\":1").contains("\"confidence_score\"");
    }

    @Test
    @DisplayName("DiagnosisSuggestionRequest nhận patient_age / patient_gender / medical_history từ frontend")
    void diagnosisRequest_snakeCase() throws Exception {
        DiagnosisSuggestionRequest req = mapper.readValue(
                "{\"symptoms\":\"đau đầu\",\"patient_age\":12,\"patient_gender\":\"FEMALE\",\"medical_history\":[\"hen\"]}",
                DiagnosisSuggestionRequest.class);

        assertThat(req.getPatientAge()).isEqualTo(12);
        assertThat(req.getPatientGender()).isEqualTo("FEMALE");
        assertThat(req.getMedicalHistory()).isEqualTo(List.of("hen"));
        assertThat(mapper.readValue("{\"symptoms\":\"x\",\"patientAge\":30}", DiagnosisSuggestionRequest.class)
                .getPatientAge()).isEqualTo(30);
    }

    @Test
    @DisplayName("AiChatbotResponse đọc đủ trường của Python ChatMessageResponse (kể cả is_out_of_scope)")
    void chatbotResponse_snakeCase() throws Exception {
        String python = "{\"session_id\":\"s1\",\"reply\":\"r\",\"intent\":\"EMERGENCY\",\"suggested_department\":"
                + "{\"dept_id\":1,\"dept_name\":\"Khoa Khám bệnh / Cấp cứu ban đầu\",\"reason\":\"x\"},"
                + "\"show_booking_button\":false,\"is_out_of_scope\":true,\"disclaimer\":\"d\"}";
        AiChatbotResponse res = mapper.readValue(python, AiChatbotResponse.class);

        assertThat(res.getIntent()).isEqualTo("EMERGENCY");
        assertThat(res.getIsOutOfScope()).isTrue();
        assertThat(res.getShowBookingButton()).isFalse();
        assertThat(res.getSessionId()).isEqualTo("s1");
        assertThat(res.getSuggestedDepartment().getDeptId()).isEqualTo(1);
    }
}
