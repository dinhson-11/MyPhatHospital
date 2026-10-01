package com.hospital.hmsai.clinical.service.impl;

import com.hospital.hmsai.clinical.dto.LabOrderResponse;
import com.hospital.hmsai.clinical.dto.LabResultResponse;
import com.hospital.hmsai.clinical.dto.UpdateLabResultRequest;
import com.hospital.hmsai.clinical.entity.LabOrder;
import com.hospital.hmsai.clinical.entity.LabOrderStatus;
import com.hospital.hmsai.clinical.entity.LabResult;
import com.hospital.hmsai.clinical.repository.LabOrderRepository;
import com.hospital.hmsai.clinical.repository.LabResultRepository;
import com.hospital.hmsai.clinical.service.LabOrderService;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LabOrderServiceImpl implements LabOrderService {

    private final LabOrderRepository labOrderRepository;
    private final LabResultRepository labResultRepository;

    @Override
    @Transactional(readOnly = true)
    public LabOrderResponse getOrderById(Long orderId) {
        log.info("Lấy thông tin chỉ định CLS ID: {}", orderId);
        LabOrder order = labOrderRepository.findByIdWithResults(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Chỉ định cận lâm sàng", "id", orderId));
        return LabOrderResponse.fromEntity(order);
    }

    @Override
    public LabResultResponse submitLabResult(Long orderId, UpdateLabResultRequest request) {
        log.info("Cập nhật kết quả cận lâm sàng cho order ID: {}", orderId);
        LabOrder order = labOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Chỉ định cận lâm sàng", "id", orderId));

        LabResult result = LabResult.builder()
                .labOrder(order)
                .resultText(request.getResultText())
                .resultFileUrl(request.getResultFileUrl())
                .resultedAt(LocalDateTime.now())
                .build();

        order.setStatus(LabOrderStatus.RESULTED);
        order.addResult(result);
        labOrderRepository.save(order);

        LabResult savedResult = labResultRepository.save(result);
        log.info("Đã lưu kết quả cận lâm sàng ID: {} cho chỉ định ID: {}", savedResult.getId(), orderId);
        return LabResultResponse.fromEntity(savedResult);
    }
}
