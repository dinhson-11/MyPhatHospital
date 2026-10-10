import React from 'react';
import { resolveHospitalDepartment } from '../../services/dataService';
import {
  EMERGENCY_NUMBER,
  HOSPITAL_HOTLINE,
  HOSPITAL_HOTLINE_DISPLAY,
} from '../../services/chatService';

/**
 * ChatMessage – một bong bóng tin nhắn trong cửa sổ Trợ lý AI:
 * - Phân biệt tin nhắn người dùng / AI (kèm nhãn ẩn cho trình đọc màn hình)
 * - Định dạng văn bản cơ bản: **in đậm**, xuống dòng, gạch đầu dòng
 * - Thẻ gợi ý chuyên khoa kèm nút đặt lịch
 * - Intent EMERGENCY: băng cảnh báo cấp cứu (gọi 115 + đường dây nóng bệnh viện),
 *   khi đó đặt lịch khám chỉ là thao tác phụ
 * - Disclaimer y tế
 */

const PRIORITY_LABELS = {
  URGENT: 'Khẩn',
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  NORMAL: 'Thường',
  LOW: 'Thấp',
};

const priorityLabel = priority =>
  PRIORITY_LABELS[String(priority || '').toUpperCase()] || String(priority);

function renderInline(text, strongClass) {
  return text.split(/(\*\*.*?\*\*)/g).map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className={strongClass}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function FormattedText({ text, isUser }) {
  if (!text) return null;
  const strongClass = isUser ? 'font-semibold' : 'font-semibold text-slate-900';
  return text.split('\n').map((line, lineIdx) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith('•') || trimmed.startsWith('- ');
    if (isBullet) {
      const cleanLine = line.replace(/^[\s•-]+/, '').trim();
      return (
        <div key={lineIdx} className="flex items-start gap-1.5 ml-1 my-0.5">
          <span className={`font-bold leading-snug ${isUser ? 'text-white' : 'text-primary'}`} aria-hidden="true">
            •
          </span>
          <span className="flex-1">{renderInline(cleanLine, strongClass)}</span>
        </div>
      );
    }
    return (
      <p key={lineIdx} className={trimmed === '' ? 'h-2' : 'my-0.5'}>
        {renderInline(line, strongClass)}
      </p>
    );
  });
}

function EmergencyBanner() {
  return (
    <div role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-3 space-y-2.5">
      <div className="flex items-start gap-2 text-red-800">
        <span className="material-symbols-outlined text-[22px] text-red-700 shrink-0" aria-hidden="true">
          emergency
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-snug">Dấu hiệu cần cấp cứu</p>
          <p className="text-xs mt-0.5 leading-snug">
            Hãy gọi cấp cứu ngay. Không tự dùng thuốc hoặc chờ đợi tại nhà.
          </p>
        </div>
      </div>

      <a
        href={`tel:${EMERGENCY_NUMBER}`}
        className="flex items-center justify-center gap-2 w-full min-h-[44px] px-3 rounded-lg bg-red-700 hover:bg-red-800 text-white text-sm font-bold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">call</span>
        <span>Gọi ngay</span>{' '}
        <span>Cấp cứu {EMERGENCY_NUMBER}</span>
      </a>

      <a
        href={`tel:${HOSPITAL_HOTLINE}`}
        className="flex items-center justify-center gap-2 w-full min-h-[44px] px-3 rounded-lg border border-red-300 bg-white hover:bg-red-100 text-red-800 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">local_hospital</span>
        <span>
          Đường dây nóng bệnh viện: <strong className="whitespace-nowrap">{HOSPITAL_HOTLINE_DISPLAY}</strong>
        </span>
      </a>
    </div>
  );
}

export default function ChatMessage({ message, onOpenBooking }) {
  const isUser = message.sender === 'user';
  const isEmergency = !isUser && String(message.intent || '').toUpperCase() === 'EMERGENCY';
  const hospitalDept = message.suggestedDept ? resolveHospitalDepartment(message.suggestedDept) : null;
  const priority = message.suggestedDept?.priority;
  const isHighPriority = ['HIGH', 'URGENT'].includes(String(priority || '').toUpperCase());

  // Khi cấp cứu, nút đặt lịch chỉ là thao tác phụ (không được nổi bật hơn nút gọi 115)
  const bookingBtnClass = isEmergency ? 'btn btn-secondary btn-sm w-full' : 'btn btn-primary btn-sm w-full';
  const bookingLabel = isEmergency ? 'Đặt lịch khám thường' : null;

  return (
    <div
      data-testid={`chat-message-${message.id}`}
      className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Ảnh đại diện AI */}
      {!isUser && (
        <div
          aria-hidden="true"
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
            isEmergency
              ? 'bg-red-100 text-red-700 border-red-200'
              : 'bg-primary-fixed text-primary border-primary-fixed-dim'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isEmergency ? 'emergency' : 'smart_toy'}
          </span>
        </div>
      )}

      {/* Bong bóng nội dung */}
      <div
        className={`min-w-0 rounded-2xl p-3 space-y-2.5 text-sm leading-relaxed ${
          isUser
            ? 'max-w-[85%] bg-primary text-white rounded-tr-lg shadow-sm'
            : isEmergency
              ? 'max-w-[92%] bg-white text-slate-800 border border-red-200 rounded-tl-lg shadow-sm'
              : 'max-w-[85%] bg-white text-slate-800 border border-slate-200 rounded-tl-lg shadow-xs'
        }`}
      >
        <span className="sr-only">{isUser ? 'Bạn: ' : 'Trợ lý AI: '}</span>

        {/* Cảnh báo cấp cứu đặt trên cùng để nổi bật nhất */}
        {isEmergency && <EmergencyBanner />}

        <div className="space-y-0.5 break-words">
          <FormattedText text={message.text} isUser={isUser} />
        </div>

        {/* Thẻ gợi ý chuyên khoa */}
        {hospitalDept && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div
              className={`flex items-start justify-between gap-2 p-2.5 rounded-xl border ${
                isEmergency ? 'bg-slate-50 border-slate-200' : 'bg-primary-fixed border-primary-fixed-dim'
              }`}
            >
              <div className="flex items-start gap-1.5 font-semibold text-primary min-w-0">
                <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden="true">
                  local_hospital
                </span>
                <span>{hospitalDept.name}</span>
              </div>
              {priority && (
                <span className={`badge shrink-0 ${isHighPriority ? 'badge-warning' : 'badge-neutral'}`}>
                  Ưu tiên: {priorityLabel(priority)}
                </span>
              )}
            </div>

            {onOpenBooking && (
              <button
                type="button"
                data-testid="btn-book-dept-chat"
                onClick={() => onOpenBooking({ departmentId: hospitalDept.id })}
                className={bookingBtnClass}
              >
                <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>
                <span className="truncate">{bookingLabel || 'Đặt khám khoa này ngay'}</span>
              </button>
            )}
          </div>
        )}

        {/* Nút đặt lịch độc lập */}
        {!hospitalDept && message.showBookingButton && onOpenBooking && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              data-testid="btn-book-chat"
              onClick={() => onOpenBooking({})}
              className={isEmergency ? bookingBtnClass : 'btn btn-soft btn-sm w-full'}
            >
              <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>
              <span className="truncate">{bookingLabel || 'Đặt lịch khám bệnh'}</span>
            </button>
          </div>
        )}

        {/* Disclaimer y tế */}
        {!isUser && message.disclaimer && (
          <div className="text-xs text-slate-500 italic pt-1.5 border-t border-slate-100 leading-snug">
            * {message.disclaimer}
          </div>
        )}

        {/* Thời gian */}
        {message.timestamp && (
          <div className={`text-xs text-right ${isUser ? 'text-white/80' : 'text-slate-500'}`}>
            {message.timestamp}
          </div>
        )}
      </div>

      {/* Ảnh đại diện người dùng */}
      {isUser && (
        <div
          aria-hidden="true"
          className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5"
        >
          <span className="material-symbols-outlined text-[18px]">person</span>
        </div>
      )}
    </div>
  );
}
