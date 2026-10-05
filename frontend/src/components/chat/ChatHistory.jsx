import React from 'react';

/**
 * ChatHistory Component (FR-10 – Sprint 7)
 * Quản lý và xem lại lịch sử các phiên chat trước đó:
 * - Danh sách phiên theo thời gian
 * - Tóm tắt số tin nhắn và nội dung tin nhắn gần nhất
 * - Chuyển đổi qua lại giữa các phiên
 * - Bắt đầu cuộc trò chuyện mới
 */
export default function ChatHistory({
  sessions = [],
  currentSessionId,
  onSelectSession,
  onNewSession,
  onBack,
}) {
  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden text-xs">
      {/* Top action bar */}
      <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-slate-600 hover:text-primary font-medium transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Quay lại chat</span>
        </button>

        <button
          type="button"
          onClick={onNewSession}
          className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          <span>Phiên mới</span>
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sessions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <span className="material-symbols-outlined text-[40px] text-slate-300 mb-2">
              chat_bubble_outline
            </span>
            <p className="font-medium text-slate-600">Chưa có lịch sử hội thoại</p>
            <p className="text-[11px] mt-1 text-slate-400">
              Các cuộc hội thoại trước đó của bạn sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          sessions.map(s => {
            const isSelected = s.id === currentSessionId;
            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectSession(s.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSession(s.id);
                  }
                }}
                className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/80 border-primary shadow-xs'
                    : 'bg-white border-slate-200/80 hover:border-primary/40 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary">
                      chat
                    </span>
                    <span>Phiên #{s.id}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {s.startedAt
                      ? new Date(s.startedAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Gần đây'}
                  </span>
                </div>

                {s.lastMessage && (
                  <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                    "{s.lastMessage}"
                  </p>
                )}

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                  <span>{s.messageCount || 1} tin nhắn</span>
                  {isSelected && (
                    <span className="text-primary font-bold flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                      <span>Đang mở</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
