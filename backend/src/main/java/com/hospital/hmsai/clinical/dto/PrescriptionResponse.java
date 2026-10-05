package com.hospital.hmsai.clinical.dto;

import com.hospital.hmsai.ai.dto.AllergyWarningDto;
import com.hospital.hmsai.ai.dto.DrugInteractionWarningDto;
import com.hospital.hmsai.clinical.entity.Prescription;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
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

    // AI Clinical Warnings (FR-11.1, FR-11.2, NFR-8)
    @Builder.Default
    private List<DrugInteractionWarningDto> interactionWarnings = new ArrayList<>();

    @Builder.Default
    private List<AllergyWarningDto> allergyAlerts = new ArrayList<>();

    @Builder.Default
    private Boolean hasWarning = false;

    private String aiDisclaimer;

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
                .interactionWarnings(new ArrayList<>())
                .allergyAlerts(new ArrayList<>())
                .hasWarning(false)
                .build();
    }
}
