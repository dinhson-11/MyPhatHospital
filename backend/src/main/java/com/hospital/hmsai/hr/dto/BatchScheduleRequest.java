package com.hospital.hmsai.hr.dto;

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
public class BatchScheduleRequest {

    @NotEmpty(message = "Danh sách lịch trực không được để trống")
    @Valid
    private List<ScheduleRequest> schedules;
}
