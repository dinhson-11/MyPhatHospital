package com.hospital.hmsai.pharmacy.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Một dòng người dùng đã chọn nhập. Dữ liệu được máy chủ kiểm tra lại
 * theo cùng quy tắc với bước xem trước (DrugImportServiceImpl).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DrugImportItem {
    /** Số dòng trong Excel, dùng để báo lỗi. */
    private Integer rowNumber;
    private String code;
    private String name;
    private String unit;
    private BigDecimal price;
    private Integer quantity;
    private LocalDate expiryDate;

    @NotNull(message = "Thiếu hành động nhập (CREATE / RESTOCK)")
    private DrugImportAction action;
}
