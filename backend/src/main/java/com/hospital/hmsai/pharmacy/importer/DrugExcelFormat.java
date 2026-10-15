package com.hospital.hmsai.pharmacy.importer;

import com.hospital.hmsai.common.exception.BusinessException;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Định dạng file Excel nhập thuốc hàng loạt: đọc dữ liệu và tạo file mẫu.
 * Cột được nhận diện theo tên tiêu đề ở dòng đầu tiên của sheet đầu tiên (không phân biệt hoa thường / dấu).
 */
public final class DrugExcelFormat {

    /** Số dòng dữ liệu tối đa mỗi lần nhập. */
    public static final int MAX_ROWS = 1000;

    static final String INVALID_FILE = "File không đúng định dạng Excel (.xlsx)";
    public static final String PRICE_INVALID = "Giá không hợp lệ";
    public static final String QUANTITY_INVALID = "Số lượng phải là số nguyên";
    public static final String EXPIRY_INVALID = "Hạn dùng không hợp lệ (dd/MM/yyyy)";

    enum Column {
        CODE("Mã thuốc", true, "mathuoc", "ma"),
        NAME("Tên thuốc", true, "tenthuoc", "ten"),
        UNIT("Đơn vị", false, "donvi", "donvitinh"),
        PRICE("Giá", true, "gia", "dongia"),
        QUANTITY("Số lượng", true, "soluong"),
        EXPIRY("Hạn dùng", false, "handung", "hansudung");

        final String label;
        final boolean required;
        final Set<String> aliases;

        Column(String label, boolean required, String... aliases) {
            this.label = label;
            this.required = required;
            this.aliases = Set.of(aliases);
        }
    }

    private static final Pattern THOUSANDS = Pattern.compile("\\d{1,3}([.,]\\d{3})+");
    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            DateTimeFormatter.ofPattern("d/M/uuuu").withResolverStyle(ResolverStyle.STRICT),
            DateTimeFormatter.ofPattern("d-M-uuuu").withResolverStyle(ResolverStyle.STRICT),
            DateTimeFormatter.ofPattern("uuuu-M-d").withResolverStyle(ResolverStyle.STRICT));

    private DrugExcelFormat() {
    }

    /**
     * Đọc các dòng thuốc (bỏ qua dòng trống).
     *
     * @throws BusinessException file không phải Excel, thiếu cột bắt buộc hoặc quá {@link #MAX_ROWS} dòng
     */
    public static List<DrugExcelRow> read(InputStream in) {
        Workbook workbook;
        try {
            workbook = WorkbookFactory.create(in);
        } catch (IOException | RuntimeException e) {
            throw new BusinessException(INVALID_FILE);
        }
        try (workbook) {
            if (workbook.getNumberOfSheets() == 0) {
                throw new BusinessException(INVALID_FILE);
            }
            return readSheet(workbook.getSheetAt(0));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static List<DrugExcelRow> readSheet(Sheet sheet) {
        DataFormatter formatter = new DataFormatter();
        formatter.setUseCachedValuesForFormulaCells(true);

        Row header = sheet.getRow(sheet.getFirstRowNum());
        Map<Column, Integer> columns = mapColumns(header, formatter);
        List<String> missing = Arrays.stream(Column.values())
                .filter(c -> c.required && !columns.containsKey(c))
                .map(c -> c.label)
                .toList();
        if (!missing.isEmpty()) {
            throw new BusinessException("File thiếu cột bắt buộc: " + String.join(", ", missing));
        }

        List<DrugExcelRow> rows = new ArrayList<>();
        for (Row row : sheet) {
            if (row.getRowNum() <= header.getRowNum()) continue;
            DrugExcelRow parsed = readRow(row, columns, formatter);
            if (parsed == null) continue;
            if (rows.size() == MAX_ROWS) {
                throw new BusinessException("File có quá nhiều dòng (tối đa " + MAX_ROWS + " thuốc mỗi lần nhập)");
            }
            rows.add(parsed);
        }
        return rows;
    }

    private static Map<Column, Integer> mapColumns(Row header, DataFormatter formatter) {
        Map<Column, Integer> columns = new EnumMap<>(Column.class);
        if (header == null) return columns;
        for (Cell cell : header) {
            String key = normalizeHeader(formatter.formatCellValue(cell));
            for (Column column : Column.values()) {
                if (column.aliases.contains(key)) {
                    columns.putIfAbsent(column, cell.getColumnIndex());
                }
            }
        }
        return columns;
    }

    /** "Đơn vị *" → "donvi": bỏ dấu, ký tự đặc biệt, khoảng trắng. */
    static String normalizeHeader(String text) {
        String noAccents = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return noAccents.replace('đ', 'd').replace('Đ', 'D')
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }

    /** Trả về null nếu dòng không có dữ liệu ở các cột đã nhận diện. */
    private static DrugExcelRow readRow(Row row, Map<Column, Integer> columns, DataFormatter formatter) {
        Map<Column, Cell> cells = new EnumMap<>(Column.class);
        boolean blank = true;
        for (Map.Entry<Column, Integer> e : columns.entrySet()) {
            Cell cell = row.getCell(e.getValue());
            cells.put(e.getKey(), cell);
            if (text(cell, formatter) != null) blank = false;
        }
        if (blank) return null;

        List<String> errors = new ArrayList<>();
        BigDecimal price = null;
        Integer quantity = null;
        LocalDate expiry = null;
        try {
            price = number(cells.get(Column.PRICE), formatter);
        } catch (NumberFormatException e) {
            errors.add(PRICE_INVALID);
        }
        try {
            quantity = integer(cells.get(Column.QUANTITY), formatter);
        } catch (NumberFormatException | ArithmeticException e) {
            errors.add(QUANTITY_INVALID);
        }
        try {
            expiry = date(cells.get(Column.EXPIRY), formatter);
        } catch (DateTimeParseException e) {
            errors.add(EXPIRY_INVALID);
        }
        return new DrugExcelRow(
                row.getRowNum() + 1,
                text(cells.get(Column.CODE), formatter),
                text(cells.get(Column.NAME), formatter),
                text(cells.get(Column.UNIT), formatter),
                price,
                quantity,
                expiry,
                List.copyOf(errors));
    }

    private static CellType typeOf(Cell cell) {
        return cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType() : cell.getCellType();
    }

    private static String text(Cell cell, DataFormatter formatter) {
        if (cell == null) return null;
        String value = formatter.formatCellValue(cell).trim();
        return value.isEmpty() ? null : value;
    }

    private static BigDecimal number(Cell cell, DataFormatter formatter) {
        if (cell != null && typeOf(cell) == CellType.NUMERIC) {
            return BigDecimal.valueOf(cell.getNumericCellValue());
        }
        String value = text(cell, formatter);
        if (value == null) return null;
        String compact = value.replace(" ", "").replace(" ", "");
        compact = THOUSANDS.matcher(compact).matches()
                ? compact.replaceAll("[.,]", "")
                : compact.replace(',', '.');
        return new BigDecimal(compact);
    }

    private static Integer integer(Cell cell, DataFormatter formatter) {
        BigDecimal value = number(cell, formatter);
        return value == null ? null : value.stripTrailingZeros().intValueExact();
    }

    private static LocalDate date(Cell cell, DataFormatter formatter) {
        if (cell != null && typeOf(cell) == CellType.NUMERIC) {
            double serial = cell.getNumericCellValue();
            if (!DateUtil.isValidExcelDate(serial)) {
                throw new DateTimeParseException("Ngày Excel không hợp lệ", String.valueOf(serial), 0);
            }
            return DateUtil.getLocalDateTime(serial).toLocalDate();
        }
        String value = text(cell, formatter);
        if (value == null) return null;
        for (DateTimeFormatter format : DATE_FORMATS) {
            try {
                return LocalDate.parse(value, format);
            } catch (DateTimeParseException ignored) {
                // thử định dạng tiếp theo
            }
        }
        throw new DateTimeParseException("Ngày không hợp lệ", value, 0);
    }

    /** File mẫu .xlsx: sheet "Thuốc" chỉ có dòng tiêu đề và sheet "Hướng dẫn". */
    public static byte[] template() {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            DataFormat dataFormat = workbook.createDataFormat();
            Font bold = workbook.createFont();
            bold.setBold(true);
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(bold);
            CellStyle textStyle = workbook.createCellStyle();
            textStyle.setDataFormat(dataFormat.getFormat("@"));
            CellStyle dateStyle = workbook.createCellStyle();
            dateStyle.setDataFormat(dataFormat.getFormat("dd/mm/yyyy"));

            Sheet sheet = workbook.createSheet("Thuốc");
            Row header = sheet.createRow(0);
            Column[] columns = Column.values();
            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i].label + (columns[i].required ? "*" : ""));
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, (columns[i] == Column.NAME ? 36 : 16) * 256);
            }
            // Mã thuốc dạng chữ để giữ số 0 ở đầu; Hạn dùng dạng ngày
            sheet.setDefaultColumnStyle(Column.CODE.ordinal(), textStyle);
            sheet.setDefaultColumnStyle(Column.EXPIRY.ordinal(), dateStyle);
            sheet.createFreezePane(0, 1);

            Sheet guide = workbook.createSheet("Hướng dẫn");
            String[] lines = {
                    "Hướng dẫn nhập thuốc từ Excel",
                    "• Nhập dữ liệu ở sheet \"Thuốc\", mỗi dòng một thuốc, tối đa " + MAX_ROWS + " dòng. Không đổi tên dòng tiêu đề.",
                    "• Mã thuốc*: tối đa 30 ký tự, không trùng nhau trong file. Hệ thống tự chuyển thành chữ in hoa.",
                    "• Tên thuốc*: tối đa 150 ký tự. Đơn vị: tối đa 30 ký tự, để trống sẽ là \"Viên\".",
                    "• Giá*: số không âm (VNĐ). Số lượng*: số nguyên không âm. Hạn dùng: ngày dạng dd/MM/yyyy.",
                    "• Nếu mã thuốc đã có trong hệ thống, bạn được chọn \"Nhập tiếp\" ở bước xem trước:",
                    "    số lượng được cộng thêm vào tồn kho; giá và hạn dùng được cập nhật (ô để trống thì giữ nguyên).",
            };
            for (int i = 0; i < lines.length; i++) {
                Cell cell = guide.createRow(i).createCell(0);
                cell.setCellValue(lines[i]);
                if (i == 0) cell.setCellStyle(headerStyle);
            }
            guide.setColumnWidth(0, 110 * 256);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
