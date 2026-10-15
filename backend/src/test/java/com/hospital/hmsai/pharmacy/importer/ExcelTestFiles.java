package com.hospital.hmsai.pharmacy.importer;

import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;

/** Tạo file .xlsx trong bộ nhớ cho test nhập thuốc. */
public final class ExcelTestFiles {

    private ExcelTestFiles() {
    }

    /** Dòng đầu là tiêu đề, các dòng sau là dữ liệu; phần tử null = dòng trống, giá trị null = ô trống. */
    public static byte[] workbook(Object[]... rows) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Thuốc");
            CellStyle dateStyle = wb.createCellStyle();
            dateStyle.setDataFormat(wb.getCreationHelper().createDataFormat().getFormat("dd/mm/yyyy"));
            for (int r = 0; r < rows.length; r++) {
                if (rows[r] == null) continue;
                Row row = sheet.createRow(r);
                for (int c = 0; c < rows[r].length; c++) {
                    Object v = rows[r][c];
                    if (v == null) continue;
                    if (v instanceof Number n) {
                        row.createCell(c).setCellValue(n.doubleValue());
                    } else if (v instanceof LocalDate d) {
                        row.createCell(c).setCellValue(d);
                        row.getCell(c).setCellStyle(dateStyle);
                    } else {
                        row.createCell(c).setCellValue(v.toString());
                    }
                }
            }
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
