package com.hospital.hmsai.user.service.impl;

import com.hospital.hmsai.common.exception.DuplicateResourceException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.user.dto.CreateUserRequest;
import com.hospital.hmsai.user.dto.UpdateUserRequest;
import com.hospital.hmsai.user.dto.UserResponse;
import com.hospital.hmsai.user.entity.*;
import com.hospital.hmsai.user.repository.DepartmentRepository;
import com.hospital.hmsai.user.repository.RoleRepository;
import com.hospital.hmsai.user.repository.StaffProfileRepository;
import com.hospital.hmsai.user.repository.UserRepository;
import com.hospital.hmsai.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Implementation UserService – quản lý tài khoản người dùng (ADMIN).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DepartmentRepository departmentRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public UserResponse create(CreateUserRequest request) {
        log.info("Admin tạo user mới: {}", request.getUsername());

        // Validate trùng lặp
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("User", "username", request.getUsername());
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()
                && userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        // Resolve roles
        Set<Role> roles = resolveRoles(request.getRoleCodes());

        // Tạo user
        User user = User.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .status(UserStatus.ACTIVE)
                .roles(roles)
                .build();

        User savedUser = userRepository.save(user);

        // Tạo staff profile nếu có
        StaffProfile staffProfile = null;
        if (request.getStaffProfile() != null) {
            staffProfile = createStaffProfile(savedUser, request.getStaffProfile());
        }

        log.info("Đã tạo user: id={}, username={}, roles={}",
                savedUser.getId(), savedUser.getUsername(), request.getRoleCodes());

        return toUserResponse(savedUser, staffProfile);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        User user = findUserById(id);
        StaffProfile staffProfile = staffProfileRepository.findByUserId(id).orElse(null);
        return toUserResponse(user, staffProfile);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getAll(Pageable pageable) {
        return userRepository.findAll(pageable)
                .map(user -> {
                    StaffProfile sp = staffProfileRepository.findByUserId(user.getId()).orElse(null);
                    return toUserResponse(user, sp);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> searchByName(String name, Pageable pageable) {
        return userRepository.findByFullNameContainingIgnoreCase(name, pageable)
                .map(user -> {
                    StaffProfile sp = staffProfileRepository.findByUserId(user.getId()).orElse(null);
                    return toUserResponse(user, sp);
                });
    }

    @Override
    @Transactional
    public UserResponse update(Long id, UpdateUserRequest request) {
        log.info("Admin cập nhật user: id={}", id);

        User user = findUserById(id);

        // Cập nhật các trường nếu được gửi
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName());
        }
        if (request.getEmail() != null) {
            // Kiểm tra email trùng (nếu thay đổi)
            if (!request.getEmail().equals(user.getEmail())
                    && !request.getEmail().isBlank()
                    && userRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException("User", "email", request.getEmail());
            }
            user.setEmail(request.getEmail());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getStatus() != null) {
            user.setStatus(UserStatus.valueOf(request.getStatus()));
        }
        if (request.getRoleCodes() != null && !request.getRoleCodes().isEmpty()) {
            user.setRoles(resolveRoles(request.getRoleCodes()));
        }

        User updatedUser = userRepository.save(user);

        // Cập nhật staff profile
        StaffProfile staffProfile = staffProfileRepository.findByUserId(id).orElse(null);
        if (request.getStaffProfile() != null) {
            if (staffProfile == null) {
                staffProfile = createStaffProfile(updatedUser, request.getStaffProfile());
            } else {
                updateStaffProfile(staffProfile, request.getStaffProfile());
            }
        }

        log.info("Đã cập nhật user: id={}, username={}", updatedUser.getId(), updatedUser.getUsername());
        return toUserResponse(updatedUser, staffProfile);
    }

    @Override
    @Transactional
    public void lockUser(Long id) {
        User user = findUserById(id);
        user.setStatus(UserStatus.LOCKED);
        userRepository.save(user);
        log.info("Đã khóa tài khoản: id={}, username={}", user.getId(), user.getUsername());
    }

    @Override
    @Transactional
    public void unlockUser(Long id) {
        User user = findUserById(id);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
        log.info("Đã mở khóa tài khoản: id={}, username={}", user.getId(), user.getUsername());
    }

    // ======================== Helper methods ========================

    private User findUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    /**
     * Resolve role codes (ADMIN, DOCTOR, ...) thành Set<Role> entities.
     */
    private Set<Role> resolveRoles(Set<String> roleCodes) {
        Set<Role> roles = new HashSet<>();
        for (String code : roleCodes) {
            Role role = roleRepository.findByCode(code.toUpperCase())
                    .orElseThrow(() -> new ResourceNotFoundException("Role", "code", code));
            roles.add(role);
        }
        return roles;
    }

    /**
     * Tạo StaffProfile cho user nhân viên y tế.
     */
    private StaffProfile createStaffProfile(User user, CreateUserRequest.StaffProfileRequest request) {
        StaffProfile.StaffProfileBuilder builder = StaffProfile.builder()
                .user(user)
                .specialty(request.getSpecialty())
                .licenseNo(request.getLicenseNo());

        if (request.getDepartmentId() != null) {
            Department dept = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Department", "id", request.getDepartmentId()));
            builder.department(dept);
        }

        return staffProfileRepository.save(builder.build());
    }

    /**
     * Cập nhật StaffProfile hiện có.
     */
    private void updateStaffProfile(StaffProfile profile, CreateUserRequest.StaffProfileRequest request) {
        if (request.getSpecialty() != null) {
            profile.setSpecialty(request.getSpecialty());
        }
        if (request.getLicenseNo() != null) {
            profile.setLicenseNo(request.getLicenseNo());
        }
        if (request.getDepartmentId() != null) {
            Department dept = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Department", "id", request.getDepartmentId()));
            profile.setDepartment(dept);
        }
        staffProfileRepository.save(profile);
    }

    /**
     * Convert User entity + StaffProfile thành UserResponse DTO.
     * Không bao giờ expose password hash.
     */
    private UserResponse toUserResponse(User user, StaffProfile staffProfile) {
        List<String> roleNames = user.getRoles().stream()
                .map(Role::getCode)
                .toList();

        UserResponse.StaffProfileInfo staffInfo = null;
        if (staffProfile != null) {
            staffInfo = UserResponse.StaffProfileInfo.builder()
                    .id(staffProfile.getId())
                    .departmentName(staffProfile.getDepartment() != null
                            ? staffProfile.getDepartment().getName() : null)
                    .specialty(staffProfile.getSpecialty())
                    .licenseNo(staffProfile.getLicenseNo())
                    .build();
        }

        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .status(user.getStatus().name())
                .roles(roleNames)
                .staffProfile(staffInfo)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
