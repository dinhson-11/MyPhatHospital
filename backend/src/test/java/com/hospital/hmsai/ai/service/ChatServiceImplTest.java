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
        assertThat(response.getSuggestedDepartment().getDeptName()).isEqualTo("Khoa Nhi");
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
        assertThat(response.getSuggestedDepartment().getDeptId()).isEqualTo(8);
        assertThat(response.getSuggestedDepartment().getDeptName()).isEqualTo("Khoa Da liễu");
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
        assertThat(response.getSuggestedDepartment().getDeptId()).isEqualTo(8);
        assertThat(response.getSuggestedDepartment().getDeptName()).isEqualTo("Khoa Da liễu");
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
}
