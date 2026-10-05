package com.hospital.hmsai.pharmacy.dto;

import com.hospital.hmsai.pharmacy.entity.DrugInteraction;
import com.hospital.hmsai.pharmacy.entity.InteractionSeverity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DrugInteractionResponse {
    private Long id;
    private Long drugAId;
    private String drugAName;
    private String drugACode;
    private Long drugBId;
    private String drugBName;
    private String drugBCode;
    private InteractionSeverity severity;
    private String description;

    public static DrugInteractionResponse fromEntity(DrugInteraction di) {
        if (di == null) return null;
        return DrugInteractionResponse.builder()
                .id(di.getId())
                .drugAId(di.getDrugA() != null ? di.getDrugA().getId() : null)
                .drugAName(di.getDrugA() != null ? di.getDrugA().getName() : null)
                .drugACode(di.getDrugA() != null ? di.getDrugA().getCode() : null)
                .drugBId(di.getDrugB() != null ? di.getDrugB().getId() : null)
                .drugBName(di.getDrugB() != null ? di.getDrugB().getName() : null)
                .drugBCode(di.getDrugB() != null ? di.getDrugB().getCode() : null)
                .severity(di.getSeverity())
                .description(di.getDescription())
                .build();
    }
}
