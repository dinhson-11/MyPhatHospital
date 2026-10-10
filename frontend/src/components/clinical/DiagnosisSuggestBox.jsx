import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AI_DISCLAIMER_TEXT, aiAlertService } from '../../services/aiAlertService';

// Gợi ý theo từ khóa (hiển thị tức thì, trước khi dịch vụ AI trả kết quả)
const ICD10_KNOWLEDGE_BASE = [
  {
    keywords: ['đau ngực', 'tức ngực', 'khó thở', 'huyết áp', 'hoa mắt', 'chóng mặt'],
    suggestions: [
      { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)', confidence: 94, reason: 'Triệu chứng đau tức ngực, chóng mặt phù hợp với biến thiên huyết áp cao' },
      { code: 'I20.9', name: 'Cơn đau thắt ngực, không đặc hiệu', confidence: 85, reason: 'Cảm giác đau thắt ngực trái cần theo dõi điện tim và men tim' },
      { code: 'I25.1', name: 'Bệnh tim xơ vữa động mạch', confidence: 78, reason: 'Nguy cơ thiếu máu cơ tim mạn tính' }
    ]
  },
  {
    keywords: ['ho', 'sốt', 'đờm', 'rát họng', 'viêm họng', 'khàn tiếng'],
    suggestions: [
      { code: 'J00', name: 'Viêm mũi họng cấp (Cảm thường)', confidence: 96, reason: 'Hội chứng viêm long đường hô hấp trên cấp tính' },
      { code: 'J02.9', name: 'Viêm họng cấp, không đặc hiệu', confidence: 88, reason: 'Đau rát họng tăng khi nuốt kèm sung huyết niêm mạc' },
      { code: 'J20.9', name: 'Viêm phế quản cấp, không đặc hiệu', confidence: 82, reason: 'Ho khan chuyển sang ho đờm kèm sốt nhẹ' }
    ]
  },
  {
    keywords: ['đau bụng', 'dạ dày', 'ợ chua', 'buồn nôn', 'thượng vị', 'tiêu chảy'],
    suggestions: [
      { code: 'K29.7', name: 'Viêm dạ dày, không đặc hiệu', confidence: 95, reason: 'Đau quặn vùng thượng vị, ợ hơi ợ chua sau bữa ăn' },
      { code: 'K21.9', name: 'Bệnh trào ngược dạ dày - thực quản (GERD)', confidence: 89, reason: 'Ợ nóng rát sau xương ức và đắng miệng' },
      { code: 'K58.9', name: 'Hội chứng ruột kích thích (IBS)', confidence: 76, reason: 'Rối loạn tiêu hóa mạn tính liên quan đến stress' }
    ]
  },
  {
    keywords: ['đái tháo đường', 'tiểu đường', 'khát nước', 'sụt cân', 'tiểu nhiều'],
    suggestions: [
      { code: 'E11.9', name: 'Đái tháo đường typ 2 không có biến chứng', confidence: 93, reason: 'Triệu chứng ăn nhiều, uống nhiều, tiểu nhiều và mệt mỏi' },
      { code: 'E14.9', name: 'Đái tháo đường không đặc hiệu', confidence: 84, reason: 'Cần xét nghiệm HbA1c và đường huyết lúc đói' }
    ]
  },
  {
    keywords: ['vai gáy', 'cột sống', 'đau lưng', 'thoái hóa', 'tê bì'],
    suggestions: [
      { code: 'M54.2', name: 'Đau cổ gáy', confidence: 92, reason: 'Co cứng cơ cạnh cột sống cổ và đau mỏi vai gáy' },
      { code: 'M47.8', name: 'Thoái hóa cột sống khác', confidence: 86, reason: 'Đau âm ỉ cột sống tăng lên khi vận động' },
      { code: 'M54.5', name: 'Đau thắt lưng', confidence: 80, reason: 'Hạn chế tầm vận động thắt lưng' }
    ]
  }
];

const DEFAULT_SUGGESTIONS = [
  { code: 'R69', name: 'Nguyên nhân gây bệnh chưa xác định', confidence: 70, reason: 'Cần chỉ định thêm cận lâm sàng để chẩn đoán phân biệt' },
  { code: 'Z00.0', name: 'Khám sức khỏe tổng quát định kỳ', confidence: 65, reason: 'Tầm soát đánh giá chức năng các cơ quan' }
];

/** Độ tin cậy có thể là 0–1 hoặc 0–100 tùy nguồn → luôn hiển thị phần trăm. */
const toPercent = (c) => {
  const n = Number(c);
  if (!Number.isFinite(n)) return null;
  return Math.round(n <= 1 ? n * 100 : n);
};

const confidenceClass = (pct) => {
  if (pct >= 90) return 'bg-emerald-100 text-emerald-900';
  if (pct >= 80) return 'bg-sky-100 text-sky-900';
  if (pct >= 70) return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-800';
};

/**
 * Gợi ý mã chẩn đoán ICD-10 từ lý do khám. Chỉ mang tính tham khảo – bác sĩ quyết định chẩn đoán.
 * Props: symptomsText, onSelectDiagnosis(code, name), visitId, disabled.
 */
export default function DiagnosisSuggestBox({ symptomsText = '', onSelectDiagnosis, visitId, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiSource, setAiSource] = useState('local'); // 'local' | 'server'
  const debounceTimerRef = useRef(null);
  const panelId = `dx-suggest-${visitId || 'new'}`;

  const localSuggestions = useMemo(() => {
    if (!symptomsText || symptomsText.trim().length < 3) return [];
    const lower = symptomsText.toLowerCase();
    for (const group of ICD10_KNOWLEDGE_BASE) {
      if (group.keywords.some((kw) => lower.includes(kw))) return group.suggestions;
    }
    return DEFAULT_SUGGESTIONS;
  }, [symptomsText]);

  const suggestions = aiSuggestions && aiSuggestions.length > 0 ? aiSuggestions : localSuggestions;

  const triggerAIAnalysis = useCallback(async () => {
    if (!symptomsText || symptomsText.trim().length < 3) return;
    setIsLoadingAI(true);
    try {
      const result = await aiAlertService.suggestDiagnosis(symptomsText, { visitId });
      if (result?.source === 'server' && result.suggestions?.length > 0) {
        setAiSuggestions(result.suggestions);
        setAiSource('server');
      } else {
        setAiSource('local');
      }
    } catch {
      setAiSource('local');
    } finally {
      setIsLoadingAI(false);
    }
  }, [symptomsText, visitId]);

  useEffect(() => {
    if (!isOpen || !symptomsText || symptomsText.trim().length < 3) return undefined;
    setAiSuggestions(null);
    setAiSource('local');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => { triggerAIAnalysis(); }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [symptomsText, isOpen, triggerAIAnalysis]);

  if (!symptomsText || suggestions.length === 0) return null;

  return (
    <div className="rounded-xl border border-secondary/40 bg-secondary-container/40 p-3.5 space-y-2.5 text-[13px]">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-primary font-bold flex-wrap">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">psychiatry</span>
          <span>Gợi ý chẩn đoán ICD-10 ({suggestions.length})</span>
          {isLoadingAI && (
            <span className="inline-flex items-center gap-1 text-xs font-normal text-slate-600" aria-live="polite">
              <span className="material-symbols-outlined text-[14px] animate-spin" aria-hidden="true">progress_activity</span>
              Đang phân tích…
            </span>
          )}
          {!isLoadingAI && isOpen && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${aiSource === 'server' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'}`}>
              {aiSource === 'server' ? 'Từ dịch vụ AI' : 'Gợi ý theo từ khóa'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOpen && (
            <button type="button" onClick={triggerAIAnalysis} disabled={isLoadingAI} className="btn btn-soft btn-sm">
              <span className="material-symbols-outlined" aria-hidden="true">smart_toy</span>
              Phân tích AI
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-controls={panelId}
            className="btn btn-ghost btn-sm text-primary"
          >
            {isOpen ? 'Thu gọn' : 'Xem gợi ý'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div id={panelId} className="space-y-2 pt-1">
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {suggestions.map((sug, idx) => {
              const pct = toPercent(sug.confidence);
              return (
                <li key={`${sug.code}-${idx}`}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelectDiagnosis?.(sug.code, sug.name)}
                    aria-label={`Chọn mã ${sug.code} – ${sug.name}`}
                    className="w-full h-full text-left p-3 rounded-lg bg-white border border-slate-300 hover:border-primary hover:bg-primary-fixed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors space-y-1 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-mono font-bold text-primary">{sug.code}</span>
                      {pct !== null && (
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${confidenceClass(pct)}`}>{pct}%</span>
                      )}
                    </span>
                    <span className="block font-semibold text-slate-900">{sug.name}</span>
                    {sug.reason && <span className="block text-xs text-slate-600">{sug.reason}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-slate-600 italic pt-1 border-t border-slate-200 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">info</span>
            <span>{AI_DISCLAIMER_TEXT} Bác sĩ bấm vào thẻ để chọn nhanh chẩn đoán.</span>
          </p>
        </div>
      )}
    </div>
  );
}
