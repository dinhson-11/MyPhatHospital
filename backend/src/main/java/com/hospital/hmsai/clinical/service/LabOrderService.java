package com.hospital.hmsai.clinical.service;

import com.hospital.hmsai.clinical.dto.LabOrderResponse;
import com.hospital.hmsai.clinical.dto.LabResultResponse;
import com.hospital.hmsai.clinical.dto.UpdateLabResultRequest;

public interface LabOrderService {

    LabOrderResponse getOrderById(Long orderId);

    LabResultResponse submitLabResult(Long orderId, UpdateLabResultRequest request);
}
