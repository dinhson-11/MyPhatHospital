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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatServiceImpl implements ChatService {

    public static final String CHATBOT_DISCLAIMER =
            "Trợ lý AI chỉ hỗ trợ tư vấn sơ bộ, không thay thế thăm khám và chỉ định của bác sĩ.";

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

    @Override
    @Transactional(readOnly = true)
    public List<ChatSessionResponseDto> getAllSessions() {
        return sessionRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toSessionResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatSessionResponseDto> getSessionsByPatient(Long patientId) {
        return sessionRepository.findByPatientIdOrderByCreatedAtDesc(patientId)
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
        String lower = message.toLowerCase();

        // 1. Khẩn cấp / Vượt phạm vi tư vấn
        if (lower.contains("cấp cứu") || lower.contains("ngất") || lower.contains("bất tỉnh")
                || lower.contains("đột quỵ") || lower.contains("co giật") || lower.contains("khó thở dữ dội")
                || lower.contains("nôn ra máu") || lower.contains("chảy máu không cầm")) {
            return AiChatbotResponse.builder()
                    .reply("⚠️ **TÌNH HUỐNG KHẨN CẤP / CẦN XỬ TRÍ NGAY LẬP TỨC**\n\n"
                            + "Các dấu hiệu bạn mô tả có thể là tình trạng cấp cứu nguy hiểm đến tính mạng.\n"
                            + "• Vui lòng gọi ngay **115** hoặc di chuyển ngay đến **Khoa Cấp cứu Mỹ Phát Hospital** (1170 Quang Trung, Chũ, Lục Ngạn).\n"
                            + "• Hotline cấp cứu 24/7: **0789 065 493**.\n"
                            + "• Không tự ý uống thuốc hoặc chờ đợi tại nhà!")
                    .intent("EMERGENCY")
                    .showBookingButton(false)
                    .sessionId(sessionId)
                    .disclaimer(CHATBOT_DISCLAIMER)
                    .build();
        }

        // 2. Chào hỏi
        if (lower.contains("xin chào") || lower.contains("chào bạn") || lower.contains("hello") || lower.contains("hi bạn")) {
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
        if (lower.contains("bhyt") || lower.contains("bảo hiểm y tế") || lower.contains("thẻ bhyt")) {
            return AiChatbotResponse.builder()
                    .reply("🏥 **Thông tin Bảo hiểm Y tế tại Mỹ Phát Hospital:**\n\n"
                            + "• Tiếp nhận BHYT thông tuyến toàn quốc (tuyến huyện/tỉnh theo quy định).\n"
                            + "• Khi đi khám, bạn cần mang theo: CCCD gắn chip (hoặc thẻ BHYT trên ứng dụng VssID) và giấy hẹn khám lại (nếu có).\n"
                            + "• Thời gian tiếp nhận khám BHYT: Thứ 2 – Thứ 6 (7h00 – 17h00), Thứ 7 (7h00 – 12h00).\n"
                            + "• Cấp cứu 24/7 không cần thủ tục BHYT trước.")
                    .intent("FAQ")
                    .showBookingButton(true)
                    .sessionId(sessionId)
                    .disclaimer(CHATBOT_DISCLAIMER)
                    .build();
        }

        // 4. FAQ: Giờ khám
        if (lower.contains("giờ khám") || lower.contains("giờ làm việc") || lower.contains("mấy giờ") || lower.contains("lịch làm việc")) {
            return AiChatbotResponse.builder()
                    .reply("⏰ **Lịch làm việc Mỹ Phát Hospital:**\n\n"
                            + "• **Thứ 2 – Thứ 6**: Sáng 07h00 – 11h30 | Chiều 13h30 – 17h00\n"
                            + "• **Thứ 7**: Sáng 07h00 – 12h00 (khám theo yêu cầu và BHYT)\n"
                            + "• **Chủ nhật**: Khám theo yêu cầu (liên hệ hotline trước)\n"
                            + "• **Khoa Cấp cứu**: Hoạt động 24/7 liên tục kể cả Lễ, Tết.")
                    .intent("FAQ")
                    .showBookingButton(true)
                    .sessionId(sessionId)
                    .disclaimer(CHATBOT_DISCLAIMER)
                    .build();
        }

        // 5. Booking
        if (lower.contains("đặt lịch") || lower.contains("hẹn khám") || lower.contains("đăng ký khám")) {
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
        if (lower.contains("dị ứng") || lower.contains("nổi mẩn") || lower.contains("nổi mần")
                || lower.contains("mẩn ngứa") || lower.contains("mần ngứa") || lower.contains("ngứa")
                || lower.contains("phát ban") || lower.contains("mề đay") || lower.contains("mày đay")
                || lower.contains("viêm da") || lower.contains("mụn") || lower.contains("nấm da")) {
            return buildDeptResponse(sessionId, 8, "Khoa Da liễu",
                    "Triệu chứng trên da và dị ứng của bạn nên được bác sĩ **Khoa Da liễu** thăm khám trực tiếp để chẩn đoán chính xác và kê đơn điều trị.",
                    "Dấu hiệu da liễu / dị ứng, mẩn ngứa", "MEDIUM");
        }
        if (lower.contains("trẻ") || lower.contains("bé") || lower.contains("con tôi") || lower.contains("sơ sinh")) {
            return buildDeptResponse(sessionId, 4, "Khoa Nhi",
                    "Bạn đang hỏi về sức khỏe trẻ nhỏ. Bệnh viện có **Khoa Nhi** với các bác sĩ chuyên khoa sẵn sàng thăm khám cho bé.",
                    "Triệu chứng liên quan đến sức khỏe trẻ em", "HIGH");
        }
        if (lower.contains("đau ngực") || lower.contains("tức ngực") || lower.contains("hồi hộp") || lower.contains("tim") || lower.contains("huyết áp")) {
            return buildDeptResponse(sessionId, 5, "Khoa Tim mạch",
                    "Triệu chứng ngực và tuần hoàn của bạn cần được kiểm tra tại **Khoa Tim mạch** để đo ECG và siêu âm tim.",
                    "Triệu chứng gợi ý bệnh lý hệ tim mạch", "HIGH");
        }
        if (lower.contains("ho") || lower.contains("đờm") || lower.contains("khó thở") || lower.contains("phổi") || lower.contains("rát họng")) {
            return buildDeptResponse(sessionId, 3, "Khoa Hô hấp",
                    "Dựa vào dấu hiệu hô hấp, bạn nên đến **Khoa Hô hấp** để bác sĩ thăm khám và nghe phổi, chỉ định X-quang nếu cần.",
                    "Dấu hiệu viêm đường hô hấp hoặc bệnh lý phổi", "HIGH");
        }
        if (lower.contains("đau bụng") || lower.contains("dạ dày") || lower.contains("ợ chua") || lower.contains("buồn nôn") || lower.contains("tiêu chảy")) {
            return buildDeptResponse(sessionId, 6, "Khoa Tiêu hóa",
                    "Triệu chứng vùng bụng liên quan đến đường tiêu hóa. Bạn nên khám tại **Khoa Tiêu hóa**.",
                    "Dấu hiệu bệnh lý tiêu hóa / dạ dày", "MEDIUM");
        }
        if (lower.contains("đau đầu") || lower.contains("chóng mặt") || lower.contains("tê bì") || lower.contains("mất ngủ")) {
            return buildDeptResponse(sessionId, 7, "Khoa Thần kinh",
                    "Triệu chứng thần kinh của bạn nên được bác sĩ **Khoa Thần kinh** đánh giá lâm sàng chuyên sâu.",
                    "Dấu hiệu thần kinh / tuần hoàn não", "MEDIUM");
        }
        if (lower.contains("đau khớp") || lower.contains("đau lưng") || lower.contains("thoái hóa") || lower.contains("sưng khớp")) {
            return buildDeptResponse(sessionId, 9, "Khoa Cơ xương khớp",
                    "Triệu chứng cơ xương khớp nên được thăm khám tại **Khoa Cơ xương khớp** để có hướng điều trị phù hợp.",
                    "Dấu hiệu thoái hóa hoặc viêm khớp", "MEDIUM");
        }

        // Mặc định
        return buildDeptResponse(sessionId, 1, "Khoa Nội tổng quát",
                "Để có đánh giá toàn diện về sức khỏe, bạn nên đến **Khoa Nội tổng quát** để được bác sĩ khám sàng lọc và hướng dẫn xét nghiệm phù hợp.",
                "Khám sức khỏe tổng quát và sàng lọc ban đầu", "NORMAL");
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
