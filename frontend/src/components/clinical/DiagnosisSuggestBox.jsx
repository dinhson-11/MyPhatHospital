import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AI_DISCLAIMER_TEXT, aiAlertService } from '../../services/aiAlertService';

// Cơ sở tri thức gợi ý chẩn đoán ICD-10 lâm sàng (fallback offline)
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
      { code: 'M54.2', name: 'Đau cổ gáy (Cervicalgia)', confidence: 92, reason: 'Co cứng cơ cạnh cột sống cổ và đau mỏi vai gáy' },
      { code: 'M47.8', name: 'Thoái hóa cột sống khác', confidence: 86, reason: 'Đau âm ỉ cột sống tăng lên khi vận động' },
      { code: 'M54.5', name: 'Đau thắt lưng (Low back pain)', confidence: 80, reason: 'Hạn chế tầm vận động thắt lưng' }
    ]
  }
];

export default function DiagnosisSuggestBox({ symptomsText = '', onSelectDiagnosis, visitId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null); // null = chưa gọi API, [] = đã gọi nhưng trống
  const [aiSource, setAiSource] = useState('local'); // 'local' | 'api' | 'fallback'
  const debounceTimerRef = useRef(null);

  // Gợi ý từ knowledge base cục bộ (instant, không cần API)
  const localSuggestions = useMemo(() => {
    if (!symptomsText || symptomsText.trim().length < 3) return [];

    const lower = symptomsText.toLowerCase();
    for (const group of ICD10_KNOWLEDGE_BASE) {
      if (group.keywords.some(kw => lower.includes(kw))) {
        return group.suggestions;
      }
    }

    // Default suggestions nếu chưa khớp từ khóa cụ thể
    return [
      { code: 'R69', name: 'Nguyên nhân gây bệnh chưa xác định', confidence: 70, reason: 'Cần chỉ định thêm cận lâm sàng để chẩn đoán phân biệt' },
      { code: 'Z00.0', name: 'Khám sức khỏe tổng quát định kỳ', confidence: 65, reason: 'Tầm soát đánh giá chức năng các cơ quan' }
    ];
  }, [symptomsText]);

  // Gợi ý hiển thị: ưu tiên AI API > fallback local
  const suggestions = aiSuggestions && aiSuggestions.length > 0 ? aiSuggestions : localSuggestions;

  // Hàm gọi AI API (debounce 500ms)
  const triggerAIAnalysis = useCallback(async () => {
    if (!symptomsText || symptomsText.trim().length < 3) return;

    setIsLoadingAI(true);
    try {
      const result = await aiAlertService.suggestDiagnosis(symptomsText, { visitId });
      if (result && result.suggestions && result.suggestions.length > 0) {
        setAiSuggestions(result.suggestions);
        setAiSource('api');
      } else {
        setAiSource('fallback');
      }
    } catch (err) {
      console.warn('Lỗi gọi AI suggest-diagnosis:', err);
      setAiSource('fallback');
    } finally {
      setIsLoadingAI(false);
    }
  }, [symptomsText, visitId]);

  // Auto-trigger AI khi mở panel và text thay đổi (debounce 500ms)
  useEffect(() => {
    if (!isOpen || !symptomsText || symptomsText.trim().length < 3) return;

    // Reset AI suggestions khi text thay đổi
    setAiSuggestions(null);
    setAiSource('local');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerAIAnalysis();
    }, 500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [symptomsText, isOpen]);

  if (!symptomsText || suggestions.length === 0) {
    return null;
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return 'bg-emerald-100 text-emerald-800';
    if (confidence >= 80) return 'bg-blue-100 text-blue-800';
    if (confidence >= 70) return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="rounded-xl border border-secondary/30 bg-secondary-container/10 p-3.5 space-y-2.5 animate-fade-in text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-bold">
          <span className="material-symbols-outlined text-[18px]">psychiatry</span>
          <span>AI Gợi ý Chẩn đoán ICD-10 ({suggestions.length})</span>
          {isLoadingAI && (
            <span className="inline-flex items-center gap-1 text-[10px] font-normal text-on-surface-variant animate-pulse">
              <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
              Đang phân tích AI...
            </span>
          )}
          {aiSource === 'api' && !isLoadingAI && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
              ✓ AI Service
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOpen && (
            <button
              type="button"
              onClick={triggerAIAnalysis}
              disabled={isLoadingAI}
              className="text-[10px] px-2 py-1 rounded-lg bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
              title="Phân tích chẩn đoán bằng AI Service"
            >
              <span className="material-symbols-outlined text-[14px]">smart_toy</span>
              <span>Phân tích AI</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            className="text-xs text-primary hover:underline font-semibold cursor-pointer"
          >
            {isOpen ? 'Thu gọn' : 'Xem gợi ý'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {suggestions.map((sug, idx) => (
              <div
                key={idx}
                onClick={() => onSelectDiagnosis && onSelectDiagnosis(sug.code, sug.name)}
                className="p-3 rounded-lg bg-white border border-outline-variant/40 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer space-y-1 shadow-2xs group"
                title="Bấm để chọn mã ICD-10 này"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary group-hover:underline">
                    {sug.code}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${getConfidenceColor(sug.confidence)}`}>
                    {sug.confidence}%
                  </span>
                </div>
                <div className="font-semibold text-on-surface line-clamp-1">{sug.name}</div>
                <div className="text-[11px] text-on-surface-variant line-clamp-2">{sug.reason}</div>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-on-surface-variant italic pt-1 border-t border-outline-variant/20 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">info</span>
            <span>{AI_DISCLAIMER_TEXT} Bác sĩ bấm vào thẻ để chọn nhanh chẩn đoán.</span>
          </div>
        </div>
      )}
    </div>
  );
}
