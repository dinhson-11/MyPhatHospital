package com.hospital.hmsai.user.service;

import com.hospital.hmsai.user.dto.CreateUserRequest;
import com.hospital.hmsai.user.dto.UpdateUserRequest;
import com.hospital.hmsai.user.dto.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service interface cho quản lý User (ADMIN).
 */
public interface UserService {

    /**
     * Tạo user mới với roles chỉ định.
     */
    UserResponse create(CreateUserRequest request);

    /**
     * Lấy thông tin user theo ID.
     */
    UserResponse getById(Long id);

    /**
     * Lấy danh sách users có phân trang.
     */
    Page<UserResponse> getAll(Pageable pageable);

    /**
     * Tìm kiếm users theo tên.
     */
    Page<UserResponse> searchByName(String name, Pageable pageable);

    /**
     * Cập nhật thông tin user.
     */
    UserResponse update(Long id, UpdateUserRequest request);

    /**
     * Khóa tài khoản user (soft lock, không xóa).
     */
    void lockUser(Long id);

    /**
     * Mở khóa tài khoản user.
     */
    void unlockUser(Long id);
}
