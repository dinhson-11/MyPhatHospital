package com.hospital.hmsai.pharmacy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Một dòng trong kết quả xem trước file Excel nhập thuốc. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DrugImportPreviewRow {
    /** Số dòng trong Excel (dòng tiêu đề là 1). */
    private int rowNumber;
    /** Mã đã chuẩn hóa (chữ in hoa). */
    private String code;
    private String name;
    private String unit;
    private BigDecimal price;
    private Integer quantity;
    private LocalDate expiryDate;
    private DrugImportRowStatus status;
    private List<String> errors;
    /** Thuốc hiện có cùng mã trong hệ thống (null nếu mã chưa có). */
    private DrugResponse existing;
}
