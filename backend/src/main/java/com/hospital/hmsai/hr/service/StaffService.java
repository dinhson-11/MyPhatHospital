package com.hospital.hmsai.hr.service;

import com.hospital.hmsai.hr.dto.StaffResponse;

import java.util.List;

public interface StaffService {

    List<StaffResponse> getAllStaff(Long departmentId);

    StaffResponse getStaffById(Long id);
}
