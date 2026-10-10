package com.hospital.hmsai.billing.pricing;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Bảng giá cận lâm sàng theo nhóm. Quy tắc được xét theo thứ tự từ cụ thể đến chung,
 * so khớp trên tên đã bỏ dấu và theo ranh giới từ (tránh "ct" khớp nhầm "Electrolyte",
 * "máu" trong "Glucose máu" bị tính giá huyết học, "Chụp CT" bị tính giá X-quang).
 */
public final class LabFeeCatalog {

    public static final BigDecimal DEFAULT_FEE = new BigDecimal("100000.00");

    private record Rule(Pattern pattern, BigDecimal fee) {
    }

    private static final List<Rule> RULES = List.of(
            rule("\\b(ct|msct|mri|cat lop|cong huong tu)\\b", "500000.00"),
            rule("\\b(sieu am|ultrasound|doppler)\\b", "180000.00"),
            rule("\\b(x-?quang|x-ray|chup)\\b", "150000.00"),
            rule("\\b(sinh hoa|glucose|duong huyet|duong mau|mo mau|cholesterol|triglycerid|hdl|ldl"
                    + "|men gan|ast|alt|ggt|chuc nang than|ure|creatinin|dien giai|electrolytes?|hba1c|acid uric)\\b",
                    "120000.00"),
            rule("\\b(huyet hoc|te bao mau|cong thuc mau|cbc|dong mau|nhom mau)\\b", "80000.00")
    );

    private LabFeeCatalog() {
    }

    public static BigDecimal feeFor(String testType) {
        if (testType == null || testType.isBlank()) {
            return DEFAULT_FEE;
        }
        String normalized = normalize(testType);
        return RULES.stream()
                .filter(r -> r.pattern().matcher(normalized).find())
                .map(Rule::fee)
                .findFirst()
                .orElse(DEFAULT_FEE);
    }

    private static Rule rule(String regex, String fee) {
        return new Rule(Pattern.compile(regex), new BigDecimal(fee));
    }

    /** Bỏ dấu tiếng Việt, chuyển chữ thường: "Chụp CT sọ não" → "chup ct so nao". */
    static String normalize(String text) {
        String noAccent = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return noAccent.toLowerCase(Locale.ROOT);
    }
}
