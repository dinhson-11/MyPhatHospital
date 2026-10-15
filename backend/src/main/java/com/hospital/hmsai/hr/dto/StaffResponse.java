package com.hospital.hmsai.hr.dto;

import com.hospital.hmsai.user.entity.StaffProfile;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffResponse {

    private Long id;
    private Long userId;
    private String fullName;
    private String username;
    private String email;
    private String phone;
    private Long departmentId;
    private String departmentName;
    private String specialty;
    private String licenseNo;
    /** Ảnh đại diện của tài khoản (null = chưa có ảnh). */
    private String avatarUrl;

    public static StaffResponse fromEntity(StaffProfile profile) {
        if (profile == null) return null;

        Long userId = null;
        String fullName = null;
        String username = null;
        String email = null;
        String phone = null;
        String avatarUrl = null;
        if (profile.getUser() != null) {
            userId = profile.getUser().getId();
            fullName = profile.getUser().getFullName();
            username = profile.getUser().getUsername();
            email = profile.getUser().getEmail();
            phone = profile.getUser().getPhone();
            avatarUrl = profile.getUser().getAvatarUrl();
        }

        Long deptId = null;
        String deptName = null;
        if (profile.getDepartment() != null) {
            deptId = profile.getDepartment().getId();
            deptName = profile.getDepartment().getName();
        }

        return StaffResponse.builder()
                .id(profile.getId())
                .userId(userId)
                .fullName(fullName)
                .username(username)
                .email(email)
                .phone(phone)
                .departmentId(deptId)
                .departmentName(deptName)
                .specialty(profile.getSpecialty())
                .licenseNo(profile.getLicenseNo())
                .avatarUrl(avatarUrl)
                .build();
    }
}
