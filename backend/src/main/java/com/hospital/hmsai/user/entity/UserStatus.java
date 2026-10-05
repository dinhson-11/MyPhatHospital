package com.hospital.hmsai.user.entity;

/**
 * Trạng thái tài khoản người dùng.
 * Khớp với ENUM('ACTIVE', 'LOCKED') trong migration V1.
 */
public enum UserStatus {
    ACTIVE,
    LOCKED
}
