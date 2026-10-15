package com.hospital.hmsai.pharmacy.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Kết quả nhập thuốc từ Excel. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DrugImportResult {
    /** Số thuốc mới được thêm. */
    private int created;
    /** Số thuốc đã có được cộng tồn kho. */
    private int restocked;
}
