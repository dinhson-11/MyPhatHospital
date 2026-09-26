package com.hospital.hmsai.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Error response chuẩn cho exception handling.
 * Format: { "success": false, "errorCode": "...", "message": "...", "details": [] }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiErrorResponse {

    @Builder.Default
    private boolean success = false;

    private String errorCode;
    private String message;
    private List<String> details;
}
