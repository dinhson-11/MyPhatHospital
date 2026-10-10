import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ChatWidget from '../components/chat/ChatWidget';
import ChatMessage from '../components/chat/ChatMessage';
import ChatHistory from '../components/chat/ChatHistory';
import { chatService, AI_DISCLAIMER_TEXT, mapServerMessage } from '../services/chatService';
import apiClient from '../services/api';

describe('Sprint 7 – AI Chatbot Suite (FR-10 & NFR-8)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('chatService Unit Tests', () => {
    it('throws error on empty message', async () => {
      await expect(chatService.sendMessage('   ')).rejects.toThrow('không được để trống');
    });

    it('processes local fallback for EMERGENCY intent with 115 callout', () => {
      const res = chatService.processLocalFallback('Bệnh nhân khó thở dữ dội và ngất xỉu');
      expect(res.intent).toBe('EMERGENCY');
      expect(res.text).toContain('115');
      expect(res.showBookingButton).toBe(false);
      expect(res.disclaimer).toBe(AI_DISCLAIMER_TEXT);
    });

    it('processes local fallback for GREETING intent', () => {
      const res = chatService.processLocalFallback('Xin chào, bạn là ai?');
      expect(res.intent).toBe('GREETING');
      expect(res.text).toContain('Trợ lý AI Y tế');
    });

    it('processes local fallback for FAQ BHYT', () => {
      const res = chatService.processLocalFallback('Cho tôi hỏi thủ tục khám BHYT');
      expect(res.intent).toBe('FAQ');
      expect(res.text).toContain('BHYT');
      expect(res.showBookingButton).toBe(true);
    });

    it('processes local fallback for SYMPTOM_CHECK with department suggestion', () => {
      const res = chatService.processLocalFallback('Tôi bị đau ngực trái và hồi hộp tim');
      expect(res.intent).toBe('SYMPTOM_CHECK');
      expect(res.suggestedDept).not.toBeNull();
      expect(res.suggestedDept.name).toContain('Cấp cứu ban đầu');
      expect(res.showBookingButton).toBe(true);
    });

    it('processes local fallback for BOOKING intent', () => {
      const res = chatService.processLocalFallback('Tôi muốn đặt lịch hẹn khám bệnh');
      expect(res.intent).toBe('BOOKING');
      expect(res.showBookingButton).toBe(true);
    });
  });

  describe('ChatMessage Component', () => {
    it('renders user message correctly with sender styles', () => {
      const msg = {
        id: 1,
        sender: 'user',
        text: 'Tôi bị đau đầu 3 ngày nay',
        timestamp: '10:00',
      };
      render(<ChatMessage message={msg} onOpenBooking={() => {}} />);

      expect(screen.getByText('Tôi bị đau đầu 3 ngày nay')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    it('renders AI message with department card and action button', () => {
      const onBooking = vi.fn();
      const msg = {
        id: 2,
        sender: 'ai',
        text: 'Bạn nên đến khám tại Khoa Tim mạch.',
        suggestedDept: { id: 5, name: 'Khoa Tim mạch', priority: 'HIGH' },
        showBookingButton: true,
        disclaimer: AI_DISCLAIMER_TEXT,
        timestamp: '10:01',
      };
      render(<ChatMessage message={msg} onOpenBooking={onBooking} />);

      // Khoa AI gợi ý (Tim mạch - bộ khoa cũ) được quy về khoa thật của bệnh viện
      expect(screen.getByText('Khoa Khám bệnh / Cấp cứu ban đầu')).toBeInTheDocument();
      // Mức ưu tiên hiển thị tiếng Việt thay vì mã enum của backend
      expect(screen.getByText(/Ưu tiên: Cao/i)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(AI_DISCLAIMER_TEXT, 'i'))).toBeInTheDocument();

      const bookBtn = screen.getByTestId('btn-book-dept-chat');
      fireEvent.click(bookBtn);
      expect(onBooking).toHaveBeenCalledWith({ departmentId: 1 });
    });

    it('renders emergency message with 115 emergency callout', () => {
      const msg = {
        id: 3,
        sender: 'ai',
        text: 'Đây là tình huống khẩn cấp nguy hiểm.',
        intent: 'EMERGENCY',
        disclaimer: AI_DISCLAIMER_TEXT,
        timestamp: '10:02',
      };
      render(<ChatMessage message={msg} onOpenBooking={() => {}} />);

      expect(screen.getByText(/Cấp cứu 115/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Gọi ngay/i })).toHaveAttribute('href', 'tel:115');
    });
  });

  describe('ChatHistory Component', () => {
    it('renders empty history placeholder when no sessions exist', () => {
      render(
        <ChatHistory
          sessions={[]}
          currentSessionId={null}
          onSelectSession={() => {}}
          onNewSession={() => {}}
          onBack={() => {}}
        />
      );
      expect(screen.getByText(/Chưa có lịch sử hội thoại/i)).toBeInTheDocument();
    });

    it('renders session list and handles session selection and new session creation', () => {
      const onSelect = vi.fn();
      const onNew = vi.fn();
      const sessions = [
        {
          id: 101,
          startedAt: new Date().toISOString(),
          lastMessage: 'Tôi bị đau bụng',
          messageCount: 4,
        },
      ];

      render(
        <ChatHistory
          sessions={sessions}
          currentSessionId={101}
          onSelectSession={onSelect}
          onNewSession={onNew}
          onBack={() => {}}
        />
      );

      expect(screen.getByText(/Phiên #101/i)).toBeInTheDocument();
      expect(screen.getByText(/"Tôi bị đau bụng"/i)).toBeInTheDocument();
      expect(screen.getByText(/Đang mở/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText(/Phiên #101/i));
      expect(onSelect).toHaveBeenCalledWith(101);

      fireEvent.click(screen.getByRole('button', { name: /Phiên mới/i }));
      expect(onNew).toHaveBeenCalled();
    });
  });

  describe('ChatWidget Full Integration', () => {
    it('renders floating action button and opens modal with initial greeting', () => {
      render(<ChatWidget onOpenBooking={() => {}} />);
      const fab = screen.getByRole('button', { name: /Mở Trợ lý AI Y tế/i });
      expect(fab).toBeInTheDocument();

      fireEvent.click(fab);
      expect(screen.getByTestId('ai-chat-window')).toBeInTheDocument();
      expect(screen.getByText(/Trợ Lý Y Tế AI 24\/7/i)).toBeInTheDocument();
      expect(screen.getByText(/Tôi là Trợ lý AI Mỹ Phát Hospital/i)).toBeInTheDocument();
    });

    it('sends message and updates conversation with AI response', async () => {
      render(<ChatWidget onOpenBooking={() => {}} />);
      const fab = screen.getByRole('button', { name: /Mở Trợ lý AI Y tế/i });
      fireEvent.click(fab);

      const input = screen.getByTestId('chat-input');
      const submitBtn = screen.getByRole('button', { name: /Gửi tin nhắn/i });

      fireEvent.change(input, { target: { value: 'Tôi bị đau ngực trái và khó thở' } });
      fireEvent.click(submitBtn);

      expect(screen.getByText('Tôi bị đau ngực trái và khó thở')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/Chuyên khoa khuyến nghị:/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('toggles session history view', () => {
      render(<ChatWidget onOpenBooking={() => {}} />);
      const fab = screen.getByRole('button', { name: /Mở Trợ lý AI Y tế/i });
      fireEvent.click(fab);

      const historyBtn = screen.getByTestId('btn-chat-history');
      fireEvent.click(historyBtn);

      expect(screen.getByText(/Quay lại chat/i)).toBeInTheDocument();

      const backBtn = screen.getByText(/Quay lại chat/i);
      fireEvent.click(backBtn);
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    it('chat window is an accessible dialog with a live log, labelled suggestions and Esc to close', () => {
      render(<ChatWidget onOpenBooking={() => {}} />);
      const fab = screen.getByRole('button', { name: /Mở Trợ lý AI Y tế/i });
      expect(fab).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(fab);
      expect(fab).toHaveAttribute('aria-expanded', 'true');

      expect(screen.getByRole('dialog', { name: /Trợ Lý Y Tế AI 24\/7/i })).toBeInTheDocument();
      const log = screen.getByRole('log', { name: /Nội dung trò chuyện/i });
      expect(log).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByLabelText(/Tin nhắn gửi Trợ lý AI/i)).toBe(screen.getByTestId('chat-input'));

      const chips = within(screen.getByRole('group', { name: /Câu hỏi gợi ý/i })).getAllByRole('button');
      expect(chips).toHaveLength(4);
      chips.forEach(chip => expect(chip.className).not.toMatch(/text-\[(9|10|11)px\]/));

      expect(screen.getByRole('button', { name: /Đóng cửa sổ trò chuyện/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Xem lịch sử hội thoại/i })).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('ai-chat-window')).not.toBeInTheDocument();
      expect(fab).toHaveFocus();
    });

    it('shows the emergency banner in the conversation for red-flag symptoms', async () => {
      render(<ChatWidget onOpenBooking={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /Mở Trợ lý AI Y tế/i }));

      fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Bố tôi đột nhiên co giật và méo miệng' } });
      fireEvent.click(screen.getByRole('button', { name: /Gửi tin nhắn/i }));

      const alert = await screen.findByRole('alert');
      expect(within(alert).getByRole('link', { name: /Gọi ngay/i })).toHaveAttribute('href', 'tel:115');
      expect(within(alert).getByRole('link', { name: /0789 065 493/ })).toHaveAttribute('href', 'tel:0789065493');
    });
  });

  describe('EMERGENCY intent handling', () => {
    const emergencyMsg = (extra = {}) => ({
      id: 30,
      sender: 'ai',
      text: 'Các dấu hiệu bạn mô tả có thể là tình trạng cấp cứu.',
      intent: 'EMERGENCY',
      disclaimer: AI_DISCLAIMER_TEXT,
      timestamp: '10:05',
      ...extra,
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('renders a role="alert" banner with both the 115 and hospital hotline links', () => {
      render(<ChatMessage message={emergencyMsg()} onOpenBooking={() => {}} />);

      const alert = screen.getByRole('alert');
      expect(alert.className).toMatch(/red/);
      expect(within(alert).getByText(/Cấp cứu 115/i)).toBeInTheDocument();
      expect(within(alert).getByRole('link', { name: /Gọi ngay/i })).toHaveAttribute('href', 'tel:115');
      const hotline = within(alert).getByRole('link', { name: /0789 065 493/ });
      expect(hotline).toHaveAttribute('href', 'tel:0789065493');
    });

    it('keeps booking as a secondary action below the emergency banner', () => {
      const onBooking = vi.fn();
      render(
        <ChatMessage
          message={emergencyMsg({ suggestedDept: { id: 1, name: 'Khoa Khám bệnh / Cấp cứu ban đầu' }, showBookingButton: true })}
          onOpenBooking={onBooking}
        />
      );

      const alert = screen.getByRole('alert');
      const bookBtn = screen.getByTestId('btn-book-dept-chat');
      expect(bookBtn.className).toMatch(/btn-secondary/);
      expect(bookBtn.className).not.toMatch(/btn-primary/);
      expect(bookBtn).not.toHaveTextContent(/Đặt khám khoa này ngay/i);
      // Băng cảnh báo đứng trước nút đặt lịch trong thứ tự đọc
      expect(alert.compareDocumentPosition(bookBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('does not render the emergency banner for normal answers', () => {
      render(<ChatMessage message={emergencyMsg({ intent: 'FAQ' })} onOpenBooking={() => {}} />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('maps intent EMERGENCY from the backend /chat/message response', async () => {
      vi.stubEnv('MODE', 'development');
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
        success: true,
        message: 'OK',
        data: {
          messageId: 901,
          sessionId: 42,
          sender: 'AI',
          // Câu không chứa từ khóa cờ đỏ cục bộ → intent phải đến từ backend
          message: 'Đau đầu dữ dội đột ngột cần được cấp cứu ngay.',
          intent: 'EMERGENCY',
          suggestedDepartment: null,
          showBookingButton: false,
          disclaimer: AI_DISCLAIMER_TEXT,
          createdAt: '2026-10-10 08:30:00',
        },
      });

      const res = await chatService.sendMessage('Tôi đau đầu dữ dội như sét đánh', 7);

      expect(postSpy).toHaveBeenCalledWith(
        '/chat/message',
        { message: 'Tôi đau đầu dữ dội như sét đánh', sessionId: 7, patientId: null },
        expect.objectContaining({ timeout: expect.any(Number) })
      );
      // Thời gian chờ phải dài hơn timeout 3 giây của backend khi gọi AI Service
      expect(postSpy.mock.calls[0][2].timeout).toBeGreaterThan(3000);
      expect(res.source).toBe('api');
      expect(res.intent).toBe('EMERGENCY');
      expect(res.id).toBe(901);
      expect(res.sessionId).toBe(42);
      expect(res.sender).toBe('ai');
      expect(res.showBookingButton).toBe(false);
      expect(res.text).toContain('cấp cứu ngay');
    });

    it('falls back to the local engine when the backend is unreachable', async () => {
      vi.stubEnv('MODE', 'development');
      vi.spyOn(apiClient, 'post').mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));

      const res = await chatService.sendMessage('Bệnh nhân bất tỉnh không gọi được');
      expect(res.source).toBe('local_fallback');
      expect(res.intent).toBe('EMERGENCY');
    });

    it('normalizes intent casing and emergency flags from the server', () => {
      expect(mapServerMessage({ message: 'x', intent: ' emergency ' }).intent).toBe('EMERGENCY');
      expect(mapServerMessage({ message: 'x', intent: 'SYMPTOM_CHECK', is_emergency: true }).intent).toBe('EMERGENCY');
      expect(mapServerMessage({ message: 'x', intent: 'faq' }).intent).toBe('FAQ');
    });

    it('keeps intent when reloading a session history', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue({
        success: true,
        data: [
          { messageId: 1, sessionId: 3, sender: 'USER', message: 'Tôi bị ngất', intent: null },
          { messageId: 2, sessionId: 3, sender: 'AI', message: 'Gọi 115 ngay', intent: 'EMERGENCY' },
        ],
      });

      const history = await chatService.getSessionMessages(3);
      expect(history).toHaveLength(2);
      expect(history[0].sender).toBe('user');
      expect(history[1].sender).toBe('ai');
      expect(history[1].intent).toBe('EMERGENCY');
    });
  });
});
