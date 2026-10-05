package com.hospital.hmsai.clinical.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePrescriptionRequest {

    @NotEmpty(message = "Đơn thuốc phải có ít nhất 1 loại thuốc")
    @Valid
    private List<PrescriptionItemRequest> items;
}
