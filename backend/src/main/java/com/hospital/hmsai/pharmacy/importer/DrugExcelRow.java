package com.hospital.hmsai.pharmacy.importer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Một dòng dữ liệu thuốc đọc từ file Excel (chưa kiểm tra nghiệp vụ).
 * Ô sai kiểu dữ liệu để null và ghi lý do vào {@code errors}.
 *
 * @param rowNumber số dòng như hiển thị trong Excel (dòng tiêu đề là 1)
 */
public record DrugExcelRow(
        int rowNumber,
        String code,
        String name,
        String unit,
        BigDecimal price,
        Integer quantity,
        LocalDate expiryDate,
        List<String> errors
) {
}
