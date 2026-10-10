package com.hospital.hmsai.pharmacy.service;

import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.pharmacy.dto.CreateDrugRequest;
import com.hospital.hmsai.pharmacy.dto.StockAdjustmentType;
import com.hospital.hmsai.pharmacy.dto.UpdateStockRequest;
import com.hospital.hmsai.pharmacy.dto.DrugInteractionResponse;
import com.hospital.hmsai.pharmacy.dto.DrugResponse;
import com.hospital.hmsai.pharmacy.entity.Drug;
import com.hospital.hmsai.pharmacy.entity.DrugInteraction;
import com.hospital.hmsai.pharmacy.entity.InteractionSeverity;
import com.hospital.hmsai.pharmacy.repository.DrugInteractionRepository;
import com.hospital.hmsai.pharmacy.repository.DrugRepository;
import com.hospital.hmsai.pharmacy.service.impl.DrugServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DrugServiceImplTest {

    @Mock
    private DrugRepository drugRepository;

    @Mock
    private DrugInteractionRepository drugInteractionRepository;

    @InjectMocks
    private DrugServiceImpl drugService;

    private Drug aspirin;
    private Drug warfarin;
    private DrugInteraction interaction;

    @BeforeEach
    void setUp() {
        aspirin = Drug.builder()
                .id(3L)
                .code("DRUG-ASP-81")
                .name("Aspirin 81mg")
                .unit("Viên")
                .price(BigDecimal.valueOf(2000))
                .stockQuantity(500)
                .build();

        warfarin = Drug.builder()
                .id(4L)
                .code("DRUG-WAR-5")
                .name("Warfarin 5mg")
                .unit("Viên")
                .price(BigDecimal.valueOf(4500))
                .stockQuantity(300)
                .build();

        interaction = DrugInteraction.builder()
                .id(1L)
                .drugA(aspirin)
                .drugB(warfarin)
                .severity(InteractionSeverity.SEVERE)
                .description("Tăng nguy cơ xuất huyết tiêu hóa")
                .build();
    }

    @Test
    @DisplayName("Tìm kiếm danh mục thuốc có phân trang")
    void testSearchDrugs() {
        Pageable pageable = PageRequest.of(0, 10);
        when(drugRepository.searchByKeyword("Aspirin", pageable))
                .thenReturn(new PageImpl<>(List.of(aspirin), pageable, 1));

        Page<DrugResponse> result = drugService.searchDrugs("Aspirin", pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("DRUG-ASP-81", result.getContent().get(0).getCode());
    }

    @Test
    @DisplayName("Lấy chi tiết thuốc theo ID thành công")
    void testGetById_Success() {
        when(drugRepository.findById(3L)).thenReturn(Optional.of(aspirin));

        DrugResponse response = drugService.getById(3L);

        assertNotNull(response);
        assertEquals("Aspirin 81mg", response.getName());
    }

    @Test
    @DisplayName("Lấy chi tiết thuốc thất bại khi không tìm thấy")
    void testGetById_NotFound() {
        when(drugRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> drugService.getById(999L));
    }

    @Test
    @DisplayName("Kiểm tra tương tác giữa các thuốc kê đơn")
    void testCheckInteractionsAmongDrugs() {
        List<Long> drugIds = List.of(3L, 4L);
        when(drugInteractionRepository.findInteractionsAmongDrugs(drugIds))
                .thenReturn(List.of(interaction));

        List<DrugInteractionResponse> responses = drugService.checkInteractionsAmongDrugs(drugIds);

        assertNotNull(responses);
        assertEquals(1, responses.size());
        assertEquals(InteractionSeverity.SEVERE, responses.get(0).getSeverity());
        assertEquals("Aspirin 81mg", responses.get(0).getDrugAName());
        assertEquals("Warfarin 5mg", responses.get(0).getDrugBName());
    }

    @Test
    @DisplayName("Kiểm tra tương tác với ít hơn 2 thuốc trả về rỗng")
    void testCheckInteractions_LessThanTwoDrugs() {
        List<DrugInteractionResponse> responses = drugService.checkInteractionsAmongDrugs(List.of(3L));
        assertTrue(responses.isEmpty());
        verify(drugInteractionRepository, never()).findInteractionsAmongDrugs(any());
    }

    @Test
    @DisplayName("Thêm thuốc: mã được chuẩn hóa (trim + chữ hoa) TRƯỚC khi kiểm tra trùng")
    void testCreateDrug_CodeNormalizedBeforeDuplicateCheck() {
        CreateDrugRequest request = CreateDrugRequest.builder()
                .code("  drug-asp-81 ").name("Aspirin 81mg").price(BigDecimal.valueOf(2000)).stockQuantity(10).build();
        when(drugRepository.existsByCode("DRUG-ASP-81")).thenReturn(true);

        assertThrows(BusinessException.class, () -> drugService.createDrug(request));
        verify(drugRepository, never()).save(any());
    }

    @Test
    @DisplayName("Điều chỉnh kiểm kê (ADJUSTMENT) về 0 được phép")
    void testUpdateStock_AdjustmentToZero_Allowed() {
        when(drugRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(aspirin));
        when(drugRepository.save(any(Drug.class))).thenAnswer(i -> i.getArgument(0));

        DrugResponse response = drugService.updateStock(3L, UpdateStockRequest.builder()
                .quantity(0).adjustmentType(StockAdjustmentType.ADJUSTMENT).build());

        assertEquals(0, response.getStockQuantity());
    }

    @Test
    @DisplayName("Nhập kho / xuất kho số lượng 0 bị từ chối")
    void testUpdateStock_ImportZero_Rejected() {
        when(drugRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(aspirin));

        assertThrows(BusinessException.class, () -> drugService.updateStock(3L, UpdateStockRequest.builder()
                .quantity(0).adjustmentType(StockAdjustmentType.IMPORT).build()));
        assertThrows(BusinessException.class, () -> drugService.updateStock(3L, UpdateStockRequest.builder()
                .quantity(0).adjustmentType(StockAdjustmentType.EXPORT).build()));
        verify(drugRepository, never()).save(any());
    }

    @Test
    @DisplayName("Xuất kho vượt tồn bị từ chối, nhập kho dùng khóa ghi dòng thuốc")
    void testUpdateStock_ExportMoreThanStock_Rejected() {
        when(drugRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(aspirin));

        assertThrows(BusinessException.class, () -> drugService.updateStock(3L, UpdateStockRequest.builder()
                .quantity(501).adjustmentType(StockAdjustmentType.EXPORT).build()));
        assertEquals(500, aspirin.getStockQuantity());
        verify(drugRepository, never()).findById(any());
    }
}
