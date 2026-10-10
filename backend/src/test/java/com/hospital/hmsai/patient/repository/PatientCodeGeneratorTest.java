package com.hospital.hmsai.patient.repository;

import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.patient.dto.CreatePatientRequest;
import com.hospital.hmsai.patient.dto.UpdatePatientRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class PatientCodeGeneratorTest {

    @Test
    @DisplayName("Mã mặc định có dạng BN-YYMMDD-NNN")
    void generate_DefaultFormat() {
        String code = PatientCodeGenerator.generate(c -> false);
        assertTrue(code.matches("^BN-\\d{6}-\\d{3}$"), code);
    }

    @Test
    @DisplayName("Trùng 10 lần với 3 chữ số → nới sang 4 chữ số, không trả về mã trùng")
    void generate_ExtendsDigitsInsteadOfReturningDuplicate() {
        // Mọi mã 3 chữ số đều đã tồn tại
        String code = PatientCodeGenerator.generate(c -> c.matches("^BN-\\d{6}-\\d{3}$"));
        assertTrue(code.matches("^BN-\\d{6}-\\d{4}$"), code);
    }

    @Test
    @DisplayName("Không tìm được mã trống → ném lỗi thay vì trả về mã trùng; mã dài nhất vừa cột 20 ký tự")
    void generate_ThrowsWhenExhausted() {
        AtomicInteger attempts = new AtomicInteger();
        assertThrows(BusinessException.class, () -> PatientCodeGenerator.generate(c -> {
            attempts.incrementAndGet();
            assertTrue(c.length() <= 20);
            return true;
        }));
        assertEquals(40, attempts.get());
    }

    @Test
    @DisplayName("Ngày sinh ở tương lai bị từ chối khi tạo/cập nhật hồ sơ bệnh nhân")
    void dob_MustBePastOrPresent() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            Validator validator = factory.getValidator();
            LocalDate tomorrow = LocalDate.now().plusDays(1);
            assertEquals(1, validator.validate(CreatePatientRequest.builder().fullName("A").dob(tomorrow).build()).size());
            assertEquals(1, validator.validate(UpdatePatientRequest.builder().dob(tomorrow).build()).size());
            assertTrue(validator.validate(CreatePatientRequest.builder().fullName("A").dob(LocalDate.now()).build()).isEmpty());
        }
    }
}
