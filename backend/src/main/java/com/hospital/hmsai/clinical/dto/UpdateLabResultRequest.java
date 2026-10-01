package com.hospital.hmsai.clinical.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateLabResultRequest {

    @NotBlank(message = "resultText không được để trống")
    private String resultText;

    private String resultFileUrl;
}
