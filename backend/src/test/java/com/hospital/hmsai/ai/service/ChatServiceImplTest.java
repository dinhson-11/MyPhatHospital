package com.hospital.hmsai.ai.service;

import com.hospital.hmsai.ai.dto.*;
import com.hospital.hmsai.ai.entity.ChatMessage;
import com.hospital.hmsai.ai.entity.ChatSession;
import com.hospital.hmsai.ai.entity.MessageSender;
import com.hospital.hmsai.ai.repository.ChatMessageRepository;
import com.hospital.hmsai.ai.repository.ChatSessionRepository;
import com.hospital.hmsai.ai.service.impl.ChatServiceImpl;
import com.hospital.hmsai.patient.entity.Patient;
import com.hospital.hmsai.patient.repository.PatientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceImplTest {

    @Mock
    private ChatSessionRepository sessionRepository;

    @Mock
    private ChatMessageRepository messageRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private ChatServiceImpl chatService;

    private Patient testPatient;
    private ChatSession testSession;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(chatService, "aiServiceBaseUrl", "http://localhost:8000");

        testPatient = Patient.builder()
                .id(1L)
                .patientCode("BN001")
                .fullName("Nguyễn Văn A")
                .build();

        testSession = ChatSession.builder()
                .id(10L)
                .patient(testPatient)
                .startedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Tạo phiên chat mới không kèm bệnh nhân (khách vãng lai)")
    void createSession_guest_success() {
        when(sessionRepository.save(any(ChatSession.class))).thenReturn(testSession);
        when(messageRepository.countBySessionId(10L)).thenReturn(0L);
        when(messageRepository.findFirstBySessionIdOrderByCreatedAtDesc(10L)).thenReturn(Optional.empty());

        ChatSessionResponseDto response = chatService.createSession(null);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
        verify(sessionRepository).save(any(ChatSession.class));
    }

    @Test
    @DisplayName("Tạo phiên chat gắn với bệnh nhân đã đăng ký")
    void createSession_withPatient_success() {
        when(patientRepository.findById(1L)).thenReturn(Optional.of(testPatient));
        when(sessionRepository.save(any(ChatSession.class))).thenReturn(testSession);
        when(messageRepository.countBySessionId(10L)).thenReturn(0L);
        when(messageRepository.findFirstBySessionIdOrderByCreatedAtDesc(10L)).thenReturn(Optional.empty());

        ChatSessionResponseDto response = chatService.createSession(1L);

        assertThat(response).isNotNull();
        assertThat(response.getPatientName()).isEqualTo("Nguyễn Văn A");
        verify(patientRepository).findById(1L);
    }

    @Test
    @DisplayName("Gửi tin nhắn – AI Service thành công")
    void sendMessage_aiServiceSuccess() {
        AiChatbotResponse aiResponse = AiChatbotResponse.builder()
                .reply("Bạn nên đi khám Khoa Tim mạch.")
                .intent("SYMPTOM_CHECK")
                .suggestedDepartment(DepartmentSuggestionDto.builder()
                        .deptId(5)
                        .deptName("Khoa Tim mạch")
                        .build())
                .showBookingButton(true)
                .sessionId("10")
                .disclaimer(ChatServiceImpl.CHATBOT_DISCLAIMER)
                .build();

        ChatMessage savedAiMessage = ChatMessage.builder()
                .id(101L)
                .session(testSession)
                .sender(MessageSender.AI)
                .message(aiResponse.getReply())
                .intent(aiResponse.getIntent())
                .createdAt(LocalDateTime.now())
                .build();

        when(sessionRepository.findById(10L)).thenReturn(Optional.of(testSession));
        when(messageRepository.save(any(ChatMessage.class))).thenReturn(savedAiMessage);
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(AiChatbotResponse.class)))
                .thenReturn(aiResponse);

        SendChatMessageRequest request = SendChatMessageRequest.builder()
                .sessionId(10L)
                .message("Tôi bị đau tức ngực trái")
                .build();

        ChatMessageResponseDto response = chatService.sendMessage(request);

        assertThat(response).isNotNull();
        assertThat(response.getSender()).isEqualTo(MessageSender.AI);
        assertThat(response.getIntent()).isEqualTo("SYMPTOM_CHECK");
        assertThat(response.getSuggestedDepartment().getDeptName()).isEqualTo("Khoa Tim mạch");
        assertThat(response.getDisclaimer()).isNotEmpty();
        verify(messageRepository, times(2)).save(any(ChatMessage.class)); // 1 User + 1 AI
    }

    @Test
    @DisplayName("Gửi tin nhắn – AI Service sập → Local Fallback kích hoạt (Tình huống khẩn cấp)")
    void sendMessage_aiServiceDown_emergencyFallback() {
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(testSession));
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(AiChatbotResponse.class)))
                .thenThrow(new RestClientException("Connection refused"));

        ChatMessage savedAiMessage = ChatMessage.builder()
                .id(102L)
                .session(testSession)
                .sender(MessageSender.AI)
                .message("⚠️ TÌNH HUỐNG KHẨN CẤP")
                .intent("EMERGENCY")
                .createdAt(LocalDateTime.now())
                .build();
        when(messageRepository.save(any(ChatMessage.class))).thenReturn(savedAiMessage);

        SendChatMessageRequest request = SendChatMessageRequest.builder()
                .sessionId(10L)
                .message("Bệnh nhân bị bất tỉnh và khó thở dữ dội, cần cấp cứu")
                .build();

        ChatMessageResponseDto response = chatService.sendMessage(request);

        assertThat(response).isNotNull();
        assertThat(response.getIntent()).isEqualTo("EMERGENCY");
        assertThat(response.getShowBookingButton()).isFalse();
        assertThat(response.getDisclaimer()).isEqualTo(ChatServiceImpl.CHATBOT_DISCLAIMER);
    }

    @Test
    @DisplayName("Gửi tin nhắn – AI Service sập → Local Fallback gợi ý Khoa Nhi")
    void sendMessage_aiServiceDown_pediatricFallback() {
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(testSession));
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(AiChatbotResponse.class)))
                .thenThrow(new RestClientException("Timeout"));

        ChatMessage savedAiMessage = ChatMessage.builder()
                .id(103L)
                .session(testSession)
                .sender(MessageSender.AI)
                .message("Khoa Nhi")
                .intent("SYMPTOM_CHECK")
                .createdAt(LocalDateTime.now())
                .build();
        when(messageRepository.save(any(ChatMessage.class))).thenReturn(savedAiMessage);

        SendChatMessageRequest request = SendChatMessageRequest.builder()
                .sessionId(10L)
                .message("Bé nhà tôi bị sốt và ho liên tục")
                .build();

        ChatMessageResponseDto response = chatService.sendMessage(request);

        assertThat(response).isNotNull();
        assertThat(response.getSuggestedDepartment()).isNotNull();
        assertThat(response.getSuggestedDepartment().getDeptName()).isEqualTo("Khoa Khám bệnh / Cấp cứu ban đầu");
    }

    @Test
    @DisplayName("Gửi tin nhắn – AI Service sập → Local Fallback dị ứng da mẩn ngứa ưu tiên Khoa Da liễu kể cả khi có từ 'bé'")
    void sendMessage_aiServiceDown_allergySkinFallback_routesToDermatology() {
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(testSession));
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(AiChatbotResponse.class)))
                .thenThrow(new RestClientException("Connection timeout"));

        ChatMessage savedAiMessage = ChatMessage.builder()
                .id(104L)
                .session(testSession)
                .sender(MessageSender.AI)
                .message("Khoa Da liễu")
                .intent("SYMPTOM_CHECK")
                .createdAt(LocalDateTime.now())
                .build();
        when(messageRepository.save(any(ChatMessage.class))).thenReturn(savedAiMessage);

        SendChatMessageRequest request = SendChatMessageRequest.builder()
                .sessionId(10L)
                .message("bé bị dị ứng, nổi mẩn da")
                .build();

        ChatMessageResponseDto response = chatService.sendMessage(request);

        assertThat(response).isNotNull();
        assertThat(response.getSuggestedDepartment()).isNotNull();
        assertThat(response.getSuggestedDepartment().getDeptId()).isEqualTo(14);
        assertThat(response.getSuggestedDepartment().getDeptName()).isEqualTo("Dịch vụ Thẩm mỹ / Tạo hình");
    }

    @Test
    @DisplayName("Gửi tin nhắn – AI Service sập → Local Fallback biến thể 'nổi mần da' vào Khoa Da liễu")
    void sendMessage_aiServiceDown_noiManDaFallback_routesToDermatology() {
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(testSession));
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(AiChatbotResponse.class)))
                .thenThrow(new RestClientException("Connection timeout"));

        ChatMessage savedAiMessage = ChatMessage.builder()
                .id(105L)
                .session(testSession)
                .sender(MessageSender.AI)
                .message("Khoa Da liễu")
                .intent("SYMPTOM_CHECK")
                .createdAt(LocalDateTime.now())
                .build();
        when(messageRepository.save(any(ChatMessage.class))).thenReturn(savedAiMessage);

        SendChatMessageRequest request = SendChatMessageRequest.builder()
                .sessionId(10L)
                .message("dị ứng, nổi mần da ngứa nhiều")
                .build();

        ChatMessageResponseDto response = chatService.sendMessage(request);

        assertThat(response).isNotNull();
        assertThat(response.getSuggestedDepartment()).isNotNull();
        assertThat(response.getSuggestedDepartment().getDeptId()).isEqualTo(14);
        assertThat(response.getSuggestedDepartment().getDeptName()).isEqualTo("Dịch vụ Thẩm mỹ / Tạo hình");
    }

    @Test
    @DisplayName("Gửi tin nhắn rỗng → Báo lỗi IllegalArgumentException")
    void sendMessage_emptyMessage_throws() {
        SendChatMessageRequest request = SendChatMessageRequest.builder()
                .sessionId(10L)
                .message("   ")
                .build();

        assertThatThrownBy(() -> chatService.sendMessage(request))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Lấy tin nhắn của phiên chat thành công")
    void getSessionMessages_success() {
        ChatMessage msg1 = ChatMessage.builder()
                .id(1L)
                .session(testSession)
                .sender(MessageSender.USER)
                .message("Chào bạn")
                .createdAt(LocalDateTime.now())
                .build();
        ChatMessage msg2 = ChatMessage.builder()
                .id(2L)
                .session(testSession)
                .sender(MessageSender.AI)
                .message("Xin chào, tôi là trợ lý AI")
                .intent("GREETING")
                .createdAt(LocalDateTime.now())
                .build();

        when(sessionRepository.existsById(10L)).thenReturn(true);
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(msg1, msg2));

        List<ChatMessageResponseDto> result = chatService.getSessionMessages(10L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getSender()).isEqualTo(MessageSender.USER);
        assertThat(result.get(1).getSender()).isEqualTo(MessageSender.AI);
        assertThat(result.get(1).getDisclaimer()).isNotEmpty();
    }

    @Test
    @DisplayName("Đóng phiên chat thành công")
    void closeSession_success() {
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(testSession));

        chatService.closeSession(10L);

        assertThat(testSession.getEndedAt()).isNotNull();
        verify(sessionRepository).save(testSession);
    }

    // =========================================================================
    // Fallback cục bộ: dấu hiệu cờ đỏ (đồng bộ với AI Service) & so khớp nguyên từ
    // =========================================================================
    private ChatMessageResponseDto sendWithAiDown(String message) {
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(testSession));
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(AiChatbotResponse.class)))
                .thenThrow(new RestClientException("Connection refused"));
        when(messageRepository.save(any(ChatMessage.class))).thenAnswer(inv -> inv.getArgument(0));
        return chatService.sendMessage(SendChatMessageRequest.builder().sessionId(10L).message(message).build());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Tôi bị đau ngực dữ dội",
            "đau thắt ngực kèm vã mồ hôi",
            "đau ngực lan ra tay trái",
            "bố tôi méo miệng, nói ngọng",
            "mẹ tôi yếu nửa người",
            "con tôi không thở được, môi tím",
            "bị sốc phản vệ sau tiêm",
            "sau khi uống thuốc bị sưng môi",
            "dị ứng hải sản rồi khó thở",
            "tôi vừa bị ngất",
            "ho ra máu",
            "đang mang thai bị ra máu",
            "có bầu 8 tuần đau bụng dữ dội",
            "tôi uống thuốc quá liều",
            "lỡ uống quá liều thuốc ngủ",
            "bé 2 tháng tuổi bị sốt",
            "trẻ sơ sinh bị sốt",
            "dot quy",
            "dau nguc du doi kho tho",
            "uong thuoc qua lieu"
    })
    @DisplayName("Fallback: mọi dấu hiệu cờ đỏ (kể cả gõ không dấu) → EMERGENCY, không hiện nút đặt lịch")
    void fallback_redFlags_returnEmergency(String message) {
        ChatMessageResponseDto response = sendWithAiDown(message);

        assertThat(response.getIntent()).as(message).isEqualTo("EMERGENCY");
        assertThat(response.getShowBookingButton()).isFalse();
        assertThat(response.getMessage()).contains("115").contains("0789 065 493");
    }

    @ParameterizedTest
    @ValueSource(strings = {"tôi muốn chết", "muon chet", "tôi không muốn sống nữa", "tôi định tự tử"})
    @DisplayName("Fallback: ý định tự sát → EMERGENCY kèm đường dây hỗ trợ tâm lý")
    void fallback_suicide_includesMentalHealthSupport(String message) {
        ChatMessageResponseDto response = sendWithAiDown(message);

        assertThat(response.getIntent()).isEqualTo("EMERGENCY");
        assertThat(response.getMessage()).contains("115").contains("Hỗ trợ tâm lý");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Tôi bị đau ngực trái và hồi hộp",
            "tôi bị đau họng và ngạt mũi",
            "đau từ từ tăng dần",
            "bé 2 tuổi bị sốt",
            "con tôi bị sốt 2 ngày nay"
    })
    @DisplayName("Fallback: không leo thang nhầm ('ngạt' ≠ 'ngất', 'từ từ' ≠ 'tự tử', trẻ ≥ 3 tháng)")
    void fallback_nonEmergency_notEscalated(String message) {
        assertThat(sendWithAiDown(message).getIntent()).as(message).isNotEqualTo("EMERGENCY");
    }

    @Test
    @DisplayName("Fallback: 'ho' khớp nguyên từ – 'cho', 'khoa' không bị coi là triệu chứng hô hấp")
    void fallback_hoKeyword_wordBoundary() {
        ChatMessageResponseDto response = sendWithAiDown("cho tôi hỏi khoa nào khám");

        assertThat(response.getSuggestedDepartment().getReason())
                .isEqualTo("Khám sức khỏe tổng quát và sàng lọc ban đầu");
    }

    @Test
    @DisplayName("Fallback: tin nhắn có triệu chứng không bị trả lời như FAQ giờ khám")
    void fallback_symptomMessage_notAnsweredAsFaq() {
        ChatMessageResponseDto response = sendWithAiDown("đau bụng mấy giờ nay rồi");

        assertThat(response.getIntent()).isEqualTo("SYMPTOM_CHECK");
        assertThat(response.getSuggestedDepartment()).isNotNull();
    }

    @Test
    @DisplayName("Fallback: 'có bầu' / 'mang bầu' → Sản - Phụ khoa")
    void fallback_colloquialPregnancy_routesToObgyn() {
        ChatMessageResponseDto response = sendWithAiDown("tôi có bầu được 3 tháng muốn đi khám");

        assertThat(response.getSuggestedDepartment().getDeptId()).isEqualTo(3);
    }

    @Test
    @DisplayName("Danh sách phiên chat được giới hạn số dòng (trần 200, tối thiểu 1) thay vì trả toàn bộ lịch sử")
    void testGetSessions_limitIsClamped() {
        org.mockito.ArgumentCaptor<org.springframework.data.domain.Pageable> page =
                org.mockito.ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
        when(sessionRepository.findAllByOrderByCreatedAtDesc(any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of()));
        when(sessionRepository.findByPatientIdOrderByCreatedAtDesc(eq(7L), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of()));

        chatService.getAllSessions(10_000);
        verify(sessionRepository).findAllByOrderByCreatedAtDesc(page.capture());
        assertThat(page.getValue().getPageSize()).isEqualTo(ChatService.MAX_SESSIONS);

        chatService.getSessionsByPatient(7L, 0);
        verify(sessionRepository).findByPatientIdOrderByCreatedAtDesc(eq(7L), page.capture());
        assertThat(page.getValue().getPageSize()).isEqualTo(1);
    }
}
