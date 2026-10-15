package com.hospital.hmsai.pharmacy.importer;

import com.hospital.hmsai.common.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static com.hospital.hmsai.pharmacy.importer.ExcelTestFiles.workbook;
import static org.junit.jupiter.api.Assertions.*;

class DrugExcelFormatTest {

    private static List<DrugExcelRow> read(byte[] bytes) {
        return DrugExcelFormat.read(new ByteArrayInputStream(bytes));
    }

    @Test
    @DisplayName("Đọc cột theo tên tiêu đề (không phụ thuộc thứ tự), bỏ dòng trống, giữ số dòng Excel")
    void readsColumnsByHeaderName() {
        byte[] file = workbook(
                new Object[]{"Tên thuốc*", "Mã thuốc*", "Số lượng*", "Giá*", "Đơn vị", "Hạn dùng"},
                new Object[]{"Paracetamol 500mg", "para-500", 100, 1500.5, "Viên", LocalDate.of(2027, 5, 31)},
                null,
                new Object[]{"Thuốc mã số", 1001, 5, 2000, null, "15/08/2027"}
        );

        List<DrugExcelRow> rows = read(file);

        assertEquals(2, rows.size());
        DrugExcelRow first = rows.get(0);
        assertEquals(2, first.rowNumber());
        assertEquals("para-500", first.code());
        assertEquals("Paracetamol 500mg", first.name());
        assertEquals("Viên", first.unit());
        assertEquals(0, new BigDecimal("1500.5").compareTo(first.price()));
        assertEquals(100, first.quantity());
        assertEquals(LocalDate.of(2027, 5, 31), first.expiryDate());
        assertTrue(first.errors().isEmpty());

        DrugExcelRow second = rows.get(1);
        assertEquals(4, second.rowNumber());
        assertEquals("1001", second.code(), "Mã dạng số phải đọc thành chữ, không có '.0'");
        assertNull(second.unit());
        assertEquals(LocalDate.of(2027, 8, 15), second.expiryDate());
    }

    @Test
    @DisplayName("Ô sai kiểu dữ liệu được ghi lỗi theo dòng thay vì làm hỏng cả file")
    void reportsInvalidCellsPerRow() {
        byte[] file = workbook(
                new Object[]{"Mã thuốc", "Tên thuốc", "Giá", "Số lượng", "Hạn dùng"},
                new Object[]{"A1", "Thuốc A", "abc", 2.5, "31/02/2027"}
        );

        DrugExcelRow row = read(file).get(0);

        assertNull(row.price());
        assertNull(row.quantity());
        assertNull(row.expiryDate());
        assertEquals(List.of("Giá không hợp lệ", "Số lượng phải là số nguyên", "Hạn dùng không hợp lệ (dd/MM/yyyy)"),
                row.errors());
    }

    @Test
    @DisplayName("Thiếu cột bắt buộc → báo rõ tên cột còn thiếu")
    void rejectsMissingRequiredColumns() {
        byte[] file = workbook(new Object[]{"Mã thuốc", "Tên thuốc"}, new Object[]{"A1", "Thuốc A"});

        BusinessException ex = assertThrows(BusinessException.class, () -> read(file));
        assertEquals("File thiếu cột bắt buộc: Giá, Số lượng", ex.getMessage());
    }

    @Test
    @DisplayName("File không phải Excel → lỗi nghiệp vụ dễ hiểu")
    void rejectsNonExcelFile() {
        byte[] notExcel = "ma,ten\nA1,Thuoc".getBytes(StandardCharsets.UTF_8);

        BusinessException ex = assertThrows(BusinessException.class, () -> read(notExcel));
        assertEquals("File không đúng định dạng Excel (.xlsx)", ex.getMessage());
    }

    @Test
    @DisplayName("Quá số dòng cho phép → từ chối cả file")
    void rejectsTooManyRows() {
        Object[][] rows = new Object[DrugExcelFormat.MAX_ROWS + 2][];
        rows[0] = new Object[]{"Mã thuốc", "Tên thuốc", "Giá", "Số lượng"};
        for (int i = 1; i < rows.length; i++) {
            rows[i] = new Object[]{"M" + i, "Thuốc " + i, 1000, 1};
        }
        byte[] file = workbook(rows);

        BusinessException ex = assertThrows(BusinessException.class, () -> read(file));
        assertEquals("File có quá nhiều dòng (tối đa " + DrugExcelFormat.MAX_ROWS + " thuốc mỗi lần nhập)", ex.getMessage());
    }

    @Test
    @DisplayName("File mẫu đọc lại được và không chứa dòng dữ liệu nào")
    void templateIsReadableAndEmpty() {
        assertTrue(read(DrugExcelFormat.template()).isEmpty());
    }
}
