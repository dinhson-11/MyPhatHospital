import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessage from './ChatMessage';
import ChatHistory from './ChatHistory';
import { chatService, AI_DISCLAIMER_TEXT } from '../../services/chatService';

/**
 * ChatWidget Component (FR-10 – Sprint 7)
 * Cửa sổ chat AI nổi (Floating Action Button):
 * - Tương tác 2 chiều với AI Chatbot y tế
 * - Phân loại intent: SYMPTOM_CHECK / BOOKING / FAQ / OUT_OF_SCOPE / EMERGENCY
 * - Gợi ý chuyên khoa khám lâm sàng & nút "Đặt khám khoa này ngay"
 * - Quản lý phiên hội thoại & xem lại lịch sử phiên
 * - Tuân thủ NFR-8: Bắt buộc kèm disclaimer y tế
 */
export default function ChatWidget({ onOpenBooking }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI Bệnh viện Thanh Sơn. Tôi có thể hỗ trợ tư vấn sơ bộ triệu chứng, gợi ý chuyên khoa khám và giải đáp thắc mắc về dịch vụ y tế 24/7.',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      disclaimer: AI_DISCLAIMER_TEXT,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const QUICK_PROMPTS = [
    'Tôi bị đau đầu, chóng mặt và mất ngủ',
    'Bị ho khan nhiều ngày và đau rát cổ họng',
    'Đau quặn bụng dưới và đầy hơi khó tiêu',
    'Bệnh viện có khám BHYT vào cuối tuần không?',
  ];

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (isOpen && !showHistory && typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping, showHistory]);

  // Gửi tin nhắn đến AI Service / Backend
  const handleSendMessage = useCallback(
    async (textToSend = null) => {
      const text = (textToSend || inputText).trim();
      if (!text) return;

      const userMsg = {
        id: Date.now(),
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, userMsg]);
      if (!textToSend) setInputText('');
      setIsTyping(true);

      try {
        const response = await chatService.sendMessage(text, currentSessionId);
        if (response.sessionId && response.sessionId !== currentSessionId) {
          setCurrentSessionId(response.sessionId);
        }

        const aiMsg = {
          id: response.id || Date.now() + 1,
          sessionId: response.sessionId,
          sender: 'ai',
          text: response.text,
          intent: response.intent,
          suggestedDept: response.suggestedDept,
          showBookingButton: response.showBookingButton,
          disclaimer: response.disclaimer || AI_DISCLAIMER_TEXT,
          timestamp: response.timestamp || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages(prev => [...prev, aiMsg]);

        // Cập nhật tóm tắt danh sách phiên
        setSessions(prev => {
          const sessId = response.sessionId || currentSessionId || Date.now();
          const existing = prev.find(s => s.id === sessId);
          if (existing) {
            return prev.map(s =>
              s.id === sessId
                ? { ...s, lastMessage: text, messageCount: (s.messageCount || 1) + 2 }
                : s
            );
          }
          return [
            {
              id: sessId,
              startedAt: new Date().toISOString(),
              lastMessage: text,
              messageCount: 2,
            },
            ...prev,
          ];
        });
      } catch (err) {
        console.error('Lỗi gửi tin nhắn AI:', err);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 2,
            sender: 'ai',
            text: 'Xin lỗi, hệ thống đang gặp trục trặc khi kết nối. Quý khách vui lòng thử lại sau hoặc liên hệ hotline Bệnh viện: 0210.3872.115.',
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            disclaimer: AI_DISCLAIMER_TEXT,
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [inputText, currentSessionId]
  );

  // Tạo cuộc hội thoại mới
  const handleStartNewSession = () => {
    const newSessionId = Date.now();
    setCurrentSessionId(newSessionId);
    setMessages([
      {
        id: Date.now(),
        sender: 'ai',
        text: 'Xin chào! Cuộc hội thoại mới đã sẵn sàng. Quý khách đang gặp triệu chứng gì hoặc cần hỗ trợ thông tin y tế nào?',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        disclaimer: AI_DISCLAIMER_TEXT,
      },
    ]);
    setShowHistory(false);
  };

  // Chọn một phiên cũ từ lịch sử
  const handleSelectSession = async sessionId => {
    setCurrentSessionId(sessionId);
    setShowHistory(false);
    try {
      const history = await chatService.getSessionMessages(sessionId);
      if (history && history.length > 0) {
        setMessages(history);
      }
    } catch {
      // Giữ nguyên tin nhắn hiện tại nếu không load được
    }
  };

  const handleBooking = deptInfo => {
    setIsOpen(false);
    if (onOpenBooking) {
      onOpenBooking(deptInfo);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end">
      {/* Chat Popover Window */}
      {isOpen && (
        <div
          data-testid="ai-chat-window"
          className="w-[calc(100vw-2rem)] sm:w-[410px] h-[550px] max-h-[84vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden mb-3 animate-fade-in"
        >
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-700 via-primary to-emerald-800 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-xs">
                <span className="material-symbols-outlined text-[24px]">smart_toy</span>
              </div>
              <div>
                <h4 className="font-headline font-bold text-sm tracking-tight flex items-center gap-1.5">
                  <span>Trợ Lý Y Tế AI 24/7</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                </h4>
                <p className="text-[11px] text-emerald-100 font-label">Bệnh viện Đa khoa Thanh Sơn</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* History Toggle */}
              <button
                type="button"
                data-testid="btn-chat-history"
                onClick={() => setShowHistory(prev => !prev)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  showHistory ? 'bg-white/30 text-white' : 'hover:bg-white/20 text-white/80 hover:text-white'
                }`}
                title={showHistory ? 'Quay lại trò chuyện' : 'Xem lịch sử hội thoại'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showHistory ? 'chat' : 'history'}
                </span>
              </button>

              {/* New Session Button */}
              <button
                type="button"
                data-testid="btn-new-chat-session"
                onClick={handleStartNewSession}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Bắt đầu phiên mới"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Đóng chat"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Conditional Content: History vs Active Chat */}
          {showHistory ? (
            <ChatHistory
              sessions={sessions}
              currentSessionId={currentSessionId}
              onSelectSession={handleSelectSession}
              onNewSession={handleStartNewSession}
              onBack={() => setShowHistory(false)}
            />
          ) : (
            <>
              {/* Messages Body */}
              <div
                data-testid="chat-messages-container"
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 text-xs"
              >
                {messages.map(m => (
                  <ChatMessage
                    key={m.id}
                    message={m}
                    onOpenBooking={handleBooking}
                  />
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div
                    data-testid="ai-typing-indicator"
                    className="flex gap-2 items-center text-slate-400 text-xs pl-9"
                  >
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-[11px]">AI đang phân tích triệu chứng...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts */}
              <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-primary/10 hover:text-primary text-slate-600 text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  data-testid="chat-input"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Nhập triệu chứng hoặc câu hỏi y tế..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="submit"
                  aria-label="Gửi tin nhắn"
                  disabled={!inputText.trim()}
                  className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </button>
              </form>

              {/* Disclaimer Footer (NFR-8) */}
              <div className="px-3 py-1.5 bg-slate-50 text-[10px] text-slate-500 text-center border-t border-slate-100 italic">
                {AI_DISCLAIMER_TEXT} Trường hợp khẩn cấp gọi <strong>115</strong>.
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        type="button"
        id="fab-ai-chat"
        onClick={() => setIsOpen(prev => !prev)}
        className="group relative flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-gradient-to-r from-emerald-600 via-primary to-teal-700 text-white font-label font-bold text-sm shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-emerald-400/30"
        aria-label="Mở Trợ lý AI Y tế"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping absolute -top-0.5 -right-0.5"></span>
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5"></span>

        <span className="material-symbols-outlined text-[22px] transition-transform group-hover:rotate-12">
          smart_toy
        </span>
        <span className="hidden sm:inline">Hỏi AI Y tế 24/7</span>
      </button>
    </div>
  );
}
