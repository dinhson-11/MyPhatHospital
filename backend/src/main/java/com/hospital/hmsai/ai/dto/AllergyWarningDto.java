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
public class AllergyWarningDto {
    @JsonProperty("drug_id")
    private Long drugId;

    @JsonProperty("drug_name")
    private String drugName;

    private String allergen;

    @JsonProperty("reaction_type")
    private String reactionType; // DIRECT_MATCH, CROSS_REACTIVITY

    private String severity; // CRITICAL, WARNING
    private String description;
    private String recommendation;
}
