import React from 'react';
import { formatDateTime } from '../../utils/format';

/**
 * ChatHistory – xem lại các phiên trò chuyện trước:
 * - Danh sách phiên (mỗi phiên là một nút bấm được bằng bàn phím)
 * - Tóm tắt số tin nhắn và nội dung gần nhất
 * - Chuyển phiên / bắt đầu phiên mới
 */
export default function ChatHistory({
  sessions = [],
  currentSessionId,
  onSelectSession,
  onNewSession,
  onBack,
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 text-sm">
      {/* Thanh thao tác */}
      <div className="px-3 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
        <button type="button" onClick={onBack} className="btn btn-light btn-sm">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          <span>Quay lại chat</span>
        </button>

        <button type="button" onClick={onNewSession} className="btn btn-primary btn-sm">
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          <span>Phiên mới</span>
        </button>
      </div>

      {/* Danh sách phiên */}
      <div className="flex-1 overflow-y-auto p-3">
        {sessions.length === 0 ? (
          <div className="empty-state h-full">
            <div className="empty-state-icon">
              <span className="material-symbols-outlined" aria-hidden="true">chat_bubble_outline</span>
            </div>
            <p className="empty-state-title">Chưa có lịch sử hội thoại</p>
            <p className="empty-state-text">Các cuộc hội thoại trước đó của bạn sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <ul className="space-y-2" aria-label="Lịch sử hội thoại">
            {sessions.map(s => {
              const isSelected = s.id === currentSessionId;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSession(s.id)}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      isSelected
                        ? 'bg-primary-fixed border-primary'
                        : 'bg-white border-slate-200 hover:border-primary/40 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">
                          chat
                        </span>
                        <span className="truncate">Phiên #{s.id}</span>
                      </span>
                      <span className="text-xs text-slate-500 shrink-0">
                        {s.startedAt ? formatDateTime(s.startedAt) : 'Gần đây'}
                      </span>
                    </span>

                    {s.lastMessage && (
                      <span className="block text-xs text-slate-600 line-clamp-1 italic">
                        "{s.lastMessage}"
                      </span>
                    )}

                    <span className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>{s.messageCount || 1} tin nhắn</span>
                      {isSelected && (
                        <span className="text-primary font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true"></span>
                          <span>Đang mở</span>
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
