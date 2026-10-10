package com.hospital.hmsai.billing.pricing;

import com.hospital.hmsai.common.WorkingHours;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.regex.Pattern;

/**
 * Quy tắc tính phần BHYT chi trả cho một lượt khám ngoại trú.
 * <ul>
 *   <li>Mã thẻ 15 ký tự: 2 chữ cái mã đối tượng, 1 chữ số mức hưởng (1–5), 12 chữ số.</li>
 *   <li>Mức hưởng theo chữ số thứ 3: 1, 2, 5 → 100%; 3 → 95%; 4 → 80%.</li>
 *   <li>Chi phí một lần khám thấp hơn 15% lương cơ sở → BHYT chi trả 100%.</li>
 *   <li>Thẻ phải còn hiệu lực vào ngày khám; bệnh viện chỉ khám BHYT Thứ 2 – Thứ 7.</li>
 * </ul>
 * Giả định người bệnh khám đúng tuyến (hệ thống chưa quản lý nơi đăng ký KCB ban đầu).
 */
public final class InsurancePolicy {

    public static final Pattern CARD_PATTERN = Pattern.compile("^[A-Z]{2}[1-5]\\d{12}$");

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private InsurancePolicy() {
    }

    public record Coverage(boolean applied, BigDecimal rate, BigDecimal insuranceAmount,
                           BigDecimal patientAmount, String note) {
    }

    public static boolean isValidCardNumber(String cardNumber) {
        return cardNumber != null && CARD_PATTERN.matcher(cardNumber).matches();
    }

    /** Mức hưởng (%) theo chữ số thứ 3 của mã thẻ. */
    public static BigDecimal benefitRate(String cardNumber) {
        return switch (cardNumber.charAt(2)) {
            case '3' -> new BigDecimal("95");
            case '4' -> new BigDecimal("80");
            default -> HUNDRED;
        };
    }

    public static Coverage evaluate(String cardNumber, LocalDate validFrom, LocalDate validTo,
                                    LocalDate serviceDate, BigDecimal totalCost, BigDecimal lowCostThreshold) {
        BigDecimal total = totalCost == null ? BigDecimal.ZERO : totalCost;

        if (cardNumber == null || cardNumber.isBlank()) {
            return notApplied(total, "Không có thẻ BHYT – người bệnh tự chi trả");
        }
        if (!isValidCardNumber(cardNumber)) {
            return notApplied(total, "Mã thẻ BHYT không hợp lệ – người bệnh tự chi trả");
        }
        if (validTo == null) {
            return notApplied(total, "Chưa nhập hạn sử dụng thẻ BHYT – người bệnh tự chi trả");
        }
        if ((validFrom != null && serviceDate.isBefore(validFrom)) || serviceDate.isAfter(validTo)) {
            return notApplied(total, "Thẻ BHYT không còn hiệu lực vào ngày khám – người bệnh tự chi trả");
        }
        if (!WorkingHours.isInsuranceDay(serviceDate)) {
            return notApplied(total, "Bệnh viện không khám BHYT vào Chủ nhật – người bệnh tự chi trả");
        }

        BigDecimal rate;
        String note;
        if (lowCostThreshold != null && total.compareTo(lowCostThreshold) < 0) {
            rate = HUNDRED;
            note = "BHYT chi trả 100% (chi phí thấp hơn 15% lương cơ sở)";
        } else {
            rate = benefitRate(cardNumber);
            note = "BHYT chi trả " + rate.stripTrailingZeros().toPlainString() + "% theo mức hưởng của thẻ";
        }

        BigDecimal insuranceAmount = total.multiply(rate)
                .divide(HUNDRED, 0, RoundingMode.HALF_UP)
                .setScale(2, RoundingMode.UNNECESSARY);
        BigDecimal patientAmount = total.subtract(insuranceAmount).setScale(2, RoundingMode.HALF_UP);
        return new Coverage(true, rate.setScale(2, RoundingMode.UNNECESSARY), insuranceAmount, patientAmount, note);
    }

    private static Coverage notApplied(BigDecimal total, String note) {
        return new Coverage(false, BigDecimal.ZERO.setScale(2), BigDecimal.ZERO.setScale(2),
                total.setScale(2, RoundingMode.HALF_UP), note);
    }
}
