package com.hospital.hmsai.publicapi;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Thông tin bác sĩ/dược sĩ hiển thị công khai trên cổng thông tin.
 * Không chứa email, SĐT hay số chứng chỉ hành nghề.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicDoctorResponse {
    private Long id;
    private String username;
    private String fullName;
    private Long departmentId;
    private String specialty;
    /** true nếu là bác sĩ (có thể đặt lịch khám); dược sĩ chỉ hiển thị. */
    private boolean canBook;
}
