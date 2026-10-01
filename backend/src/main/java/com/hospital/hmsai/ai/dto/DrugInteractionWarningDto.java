package com.hospital.hmsai.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DrugInteractionWarningDto {
    @JsonProperty("drug_a_id")
    private Long drugAId;

    @JsonProperty("drug_a_name")
    private String drugAName;

    @JsonProperty("drug_b_id")
    private Long drugBId;

    @JsonProperty("drug_b_name")
    private String drugBName;

    private String severity; // CRITICAL, WARNING, INFO
    private String mechanism;
    private String description;
    private String recommendation;
}
