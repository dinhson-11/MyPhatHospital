package com.hospital.hmsai.pharmacy.service;

import com.hospital.hmsai.pharmacy.dto.DrugImportPreviewRow;
import com.hospital.hmsai.pharmacy.dto.DrugImportRequest;
import com.hospital.hmsai.pharmacy.dto.DrugImportResult;

import java.io.InputStream;
import java.util.List;

/** Nhập thuốc hàng loạt từ file Excel (FR-6.1). */
public interface DrugImportService {

    /** Đọc và kiểm tra file, phân loại từng dòng (mới / đã tồn tại / lỗi). Không ghi dữ liệu. */
    List<DrugImportPreviewRow> preview(InputStream excel);

    /** Lưu các dòng đã chọn trong một transaction: lỗi ở bất kỳ dòng nào thì không lưu gì. */
    DrugImportResult importDrugs(DrugImportRequest request);
}
