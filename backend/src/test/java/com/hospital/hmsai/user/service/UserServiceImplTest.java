package com.hospital.hmsai.user.service;

import com.hospital.hmsai.user.dto.UserResponse;
import com.hospital.hmsai.user.entity.Role;
import com.hospital.hmsai.user.entity.User;
import com.hospital.hmsai.user.entity.UserStatus;
import com.hospital.hmsai.user.repository.DepartmentRepository;
import com.hospital.hmsai.user.repository.RoleRepository;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import com.hospital.hmsai.user.repository.UserRepository;
import com.hospital.hmsai.user.service.impl.UserServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private StaffProfileRepository staffProfileRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserServiceImpl userService;

    @Test
    @DisplayName("Thông tin tài khoản (màn hình quản trị) kèm ảnh đại diện")
    void userResponseIncludesAvatar() {
        User user = User.builder().id(3L).username("dd.lan").fullName("Điều dưỡng Lan")
                .status(UserStatus.ACTIVE).avatarUrl("https://cdn/lan.jpg")
                .roles(Set.of(Role.builder().id(4L).code("NURSE").name("Điều dưỡng").build()))
                .build();
        when(userRepository.findById(3L)).thenReturn(Optional.of(user));
        when(staffProfileRepository.findByUserId(3L)).thenReturn(Optional.empty());

        UserResponse response = userService.getById(3L);

        assertEquals("https://cdn/lan.jpg", response.getAvatarUrl());
    }
}
