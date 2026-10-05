package com.hospital.hmsai.hr.dto;

import com.hospital.hmsai.hr.entity.StaffSchedule;
import com.hospital.hmsai.hr.entity.WorkShift;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleResponse {

    private Long id;
    private Long staffId;
    private String staffName;
    private String specialty;
    private Long departmentId;
    private String departmentName;
    private LocalDate workDate;
    private WorkShift shift;
    private String roomNo;
    private String note;
    private LocalDateTime createdAt;

    public static ScheduleResponse fromEntity(StaffSchedule schedule) {
        if (schedule == null) return null;

        Long staffId = null;
        String staffName = null;
        String specialty = null;
        if (schedule.getStaffProfile() != null) {
            staffId = schedule.getStaffProfile().getId();
            specialty = schedule.getStaffProfile().getSpecialty();
            if (schedule.getStaffProfile().getUser() != null) {
                staffName = schedule.getStaffProfile().getUser().getFullName();
            }
        }

        Long deptId = null;
        String deptName = null;
        if (schedule.getDepartment() != null) {
            deptId = schedule.getDepartment().getId();
            deptName = schedule.getDepartment().getName();
        }

        return ScheduleResponse.builder()
                .id(schedule.getId())
                .staffId(staffId)
                .staffName(staffName)
                .specialty(specialty)
                .departmentId(deptId)
                .departmentName(deptName)
                .workDate(schedule.getWorkDate())
                .shift(schedule.getShift())
                .roomNo(schedule.getRoomNo())
                .note(schedule.getNote())
                .createdAt(schedule.getCreatedAt())
                .build();
    }
}
