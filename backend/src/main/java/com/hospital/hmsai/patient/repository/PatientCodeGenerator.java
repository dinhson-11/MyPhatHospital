package com.hospital.hmsai.patient.repository;

import com.hospital.hmsai.common.exception.BusinessException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Predicate;

/**
 * Bộ sinh mã bệnh nhân dùng chung (lễ tân tạo hồ sơ và đặt lịch công khai).
 * <p>
 * Định dạng: {@code BN-YYMMDD-NNN}. Nếu thử 10 lần với 3 chữ số vẫn trùng (ngày đông bệnh nhân),
 * phần số được nới dần lên 4, 5, 6 chữ số. Không bao giờ trả về mã đã tồn tại; nếu vẫn không tìm được
 * mã trống thì ném lỗi thay vì trả về mã trùng. Mã dài nhất {@code BN-YYMMDD-NNNNNN} = 16 ký tự,
 * vừa cột {@code patients.patient_code VARCHAR(20)}.
 */
public final class PatientCodeGenerator {

    private static final String PREFIX = "BN-";
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyMMdd");
    private static final int MIN_DIGITS = 3;
    private static final int MAX_DIGITS = 6;
    private static final int ATTEMPTS_PER_LENGTH = 10;

    private PatientCodeGenerator() {
    }

    /**
     * @param exists hàm kiểm tra mã đã tồn tại (thường là {@code patientRepository::existsByPatientCode})
     * @return mã bệnh nhân chưa tồn tại
     */
    public static String generate(Predicate<String> exists) {
        String datePart = LocalDate.now().format(DATE_FORMAT);
        int bound = 1;
        for (int i = 0; i < MIN_DIGITS; i++) {
            bound *= 10;
        }
        for (int digits = MIN_DIGITS; digits <= MAX_DIGITS; digits++, bound *= 10) {
            for (int attempt = 0; attempt < ATTEMPTS_PER_LENGTH; attempt++) {
                String number = String.format("%0" + digits + "d", ThreadLocalRandom.current().nextInt(bound));
                String code = PREFIX + datePart + "-" + number;
                if (!exists.test(code)) {
                    return code;
                }
            }
        }
        throw new BusinessException("Không thể sinh mã bệnh nhân duy nhất. Vui lòng thử lại sau ít phút.");
    }
}
