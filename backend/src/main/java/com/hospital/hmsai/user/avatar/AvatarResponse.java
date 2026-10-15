package com.hospital.hmsai.user.avatar;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Ảnh đại diện sau khi đổi / xóa (avatarUrl null = đã xóa ảnh). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AvatarResponse {
    private String avatarUrl;
}
