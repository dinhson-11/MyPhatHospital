import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import ChatMessage from './ChatMessage';
import ChatHistory from './ChatHistory';
import { chatService, AI_DISCLAIMER_TEXT, EMERGENCY_NUMBER } from '../../services/chatService';
import { useEscapeKey } from '../../hooks/useEscapeKey';

/**
 * ChatWidget – cửa sổ Trợ lý AI y tế nổi (nút tròn góc phải dưới):
 * - Trò chuyện 2 chiều với AI, phân loại intent (SYMPTOM_CHECK / BOOKING / FAQ / OUT_OF_SCOPE / EMERGENCY)
 * - Gợi ý chuyên khoa & nút đặt lịch, cảnh báo cấp cứu khi có dấu hiệu cờ đỏ
 * - Quản lý phiên hội thoại & xem lại lịch sử
 * - Truy cập bằng bàn phím: Esc đóng cửa sổ, focus trả về nút mở
 */

const QUICK_PROMPTS = [
  'Tôi bị đau đầu, chóng mặt và mất ngủ',
  'Bị ho khan nhiều ngày và đau rát cổ họng',
  'Đau quặn bụng dưới và đầy hơi khó tiêu',
  'Bệnh viện có khám BHYT vào cuối tuần không?',
];

const nowTime = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const aiNotice = (id, text) => ({
  id,
  sender: 'ai',
  text,
  timestamp: nowTime(),
  disclaimer: AI_DISCLAIMER_TEXT,
});

export default function ChatWidget({ onOpenBooking }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState(() => [
    aiNotice(
      1,
      'Xin chào! Tôi là Trợ lý AI Mỹ Phát Hospital. Tôi có thể hỗ trợ tư vấn sơ bộ triệu chứng, gợi ý chuyên khoa khám và giải đáp thắc mắc về dịch vụ y tế 24/7.'
    ),
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fabRef = useRef(null);

  const windowId = useId();
  const titleId = useId();
  const inputId = useId();

  // Đóng cửa sổ và trả focus về nút mở (dùng cho nút Đóng và phím Esc)
  const closeChat = useCallback(() => {
    fabRef.current?.focus();
    setIsOpen(false);
  }, []);

  useEscapeKey(isOpen, closeChat);

  // Đưa con trỏ vào ô nhập khi mở cửa sổ hoặc quay lại từ lịch sử
  useEffect(() => {
    if (isOpen && !showHistory) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen, showHistory]);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (isOpen && !showHistory && typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isOpen, isTyping, showHistory]);

  // Gửi tin nhắn đến AI Service / Backend
  const handleSendMessage = useCallback(
    async (textToSend = null) => {
      const text = (textToSend || inputText).trim();
      if (!text || isTyping) return;

      const userMsg = {
        id: Date.now(),
        sender: 'user',
        text,
        timestamp: nowTime(),
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
          timestamp: response.timestamp || nowTime(),
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
          aiNotice(
            Date.now() + 2,
            'Xin lỗi, hệ thống đang gặp trục trặc khi kết nối. Quý khách vui lòng thử lại sau hoặc liên hệ đường dây nóng Mỹ Phát Hospital: 0789 065 493.'
          ),
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [inputText, currentSessionId, isTyping]
  );

  // Tạo cuộc hội thoại mới
  const handleStartNewSession = () => {
    const newSessionId = Date.now();
    setCurrentSessionId(newSessionId);
    setMessages([
      aiNotice(
        newSessionId,
        'Xin chào! Cuộc hội thoại mới đã sẵn sàng. Quý khách đang gặp triệu chứng gì hoặc cần hỗ trợ thông tin y tế nào?'
      ),
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
      // Giữ nguyên tin nhắn hiện tại nếu không tải được
    }
  };

  const handleBooking = deptInfo => {
    setIsOpen(false);
    if (onOpenBooking) {
      onOpenBooking(deptInfo);
    }
  };

  const headerBtnClass =
    'w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70';

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end">
      {/* Cửa sổ trò chuyện */}
      {isOpen && (
        <div
          id={windowId}
          data-testid="ai-chat-window"
          role="dialog"
          aria-labelledby={titleId}
          className="w-[calc(100vw-2rem)] sm:w-[410px] h-[560px] max-h-[calc(100dvh_-_7rem)] bg-white rounded-2xl shadow-pop border border-slate-200 flex flex-col overflow-hidden mb-3 animate-fade-in"
        >
          {/* Header */}
          <div className="px-3.5 py-3 bg-primary text-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shrink-0"
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-[24px]">smart_toy</span>
              </div>
              <div className="min-w-0">
                <h2 id={titleId} className="font-headline font-bold text-sm tracking-tight">
                  Trợ Lý Y Tế AI 24/7
                </h2>
                <p className="text-xs text-white/80 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true"></span>
                  <span>Mỹ Phát Hospital · Đang trực tuyến</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                data-testid="btn-chat-history"
                onClick={() => setShowHistory(prev => !prev)}
                aria-pressed={showHistory}
                aria-label={showHistory ? 'Quay lại trò chuyện' : 'Xem lịch sử hội thoại'}
                title={showHistory ? 'Quay lại trò chuyện' : 'Xem lịch sử hội thoại'}
                className={`${headerBtnClass} ${
                  showHistory ? 'bg-white/25 text-white' : 'hover:bg-white/15 text-white/85 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  {showHistory ? 'chat' : 'history'}
                </span>
              </button>

              <button
                type="button"
                data-testid="btn-new-chat-session"
                onClick={handleStartNewSession}
                aria-label="Bắt đầu cuộc trò chuyện mới"
                title="Bắt đầu cuộc trò chuyện mới"
                className={`${headerBtnClass} hover:bg-white/15 text-white/85 hover:text-white`}
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add_comment</span>
              </button>

              <button
                type="button"
                onClick={closeChat}
                aria-label="Đóng cửa sổ trò chuyện"
                title="Đóng (Esc)"
                className={`${headerBtnClass} hover:bg-white/15 text-white/85 hover:text-white`}
              >
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">close</span>
              </button>
            </div>
          </div>

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
              {/* Nội dung hội thoại */}
              <div
                data-testid="chat-messages-container"
                role="log"
                aria-live="polite"
                aria-label="Nội dung trò chuyện"
                tabIndex={0}
                className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
              >
                {messages.map(m => (
                  <ChatMessage key={m.id} message={m} onOpenBooking={handleBooking} />
                ))}

                {isTyping && (
                  <div data-testid="ai-typing-indicator" className="flex gap-1.5 items-center text-slate-500 text-xs pl-10">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" aria-hidden="true"></span>
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" aria-hidden="true"></span>
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" aria-hidden="true"></span>
                    <span className="ml-1">AI đang phân tích triệu chứng...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Câu hỏi gợi ý */}
              <div
                role="group"
                aria-label="Câu hỏi gợi ý"
                className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto flex gap-1.5 shrink-0"
              >
                {QUICK_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isTyping}
                    className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-primary hover:bg-primary-fixed hover:text-primary text-slate-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Ô nhập tin nhắn */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
              >
                <label htmlFor={inputId} className="sr-only">
                  Tin nhắn gửi Trợ lý AI
                </label>
                <input
                  ref={inputRef}
                  id={inputId}
                  type="text"
                  data-testid="chat-input"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Nhập triệu chứng hoặc câu hỏi y tế..."
                  autoComplete="off"
                  maxLength={1000}
                  className="flex-1 min-w-0 h-10 px-3 text-base sm:text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                />
                <button
                  type="submit"
                  aria-label="Gửi tin nhắn"
                  title="Gửi tin nhắn"
                  disabled={!inputText.trim() || isTyping}
                  className="w-10 h-10 rounded-lg bg-primary hover:bg-primary-dark text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">send</span>
                </button>
              </form>

              {/* Disclaimer y tế */}
              <p className="px-3 py-2 bg-slate-50 text-xs text-slate-600 text-center border-t border-slate-100 leading-snug">
                {AI_DISCLAIMER_TEXT} Trường hợp khẩn cấp gọi{' '}
                <a
                  href={`tel:${EMERGENCY_NUMBER}`}
                  className="font-bold text-red-700 underline underline-offset-2 hover:text-red-800"
                >
                  {EMERGENCY_NUMBER}
                </a>
                .
              </p>
            </>
          )}
        </div>
      )}

      {/* Nút mở Trợ lý AI */}
      <button
        ref={fabRef}
        type="button"
        id="fab-ai-chat"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Mở Trợ lý AI Y tế (Hỏi AI Y tế 24/7)"
        aria-expanded={isOpen}
        aria-controls={isOpen ? windowId : undefined}
        className="relative flex items-center gap-2 h-12 px-4 sm:px-5 rounded-full bg-primary hover:bg-primary-dark text-white font-label font-semibold text-sm shadow-pop transition-colors cursor-pointer border border-white/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
      >
        <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
          {isOpen ? 'close' : 'forum'}
        </span>
        <span className="hidden sm:inline">Hỏi AI Y tế 24/7</span>
        <span
          className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white/70"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
