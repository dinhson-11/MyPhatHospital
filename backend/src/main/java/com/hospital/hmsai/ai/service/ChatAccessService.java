package com.hospital.hmsai.ai.service;

import com.hospital.hmsai.ai.repository.ChatSessionRepository;
import com.hospital.hmsai.security.SecurityService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;

/**
 * Kiểm soát quyền truy cập phiên chat (chatbot công khai nhưng dữ liệu hội thoại là riêng tư).
 * <p>
 * Khách vãng lai không có tài khoản, nên quyền truy cập một phiên được chứng minh bằng một mã bí mật
 * (HMAC-SHA256 của id phiên, ký bằng khóa JWT của máy chủ) được cấp khi tạo phiên và gửi lại ở header
 * {@code X-Chat-Token}. Không có mã (hoặc mã sai) thì chỉ còn hai trường hợp được phép: Quản trị viên, hoặc
 * bệnh nhân đang đăng nhập là chủ của phiên. Id phiên là số tăng dần nên bản thân id KHÔNG đủ để truy cập.
 */
@Service
public class ChatAccessService {

    /** Tên header chứa mã truy cập phiên chat. */
    public static final String TOKEN_HEADER = "X-Chat-Token";

    private static final String HMAC = "HmacSHA256";

    private final ChatSessionRepository sessionRepository;
    private final SecurityService securityService;
    private final byte[] key;

    public ChatAccessService(ChatSessionRepository sessionRepository,
                             SecurityService securityService,
                             @Value("${jwt.secret}") String secret) {
        this.sessionRepository = sessionRepository;
        this.securityService = securityService;
        this.key = secret.getBytes(StandardCharsets.UTF_8);
    }

    /** Cấp mã truy cập cho một phiên chat (không lưu DB: tính lại được từ id + khóa máy chủ). */
    public String issueToken(Long sessionId) {
        if (sessionId == null) {
            return null;
        }
        try {
            Mac mac = Mac.getInstance(HMAC);
            mac.init(new SecretKeySpec(key, HMAC));
            byte[] sig = mac.doFinal(("chat-session:" + sessionId).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(sig);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Không tạo được mã truy cập phiên chat", e);
        }
    }

    /** Mã có đúng là mã của phiên này không (so sánh thời gian cố định). */
    public boolean isValidToken(Long sessionId, String token) {
        if (sessionId == null || token == null || token.isBlank()) {
            return false;
        }
        String expected = issueToken(sessionId);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Cho phép truy cập khi: mã phiên đúng, hoặc là Quản trị viên, hoặc là bệnh nhân chủ phiên.
     * Ngược lại ném {@link AccessDeniedException} (403).
     */
    public void requireSessionAccess(Long sessionId, Authentication authentication, String token) {
        if (isValidToken(sessionId, token)) {
            return;
        }
        if (isLoggedIn(authentication)) {
            if (SecurityService.hasAnyRole(authentication, "ADMIN")) {
                return;
            }
            if (sessionId != null
                    && sessionRepository.existsByIdAndPatient_User_UsernameIgnoreCase(sessionId, authentication.getName())) {
                return;
            }
        }
        throw new AccessDeniedException("Không có quyền truy cập phiên chat này");
    }

    /** Phiên đã tồn tại thì mới cần kiểm quyền; id chưa tồn tại sẽ được tạo mới (không lộ dữ liệu của ai). */
    public void requireAccessIfSessionExists(Long sessionId, Authentication authentication, String token) {
        if (sessionId != null && sessionRepository.existsById(sessionId)) {
            requireSessionAccess(sessionId, authentication, token);
        }
    }

    /**
     * Hồ sơ bệnh nhân gắn với phiên mới: bệnh nhân đăng nhập → hồ sơ CỦA CHÍNH HỌ (bỏ qua giá trị client gửi lên);
     * Quản trị viên → giá trị yêu cầu; khách/nhân viên khác → không gắn hồ sơ.
     */
    public Long resolvePatientId(Authentication authentication, Long requestedPatientId) {
        if (!isLoggedIn(authentication)) {
            return null;
        }
        if (SecurityService.hasAnyRole(authentication, "ADMIN")) {
            return requestedPatientId;
        }
        if (SecurityService.hasAnyRole(authentication, "PATIENT")) {
            return securityService.currentPatientId(authentication);
        }
        return null;
    }

    private static boolean isLoggedIn(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)
                && authentication.getName() != null;
    }
}
