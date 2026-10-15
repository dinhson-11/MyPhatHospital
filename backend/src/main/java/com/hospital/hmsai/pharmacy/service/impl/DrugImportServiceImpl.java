package com.hospital.hmsai.pharmacy.service.impl;

import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.pharmacy.dto.DrugImportAction;
import com.hospital.hmsai.pharmacy.dto.DrugImportItem;
import com.hospital.hmsai.pharmacy.dto.DrugImportPreviewRow;
import com.hospital.hmsai.pharmacy.dto.DrugImportRequest;
import com.hospital.hmsai.pharmacy.dto.DrugImportResult;
import com.hospital.hmsai.pharmacy.dto.DrugImportRowStatus;
import com.hospital.hmsai.pharmacy.dto.DrugResponse;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.pharmacy.importer.DrugExcelFormat;
import com.hospital.hmsai.pharmacy.importer.DrugExcelRow;
import com.hospital.hmsai.pharmacy.repository.DrugRepository;
import com.hospital.hmsai.pharmacy.service.DrugImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Nhập thuốc hàng loạt từ Excel. Bước xem trước và bước nhập dùng chung quy tắc kiểm tra
 * ({@link #fieldErrors}, {@link #newDrugErrors}); quy tắc khớp với thêm từng thuốc trong DrugServiceImpl
 * (mã chuẩn hóa chữ in hoa, đơn vị trống → "Viên") và độ dài cột của bảng drugs.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DrugImportServiceImpl implements DrugImportService {

    private static final int CODE_MAX = 30;
    private static final int NAME_MAX = 150;
    private static final int UNIT_MAX = 30;
    /** price DECIMAL(12,2) → tối đa 10 chữ số phần nguyên. */
    private static final BigDecimal PRICE_LIMIT = new BigDecimal("10000000000");
    private static final String DEFAULT_UNIT = "Viên";

    private final DrugRepository drugRepository;

    @Override
    public List<DrugImportPreviewRow> preview(InputStream excel) {
        List<DrugExcelRow> rows = DrugExcelFormat.read(excel);
        log.info("Xem trước file nhập thuốc: {} dòng", rows.size());

        Set<String> codes = rows.stream()
                .map(r -> normalizeCode(r.code()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, Drug> existing = codes.isEmpty() ? Map.of() : drugRepository.findByCodeIn(codes).stream()
                .collect(Collectors.toMap(d -> normalizeCode(d.getCode()), d -> d, (a, b) -> a));

        Map<String, Integer> firstRowOfCode = new HashMap<>();
        List<DrugImportPreviewRow> result = new ArrayList<>(rows.size());
        for (DrugExcelRow row : rows) {
            String code = normalizeCode(row.code());
            List<String> errors = new ArrayList<>(row.errors());
            errors.addAll(fieldErrors(code, row.name(), row.unit(), row.price(), row.quantity(),
                    row.errors().contains(DrugExcelFormat.QUANTITY_INVALID)));
            duplicateError(code, row.rowNumber(), firstRowOfCode).ifPresent(errors::add);

            Drug current = code != null ? existing.get(code) : null;
            if (current == null) {
                errors.addAll(newDrugErrors(row.name(), row.price(), row.errors().contains(DrugExcelFormat.PRICE_INVALID)));
            }
            DrugImportRowStatus status = !errors.isEmpty() ? DrugImportRowStatus.INVALID
                    : current != null ? DrugImportRowStatus.EXISTS
                    : DrugImportRowStatus.NEW;

            result.add(DrugImportPreviewRow.builder()
                    .rowNumber(row.rowNumber())
                    .code(code)
                    .name(row.name())
                    .unit(row.unit())
                    .price(row.price())
                    .quantity(row.quantity())
                    .expiryDate(row.expiryDate())
                    .status(status)
                    .errors(errors)
                    .existing(DrugResponse.fromEntity(current))
                    .build());
        }
        return result;
    }

    @Override
    @Transactional
    public DrugImportResult importDrugs(DrugImportRequest request) {
        List<DrugImportItem> items = request.getItems();

        // Kiểm tra lại toàn bộ trước khi ghi: dữ liệu đến từ máy khách
        Map<String, Integer> firstRowOfCode = new HashMap<>();
        for (int i = 0; i < items.size(); i++) {
            DrugImportItem item = items.get(i);
            int rowNumber = rowNumberOf(item, i);
            String code = normalizeCode(item.getCode());
            List<String> errors = fieldErrors(code, item.getName(), item.getUnit(), item.getPrice(), item.getQuantity(), false);
            duplicateError(code, rowNumber, firstRowOfCode).ifPresent(errors::add);
            if (item.getAction() == DrugImportAction.CREATE) {
                errors.addAll(newDrugErrors(item.getName(), item.getPrice(), false));
            }
            if (!errors.isEmpty()) {
                throw new BusinessException("Dòng " + rowNumber + ": " + String.join("; ", errors));
            }
        }

        int created = 0;
        int restocked = 0;
        for (int i = 0; i < items.size(); i++) {
            DrugImportItem item = items.get(i);
            int rowNumber = rowNumberOf(item, i);
            String code = normalizeCode(item.getCode());
            switch (item.getAction()) {
                case CREATE -> {
                    create(item, code, rowNumber);
                    created++;
                }
                case RESTOCK -> {
                    restock(item, code, rowNumber);
                    restocked++;
                }
            }
        }
        log.info("Nhập thuốc từ Excel: thêm mới {}, cộng tồn kho {}", created, restocked);
        return new DrugImportResult(created, restocked);
    }

    private void create(DrugImportItem item, String code, int rowNumber) {
        if (drugRepository.existsByCode(code)) {
            throw new BusinessException("Dòng " + rowNumber + ": mã thuốc " + code
                    + " đã tồn tại. Vui lòng xem trước lại file.");
        }
        String unit = item.getUnit() != null && !item.getUnit().isBlank() ? item.getUnit().trim() : DEFAULT_UNIT;
        drugRepository.save(Drug.builder()
                .code(code)
                .name(item.getName().trim())
                .unit(unit)
                .price(item.getPrice())
                .stockQuantity(item.getQuantity())
                .expiryDate(item.getExpiryDate())
                .build());
    }

    /** Cộng tồn kho; giá / hạn dùng chỉ cập nhật khi file có giá trị. Tên và đơn vị giữ nguyên. */
    private void restock(DrugImportItem item, String code, int rowNumber) {
        Drug drug = drugRepository.findByCodeForUpdate(code)
                .orElseThrow(() -> new BusinessException("Dòng " + rowNumber + ": mã thuốc " + code
                        + " không còn trong hệ thống. Vui lòng xem trước lại file."));
        int current = drug.getStockQuantity() != null ? drug.getStockQuantity() : 0;
        try {
            drug.setStockQuantity(Math.addExact(current, item.getQuantity()));
        } catch (ArithmeticException e) {
            throw new BusinessException("Dòng " + rowNumber + ": tồn kho sau khi nhập vượt quá giới hạn");
        }
        if (item.getPrice() != null) drug.setPrice(item.getPrice());
        if (item.getExpiryDate() != null) drug.setExpiryDate(item.getExpiryDate());
        drugRepository.save(drug);
    }

    private static int rowNumberOf(DrugImportItem item, int index) {
        return item.getRowNumber() != null ? item.getRowNumber() : index + 1;
    }

    private static String normalizeCode(String code) {
        return code == null || code.isBlank() ? null : code.trim().toUpperCase(Locale.ROOT);
    }

    /** Lỗi không phụ thuộc thuốc đã có hay chưa. */
    private static List<String> fieldErrors(String code, String name, String unit, BigDecimal price,
                                            Integer quantity, boolean quantityUnreadable) {
        List<String> errors = new ArrayList<>();
        if (code == null) {
            errors.add("Thiếu mã thuốc");
        } else if (code.length() > CODE_MAX) {
            errors.add("Mã thuốc tối đa " + CODE_MAX + " ký tự");
        }
        if (name != null && name.trim().length() > NAME_MAX) {
            errors.add("Tên thuốc tối đa " + NAME_MAX + " ký tự");
        }
        if (unit != null && unit.trim().length() > UNIT_MAX) {
            errors.add("Đơn vị tối đa " + UNIT_MAX + " ký tự");
        }
        if (price != null) {
            if (price.signum() < 0) {
                errors.add("Giá không được âm");
            } else if (price.compareTo(PRICE_LIMIT) >= 0) {
                errors.add("Giá quá lớn");
            } else if (price.stripTrailingZeros().scale() > 2) {
                errors.add("Giá tối đa 2 chữ số thập phân");
            }
        }
        if (quantity == null) {
            if (!quantityUnreadable) errors.add("Thiếu số lượng");
        } else if (quantity < 0) {
            errors.add("Số lượng không được âm");
        }
        return errors;
    }

    /** Thuốc mới bắt buộc có tên và giá (thuốc đã có thì giữ tên, giá trống = giữ giá cũ). */
    private static List<String> newDrugErrors(String name, BigDecimal price, boolean priceUnreadable) {
        List<String> errors = new ArrayList<>();
        if (name == null || name.isBlank()) errors.add("Thiếu tên thuốc");
        if (price == null && !priceUnreadable) errors.add("Thiếu giá");
        return errors;
    }

    private static Optional<String> duplicateError(String code, int rowNumber, Map<String, Integer> firstRowOfCode) {
        if (code == null) return Optional.empty();
        Integer first = firstRowOfCode.putIfAbsent(code, rowNumber);
        return first != null ? Optional.of("Trùng mã với dòng " + first + " trong file") : Optional.empty();
    }
}
