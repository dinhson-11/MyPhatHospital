package com.hospital.hmsai.billing.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Cấu hình phân hệ viện phí (application.yml: billing.*).
 */
@Data
@Component
@ConfigurationProperties(prefix = "billing")
public class BillingProperties {

    /** Phí khám bệnh một lượt (VNĐ). */
    private BigDecimal consultationFee = new BigDecimal("150000");

    private Insurance insurance = new Insurance();

    private VietQr vietqr = new VietQr();

    @Data
    public static class Insurance {
        /** Mức lương cơ sở (VNĐ) – dùng tính ngưỡng chi phí thấp được BHYT chi trả 100%. */
        private BigDecimal baseSalary = new BigDecimal("2340000");

        /** Tỷ lệ ngưỡng chi phí thấp so với lương cơ sở (mặc định 15%). */
        private BigDecimal lowCostThresholdRatio = new BigDecimal("0.15");

        public BigDecimal lowCostThreshold() {
            return baseSalary.multiply(lowCostThresholdRatio);
        }
    }

    @Data
    public static class VietQr {
        /** Mã BIN ngân hàng theo NAPAS, VD 970422 (MB Bank). */
        private String bankBin;
        private String bankName;
        private String accountNo;
        private String accountName;
        /** Mẫu ảnh img.vietqr.io: compact, compact2, qr_only, print. */
        private String template = "compact2";
        /** true khi là tài khoản demo – giao diện cảnh báo không chuyển tiền thật. */
        private boolean demo;

        public boolean isConfigured() {
            return notBlank(bankBin) && notBlank(accountNo) && notBlank(accountName);
        }

        private static boolean notBlank(String s) {
            return s != null && !s.isBlank();
        }
    }
}
