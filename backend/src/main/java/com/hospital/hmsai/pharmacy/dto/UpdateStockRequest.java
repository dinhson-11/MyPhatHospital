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

    /**
     * IMPORT/EXPORT: số lượng nhập/xuất (≥ 1, kiểm tra ở service).
     * ADJUSTMENT: tồn kho thực tế sau kiểm kê (≥ 0, cho phép điều chỉnh về 0).
     */
    @NotNull(message = "Số lượng điều chỉnh không được để trống")
    @Min(value = 0, message = "Số lượng điều chỉnh không được âm")
    private Integer quantity;

    @NotNull(message = "Loại điều chỉnh kho không được để trống")
    private StockAdjustmentType adjustmentType;

    private String note;
}
