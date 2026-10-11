package com.hospital.hmsai.billing.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Chuỗi VietQR phải KHỚP TỪNG KÝ TỰ (kể cả CRC) với mã do dịch vụ VietQR chuẩn sinh ra. Hai chuỗi chuẩn dưới đây là kết quả
 * GIẢI MÃ ảnh QR do img.vietqr.io sinh cho tài khoản mẫu 0123456789 (Vietcombank): (1) không số tiền → QR tĩnh;
 * (2) số tiền 136.000 và nội dung "MPH HD261012000010" → QR động. Cấu trúc này cũng đã được đối chiếu với mã QR tĩnh
 * thật trong ứng dụng Vietcombank (chỉ khác số tài khoản).
 */
class VietQrPayloadTest {

    private static final String BIN = "970436";            // Vietcombank
    private static final String ACCOUNT = "0123456789";

    /** QR tĩnh (không số tiền, không nội dung). */
    private static final String STATIC_REFERENCE =
            "00020101021138540010A00000072701240006970436011001234567890208QRIBFTTA53037045802VN63046A15";

    /** QR động: 136.000 đ, nội dung "MPH HD261012000010". */
    private static final String DYNAMIC_REFERENCE =
            "00020101021238540010A00000072701240006970436011001234567890208QRIBFTTA530370454061360005802VN"
                    + "62220818MPH HD26101200001063042669";

    @Test
    @DisplayName("VIETQR-01: QR tĩnh dựng lại trùng khớp từng ký tự (kể cả CRC) với mã chuẩn")
    void staticPayloadMatchesBankApp() {
        assertEquals(STATIC_REFERENCE, VietQrPayload.build(BIN, ACCOUNT, null, null));
        assertEquals(STATIC_REFERENCE, VietQrPayload.build(BIN, ACCOUNT, BigDecimal.ZERO, ""));
    }

    @Test
    @DisplayName("VIETQR-02: QR động (số tiền + nội dung) trùng khớp từng ký tự với mã chuẩn")
    void dynamicPayloadMatchesVietQrIo() {
        assertEquals(DYNAMIC_REFERENCE,
                VietQrPayload.build(BIN, ACCOUNT, new BigDecimal("136000"), "MPH HD261012000010"));
    }

    @Test
    @DisplayName("VIETQR-03: Số tiền lẻ được làm tròn về đồng; số tiền nằm trong trường 54")
    void amountIsRoundedToWholeDong() {
        String p = VietQrPayload.build(BIN, ACCOUNT, new BigDecimal("136000.4"), "MPH HD1");
        assertTrue(p.contains("5406136000"), p);
        assertTrue(p.contains("010212"), "QR động có cờ 12");
    }

    @Test
    @DisplayName("VIETQR-04: Nội dung được bỏ dấu, chuẩn hóa và cắt tối đa 25 ký tự")
    void contentIsSanitized() {
        assertEquals("Thanh toan vien phi", VietQrPayload.sanitizeContent("Thanh toán viện phí"));
        assertEquals("Duong", VietQrPayload.sanitizeContent("Đường"));
        // Cắt tại 25 ký tự rồi bỏ khoảng trắng thừa ở cuối
        assertEquals("MPH HD261010000001 THANH", VietQrPayload.sanitizeContent("MPH HD261010000001 THANH TOAN VIEN PHI KHAM"));
        assertEquals("", VietQrPayload.sanitizeContent(null));
    }

    @Test
    @DisplayName("VIETQR-05: CRC-16/CCITT-FALSE đúng với vector chuẩn \"123456789\" = 29B1")
    void crcMatchesStandardCheckValue() {
        assertEquals("29B1", VietQrPayload.crc16("123456789"));
    }

    @Test
    @DisplayName("VIETQR-06: BIN hoặc số tài khoản sai định dạng bị từ chối")
    void invalidInputRejected() {
        assertThrows(IllegalArgumentException.class, () -> VietQrPayload.build("97043", ACCOUNT, null, null));
        assertThrows(IllegalArgumentException.class, () -> VietQrPayload.build(BIN, "", null, null));
        assertThrows(IllegalArgumentException.class, () -> VietQrPayload.build(BIN, "1234 5678", null, null));
    }
}
