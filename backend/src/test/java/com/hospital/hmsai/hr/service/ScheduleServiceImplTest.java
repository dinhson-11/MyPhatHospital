package com.hospital.hmsai.hr.service;

import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.hr.dto.BatchScheduleRequest;
import com.hospital.hmsai.hr.dto.ScheduleRequest;
import com.hospital.hmsai.hr.dto.ScheduleResponse;
import com.hospital.hmsai.hr.entity.StaffSchedule;
import com.hospital.hmsai.hr.entity.WorkShift;
import com.hospital.hmsai.hr.repository.StaffScheduleRepository;
import com.hospital.hmsai.hr.service.impl.ScheduleServiceImpl;
import com.hospital.hmsai.user.entity.Department;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.entity.User;
import com.hospital.hmsai.user.repository.DepartmentRepository;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScheduleServiceImplTest {

    @Mock
    private StaffScheduleRepository staffScheduleRepository;

    @Mock
    private StaffProfileRepository staffProfileRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @InjectMocks
    private ScheduleServiceImpl scheduleService;

    private StaffProfile doctor;
    private Department department;
    private LocalDate today;

    @BeforeEach
    void setUp() {
        today = LocalDate.now();
        User doctorUser = User.builder().id(10L).fullName("BS. Nguyễn Văn Hùng").build();
        department = Department.builder().id(1L).name("Nội tổng quát").build();
        doctor = StaffProfile.builder().id(5L).user(doctorUser).department(department).specialty("Nội khoa").build();
    }

    @Test
    @DisplayName("Xếp lịch trực thành công khi không có trùng lịch")
    void createSchedule_Success() {
        ScheduleRequest request = ScheduleRequest.builder()
                .staffId(5L)
                .departmentId(1L)
                .workDate(today)
                .shift(WorkShift.MORNING)
                .roomNo("P.201")
                .note("Trực sáng")
                .build();

        when(staffScheduleRepository.existsByStaffProfileIdAndWorkDateAndShiftIn(5L, today, EnumSet.of(WorkShift.MORNING, WorkShift.FULL_DAY))).thenReturn(false);
        when(staffProfileRepository.findById(5L)).thenReturn(Optional.of(doctor));
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(department));

        StaffSchedule saved = StaffSchedule.builder()
                .id(1L)
                .staffProfile(doctor)
                .department(department)
                .workDate(today)
                .shift(WorkShift.MORNING)
                .roomNo("P.201")
                .note("Trực sáng")
                .build();
        when(staffScheduleRepository.save(any(StaffSchedule.class))).thenReturn(saved);

        ScheduleResponse response = scheduleService.createSchedule(request);

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("BS. Nguyễn Văn Hùng", response.getStaffName());
        assertEquals("Nội tổng quát", response.getDepartmentName());
        assertEquals(WorkShift.MORNING, response.getShift());

        verify(staffScheduleRepository).save(any(StaffSchedule.class));
    }

    @Test
    @DisplayName("Chặn xếp lịch trực khi phát hiện trùng ca trực trong ngày của nhân viên")
    void createSchedule_Conflict_ThrowsBusinessException() {
        ScheduleRequest request = ScheduleRequest.builder()
                .staffId(5L)
                .departmentId(1L)
                .workDate(today)
                .shift(WorkShift.MORNING)
                .build();

        when(staffScheduleRepository.existsByStaffProfileIdAndWorkDateAndShiftIn(5L, today, EnumSet.of(WorkShift.MORNING, WorkShift.FULL_DAY))).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                scheduleService.createSchedule(request));
        assertTrue(ex.getMessage().contains("đã có lịch trực"));
    }

    @Test
    @DisplayName("Xếp lịch trực hàng loạt theo tuần")
    void createBatchSchedules_Success() {
        ScheduleRequest req1 = ScheduleRequest.builder()
                .staffId(5L).departmentId(1L).workDate(today).shift(WorkShift.MORNING).build();
        ScheduleRequest req2 = ScheduleRequest.builder()
                .staffId(5L).departmentId(1L).workDate(today.plusDays(1)).shift(WorkShift.AFTERNOON).build();

        when(staffScheduleRepository.existsByStaffProfileIdAndWorkDateAndShiftIn(any(), any(), any())).thenReturn(false);
        when(staffProfileRepository.findById(5L)).thenReturn(Optional.of(doctor));
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(department));
        when(staffScheduleRepository.save(any(StaffSchedule.class))).thenAnswer(i -> i.getArgument(0));

        BatchScheduleRequest batchRequest = BatchScheduleRequest.builder()
                .schedules(List.of(req1, req2))
                .build();

        List<ScheduleResponse> responses = scheduleService.createBatchSchedules(batchRequest);

        assertNotNull(responses);
        assertEquals(2, responses.size());
        verify(staffScheduleRepository, times(2)).save(any(StaffSchedule.class));
    }

    @Test
    @DisplayName("Ca cả ngày (FULL_DAY) chồng lấn ca sáng/chiều đã có trong ngày → chặn")
    void createSchedule_FullDayOverlapsMorning_ThrowsBusinessException() {
        ScheduleRequest request = ScheduleRequest.builder()
                .staffId(5L)
                .departmentId(1L)
                .workDate(today)
                .shift(WorkShift.FULL_DAY)
                .build();

        when(staffScheduleRepository.existsByStaffProfileIdAndWorkDateAndShiftIn(
                5L, today, EnumSet.of(WorkShift.MORNING, WorkShift.AFTERNOON, WorkShift.FULL_DAY))).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                scheduleService.createSchedule(request));
        assertTrue(ex.getMessage().contains("đã có lịch trực"));
        verify(staffScheduleRepository, never()).save(any());
    }

    @Test
    @DisplayName("Ca đêm không chồng lấn ca cả ngày")
    void createSchedule_NightOnlyConflictsWithNight() {
        ScheduleRequest request = ScheduleRequest.builder()
                .staffId(5L)
                .departmentId(1L)
                .workDate(today)
                .shift(WorkShift.NIGHT)
                .build();

        when(staffScheduleRepository.existsByStaffProfileIdAndWorkDateAndShiftIn(5L, today, EnumSet.of(WorkShift.NIGHT)))
                .thenReturn(false);
        when(staffProfileRepository.findById(5L)).thenReturn(Optional.of(doctor));
        when(departmentRepository.findById(1L)).thenReturn(Optional.of(department));
        when(staffScheduleRepository.save(any(StaffSchedule.class))).thenAnswer(i -> i.getArgument(0));

        ScheduleResponse response = scheduleService.createSchedule(request);
        assertEquals(WorkShift.NIGHT, response.getShift());
    }

    @Test
    @DisplayName("Xóa ca trực theo ID")
    void deleteSchedule_Success() {
        StaffSchedule schedule = StaffSchedule.builder().id(10L).build();
        when(staffScheduleRepository.findById(10L)).thenReturn(Optional.of(schedule));

        scheduleService.deleteSchedule(10L);

        verify(staffScheduleRepository).delete(schedule);
    }
}
