package com.hospital.hmsai.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

/**
 * DTO cho request cập nhật thông tin user (bởi ADMIN).
 * Các trường nullable – chỉ cập nhật trường được gửi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    @Size(max = 150, message = "Họ tên tối đa 150 ký tự")
    private String fullName;

    @Email(message = "Email không hợp lệ")
    @Size(max = 150, message = "Email tối đa 150 ký tự")
    private String email;

    @Pattern(regexp = "^(0[0-9]{9,10})?$", message = "Số điện thoại không hợp lệ")
    private String phone;

    /** Cập nhật trạng thái: ACTIVE hoặc LOCKED */
    @Pattern(regexp = "^(ACTIVE|LOCKED)?$", message = "Trạng thái phải là ACTIVE hoặc LOCKED")
    private String status;

    /** Cập nhật danh sách roles (nếu có) */
    private Set<String> roleCodes;

    /** Cập nhật staff profile (nếu có) */
    private CreateUserRequest.StaffProfileRequest staffProfile;
}
