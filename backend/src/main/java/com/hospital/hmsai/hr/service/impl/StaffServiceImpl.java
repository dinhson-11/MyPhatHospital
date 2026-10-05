package com.hospital.hmsai.hr.service.impl;

import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.hr.dto.StaffResponse;
import com.hospital.hmsai.hr.service.StaffService;
import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StaffServiceImpl implements StaffService {

    private final StaffProfileRepository staffProfileRepository;

    @Override
    public List<StaffResponse> getAllStaff(Long departmentId) {
        log.info("Lấy danh sách nhân viên y tế – departmentId: {}", departmentId);
        List<StaffProfile> profiles = staffProfileRepository.findAll();
        return profiles.stream()
                .filter(p -> departmentId == null || (p.getDepartment() != null && departmentId.equals(p.getDepartment().getId())))
                .map(StaffResponse::fromEntity)
                .toList();
    }

    @Override
    public StaffResponse getStaffById(Long id) {
        log.info("Lấy thông tin nhân viên ID: {}", id);
        StaffProfile profile = staffProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ nhân viên", "id", id));
        return StaffResponse.fromEntity(profile);
    }
}
