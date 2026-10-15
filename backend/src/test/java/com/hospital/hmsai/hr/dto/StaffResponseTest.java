package com.hospital.hmsai.hr.dto;

import com.hospital.hmsai.user.entity.StaffProfile;
import com.hospital.hmsai.user.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class StaffResponseTest {

    @Test
    @DisplayName("Hồ sơ nhân viên kèm ảnh đại diện của tài khoản")
    void includesAccountAvatar() {
        StaffProfile profile = StaffProfile.builder().id(5L)
                .user(User.builder().id(9L).username("bs.nga").fullName("BS Nga").avatarUrl("https://cdn/nga.jpg").build())
                .build();

        assertEquals("https://cdn/nga.jpg", StaffResponse.fromEntity(profile).getAvatarUrl());
    }
}
