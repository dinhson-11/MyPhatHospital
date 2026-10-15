package com.hospital.hmsai.common.exception;

import com.hospital.hmsai.common.ApiErrorResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("File upload vượt giới hạn → 400 kèm thông báo dễ hiểu (không phải lỗi hệ thống 500)")
    void uploadTooLargeIsBadRequest() {
        ResponseEntity<ApiErrorResponse> response =
                handler.handleUploadTooLarge(new MaxUploadSizeExceededException(5 * 1024 * 1024));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("FILE_TOO_LARGE", response.getBody().getErrorCode());
        assertEquals("File vượt quá dung lượng cho phép (tối đa 5MB)", response.getBody().getMessage());
    }
}
