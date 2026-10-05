package com.hospital.hmsai.common.exception;

/**
 * Exception cho lỗi nghiệp vụ (400 Bad Request).
 */
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }
}
