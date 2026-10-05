package com.hospital.hmsai.hr.service;

import com.hospital.hmsai.hr.dto.BatchScheduleRequest;
import com.hospital.hmsai.hr.dto.ScheduleRequest;
import com.hospital.hmsai.hr.dto.ScheduleResponse;

import java.time.LocalDate;
import java.util.List;

public interface ScheduleService {

    ScheduleResponse createSchedule(ScheduleRequest request);

    List<ScheduleResponse> createBatchSchedules(BatchScheduleRequest request);

    List<ScheduleResponse> getSchedules(Long staffId, Long departmentId, LocalDate startDate, LocalDate endDate);

    void deleteSchedule(Long id);
}
