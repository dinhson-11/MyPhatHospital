package com.hospital.hmsai.pharmacy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DispensedItemResponse {

    private Long drugId;
    private String drugCode;
    private String drugName;
    private String unit;
    private BigDecimal price;
    private String dosage;
    private Integer quantity;
    private Integer remainingStock;
    private String instruction;
}
