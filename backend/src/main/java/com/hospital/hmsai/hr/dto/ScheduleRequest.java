package com.hospital.hmsai.hr.dto;

import com.hospital.hmsai.hr.entity.WorkShift;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleRequest {

    @NotNull(message = "ID nhân viên y tế không được để trống")
    private Long staffId;

    @NotNull(message = "Khoa/Phòng ban không được để trống")
    private Long departmentId;

    @NotNull(message = "Ngày trực không được để trống")
    private LocalDate workDate;

    @NotNull(message = "Ca trực không được để trống")
    private WorkShift shift;

    private String roomNo;

    private String note;
}
