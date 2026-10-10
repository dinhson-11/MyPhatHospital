package com.hospital.hmsai.ai.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DrugItemDto {
    private Long id;
    private String code;
    private String name;
    private String dosage;
    /** Python DrugItem.active_ingredient; vẫn nhận "activeIngredient" từ client cũ. */
    @JsonProperty("active_ingredient")
    @JsonAlias("activeIngredient")
    private String activeIngredient;
}
