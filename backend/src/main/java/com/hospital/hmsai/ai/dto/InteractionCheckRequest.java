package com.hospital.hmsai.ai.dto;

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
public class InteractionCheckRequest {

    @NotEmpty(message = "Danh sách thuốc không được để trống")
    private List<DrugItemDto> drugs;
}
