package com.hospital.hmsai.clinical.dto;

import com.hospital.hmsai.clinical.entity.Prescription;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionResponse {

    private Long id;
    private Long visitId;
    private List<PrescriptionItemResponse> items;
    private BigDecimal estimatedTotalAmount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PrescriptionResponse fromEntity(Prescription prescription) {
        if (prescription == null) return null;

        List<PrescriptionItemResponse> itemResponses = prescription.getItems() != null
                ? prescription.getItems().stream().map(PrescriptionItemResponse::fromEntity).toList()
                : Collections.emptyList();

        BigDecimal total = BigDecimal.ZERO;
        for (PrescriptionItemResponse item : itemResponses) {
            if (item.getUnitPrice() != null && item.getQuantity() != null) {
                total = total.add(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
            }
        }

        return PrescriptionResponse.builder()
                .id(prescription.getId())
                .visitId(prescription.getVisit() != null ? prescription.getVisit().getId() : null)
                .items(itemResponses)
                .estimatedTotalAmount(total)
                .createdAt(prescription.getCreatedAt())
                .updatedAt(prescription.getUpdatedAt())
                .build();
    }
}
