package com.hospital.hmsai.billing.pricing;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LabFeeCatalogTest {

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource(delimiter = '|', value = {
            // Danh mục chuẩn của giao diện bác sĩ
            "Tổng phân tích tế bào máu ngoại vi (CBC 18 chỉ số)|80000",
            "Định lượng Glucose máu lúc đói|120000",
            "Bộ mỡ máu toàn phần (Cholesterol, Triglycerid, HDL, LDL)|120000",
            "Men gan (AST, ALT, GGT)|120000",
            "Chức năng thận (Ure, Creatinin huyết thanh)|120000",
            "Tổng phân tích nước tiểu 10 thông số|100000",
            "X-quang ngực thẳng kỹ thuật số (CR/DR)|150000",
            "Siêu âm ổ bụng tổng quát màu 4D|180000",
            "Điện tâm đồ 12 chuyển đạo (ECG)|100000",
            // Các lỗi định giá cũ
            "Chụp CT sọ não|500000",
            "Chụp cộng hưởng từ (MRI) cột sống|500000",
            "Điện giải đồ (Electrolytes)|120000",
            "Xquang khớp gối|150000"
    })
    @DisplayName("Định giá cận lâm sàng theo nhóm, không khớp nhầm")
    void feeFor(String testType, String expected) {
        assertEquals(0, new BigDecimal(expected).compareTo(LabFeeCatalog.feeFor(testType)));
    }
}
