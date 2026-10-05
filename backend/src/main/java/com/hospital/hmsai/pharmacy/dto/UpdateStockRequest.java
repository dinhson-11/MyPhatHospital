package com.hospital.hmsai.pharmacy.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStockRequest {

    @NotNull(message = "Số lượng điều chỉnh không được để trống")
    @Min(value = 1, message = "Số lượng điều chỉnh tối thiểu là 1")
    private Integer quantity;

    @NotNull(message = "Loại điều chỉnh kho không được để trống")
    private StockAdjustmentType adjustmentType;

    private String note;
}
