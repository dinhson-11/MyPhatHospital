package com.hospital.hmsai.pharmacy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DispenseResponse {

    private Long id;
    private Long prescriptionId;
    private Long visitId;
    private String patientName;
    private String patientCode;
    private String doctorName;
    private String dispensedByName;
    private LocalDateTime dispensedAt;
    private List<DispensedItemResponse> items;
    private String note;
}
