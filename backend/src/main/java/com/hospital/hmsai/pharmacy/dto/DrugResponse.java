package com.hospital.hmsai.pharmacy.dto;

import com.hospital.hmsai.pharmacy.entity.Drug;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DrugResponse {
    private Long id;
    private String code;
    private String name;
    private String unit;
    private BigDecimal price;
    private Integer stockQuantity;
    private LocalDate expiryDate;

    public static DrugResponse fromEntity(Drug drug) {
        if (drug == null) return null;
        return DrugResponse.builder()
                .id(drug.getId())
                .code(drug.getCode())
                .name(drug.getName())
                .unit(drug.getUnit())
                .price(drug.getPrice())
                .stockQuantity(drug.getStockQuantity())
                .expiryDate(drug.getExpiryDate())
                .build();
    }
}
