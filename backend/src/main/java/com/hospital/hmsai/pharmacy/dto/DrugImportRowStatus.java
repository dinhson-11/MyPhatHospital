package com.hospital.hmsai.pharmacy.dto;

/** Trạng thái một dòng khi xem trước file Excel nhập thuốc. */
public enum DrugImportRowStatus {
    /** Mã chưa có → sẽ thêm thuốc mới. */
    NEW,
    /** Mã đã có trong hệ thống → người dùng chọn "Nhập tiếp" (cộng tồn kho) hoặc bỏ qua. */
    EXISTS,
    /** Dữ liệu không hợp lệ → không được nhập. */
    INVALID
}
