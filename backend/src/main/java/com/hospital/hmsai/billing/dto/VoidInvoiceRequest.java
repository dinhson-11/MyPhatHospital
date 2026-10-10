package com.hospital.hmsai.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Yêu cầu hủy hóa đơn chưa thu hoặc hoàn tiền hóa đơn đã thu – bắt buộc ghi lý do.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoidInvoiceRequest {

    @NotBlank(message = "Vui lòng nhập lý do")
    @Size(min = 5, max = 255, message = "Lý do từ 5 đến 255 ký tự")
    private String reason;
}
