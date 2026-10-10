/**
 * Chatbot Service – Kết nối API Backend & AI Service (FR-10 – Sprint 7)
 * Cung cấp:
 * - Gửi/nhận tin nhắn hội thoại với AI
 * - Quản lý phiên chat (session)
 * - Fallback thông minh cục bộ khi mất kết nối mạng
 * - Tuân thủ NFR-8: Disclaimer y tế bắt buộc
 */

import apiClient from './api';
import { triageService } from './triageService';

export const AI_DISCLAIMER_TEXT =
  'Trợ lý AI chỉ hỗ trợ tư vấn sơ bộ, không thay thế thăm khám và chỉ định của bác sĩ.';

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

    // Trong môi trường test hoặc không có backend dev, chạy fallback đồng bộ/tức thì
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
        { timeout: 1500 }
      );

      const data = res.data || res;
      if (data && (data.message || data.reply)) {
        const dept = data.suggestedDepartment || data.suggested_department;
        return {
          id: data.messageId || Date.now(),
          sessionId: data.sessionId,
          sender: 'ai',
          text: data.message || data.reply,
          intent: data.intent,
          suggestedDept: dept
            ? {
                id: dept.dept_id || dept.deptId || dept.id,
                name: dept.dept_name || dept.deptName || dept.name,
                reason: dept.reason,
                priority: dept.priority,
              }
            : null,
          showBookingButton: Boolean(data.showBookingButton ?? data.show_booking_button),
          disclaimer: data.disclaimer || AI_DISCLAIMER_TEXT,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          source: 'api',
        };
      }
    } catch {
      // Backend / AI Service offline -> Chuyển sang Local Fallback
    }

    // Local Fallback Engine
    return chatService.processLocalFallback(trimmed, sessionId);
  },

  /**
   * Tạo phiên chat mới
   */
  async createSession(patientId = null) {
    try {
      const url = patientId ? `/chat/sessions?patientId=${patientId}` : '/chat/sessions';
      const res = await apiClient.post(url, {}, { timeout: 1500 });
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
      const res = await apiClient.get(`/chat/sessions/${sessionId}/messages`, { timeout: 1500 });
      const list = res.data || res;
      return (list || []).map(item => ({
        id: item.messageId || item.id,
        sessionId: item.sessionId,
        sender: (item.sender || '').toLowerCase() === 'user' ? 'user' : 'ai',
        text: item.message,
        intent: item.intent,
        suggestedDept: item.suggestedDepartment
          ? {
              id: item.suggestedDepartment.dept_id || item.suggestedDepartment.deptId,
              name: item.suggestedDepartment.dept_name || item.suggestedDepartment.deptName,
            }
          : null,
        showBookingButton: Boolean(item.showBookingButton),
        disclaimer: item.disclaimer || AI_DISCLAIMER_TEXT,
        timestamp: item.createdAt
          ? new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }));
    } catch {
      // Return empty if offline
    }
    return [];
  },

  /**
   * Local Rule-based Fallback khi mất kết nối mạng
   */
  processLocalFallback(text, sessionId = null) {
    const lower = text.toLowerCase();
    let textReply = '';
    let intent = 'SYMPTOM_CHECK';
    let suggestedDept = null;
    let showBooking = false;

    // 1. Tình huống cấp cứu / Vượt phạm vi tư vấn
    if (
      lower.includes('cấp cứu') ||
      lower.includes('ngất') ||
      lower.includes('bất tỉnh') ||
      lower.includes('khó thở dữ dội') ||
      lower.includes('co giật') ||
      lower.includes('đột quỵ') ||
      lower.includes('nôn ra máu')
    ) {
      intent = 'EMERGENCY';
      textReply =
        '⚠️ **TÌNH HUỐNG KHẨN CẤP / CẦN XỬ TRÍ NGAY LẬP TỨC**\n\n' +
        'Các dấu hiệu bạn mô tả có thể là tình trạng cấp cứu nguy hiểm đến tính mạng.\n' +
        '• Vui lòng gọi ngay **115** hoặc di chuyển ngay đến **Khoa Cấp cứu Mỹ Phát Hospital** (1170 Quang Trung, Chũ, Lục Ngạn).\n' +
        '• Hotline cấp cứu: **0789 065 493** (trực 24/7).\n' +
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
        '• Hướng dẫn đặt lịch khám trực tuyến hoặc gọi hotline 0789 065 493\n\n' +
        'Bạn đang gặp vấn đề sức khỏe gì hoặc cần hỗ trợ thông tin nào?';
      showBooking = false;
    }
    // 3. BHYT
    else if (lower.includes('bhyt') || lower.includes('bảo hiểm') || lower.includes('thủ tục')) {
      intent = 'FAQ';
      textReply =
        'Mỹ Phát Hospital tiếp nhận khám chữa bệnh BHYT thông tuyến toàn quốc từ Thứ 2 đến Chủ Nhật hàng tuần (7h00 - 17h30). ' +
        'Quý khách chỉ cần mang theo CCCD gắn chip hoặc thẻ BHYT trên ứng dụng VssID khi đến làm thủ tục.';
      showBooking = true;
    }
    // 4. Giờ khám
    else if (lower.includes('giờ khám') || lower.includes('giờ làm việc') || lower.includes('mấy giờ')) {
      intent = 'FAQ';
      textReply =
        '⏰ **Lịch khám bệnh tại Mỹ Phát Hospital:**\n\n' +
        '• Thứ 2 – Chủ Nhật: 07h00 – 11h30 (sáng) | 13h30 – 17h30 (chiều)\n' +
        '• Khám BHYT và dịch vụ theo yêu cầu hàng ngày\n' +
        '• Cấp cứu hoạt động 24/24 tất cả các ngày trong tuần (Hotline: 0789 065 493).';
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
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      source: 'local_fallback',
    };
  },
};
