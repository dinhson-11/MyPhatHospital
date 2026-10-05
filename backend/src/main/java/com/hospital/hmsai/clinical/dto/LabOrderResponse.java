package com.hospital.hmsai.clinical.dto;

import com.hospital.hmsai.clinical.entity.LabOrder;
import com.hospital.hmsai.clinical.entity.LabOrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabOrderResponse {

    private Long id;
    private Long visitId;
    private String testType;
    private LabOrderStatus status;
    private LocalDateTime orderedAt;
    private List<LabResultResponse> results;
    private LocalDateTime createdAt;

    public static LabOrderResponse fromEntity(LabOrder order) {
        if (order == null) return null;
        List<LabResultResponse> resultResponses = order.getResults() != null
                ? order.getResults().stream().map(LabResultResponse::fromEntity).toList()
                : Collections.emptyList();

        return LabOrderResponse.builder()
                .id(order.getId())
                .visitId(order.getVisit() != null ? order.getVisit().getId() : null)
                .testType(order.getTestType())
                .status(order.getStatus())
                .orderedAt(order.getOrderedAt())
                .results(resultResponses)
                .createdAt(order.getCreatedAt())
                .build();
    }
}
