package com.hospital.hmsai.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO response cho thông tin user.
 * Không bao giờ expose password hash.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {

    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String status;
    private List<String> roles;
    private StaffProfileInfo staffProfile;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Thông tin chuyên môn nhân viên (nếu có).
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffProfileInfo {
        private Long id;
        private String departmentName;
        private String specialty;
        private String licenseNo;
    }
}
