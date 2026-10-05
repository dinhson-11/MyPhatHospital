package com.hospital.hmsai.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionSafetyResponse {

    public static final String DEFAULT_DISCLAIMER =
            "Kết quả do AI phân tích chỉ mang tính tham khảo, không thay thế phán đoán lâm sàng của bác sĩ.";

    @JsonProperty("is_safe")
    @Builder.Default
    private Boolean isSafe = true;

    @JsonProperty("has_warning")
    @Builder.Default
    private Boolean hasWarning = false;

    @JsonProperty("has_critical")
    @Builder.Default
    private Boolean hasCritical = false;

    @JsonProperty("interaction_count")
    @Builder.Default
    private Integer interactionCount = 0;

    @JsonProperty("allergy_count")
    @Builder.Default
    private Integer allergyCount = 0;

    @Builder.Default
    private List<DrugInteractionWarningDto> interactions = new ArrayList<>();

    @JsonProperty("allergy_alerts")
    @Builder.Default
    private List<AllergyWarningDto> allergyAlerts = new ArrayList<>();

    @JsonProperty("confidence_score")
    @Builder.Default
    private BigDecimal confidenceScore = new BigDecimal("0.95");

    @Builder.Default
    private String disclaimer = DEFAULT_DISCLAIMER;
}
