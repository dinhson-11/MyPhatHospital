package com.hospital.hmsai.clinical.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class VitalSignsValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    @Test
    @DisplayName("Sinh hiệu trong ngưỡng hợp lệ")
    void validVitals_NoViolations() {
        VitalSignsDto vitals = VitalSignsDto.builder()
                .pulse(80).bloodPressureSystolic(120).bloodPressureDiastolic(80)
                .temperature(36.8).respiratoryRate(18).spO2(98).weight(65.0).height(170.0)
                .build();
        assertTrue(validator.validate(vitals).isEmpty());
    }

    @Test
    @DisplayName("Giá trị ngoài ngưỡng sinh lý bị từ chối")
    void outOfRangeVitals_Violations() {
        VitalSignsDto vitals = VitalSignsDto.builder()
                .pulse(400).spO2(120).temperature(50.0).weight(0.1).height(300.0).respiratoryRate(2)
                .build();
        Set<ConstraintViolation<VitalSignsDto>> violations = validator.validate(vitals);
        assertEquals(6, violations.size());
    }

    @Test
    @DisplayName("Huyết áp tâm thu phải lớn hơn tâm trương")
    void systolicNotGreaterThanDiastolic_Violation() {
        VitalSignsDto vitals = VitalSignsDto.builder().bloodPressureSystolic(80).bloodPressureDiastolic(90).build();
        Set<ConstraintViolation<VitalSignsDto>> violations = validator.validate(vitals);
        assertEquals(1, violations.size());
        assertTrue(violations.iterator().next().getMessage().contains("tâm thu"));
    }

    @Test
    @DisplayName("@Valid lan truyền xuống vitalSigns của CreateVisitRequest")
    void createVisitRequest_CascadesValidation() {
        CreateVisitRequest request = CreateVisitRequest.builder()
                .patientId(1L).doctorId(1L)
                .vitalSigns(VitalSignsDto.builder().pulse(5).build())
                .build();
        assertEquals(1, validator.validate(request).size());
    }

    @Test
    @DisplayName("Thuộc tính kiểm tra huyết áp không bị ghi vào JSON lưu DB")
    void consistencyFlag_NotSerialized() throws Exception {
        String json = new ObjectMapper().writeValueAsString(
                VitalSignsDto.builder().bloodPressureSystolic(120).bloodPressureDiastolic(80).build());
        assertFalse(json.contains("bloodPressureConsistent"));
        VitalSignsDto parsed = new ObjectMapper().readValue(json + "", VitalSignsDto.class);
        assertEquals(120, parsed.getBloodPressureSystolic());
    }

    @Test
    @DisplayName("BMI và phân loại theo ngưỡng châu Á")
    void bmi_AsianCutOffs() {
        assertEquals(22.5, VisitResponse.computeBmi(65.0, 170.0));
        assertEquals("Bình thường", VisitResponse.bmiCategory(22.5));
        assertEquals("Thừa cân", VisitResponse.bmiCategory(23.0));
        assertEquals("Béo phì độ I", VisitResponse.bmiCategory(25.0));
        assertEquals("Béo phì độ II", VisitResponse.bmiCategory(30.0));
        assertEquals("Thiếu cân", VisitResponse.bmiCategory(18.4));
        assertNull(VisitResponse.computeBmi(null, 170.0));
    }
}
