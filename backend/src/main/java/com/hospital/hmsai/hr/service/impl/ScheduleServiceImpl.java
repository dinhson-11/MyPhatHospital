package com.hospital.hmsai.hr.service.impl;

import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.hr.dto.BatchScheduleRequest;
import com.hospital.hmsai.hr.dto.ScheduleRequest;
import com.hospital.hmsai.hr.dto.ScheduleResponse;
import com.hospital.hmsai.hr.entity.StaffSchedule;
import com.hospital.hmsai.hr.repository.StaffScheduleRepository;
import com.hospital.hmsai.hr.service.ScheduleService;
import com.hospital.hmsai.user.entity.Department;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.repository.DepartmentRepository;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleServiceImpl implements ScheduleService {

    private final StaffScheduleRepository staffScheduleRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final DepartmentRepository departmentRepository;

    @Override
    @Transactional
    public ScheduleResponse createSchedule(ScheduleRequest request) {
        log.info("Xếp lịch trực: staffId={}, date={}, shift={}", request.getStaffId(), request.getWorkDate(), request.getShift());

        // 1. Kiểm tra chống trùng ca trực trong cùng một ngày cho nhân viên
        if (staffScheduleRepository.existsByStaffProfileIdAndWorkDateAndShift(
                request.getStaffId(), request.getWorkDate(), request.getShift())) {
            throw new BusinessException("Nhân viên ID " + request.getStaffId() +
                    " đã có lịch trực ca " + request.getShift() + " vào ngày " + request.getWorkDate());
        }

        // 2. Tìm StaffProfile và Department
        StaffProfile staff = staffProfileRepository.findById(request.getStaffId())
                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ nhân viên", "id", request.getStaffId()));

        Department department = departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Khoa/Phòng ban", "id", request.getDepartmentId()));

        // 3. Tạo và lưu bản ghi
        StaffSchedule schedule = StaffSchedule.builder()
                .staffProfile(staff)
                .department(department)
                .workDate(request.getWorkDate())
                .shift(request.getShift())
                .roomNo(request.getRoomNo())
                .note(request.getNote())
                .build();

        StaffSchedule saved = staffScheduleRepository.save(schedule);
        log.info("Lưu lịch trực thành công ID: {}", saved.getId());
        return ScheduleResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public List<ScheduleResponse> createBatchSchedules(BatchScheduleRequest request) {
        log.info("Xếp lịch trực hàng loạt: {} ca", request.getSchedules().size());
        List<ScheduleResponse> results = new ArrayList<>();
        for (ScheduleRequest req : request.getSchedules()) {
            results.add(createSchedule(req));
        }
        return results;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ScheduleResponse> getSchedules(Long staffId, Long departmentId, LocalDate startDate, LocalDate endDate) {
        LocalDate from = (startDate != null) ? startDate : LocalDate.now();
        LocalDate to = (endDate != null) ? endDate : from.plusDays(7);

        log.info("Tra cứu lịch trực: staffId={}, deptId={}, from={}, to={}", staffId, departmentId, from, to);

        List<StaffSchedule> list;
        if (staffId != null) {
            list = staffScheduleRepository.findByStaffAndDateRangeWithDetails(staffId, from, to);
        } else if (departmentId != null) {
            list = staffScheduleRepository.findByDepartmentAndDateRangeWithDetails(departmentId, from, to);
        } else {
            list = staffScheduleRepository.findByDateRangeWithDetails(from, to);
        }

        return list.stream()
                .map(ScheduleResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public void deleteSchedule(Long id) {
        log.info("Xóa lịch trực ID: {}", id);
        StaffSchedule schedule = staffScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch trực", "id", id));
        staffScheduleRepository.delete(schedule);
    }
}
