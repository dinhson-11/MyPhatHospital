package com.hospital.hmsai.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Ca khám đã hoàn tất nhưng chưa có hóa đơn còn hiệu lực – hàng chờ lập hóa đơn của thu ngân.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UninvoicedVisitResponse {

    private Long visitId;
    private LocalDateTime visitTime;
    private Long patientId;
    private String patientName;
    private String patientCode;
    private String doctorName;
    private String diagnosisCode;
    private String diagnosisNote;
    /** Thẻ BHYT hợp lệ vào ngày khám – thu ngân biết trước hóa đơn sẽ được BHYT chi trả. */
    private boolean insuranceEligible;
}
