package com.hospital.hmsai.clinical.dto;

import com.hospital.hmsai.clinical.entity.PrescriptionItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionItemResponse {

    private Long id;
    private Long drugId;
    private String drugCode;
    private String drugName;
    private String unit;
    private BigDecimal unitPrice;
    private String dosage;
    private Integer quantity;
    private String instruction;
    private LocalDateTime createdAt;

    public static PrescriptionItemResponse fromEntity(PrescriptionItem item) {
        if (item == null) return null;
        return PrescriptionItemResponse.builder()
                .id(item.getId())
                .drugId(item.getDrug() != null ? item.getDrug().getId() : null)
                .drugCode(item.getDrug() != null ? item.getDrug().getCode() : null)
                .drugName(item.getDrug() != null ? item.getDrug().getName() : null)
                .unit(item.getDrug() != null ? item.getDrug().getUnit() : null)
                .unitPrice(item.getDrug() != null ? item.getDrug().getPrice() : null)
                .dosage(item.getDosage())
                .quantity(item.getQuantity())
                .instruction(item.getInstruction())
                .createdAt(item.getCreatedAt())
                .build();
    }
}
