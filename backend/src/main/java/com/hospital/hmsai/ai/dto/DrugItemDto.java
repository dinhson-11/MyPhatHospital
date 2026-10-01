package com.hospital.hmsai.ai.dto;

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
    private String activeIngredient;
}
