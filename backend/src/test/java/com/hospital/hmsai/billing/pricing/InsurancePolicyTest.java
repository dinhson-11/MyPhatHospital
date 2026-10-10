package com.hospital.hmsai.billing.pricing;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

import static org.junit.jupiter.api.Assertions.*;

class InsurancePolicyTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 12);
    private static final LocalDate SUNDAY = MONDAY.with(TemporalAdjusters.previous(DayOfWeek.SUNDAY));
    private static final BigDecimal THRESHOLD = new BigDecimal("351000");

    @ParameterizedTest(name = "{0} → {1}%")
    @CsvSource({
            "DN1010123456789, 100",
            "HT2010123456789, 100",
            "HN3010123456789, 95",
            "GD4010123456789, 80",
            "CC5010123456789, 100"
    })
    @DisplayName("Mức hưởng theo chữ số thứ 3 của mã thẻ")
    void benefitRateByCardLevel(String card, String expectedRate) {
        InsurancePolicy.Coverage c = InsurancePolicy.evaluate(card, null, MONDAY.plusYears(1), MONDAY,
                new BigDecimal("1000000"), THRESHOLD);
        assertTrue(c.applied());
        assertEquals(0, new BigDecimal(expectedRate).compareTo(c.rate()));
        assertEquals(0, new BigDecimal("1000000").compareTo(c.insuranceAmount().add(c.patientAmount())));
    }

    @Test
    @DisplayName("Làm tròn đến đồng, tổng BHYT + người bệnh luôn bằng tổng chi phí")
    void roundsToWholeDong() {
        InsurancePolicy.Coverage c = InsurancePolicy.evaluate("HN3010123456789", null, MONDAY.plusDays(1), MONDAY,
                new BigDecimal("456789"), THRESHOLD);
        assertEquals(0, new BigDecimal("433950").compareTo(c.insuranceAmount())); // 456.789 x 95% = 433.949,55
        assertEquals(0, new BigDecimal("22839").compareTo(c.patientAmount()));
    }

    @Test
    @DisplayName("Không khám BHYT vào Chủ nhật")
    void sundayNotCovered() {
        InsurancePolicy.Coverage c = InsurancePolicy.evaluate("GD4010123456789", null, SUNDAY.plusYears(1), SUNDAY,
                new BigDecimal("500000"), THRESHOLD);
        assertFalse(c.applied());
        assertEquals(0, new BigDecimal("500000").compareTo(c.patientAmount()));
        assertTrue(c.note().contains("Chủ nhật"));
    }

    @Test
    @DisplayName("Thẻ chưa đến ngày hiệu lực không được hưởng")
    void cardNotYetValid() {
        InsurancePolicy.Coverage c = InsurancePolicy.evaluate("GD4010123456789", MONDAY.plusDays(1), MONDAY.plusYears(1),
                MONDAY, new BigDecimal("500000"), THRESHOLD);
        assertFalse(c.applied());
    }

    @Test
    @DisplayName("Mã thẻ sai định dạng hoặc thiếu hạn sử dụng không được hưởng")
    void invalidCard() {
        assertFalse(InsurancePolicy.evaluate("GD6010123456789", null, MONDAY.plusYears(1), MONDAY,
                new BigDecimal("500000"), THRESHOLD).applied());
        assertFalse(InsurancePolicy.evaluate("GD401012345", null, MONDAY.plusYears(1), MONDAY,
                new BigDecimal("500000"), THRESHOLD).applied());
        assertFalse(InsurancePolicy.evaluate("GD4010123456789", null, null, MONDAY,
                new BigDecimal("500000"), THRESHOLD).applied());
    }

    @Test
    @DisplayName("Đúng bằng ngưỡng 15% lương cơ sở thì áp mức hưởng của thẻ (chỉ dưới ngưỡng mới 100%)")
    void thresholdBoundary() {
        InsurancePolicy.Coverage below = InsurancePolicy.evaluate("GD4010123456789", null, MONDAY.plusYears(1), MONDAY,
                new BigDecimal("350999"), THRESHOLD);
        InsurancePolicy.Coverage equal = InsurancePolicy.evaluate("GD4010123456789", null, MONDAY.plusYears(1), MONDAY,
                new BigDecimal("351000"), THRESHOLD);
        assertEquals(0, new BigDecimal("100").compareTo(below.rate()));
        assertEquals(0, new BigDecimal("80").compareTo(equal.rate()));
    }
}
