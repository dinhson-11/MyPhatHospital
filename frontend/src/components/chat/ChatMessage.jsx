import React from 'react';
import { resolveHospitalDepartment } from '../../services/dataService';

/**
 * ChatMessage Component (FR-10 – Sprint 7)
 * Hiển thị từng bong bóng tin nhắn:
 * - Phân biệt tin nhắn Người dùng / AI với avatar & bubble style
 * - Hỗ trợ format text phong phú (markdown cơ bản: in đậm, xuống dòng, gạch đầu dòng)
 * - Thẻ gợi ý chuyên khoa nổi bật với nút "Đặt lịch khám khoa này"
 * - Cảnh báo khẩn cấp khi vượt phạm vi (gọi 115)
 * - Disclaimer y tế NFR-8
 */
export default function ChatMessage({ message, onOpenBooking }) {
  const isUser = message.sender === 'user';
  const isEmergency = message.intent === 'EMERGENCY';
  const hospitalDept = message.suggestedDept ? resolveHospitalDepartment(message.suggestedDept) : null;

  // Format nội dung tin nhắn với hỗ trợ in đậm và bullet points cơ bản
  const formatText = text => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      // Dấu gạch đầu dòng
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      const cleanLine = isBullet ? line.replace(/^[\s•-]+/, '').trim() : line;

      // Xử lý **in đậm**
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={lineIdx} className="flex items-start gap-1.5 ml-1 my-0.5">
            <span className="text-primary font-bold text-[12px] leading-tight">•</span>
            <span className="flex-1">{renderedParts}</span>
          </div>
        );
      }

      return (
        <p key={lineIdx} className={line.trim() === '' ? 'h-2' : 'my-0.5'}>
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <div
      data-testid={`chat-message-${message.id}`}
      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
            isEmergency
              ? 'bg-rose-100 text-rose-600 border border-rose-200'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isEmergency ? 'emergency' : 'smart_toy'}
          </span>
        </div>
      )}

      {/* Message Content Bubble */}
      <div
        className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 space-y-2.5 transition-all text-xs leading-relaxed ${
          isUser
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-tr-xs shadow-xs'
            : isEmergency
              ? 'bg-rose-50 text-slate-800 border border-rose-200 rounded-tl-xs shadow-xs'
              : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs shadow-xs'
        }`}
      >
        {/* Formatted Text */}
        <div className="space-y-0.5">{formatText(message.text)}</div>

        {/* Emergency Escalate Callout */}
        {isEmergency && (
          <div className="p-2.5 rounded-xl bg-rose-100/80 border border-rose-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-rose-800 font-bold">
              <span className="material-symbols-outlined text-[18px]">call</span>
              <span>Cấp cứu 115</span>
            </div>
            <a
              href="tel:115"
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-xs transition-colors"
            >
              Gọi ngay
            </a>
          </div>
        )}

        {/* Suggested Department Card */}
        {message.suggestedDept && (
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <div className="flex items-center justify-between bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">
                  local_hospital
                </span>
                <span>{hospitalDept.name}</span>
              </div>
              {message.suggestedDept.priority && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    message.suggestedDept.priority === 'HIGH'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  Ưu tiên: {message.suggestedDept.priority}
                </span>
              )}
            </div>

            {onOpenBooking && (
              <button
                type="button"
                data-testid="btn-book-dept-chat"
                onClick={() => onOpenBooking({ departmentId: hospitalDept.id })}
                className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                <span>Đặt khám khoa này ngay</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            )}
          </div>
        )}

        {/* Standalone Booking Button */}
        {!message.suggestedDept && message.showBookingButton && onOpenBooking && (
          <div className="pt-1 border-t border-slate-100">
            <button
              type="button"
              data-testid="btn-book-chat"
              onClick={() => onOpenBooking({})}
              className="w-full py-1.5 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">calendar_month</span>
              <span>Đặt lịch khám bệnh</span>
            </button>
          </div>
        )}

        {/* NFR-8 Disclaimer Note */}
        {!isUser && message.disclaimer && (
          <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100/60 leading-tight">
            * {message.disclaimer}
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`text-[9px] text-right ${
            isUser ? 'text-emerald-100' : 'text-slate-400'
          }`}
        >
          {message.timestamp}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-[11px] font-bold">
          <span className="material-symbols-outlined text-[16px]">person</span>
        </div>
      )}
    </div>
  );
}
