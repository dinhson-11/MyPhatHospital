package com.hospital.hmsai.clinical.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePrescriptionRequest {

    @NotEmpty(message = "Đơn thuốc phải có ít nhất 1 loại thuốc")
    @Valid
    private List<PrescriptionItemRequest> items;

    /**
     * Lý do bác sĩ xác nhận vẫn kê đơn khi hệ thống phát hiện cảnh báo nghiêm trọng
     * (tương tác thuốc SEVERE, dị ứng SEVERE/MODERATE). Bỏ trống khi có cảnh báo nghiêm trọng
     * → 400 PRESCRIPTION_SAFETY_BLOCK.
     */
    @Size(max = 500, message = "Lý do xác nhận kê đơn không quá 500 ký tự")
    private String overrideReason;
}
