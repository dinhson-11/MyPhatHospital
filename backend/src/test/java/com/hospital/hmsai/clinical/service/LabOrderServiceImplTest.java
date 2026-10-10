package com.hospital.hmsai.clinical.service;

import com.hospital.hmsai.clinical.dto.LabResultResponse;
import com.hospital.hmsai.clinical.dto.UpdateLabResultRequest;
import com.hospital.hmsai.clinical.entity.LabOrder;
import com.hospital.hmsai.clinical.entity.LabOrderStatus;
import com.hospital.hmsai.clinical.entity.LabResult;
import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.clinical.entity.VisitStatus;
import com.hospital.hmsai.clinical.repository.LabOrderRepository;
import com.hospital.hmsai.clinical.repository.LabResultRepository;
import com.hospital.hmsai.clinical.service.impl.LabOrderServiceImpl;
import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LabOrderServiceImplTest {

    @Mock
    private LabOrderRepository labOrderRepository;

    @Mock
    private LabResultRepository labResultRepository;

    @InjectMocks
    private LabOrderServiceImpl labOrderService;

    private LabOrder order;

    @BeforeEach
    void setUp() {
        // Kết quả CLS thường có sau khi lượt khám đã hoàn tất – vẫn phải nhập được
        Visit visit = Visit.builder().id(50L).status(VisitStatus.COMPLETED).build();
        order = LabOrder.builder()
                .id(300L)
                .visit(visit)
                .testType("Công thức máu")
                .status(LabOrderStatus.ORDERED)
                .results(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("Nhập kết quả CLS: chỉ lưu kết quả đúng một lần (không còn merge tạo bản sao)")
    void submitLabResult_PersistsResultOnce() {
        when(labOrderRepository.findByIdForUpdate(300L)).thenReturn(Optional.of(order));
        when(labResultRepository.save(any(LabResult.class))).thenAnswer(inv -> {
            LabResult r = inv.getArgument(0);
            r.setId(900L);
            return r;
        });

        LabResultResponse response = labOrderService.submitLabResult(300L,
                UpdateLabResultRequest.builder().resultText("Hb 13.5 g/dL").build());

        assertEquals(900L, response.getId());
        assertEquals(300L, response.getLabOrderId());
        assertEquals(LabOrderStatus.RESULTED, order.getStatus());
        assertEquals(1, order.getResults().size());
        verify(labResultRepository, times(1)).save(any(LabResult.class));
        verify(labOrderRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không nhập trùng kết quả cho chỉ định đã có kết quả")
    void submitLabResult_AlreadyResulted_Rejected() {
        order.setStatus(LabOrderStatus.RESULTED);
        when(labOrderRepository.findByIdForUpdate(300L)).thenReturn(Optional.of(order));

        assertThrows(BusinessException.class, () -> labOrderService.submitLabResult(300L,
                UpdateLabResultRequest.builder().resultText("Kết quả lần 2").build()));
        verify(labResultRepository, never()).save(any());
    }

    @Test
    @DisplayName("Chỉ định không tồn tại → 404")
    void submitLabResult_NotFound() {
        when(labOrderRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> labOrderService.submitLabResult(999L,
                UpdateLabResultRequest.builder().resultText("x").build()));
    }
}
