import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatWidget from '../components/chat/ChatWidget';
import ChatMessage from '../components/chat/ChatMessage';
import ChatHistory from '../components/chat/ChatHistory';
import { chatService, AI_DISCLAIMER_TEXT } from '../services/chatService';

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
      expect(res.suggestedDept.name).toContain('Tim mạch');
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

      expect(screen.getByText('Khoa Tim mạch')).toBeInTheDocument();
      expect(screen.getByText(/Ưu tiên: HIGH/i)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(AI_DISCLAIMER_TEXT, 'i'))).toBeInTheDocument();

      const bookBtn = screen.getByTestId('btn-book-dept-chat');
      fireEvent.click(bookBtn);
      expect(onBooking).toHaveBeenCalledWith({ departmentId: 5 });
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
      expect(screen.getByText(/Tôi là Trợ lý AI Bệnh viện Thanh Sơn/i)).toBeInTheDocument();
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
  });
});
