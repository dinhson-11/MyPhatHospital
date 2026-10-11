package com.hospital.hmsai.billing.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;

/**
 * Sinh chuỗi nội dung mã VietQR (chuẩn EMVCo QR + dịch vụ "chuyển nhanh NAPAS 247 tới tài khoản").
 * <p>
 * Backend tự dựng chuỗi này nên mã QR không phụ thuộc dịch vụ vẽ ảnh bên ngoài (img.vietqr.io) và hoạt động cả khi
 * máy chủ/trình duyệt không có Internet; giao diện chỉ việc vẽ chuỗi thành ảnh QR. Cấu trúc (xác minh bằng cách giải mã
 * mã QR tĩnh thật của Vietcombank và mã động do img.vietqr.io sinh ra):
 * <pre>
 * 00 02 01                         phiên bản
 * 01 02 11|12                     11 = QR tĩnh (không số tiền), 12 = QR động (kèm số tiền)
 * 38 LL                            thông tin tài khoản thụ hưởng (NAPAS)
 *    00 10 A000000727              mã định danh dịch vụ NAPAS
 *    01 LL  00 06 {BIN}  01 LL {số tài khoản}
 *    02 08 QRIBFTTA                dịch vụ: chuyển nhanh tới tài khoản
 * 53 03 704                        tiền tệ VND
 * 54 LL {số tiền}                  (chỉ QR động)
 * 58 02 VN                         quốc gia
 * 62 LL 08 LL {nội dung}           nội dung chuyển khoản (tối đa 25 ký tự)
 * 63 04 {CRC16}                    CRC-16/CCITT-FALSE trên toàn bộ chuỗi, gồm cả "6304"
 * </pre>
 */
public final class VietQrPayload {

    /** Mã dịch vụ NAPAS trong trường 38. */
    private static final String NAPAS_AID = "A000000727";
    /** Dịch vụ chuyển nhanh 24/7 tới tài khoản. */
    private static final String SERVICE_ACCOUNT = "QRIBFTTA";
    /** Độ dài tối đa của nội dung chuyển khoản theo chuẩn VietQR. */
    public static final int MAX_CONTENT_LENGTH = 25;

    private VietQrPayload() {
    }

    /**
     * @param bankBin   mã BIN ngân hàng theo NAPAS (vd 970436 = Vietcombank)
     * @param accountNo số tài khoản thụ hưởng
     * @param amount    số tiền VNĐ; {@code null} hoặc ≤ 0 → QR tĩnh (người chuyển tự nhập số tiền)
     * @param content   nội dung chuyển khoản; bỏ dấu, chỉ giữ ký tự in được, cắt còn {@value #MAX_CONTENT_LENGTH} ký tự
     */
    public static String build(String bankBin, String accountNo, BigDecimal amount, String content) {
        if (bankBin == null || !bankBin.matches("\\d{6}")) {
            throw new IllegalArgumentException("Mã BIN ngân hàng phải gồm 6 chữ số");
        }
        if (accountNo == null || !accountNo.matches("[0-9A-Za-z]{1,19}")) {
            throw new IllegalArgumentException("Số tài khoản không hợp lệ (tối đa 19 ký tự chữ-số)");
        }
        boolean dynamic = amount != null && amount.signum() > 0;

        String beneficiary = tlv("00", bankBin) + tlv("01", accountNo);
        String merchant = tlv("00", NAPAS_AID) + tlv("01", beneficiary) + tlv("02", SERVICE_ACCOUNT);

        StringBuilder sb = new StringBuilder();
        sb.append(tlv("00", "01"));
        sb.append(tlv("01", dynamic ? "12" : "11"));
        sb.append(tlv("38", merchant));
        sb.append(tlv("53", "704"));
        if (dynamic) {
            sb.append(tlv("54", amount.setScale(0, RoundingMode.HALF_UP).toPlainString()));
        }
        sb.append(tlv("58", "VN"));
        String info = sanitizeContent(content);
        if (!info.isEmpty()) {
            sb.append(tlv("62", tlv("08", info)));
        }
        sb.append("6304");
        sb.append(crc16(sb.toString()));
        return sb.toString();
    }

    /** Bỏ dấu tiếng Việt, thay ký tự ngoài ASCII in được bằng khoảng trắng, gộp khoảng trắng, cắt tối đa 25 ký tự. */
    public static String sanitizeContent(String content) {
        if (content == null) {
            return "";
        }
        String noAccent = Normalizer.normalize(content, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D');
        String ascii = noAccent.replaceAll("[^\\x20-\\x7E]", " ").replaceAll("\\s+", " ").trim();
        return ascii.length() > MAX_CONTENT_LENGTH ? ascii.substring(0, MAX_CONTENT_LENGTH).trim() : ascii;
    }

    private static String tlv(String tag, String value) {
        int length = value.getBytes(StandardCharsets.UTF_8).length;
        return tag + String.format("%02d", length) + value;
    }

    /** CRC-16/CCITT-FALSE (đa thức 0x1021, khởi tạo 0xFFFF), 4 ký tự hex in hoa. */
    static String crc16(String data) {
        int crc = 0xFFFF;
        for (byte b : data.getBytes(StandardCharsets.UTF_8)) {
            crc ^= (b & 0xFF) << 8;
            for (int i = 0; i < 8; i++) {
                crc = (crc & 0x8000) != 0 ? (crc << 1) ^ 0x1021 : crc << 1;
                crc &= 0xFFFF;
            }
        }
        return String.format("%04X", crc);
    }
}
