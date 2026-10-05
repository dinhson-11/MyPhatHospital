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
public class InteractionCheckResponse {

    @JsonProperty("has_interaction")
    @Builder.Default
    private Boolean hasInteraction = false;

    @JsonProperty("has_critical")
    @Builder.Default
    private Boolean hasCritical = false;

    @JsonProperty("total_interactions")
    @Builder.Default
    private Integer totalInteractions = 0;

    @Builder.Default
    private List<DrugInteractionWarningDto> interactions = new ArrayList<>();

    @JsonProperty("confidence_score")
    @Builder.Default
    private BigDecimal confidenceScore = new BigDecimal("0.95");

    @Builder.Default
    private String disclaimer = PrescriptionSafetyResponse.DEFAULT_DISCLAIMER;
}
