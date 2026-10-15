package com.hospital.hmsai.pharmacy.dto;

/** Hành động cho từng dòng khi xác nhận nhập thuốc từ Excel. */
public enum DrugImportAction {
    /** Thêm thuốc mới vào danh mục. */
    CREATE,
    /** Thuốc đã có: cộng số lượng vào tồn kho, cập nhật giá / hạn dùng nếu có. */
    RESTOCK
}
