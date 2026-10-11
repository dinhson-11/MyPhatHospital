package com.hospital.hmsai.ai.service.impl;

import com.hospital.hmsai.ai.dto.*;
import com.hospital.hmsai.ai.entity.ChatMessage;
import com.hospital.hmsai.ai.entity.ChatSession;
import com.hospital.hmsai.ai.entity.MessageSender;
import com.hospital.hmsai.ai.repository.ChatMessageRepository;
import com.hospital.hmsai.ai.repository.ChatSessionRepository;
import com.hospital.hmsai.ai.service.ChatService;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static com.hospital.hmsai.ai.util.VietnameseTextMatcher.containsAny;
import static com.hospital.hmsai.ai.util.VietnameseTextMatcher.exact;
import static com.hospital.hmsai.ai.util.VietnameseTextMatcher.normalize;
import static com.hospital.hmsai.ai.util.VietnameseTextMatcher.stripDiacritics;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatServiceImpl implements ChatService {

    public static final String CHATBOT_DISCLAIMER =
            "Trợ lý AI chỉ hỗ trợ tư vấn sơ bộ, không thay thế thăm khám và chỉ định của bác sĩ.";

    // =========================================================================
    // TỪ KHÓA CẤP CỨU (CỜ ĐỎ) – đồng bộ với ai-service/services/chatbot_service.py (EMERGENCY_RULES)
    // So khớp nguyên từ, chịu được gõ không dấu; exact(...) = chỉ khớp khi gõ đúng dấu.
    // =========================================================================
    private static final String[] EMERGENCY_ANY_TERMS = {
            // Chung
            "cấp cứu", "nguy kịch", "hôn mê", "ngừng thở", "ngưng thở", "ngừng tim", "tai nạn",
            "mất ý thức", "khó thở nặng",
            // Đau ngực
            "nhồi máu cơ tim", "đau ngực dữ dội", "đau ngực lan tay", "đau ngực lan ra tay",
            // Đột quỵ
            "đột quỵ", "tai biến", "méo miệng", "méo mồm", "méo mặt", "nói ngọng", "nói khó",
            "yếu nửa người", "liệt nửa người", "tê nửa người",
            // Đường thở
            "khó thở dữ dội", "không thở được", "thở không được", "không thở nổi", "thở không nổi",
            "tím tái", "môi tím", "tím môi", "ngạt thở", "hóc dị vật",
            // Phản vệ
            "sốc phản vệ", "phản vệ", "sưng môi", "phù môi", "phù mặt", "phù họng", "sưng lưỡi", "phù lưỡi",
            // Co giật / ngất
            "co giật", exact("ngất"), "ngất xỉu", "ngất đi", exact("xỉu"), "bất tỉnh",
            // Chảy máu
            "nôn ra máu", "ói ra máu", "ho ra máu", "khạc ra máu", "chảy máu không cầm",
            "chảy máu không ngừng", "chảy máu nhiều", "mất máu nhiều", "băng huyết",
            // Quá liều / ngộ độc (thứ tự từ linh hoạt: "uống quá liều thuốc", "uống thuốc quá liều")
            "quá liều", "uống thuốc độc", "uống thuốc trừ sâu", "uống thuốc diệt cỏ", "uống thuốc chuột",
            "ngộ độc cấp", "ngộ độc rượu", "ngộ độc methanol", "ngộ độc thuốc", "ngộ độc nấm", "ngộ độc khí"
    };
    private static final String[] SUICIDE_TERMS = {
            "muốn chết", exact("tự tử"), "tự sát", "tự vẫn", "không muốn sống", "tự làm hại bản thân", "tự hại"
    };
    private static final String[] CHEST_PAIN_TERMS = {
            "đau ngực", "tức ngực", "đau thắt ngực", "đau tức ngực", "nặng ngực"
    };
    private static final String[] CHEST_PAIN_SEVERITY_TERMS = {
            "dữ dội", "lan tay", "lan ra tay", "lan xuống tay", "lan lên hàm", "lan ra sau lưng",
            "vã mồ hôi", "toát mồ hôi", "khó thở", "ngất xỉu", exact("ngất")
    };
    private static final String[] PREGNANCY_TERMS = {
            "mang thai", "có thai", "có bầu", "mang bầu", "bà bầu", "đang bầu", "thai"
    };
    private static final String[] PREGNANCY_DANGER_TERMS = {
            "ra máu", "ra huyết", "chảy máu âm đạo", "chảy máu vùng kín", "đau bụng dữ dội",
            "vỡ ối", "rỉ ối", "ra nước ối"
    };
    private static final String[] ALLERGY_TRIGGER_TERMS = {
            "dị ứng", "mề đay", "mày đay", "mẩn ngứa", "sau tiêm", "sau khi tiêm", "sau uống thuốc",
            "sau khi uống thuốc", "sau dùng thuốc", "ong đốt"
    };
    private static final String[] ANAPHYLAXIS_SIGN_TERMS = {"khó thở", "tụt huyết áp", "choáng"};
    private static final String[] INFANT_DANGER_TERMS = {"sốt", "bỏ bú", "li bì"};
    private static final String AGE_UNIT = "(tháng|thang|tuần|tuan|ngày|ngay)";
    private static final Pattern[] INFANT_AGE_PATTERNS = {
            // "2 tháng tuổi", "3 tuần tuổi", "10 ngày tuổi"
            Pattern.compile("(?<!\\w)(\\d{1,2})\\s*" + AGE_UNIT + "\\s*(?:tuổi|tuoi)(?!\\w)",
                    Pattern.UNICODE_CHARACTER_CLASS),
            // "bé 2 tháng", "bé nhà tôi 6 tuần" (không bắt "con tôi bị sốt 2 ngày")
            Pattern.compile("(?<!\\w)(?:bé|be|trẻ|tre|con|cháu|chau)(?:\\s+(?:nhà\\s+|nha\\s+)?(?:tôi|toi|em|mình|minh))?"
                    + "\\s+(\\d{1,2})\\s*" + AGE_UNIT + "(?!\\w)", Pattern.UNICODE_CHARACTER_CLASS)
    };

    /** Triệu chứng: có triệu chứng thì không trả lời chào hỏi / FAQ chung chung (vd "đau ở đâu"). */
    private static final String[] SYMPTOM_TERMS = {
            "đau", "nhức", "sốt", "ho", "nôn", "ói", "buồn nôn", "mệt", "ngứa", "sưng", "phù", "chảy máu",
            "ra máu", "khó thở", "chóng mặt", "hoa mắt", "tiêu chảy", "táo bón", "triệu chứng", "viêm",
            "nổi mẩn", "nổi mần", "phát ban", "dị ứng", "tê bì", "co giật", "ợ chua", "khàn tiếng",
            "ngạt mũi", "nghẹt mũi", "sổ mũi", "ù tai", "mất ngủ", "hồi hộp", "tức ngực", "mụn", "bị bệnh", "bị ốm"
    };

    private static final String EMERGENCY_REPLY = "⚠️ **TÌNH HUỐNG KHẨN CẤP / CẦN XỬ TRÍ NGAY LẬP TỨC**\n\n"
            + "Các dấu hiệu bạn mô tả có thể là tình trạng cấp cứu nguy hiểm đến tính mạng.\n"
            + "• Vui lòng gọi ngay **115** hoặc di chuyển ngay đến **Khoa Cấp cứu Mỹ Phát Hospital** (1170 Quang Trung, Chũ, Lục Ngạn).\n"
            + "• Hotline cấp cứu 24/7: **0789 065 493**.\n"
            + "• Không tự ý uống thuốc hoặc chờ đợi tại nhà!";

    private static final String SUICIDE_REPLY = "⚠️ **Bạn không đơn độc – hãy tìm trợ giúp ngay bây giờ**\n\n"
            + "Nếu bạn đang có ý định làm hại bản thân hoặc đang gặp nguy hiểm, vui lòng gọi ngay **115** "
            + "hoặc đến **Khoa Cấp cứu Mỹ Phát Hospital** (1170 Quang Trung, Chũ, Lục Ngạn).\n"
            + "• Hỗ trợ tâm lý khẩn cấp 24/7: Hotline Mỹ Phát Hospital **0789 065 493** – nhân viên y tế sẽ lắng nghe và kết nối bạn với bác sĩ.\n"
            + "• Nếu bạn là trẻ em (dưới 16 tuổi): Tổng đài quốc gia bảo vệ trẻ em **111** (miễn phí, 24/7).\n"
            + "• Hãy ở cạnh hoặc gọi ngay cho người thân, bạn bè mà bạn tin tưởng; cất xa thuốc và vật sắc nhọn.";

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final PatientRepository patientRepository;
    private final RestTemplate restTemplate;

    @Value("${ai-service.base-url:http://localhost:8000}")
    private String aiServiceBaseUrl;

    @Override
    @Transactional
    public ChatSessionResponseDto createSession(Long patientId) {
        Patient patient = null;
        if (patientId != null) {
            patient = patientRepository.findById(patientId).orElse(null);
        }

        ChatSession session = ChatSession.builder()
                .patient(patient)
                .startedAt(LocalDateTime.now())
                .build();
        ChatSession savedSession = sessionRepository.save(session);
        return toSessionResponseDto(savedSession);
    }

    private static org.springframework.data.domain.Pageable sessionPage(int limit) {
        return org.springframework.data.domain.PageRequest.of(0, Math.min(Math.max(limit, 1), MAX_SESSIONS));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatSessionResponseDto> getAllSessions(int limit) {
        return sessionRepository.findAllByOrderByCreatedAtDesc(sessionPage(limit))
                .getContent()
                .stream()
                .map(this::toSessionResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatSessionResponseDto> getSessionsByPatient(Long patientId, int limit) {
        return sessionRepository.findByPatientIdOrderByCreatedAtDesc(patientId, sessionPage(limit))
                .getContent()
                .stream()
                .map(this::toSessionResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ChatSessionResponseDto getSession(Long sessionId) {
        ChatSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiên chat với id: " + sessionId));
        return toSessionResponseDto(session);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessageResponseDto> getSessionMessages(Long sessionId) {
        if (!sessionRepository.existsById(sessionId)) {
            throw new ResourceNotFoundException("Không tìm thấy phiên chat với id: " + sessionId);
        }

        List<ChatMessage> messages = messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        return messages.stream().map(msg -> ChatMessageResponseDto.builder()
                .messageId(msg.getId())
                .sessionId(sessionId)
                .sender(msg.getSender())
                .message(msg.getMessage())
                .intent(msg.getIntent())
                .disclaimer(msg.getSender() == MessageSender.AI ? CHATBOT_DISCLAIMER : null)
                .createdAt(msg.getCreatedAt())
                .build()
        ).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ChatMessageResponseDto sendMessage(SendChatMessageRequest request) {
        if (request == null || request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            throw new IllegalArgumentException("Tin nhắn không được để trống");
        }

        // 1. Xác định hoặc tạo mới ChatSession
        ChatSession session = null;
        if (request.getSessionId() != null) {
            session = sessionRepository.findById(request.getSessionId()).orElse(null);
        }

        if (session == null) {
            Patient patient = null;
            if (request.getPatientId() != null) {
                patient = patientRepository.findById(request.getPatientId()).orElse(null);
            }
            session = ChatSession.builder()
                    .patient(patient)
                    .startedAt(LocalDateTime.now())
                    .build();
            session = sessionRepository.save(session);
        }

        // 2. Lưu tin nhắn của người dùng
        ChatMessage userMessage = ChatMessage.builder()
                .session(session)
                .sender(MessageSender.USER)
                .message(request.getMessage().trim())
                .build();
        messageRepository.save(userMessage);

        // 3. Gọi AI Service hoặc fallback
        AiChatbotResponse aiResponse = callAiService(request.getMessage().trim(), session.getId().toString());

        // 4. Lưu tin nhắn phản hồi của AI
        ChatMessage aiMessage = ChatMessage.builder()
                .session(session)
                .sender(MessageSender.AI)
                .message(aiResponse.getReply())
                .intent(aiResponse.getIntent())
                .build();
        ChatMessage savedAiMessage = messageRepository.save(aiMessage);

        // 5. Trả về kết quả
        return ChatMessageResponseDto.builder()
                .messageId(savedAiMessage.getId())
                .sessionId(session.getId())
                .sender(MessageSender.AI)
                .message(aiResponse.getReply())
                .intent(aiResponse.getIntent())
                .suggestedDepartment(aiResponse.getSuggestedDepartment())
                .showBookingButton(aiResponse.getShowBookingButton())
                .disclaimer(aiResponse.getDisclaimer() != null ? aiResponse.getDisclaimer() : CHATBOT_DISCLAIMER)
                .createdAt(savedAiMessage.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public void closeSession(Long sessionId) {
        ChatSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiên chat với id: " + sessionId));
        session.setEndedAt(LocalDateTime.now());
        sessionRepository.save(session);
    }

    /**
     * Gọi HTTP sang FastAPI AI Service, nếu lỗi hoặc timeout thì chuyển sang Local Rule-based Fallback.
     */
    private AiChatbotResponse callAiService(String message, String sessionId) {
        String url = aiServiceBaseUrl + "/api/v1/ai/chat/message";
        try {
            log.info("Gửi tin nhắn tới AI Chatbot tại: {}", url);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            AiChatbotRequest requestPayload = AiChatbotRequest.builder()
                    .message(message)
                    .sessionId(sessionId)
                    .build();

            HttpEntity<AiChatbotRequest> entity = new HttpEntity<>(requestPayload, headers);
            AiChatbotResponse response = restTemplate.postForObject(url, entity, AiChatbotResponse.class);

            if (response != null && response.getReply() != null) {
                return response;
            }
        } catch (Exception ex) {
            log.warn("AI Service không khả dụng ({}), chuyển sang Local Rule-based Chatbot Fallback.", ex.getMessage());
        }

        return generateLocalFallbackResponse(message, sessionId);
    }

    /**
     * Fallback AI Chatbot logic nếu AI Service offline.
     */
    private AiChatbotResponse generateLocalFallbackResponse(String message, String sessionId) {
        String lower = normalize(message);

        // 1. Khẩn cấp – luôn kiểm tra TRƯỚC mọi bước khác (bộ từ khóa đồng bộ với AI Service)
        boolean suicideRisk = isSuicideRisk(lower);
        if (suicideRisk || isEmergency(lower)) {
            return AiChatbotResponse.builder()
                    .reply(suicideRisk ? SUICIDE_REPLY : EMERGENCY_REPLY)
                    .intent("EMERGENCY")
                    .showBookingButton(false)
                    .isOutOfScope(true)
                    .sessionId(sessionId)
                    .disclaimer(CHATBOT_DISCLAIMER)
                    .build();
        }

        // Tin nhắn mô tả triệu chứng thì không trả lời chào hỏi / FAQ / đặt lịch chung chung
        boolean hasSymptom = containsAny(lower, SYMPTOM_TERMS);

        // 2. Chào hỏi
        if (!hasSymptom && containsAny(lower, "xin chào", "chào bạn", "hello", "hi bạn")) {
            return AiChatbotResponse.builder()
                    .reply("Xin chào! Tôi là **Trợ lý AI Y tế của Mỹ Phát Hospital**.\n\n"
                            + "Tôi có thể giúp bạn:\n"
                            + "• Tra cứu thông tin dịch vụ, giờ khám, bảo hiểm y tế\n"
                            + "• Tư vấn sơ bộ triệu chứng và gợi ý chuyên khoa khám phù hợp\n"
                            + "• Hỗ trợ thông tin đặt lịch khám trực tuyến\n\n"
                            + "Bạn đang gặp phải triệu chứng gì hoặc cần hỗ trợ thông tin nào?")
                    .intent("GREETING")
                    .showBookingButton(false)
                    .sessionId(sessionId)
                    .disclaimer(CHATBOT_DISCLAIMER)
                    .build();
        }

        // 3. FAQ: BHYT
        if (!hasSymptom && containsAny(lower, "bhyt", "bảo hiểm y tế", "thẻ bhyt")) {
            return AiChatbotResponse.builder()
                    .reply("🏥 **Thông tin Bảo hiểm Y tế tại Mỹ Phát Hospital:**\n\n"
                            + "• Tiếp nhận BHYT thông tuyến toàn quốc (tuyến huyện/tỉnh theo quy định).\n"
                            + "• Khi đi khám, bạn cần mang theo: CCCD gắn chip (hoặc thẻ BHYT trên ứng dụng VssID) và giấy hẹn khám lại (nếu có).\n"
                            + "• Khám BHYT: Thứ 2 – Thứ 7 (trong giờ khám bệnh của bệnh viện).\n"
                            + "• Cấp cứu 24/7 không cần thủ tục BHYT trước.")
                    .intent("FAQ")
                    .showBookingButton(true)
                    .sessionId(sessionId)
                    .disclaimer(CHATBOT_DISCLAIMER)
                    .build();
        }

        // 4. FAQ: Giờ khám
        if (!hasSymptom && containsAny(lower, "giờ khám", "giờ làm việc", "mấy giờ", "lịch làm việc")) {
            return AiChatbotResponse.builder()
                    .reply("⏰ **Lịch làm việc Mỹ Phát Hospital:**\n\n"
                            + "• **Thứ 2 – Chủ nhật**\n"
                            + "• Mùa hè (01/04 – 31/10): sáng 07h00 – 11h00 | chiều 13h00 – 17h30\n"
                            + "• Mùa đông (01/11 – 31/03, lùi 30 phút): sáng 07h30 – 11h30 | chiều 13h30 – 18h00\n"
                            + "• **Khám BHYT**: Thứ 2 – Thứ 7\n"
                            + "• **Cấp cứu và điều trị**: Hoạt động 24/24 liên tục, kể cả ngày lễ.")
                    .intent("FAQ")
                    .showBookingButton(true)
                    .sessionId(sessionId)
                    .disclaimer(CHATBOT_DISCLAIMER)
                    .build();
        }

        // 5. Booking
        if (!hasSymptom && containsAny(lower, "đặt lịch", "hẹn khám", "đăng ký khám")) {
            return AiChatbotResponse.builder()
                    .reply("Bạn có thể đặt lịch khám bệnh trực tuyến nhanh chóng qua hệ thống của chúng tôi.\n"
                            + "Vui lòng bấm nút **'Đặt lịch khám ngay'** bên dưới để chọn chuyên khoa, bác sĩ và khung giờ mong muốn.")
                    .intent("BOOKING")
                    .showBookingButton(true)
                    .sessionId(sessionId)
                    .disclaimer(CHATBOT_DISCLAIMER)
                    .build();
        }

        // 6. Gợi ý chuyên khoa theo triệu chứng
        // 6a. Triệu chứng Da liễu & Dị ứng: ưu tiên cao cho các tổn thương da mẩn/mần ngứa, dị ứng, mề đay kể cả khi có từ 'bé', 'con'
        if (containsAny(lower, "dị ứng", "nổi mẩn", "nổi mần", "mẩn ngứa", "mần ngứa", "ngứa",
                "phát ban", "mề đay", "mày đay", "viêm da", "mụn", "nấm da")) {
            return buildDeptResponse(sessionId, 14, "Dịch vụ Thẩm mỹ / Tạo hình",
                    "Triệu chứng trên da và dị ứng của bạn nên được bác sĩ **Dịch vụ Thẩm mỹ / Tạo hình** (da liễu) thăm khám trực tiếp để chẩn đoán chính xác và kê đơn điều trị.",
                    "Dấu hiệu da liễu / dị ứng, mẩn ngứa", "MEDIUM");
        }
        if (containsAny(lower, "khám thai", "mang thai", "có thai", "có bầu", "mang bầu", "bà bầu",
                "thai kỳ", "kinh nguyệt", "phụ khoa")) {
            return buildDeptResponse(sessionId, 3, "Sản - Phụ khoa",
                    "Vấn đề thai kỳ và sức khỏe phụ nữ của bạn sẽ được bác sĩ **Sản - Phụ khoa** tư vấn và thăm khám chuyên sâu.",
                    "Triệu chứng liên quan đến thai kỳ / phụ khoa", "MEDIUM");
        }
        if (containsAny(lower, "đau họng", "rát họng", "viêm họng", "ngạt mũi", "viêm xoang", "đau tai",
                "khàn tiếng")) {
            return buildDeptResponse(sessionId, 10, "Tai Mũi Họng",
                    "Triệu chứng tai mũi họng của bạn nên được nội soi kiểm tra tại **Tai Mũi Họng** để điều trị dứt điểm.",
                    "Triệu chứng viêm nhiễm vùng tai mũi họng", "MEDIUM");
        }
        if (containsAny(lower, "trẻ", "bé", "con tôi", "sơ sinh")) {
            return buildDeptResponse(sessionId, 1, "Khoa Khám bệnh / Cấp cứu ban đầu",
                    "Bạn đang hỏi về sức khỏe trẻ nhỏ. Bạn có thể đặt lịch tại **Khoa Khám bệnh / Cấp cứu ban đầu** để bác sĩ thăm khám cho bé.",
                    "Triệu chứng liên quan đến sức khỏe trẻ em", "HIGH");
        }
        if (containsAny(lower, "đau ngực", "tức ngực", "hồi hộp", "tim", "huyết áp")) {
            return buildDeptResponse(sessionId, 1, "Khoa Khám bệnh / Cấp cứu ban đầu",
                    "Triệu chứng ngực và tuần hoàn của bạn cần được kiểm tra tại **Khoa Khám bệnh / Cấp cứu ban đầu** để đo ECG và đánh giá ban đầu.",
                    "Triệu chứng gợi ý bệnh lý hệ tim mạch", "HIGH");
        }
        // "ho" khớp nguyên từ: không bắt nhầm "cho", "khoa", "họng"
        if (containsAny(lower, "ho", "đờm", "khó thở", "phổi")) {
            return buildDeptResponse(sessionId, 1, "Khoa Khám bệnh / Cấp cứu ban đầu",
                    "Dựa vào dấu hiệu hô hấp, bạn nên đến **Khoa Khám bệnh / Cấp cứu ban đầu** để bác sĩ thăm khám và nghe phổi, chỉ định X-quang nếu cần.",
                    "Dấu hiệu viêm đường hô hấp hoặc bệnh lý phổi", "HIGH");
        }
        if (containsAny(lower, "đau bụng", "dạ dày", "ợ chua", "buồn nôn", "tiêu chảy")) {
            return buildDeptResponse(sessionId, 1, "Khoa Khám bệnh / Cấp cứu ban đầu",
                    "Triệu chứng vùng bụng liên quan đến đường tiêu hóa. Bạn nên khám tại **Khoa Khám bệnh / Cấp cứu ban đầu**.",
                    "Dấu hiệu bệnh lý tiêu hóa / dạ dày", "MEDIUM");
        }
        if (containsAny(lower, "đau đầu", "chóng mặt", "tê bì", "mất ngủ")) {
            return buildDeptResponse(sessionId, 1, "Khoa Khám bệnh / Cấp cứu ban đầu",
                    "Triệu chứng thần kinh của bạn nên được bác sĩ **Khoa Khám bệnh / Cấp cứu ban đầu** đánh giá lâm sàng chuyên sâu.",
                    "Dấu hiệu thần kinh / tuần hoàn não", "MEDIUM");
        }
        if (containsAny(lower, "đau khớp", "đau lưng", "thoái hóa", "sưng khớp")) {
            return buildDeptResponse(sessionId, 13, "Khoa Y học cổ truyền – Phục hồi chức năng",
                    "Triệu chứng cơ xương khớp nên được thăm khám tại **Khoa Y học cổ truyền – Phục hồi chức năng** để có hướng điều trị phù hợp.",
                    "Dấu hiệu thoái hóa hoặc viêm khớp", "MEDIUM");
        }

        // Mặc định
        return buildDeptResponse(sessionId, 1, "Khoa Khám bệnh / Cấp cứu ban đầu",
                "Để có đánh giá toàn diện về sức khỏe, bạn nên đến **Khoa Khám bệnh / Cấp cứu ban đầu** để được bác sĩ khám sàng lọc và hướng dẫn xét nghiệm phù hợp.",
                "Khám sức khỏe tổng quát và sàng lọc ban đầu", "NORMAL");
    }

    static boolean isSuicideRisk(String normalizedText) {
        return containsAny(normalizedText, SUICIDE_TERMS);
    }

    /** Phát hiện dấu hiệu cấp cứu (cờ đỏ). {@code normalizedText} phải đã qua normalize(). */
    static boolean isEmergency(String normalizedText) {
        if (containsAny(normalizedText, EMERGENCY_ANY_TERMS)) {
            return true;
        }
        if (containsAny(normalizedText, CHEST_PAIN_TERMS) && containsAny(normalizedText, CHEST_PAIN_SEVERITY_TERMS)) {
            return true;
        }
        if (containsAny(normalizedText, PREGNANCY_TERMS) && containsAny(normalizedText, PREGNANCY_DANGER_TERMS)) {
            return true;
        }
        if (containsAny(normalizedText, ALLERGY_TRIGGER_TERMS) && containsAny(normalizedText, ANAPHYLAXIS_SIGN_TERMS)) {
            return true;
        }
        return isYoungInfant(normalizedText) && containsAny(normalizedText, INFANT_DANGER_TERMS);
    }

    /** Trẻ sơ sinh hoặc dưới 3 tháng tuổi. */
    private static boolean isYoungInfant(String normalizedText) {
        if (containsAny(normalizedText, "sơ sinh")) {
            return true;
        }
        for (Pattern pattern : INFANT_AGE_PATTERNS) {
            Matcher m = pattern.matcher(normalizedText);
            while (m.find()) {
                int n = Integer.parseInt(m.group(1));
                String unit = stripDiacritics(m.group(2));
                if ((unit.equals("thang") && n < 3) || (unit.equals("tuan") && n < 13) || (unit.equals("ngay") && n <= 90)) {
                    return true;
                }
            }
        }
        return false;
    }

    private AiChatbotResponse buildDeptResponse(String sessionId, Integer deptId, String deptName,
                                                 String reply, String reason, String priority) {
        return AiChatbotResponse.builder()
                .reply(reply)
                .intent("SYMPTOM_CHECK")
                .suggestedDepartment(DepartmentSuggestionDto.builder()
                        .deptId(deptId)
                        .deptName(deptName)
                        .reason(reason)
                        .priority(priority)
                        .build())
                .showBookingButton(true)
                .sessionId(sessionId)
                .disclaimer(CHATBOT_DISCLAIMER)
                .build();
    }

    private ChatSessionResponseDto toSessionResponseDto(ChatSession session) {
        int messageCount = (int) messageRepository.countBySessionId(session.getId());
        String lastMessage = messageRepository.findFirstBySessionIdOrderByCreatedAtDesc(session.getId())
                .map(ChatMessage::getMessage)
                .orElse(null);

        return ChatSessionResponseDto.builder()
                .id(session.getId())
                .patientId(session.getPatient() != null ? session.getPatient().getId() : null)
                .patientName(session.getPatient() != null ? session.getPatient().getFullName() : "Khách vãng lai")
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .messageCount(messageCount)
                .lastMessage(lastMessage)
                .createdAt(session.getCreatedAt())
                .build();
    }
}
