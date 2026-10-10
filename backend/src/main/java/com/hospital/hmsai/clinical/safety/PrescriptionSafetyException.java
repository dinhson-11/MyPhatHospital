package com.hospital.hmsai.clinical.safety;

import com.hospital.hmsai.common.exception.BusinessException;

import java.util.List;

/**
 * Đơn thuốc bị chặn trước khi lưu do có cảnh báo nghiêm trọng (tương tác thuốc mức SEVERE hoặc
 * dị ứng mức SEVERE/MODERATE) mà bác sĩ chưa nhập lý do xác nhận kê đơn ({@code overrideReason}).
 * <p>
 * GlobalExceptionHandler trả về 400 với errorCode {@code PRESCRIPTION_SAFETY_BLOCK},
 * {@code details} = danh sách cảnh báo.
 */
public class PrescriptionSafetyException extends BusinessException {

    public static final String ERROR_CODE = "PRESCRIPTION_SAFETY_BLOCK";
    public static final String MESSAGE = "Đơn thuốc có cảnh báo nghiêm trọng – cần bác sĩ xác nhận lý do kê đơn";

    private final List<String> warnings;

    public PrescriptionSafetyException(List<String> warnings) {
        super(MESSAGE);
        this.warnings = warnings == null ? List.of() : List.copyOf(warnings);
    }

    public List<String> getWarnings() {
        return warnings;
    }
}
