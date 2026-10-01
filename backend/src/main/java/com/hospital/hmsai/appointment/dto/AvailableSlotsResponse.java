package com.hospital.hmsai.appointment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * DTO trả về danh sách khung giờ trống của bác sĩ trong 1 ngày.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailableSlotsResponse {

    private Long doctorId;
    private String doctorName;
    private LocalDate date;
    private List<TimeSlot> availableSlots;
    private List<TimeSlot> bookedSlots;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimeSlot {
        private LocalTime startTime;
        private LocalTime endTime;
        private boolean available;
    }
}
