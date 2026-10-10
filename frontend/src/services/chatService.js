/**
 * Chatbot Service – Kết nối API Backend & AI Service
 * Cung cấp:
 * - Gửi/nhận tin nhắn hội thoại với AI
 * - Quản lý phiên chat (session)
 * - Fallback cục bộ khi mất kết nối mạng
 * - Disclaimer y tế bắt buộc
 */

import apiClient from './api';
import { triageService } from './triageService';
import { HOURS_TEXT } from './hospitalHours';

export const AI_DISCLAIMER_TEXT =
  'Trợ lý AI chỉ hỗ trợ tư vấn sơ bộ, không thay thế thăm khám và chỉ định của bác sĩ.';

/** Số điện thoại hiển thị trong cảnh báo cấp cứu. */
export const EMERGENCY_NUMBER = '115';
export const HOSPITAL_HOTLINE = '0789065493';
export const HOSPITAL_HOTLINE_DISPLAY = '0789 065 493';

/**
 * Thời gian chờ phản hồi từ backend. Backend chờ AI Service tối đa 3 giây rồi tự chuyển sang
 * luật dự phòng, nên phía giao diện phải chờ lâu hơn mức đó – nếu không, các phản hồi phân loại
 * cấp cứu (EMERGENCY) của AI sẽ bị bỏ qua và thay bằng bộ luật cục bộ đơn giản hơn.
 */
const CHAT_TIMEOUT_MS = 8000;

/**
 * Cụm từ cờ đỏ cho bộ luật cục bộ (đồng bộ một phần với AI Service).
 * Chỉ gồm các cụm tự thân đã là dấu hiệu nguy hiểm – không dùng "đau ngực"/"khó thở" đơn lẻ.
 */
const RED_FLAG_TERMS = [
  'cấp cứu', 'ngất', 'bất tỉnh', 'hôn mê', 'mất ý thức', 'co giật',
  'khó thở dữ dội', 'khó thở nặng', 'không thở được', 'ngừng thở', 'ngưng thở', 'ngừng tim', 'tím tái',
  'đột quỵ', 'tai biến', 'méo miệng', 'liệt nửa người', 'yếu nửa người',
  'nhồi máu cơ tim', 'đau ngực dữ dội', 'sốc phản vệ',
  'nôn ra máu', 'ói ra máu', 'ho ra máu', 'chảy máu không cầm', 'băng huyết',
  'muốn chết', 'tự tử', 'tự sát', 'không muốn sống', 'quá liều', 'ngộ độc cấp', 'ngộ độc thuốc',
];

const nowTime = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/** Chuẩn hóa intent từ backend/AI ("emergency", " EMERGENCY ") → "EMERGENCY". */
export function normalizeIntent(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().toUpperCase();
  return s || null;
}

function mapSuggestedDept(dept) {
  if (!dept) return null;
  return {
    id: dept.dept_id ?? dept.deptId ?? dept.id,
    name: dept.dept_name || dept.deptName || dept.name,
    reason: dept.reason,
    priority: dept.priority,
  };
}

/**
 * Chuyển một tin nhắn backend (ChatMessageResponseDto hoặc phản hồi AI Service) về dạng giao diện dùng.
 * Giữ nguyên intent (đặc biệt EMERGENCY) để ChatMessage hiển thị cảnh báo cấp cứu.
 */
export function mapServerMessage(data, fallbackSessionId = null) {
  if (!data) return null;
  const isEmergencyFlag = data.isEmergency === true || data.is_emergency === true || data.emergency === true;
  const intent = isEmergencyFlag ? 'EMERGENCY' : normalizeIntent(data.intent);
  const rawSender = String(data.sender || 'AI').toLowerCase();
  const createdAt = data.createdAt || data.created_at;
  const createdDate = createdAt ? new Date(String(createdAt).replace(' ', 'T')) : null;

  return {
    id: data.messageId ?? data.message_id ?? data.id ?? Date.now(),
    sessionId: data.sessionId ?? data.session_id ?? fallbackSessionId,
    sender: rawSender === 'user' ? 'user' : 'ai',
    text: data.message ?? data.reply ?? '',
    intent,
    suggestedDept: mapSuggestedDept(data.suggestedDepartment || data.suggested_department),
    showBookingButton: Boolean(data.showBookingButton ?? data.show_booking_button),
    disclaimer: data.disclaimer || AI_DISCLAIMER_TEXT,
    timestamp:
      createdDate && !Number.isNaN(createdDate.getTime())
        ? createdDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : nowTime(),
  };
}

export const chatService = {
  /**
   * Gửi tin nhắn đến Chatbot y tế
   * @param {string} message - Nội dung tin nhắn
   * @param {string|number|null} sessionId - ID phiên chat hiện tại (nếu có)
   * @param {number|null} patientId - ID bệnh nhân (nếu đã đăng nhập)
   * @returns {Promise<object>} Phản hồi từ Chatbot
   */
  async sendMessage(message, sessionId = null, patientId = null) {
    const trimmed = (message || '').trim();
    if (!trimmed) {
      throw new Error('Nội dung tin nhắn không được để trống');
    }

    // Trong môi trường test (không có backend), chạy bộ luật cục bộ ngay lập tức
    if (import.meta.env?.MODE === 'test') {
      return chatService.processLocalFallback(trimmed, sessionId);
    }

    try {
      const res = await apiClient.post(
        '/chat/message',
        {
          message: trimmed,
          sessionId: sessionId ? Number(sessionId) : null,
          patientId: patientId ? Number(patientId) : null,
        },
        { timeout: CHAT_TIMEOUT_MS }
      );

      // apiClient trả về body ApiResponse { success, message, data } – nội dung chat nằm trong data
      const data = res?.data && typeof res.data === 'object' ? res.data : res;
      if (data && (data.message || data.reply)) {
        return { ...mapServerMessage(data, sessionId), sender: 'ai', source: 'api' };
      }
    } catch {
      // Backend / AI Service offline -> Chuyển sang bộ luật cục bộ
    }

    return chatService.processLocalFallback(trimmed, sessionId);
  },

  /**
   * Tạo phiên chat mới
   */
  async createSession(patientId = null) {
    try {
      const url = patientId ? `/chat/sessions?patientId=${patientId}` : '/chat/sessions';
      const res = await apiClient.post(url, {}, { timeout: CHAT_TIMEOUT_MS });
      return res.data || res;
    } catch {
      // Fallback
    }
    return {
      id: Date.now(),
      patientId,
      startedAt: new Date().toISOString(),
      messageCount: 0,
    };
  },

  /**
   * Lấy lịch sử tin nhắn của một phiên chat
   */
  async getSessionMessages(sessionId) {
    try {
      const res = await apiClient.get(`/chat/sessions/${sessionId}/messages`, { timeout: CHAT_TIMEOUT_MS });
      const list = Array.isArray(res?.data) ? res.data : res;
      return (Array.isArray(list) ? list : []).map(item => mapServerMessage(item, sessionId));
    } catch {
      // Return empty if offline
    }
    return [];
  },

  /**
   * Bộ luật cục bộ khi mất kết nối mạng
   */
  processLocalFallback(text, sessionId = null) {
    const lower = text.toLowerCase();
    let textReply = '';
    let intent = 'SYMPTOM_CHECK';
    let suggestedDept = null;
    let showBooking = false;

    // 1. Tình huống cấp cứu / dấu hiệu cờ đỏ
    if (RED_FLAG_TERMS.some(term => lower.includes(term))) {
      intent = 'EMERGENCY';
      textReply =
        '⚠️ **TÌNH HUỐNG KHẨN CẤP / CẦN XỬ TRÍ NGAY LẬP TỨC**\n\n' +
        'Các dấu hiệu bạn mô tả có thể là tình trạng cấp cứu nguy hiểm đến tính mạng.\n' +
        `• Vui lòng gọi ngay **${EMERGENCY_NUMBER}** hoặc di chuyển ngay đến **Khoa Cấp cứu Mỹ Phát Hospital** (1170 Quang Trung, Chũ, Lục Ngạn).\n` +
        `• Đường dây nóng cấp cứu: **${HOSPITAL_HOTLINE_DISPLAY}** (trực 24/7).\n` +
        '• Không tự ý uống thuốc hoặc chờ đợi tại nhà!';
      showBooking = false;
    }
    // 2. Chào hỏi
    else if (
      lower.includes('chào') ||
      lower.includes('hello') ||
      lower.includes('hi bạn') ||
      lower.includes('bạn là ai')
    ) {
      intent = 'GREETING';
      textReply =
        'Xin chào! Tôi là **Trợ lý AI Y tế Mỹ Phát Hospital**.\n\n' +
        'Tôi có thể hỗ trợ bạn:\n' +
        '• Tư vấn sơ bộ triệu chứng và gợi ý chuyên khoa khám\n' +
        '• Tra cứu giờ làm việc, thủ tục BHYT và viện phí\n' +
        `• Hướng dẫn đặt lịch khám trực tuyến hoặc gọi đường dây nóng ${HOSPITAL_HOTLINE_DISPLAY}\n\n` +
        'Bạn đang gặp vấn đề sức khỏe gì hoặc cần hỗ trợ thông tin nào?';
      showBooking = false;
    }
    // 3. BHYT
    else if (lower.includes('bhyt') || lower.includes('bảo hiểm') || lower.includes('thủ tục')) {
      intent = 'FAQ';
      textReply =
        'Mỹ Phát Hospital tiếp nhận khám chữa bệnh BHYT thông tuyến toàn quốc từ Thứ 2 đến Thứ 7 hàng tuần (theo giờ khám bệnh của bệnh viện). ' +
        'Quý khách chỉ cần mang theo CCCD gắn chip hoặc thẻ BHYT trên ứng dụng VssID khi đến làm thủ tục.';
      showBooking = true;
    }
    // 4. Giờ khám
    else if (lower.includes('giờ khám') || lower.includes('giờ làm việc') || lower.includes('mấy giờ')) {
      intent = 'FAQ';
      textReply =
        '⏰ **Lịch khám bệnh tại Mỹ Phát Hospital:**\n\n' +
        `• ${HOURS_TEXT.days}\n` +
        `• ${HOURS_TEXT.summer}\n` +
        `• ${HOURS_TEXT.winter}\n` +
        `• ${HOURS_TEXT.bhyt}\n` +
        `• ${HOURS_TEXT.emergency} (Đường dây nóng: ${HOSPITAL_HOTLINE_DISPLAY}).`;
      showBooking = true;
    }
    // 5. Đặt lịch
    else if (lower.includes('đặt lịch') || lower.includes('hẹn khám') || lower.includes('đăng ký khám')) {
      intent = 'BOOKING';
      textReply =
        'Quý khách có thể bấm nút "Đặt lịch khám" trên hệ thống để chọn bác sĩ và khung giờ theo ý muốn mà không cần phải chờ đợi xếp hàng.';
      showBooking = true;
    }
    // 6. Triệu chứng cụ thể
    else {
      intent = 'SYMPTOM_CHECK';
      const triage = triageService.triageSymptoms(text);
      if (triage && triage.deptName) {
        suggestedDept = {
          id: triage.deptId,
          name: triage.deptName,
          reason: triage.advice,
          priority: 'NORMAL',
        };
        textReply = `Dựa trên triệu chứng "${text}", hệ thống phân tích sơ bộ:\n\n• ${triage.advice}\n• Chuyên khoa khuyến nghị: ${triage.deptName}.`;
        showBooking = true;
      } else {
        textReply =
          'Cảm ơn quý khách đã chia sẻ thông tin. Để được chẩn đoán chính xác nhất, quý khách nên đến trực tiếp Bệnh viện để bác sĩ chuyên khoa thăm khám lâm sàng và chỉ định các xét nghiệm cần thiết.';
        suggestedDept = { id: 1, name: 'Khoa Khám bệnh / Cấp cứu ban đầu', reason: 'Khám sàng lọc ban đầu' };
        showBooking = true;
      }
    }

    return {
      id: Date.now() + 1,
      sessionId: sessionId || Date.now(),
      sender: 'ai',
      text: textReply,
      intent,
      suggestedDept,
      showBookingButton: showBooking,
      disclaimer: AI_DISCLAIMER_TEXT,
      timestamp: nowTime(),
      source: 'local_fallback',
    };
  },
};
