package com.hospital.hmsai.pharmacy.service;

import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.pharmacy.dto.DrugImportAction;
import com.hospital.hmsai.pharmacy.dto.DrugImportItem;
import com.hospital.hmsai.pharmacy.dto.DrugImportPreviewRow;
import com.hospital.hmsai.pharmacy.dto.DrugImportRequest;
import com.hospital.hmsai.pharmacy.dto.DrugImportResult;
import com.hospital.hmsai.pharmacy.dto.DrugImportRowStatus;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.pharmacy.repository.DrugRepository;
import com.hospital.hmsai.pharmacy.service.impl.DrugImportServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static com.hospital.hmsai.pharmacy.importer.ExcelTestFiles.workbook;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DrugImportServiceImplTest {

    private static final Object[] HEADER = {"Mã thuốc*", "Tên thuốc*", "Đơn vị", "Giá*", "Số lượng*", "Hạn dùng"};

    @Mock
    private DrugRepository drugRepository;

    @InjectMocks
    private DrugImportServiceImpl importService;

    private Drug paracetamol;

    @BeforeEach
    void setUp() {
        paracetamol = Drug.builder()
                .id(1L)
                .code("PARA-500")
                .name("Paracetamol 500mg")
                .unit("Viên")
                .price(BigDecimal.valueOf(1500))
                .stockQuantity(200)
                .expiryDate(LocalDate.of(2027, 1, 1))
                .build();
    }

    private List<DrugImportPreviewRow> preview(Object[]... dataRows) {
        Object[][] rows = new Object[dataRows.length + 1][];
        rows[0] = HEADER;
        System.arraycopy(dataRows, 0, rows, 1, dataRows.length);
        return importService.preview(new ByteArrayInputStream(workbook(rows)));
    }

    private static DrugImportItem item(int row, String code, String name, Integer qty, BigDecimal price, DrugImportAction action) {
        return DrugImportItem.builder()
                .rowNumber(row).code(code).name(name).quantity(qty).price(price).action(action)
                .build();
    }

    // ------------------------------------------------------------------ xem trước

    @Test
    @DisplayName("Xem trước: phân loại dòng mới / đã tồn tại (kèm dữ liệu hiện có) theo mã đã chuẩn hóa")
    void previewClassifiesNewAndExistingRows() {
        when(drugRepository.findByCodeIn(anyCollection())).thenReturn(List.of(paracetamol));

        List<DrugImportPreviewRow> rows = preview(
                new Object[]{" para-500 ", null, null, null, 50, null},
                new Object[]{"amox-250", "Amoxicillin 250mg", "Viên", 3000, 100, "31/12/2027"}
        );

        DrugImportPreviewRow existing = rows.get(0);
        assertEquals(DrugImportRowStatus.EXISTS, existing.getStatus());
        assertEquals("PARA-500", existing.getCode());
        assertTrue(existing.getErrors().isEmpty(), "Thuốc đã có không bắt buộc tên / giá");
        assertEquals(200, existing.getExisting().getStockQuantity());
        assertEquals("Paracetamol 500mg", existing.getExisting().getName());

        DrugImportPreviewRow fresh = rows.get(1);
        assertEquals(DrugImportRowStatus.NEW, fresh.getStatus());
        assertEquals("AMOX-250", fresh.getCode());
        assertEquals(3, fresh.getRowNumber());
        assertNull(fresh.getExisting());
    }

    @Test
    @DisplayName("Xem trước: dòng sai dữ liệu / trùng mã trong file được đánh dấu lỗi kèm lý do")
    void previewMarksInvalidRows() {
        when(drugRepository.findByCodeIn(anyCollection())).thenReturn(List.of());

        List<DrugImportPreviewRow> rows = preview(
                new Object[]{"A1", "Thuốc A", null, 1000, 10, null},
                new Object[]{"a1", "Thuốc A lần 2", null, 1000, 10, null},
                new Object[]{"B1", null, null, null, null, null},
                new Object[]{"C".repeat(31), "N".repeat(151), "U".repeat(31), -1, -5, null},
                new Object[]{null, "Không mã", null, "abc", 1, null}
        );

        assertEquals(DrugImportRowStatus.NEW, rows.get(0).getStatus());
        assertEquals(List.of("Trùng mã với dòng 2 trong file"), rows.get(1).getErrors());
        assertEquals(List.of("Thiếu số lượng", "Thiếu tên thuốc", "Thiếu giá"), rows.get(2).getErrors());
        assertEquals(List.of("Mã thuốc tối đa 30 ký tự", "Tên thuốc tối đa 150 ký tự", "Đơn vị tối đa 30 ký tự",
                "Giá không được âm", "Số lượng không được âm"), rows.get(3).getErrors());
        assertEquals(List.of("Giá không hợp lệ", "Thiếu mã thuốc"), rows.get(4).getErrors());
        rows.subList(1, 5).forEach(r -> assertEquals(DrugImportRowStatus.INVALID, r.getStatus()));
    }

    // ------------------------------------------------------------------ nhập

    @Test
    @DisplayName("Nhập: CREATE thêm thuốc mới, RESTOCK cộng tồn kho + cập nhật giá/HSD, giữ tên/đơn vị")
    void importCreatesAndRestocks() {
        when(drugRepository.existsByCode("AMOX-250")).thenReturn(false);
        when(drugRepository.findByCodeForUpdate("PARA-500")).thenReturn(Optional.of(paracetamol));
        when(drugRepository.save(any(Drug.class))).thenAnswer(inv -> inv.getArgument(0));

        DrugImportItem create = item(2, "amox-250", " Amoxicillin 250mg ", 100, BigDecimal.valueOf(3000), DrugImportAction.CREATE);
        DrugImportItem restock = item(3, "para-500", "Tên khác trong file", 50, BigDecimal.valueOf(1800), DrugImportAction.RESTOCK);
        restock.setExpiryDate(LocalDate.of(2028, 6, 30));
        restock.setUnit("Hộp");

        DrugImportResult result = importService.importDrugs(new DrugImportRequest(List.of(create, restock)));

        assertEquals(1, result.getCreated());
        assertEquals(1, result.getRestocked());

        ArgumentCaptor<Drug> saved = ArgumentCaptor.forClass(Drug.class);
        verify(drugRepository, times(2)).save(saved.capture());
        Drug created = saved.getAllValues().get(0);
        assertEquals("AMOX-250", created.getCode());
        assertEquals("Amoxicillin 250mg", created.getName());
        assertEquals("Viên", created.getUnit());
        assertEquals(100, created.getStockQuantity());

        assertEquals(250, paracetamol.getStockQuantity());
        assertEquals(BigDecimal.valueOf(1800), paracetamol.getPrice());
        assertEquals(LocalDate.of(2028, 6, 30), paracetamol.getExpiryDate());
        assertEquals("Paracetamol 500mg", paracetamol.getName());
        assertEquals("Viên", paracetamol.getUnit());
    }

    @Test
    @DisplayName("Nhập: RESTOCK để trống giá / HSD thì giữ nguyên giá trị cũ")
    void restockKeepsOldPriceAndExpiryWhenBlank() {
        when(drugRepository.findByCodeForUpdate("PARA-500")).thenReturn(Optional.of(paracetamol));

        importService.importDrugs(new DrugImportRequest(List.of(
                item(2, "PARA-500", null, 10, null, DrugImportAction.RESTOCK))));

        assertEquals(210, paracetamol.getStockQuantity());
        assertEquals(BigDecimal.valueOf(1500), paracetamol.getPrice());
        assertEquals(LocalDate.of(2027, 1, 1), paracetamol.getExpiryDate());
    }

    @Test
    @DisplayName("Nhập: mã CREATE vừa bị người khác thêm → báo lỗi theo dòng, không lưu")
    void importRejectsCreateForExistingCode() {
        when(drugRepository.existsByCode("PARA-500")).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () -> importService.importDrugs(
                new DrugImportRequest(List.of(item(4, "para-500", "Paracetamol", 10, BigDecimal.TEN, DrugImportAction.CREATE)))));

        assertEquals("Dòng 4: mã thuốc PARA-500 đã tồn tại. Vui lòng xem trước lại file.", ex.getMessage());
        verify(drugRepository, never()).save(any());
    }

    @Test
    @DisplayName("Nhập: RESTOCK cho mã không còn tồn tại → báo lỗi theo dòng")
    void importRejectsRestockForMissingCode() {
        when(drugRepository.findByCodeForUpdate("GONE")).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class, () -> importService.importDrugs(
                new DrugImportRequest(List.of(item(5, "gone", null, 10, null, DrugImportAction.RESTOCK)))));

        assertEquals("Dòng 5: mã thuốc GONE không còn trong hệ thống. Vui lòng xem trước lại file.", ex.getMessage());
    }

    @Test
    @DisplayName("Nhập: dữ liệu sai (máy chủ kiểm tra lại) → báo lỗi theo dòng, không lưu")
    void importRevalidatesItems() {
        BusinessException ex = assertThrows(BusinessException.class, () -> importService.importDrugs(
                new DrugImportRequest(List.of(item(6, "X1", null, -1, null, DrugImportAction.CREATE)))));

        assertEquals("Dòng 6: Số lượng không được âm; Thiếu tên thuốc; Thiếu giá", ex.getMessage());
        verifyNoInteractions(drugRepository);
    }

    @Test
    @DisplayName("Nhập: hai dòng cùng mã trong một lần nhập → từ chối")
    void importRejectsDuplicateCodes() {
        BusinessException ex = assertThrows(BusinessException.class, () -> importService.importDrugs(
                new DrugImportRequest(List.of(
                        item(2, "A1", "Thuốc A", 1, BigDecimal.ONE, DrugImportAction.CREATE),
                        item(3, "a1", "Thuốc A", 1, BigDecimal.ONE, DrugImportAction.CREATE)))));

        assertEquals("Dòng 3: Trùng mã với dòng 2 trong file", ex.getMessage());
        verifyNoInteractions(drugRepository);
    }
}
