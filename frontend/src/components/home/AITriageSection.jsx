import React, { useState } from 'react';
import { triageService } from '../../services/triageService';
import { useToast } from '../../context/ToastContext';

const QUICK_TAGS = [
  { label: 'Đau tức ngực, khó thở', text: 'Tôi bị đau tức ngực trái, hồi hộp đánh trống ngực và khó thở khi gắng sức' },
  { label: 'Ho nhiều, đau rát họng', text: 'Bị ho đờm nhiều ngày, khàn tiếng và đau rát cổ họng khi nuốt nước' },
  { label: 'Đau bụng, ợ chua dạ dày', text: 'Bị đau quặn thượng vị dạ dày, đầy hơi, ợ chua và buồn nôn sau khi ăn' },
  { label: 'Bé sốt cao, quấy khóc', text: 'Bé 3 tuổi bị sốt cao 39 độ, biếng ăn và quấy khóc liên tục' },
  { label: 'Ngứa da, mẩn đỏ', text: 'Da nổi mẩn đỏ, ngứa ngáy nhiều ở hai cánh tay sau khi ăn hải sản' },
  { label: 'Đau mỏi vai gáy, chóng mặt', text: 'Thường xuyên chóng mặt, hoa mắt, mất ngủ và đau mỏi vai gáy khi làm việc' }
];

// Màu theo mức độ ưu tiên: đỏ = khẩn cấp, hổ phách = cần lưu ý, xanh lục = không khẩn cấp
const URGENCY_STYLES = {
  HIGH: { icon: 'emergency', iconClass: 'text-red-400 animate-pulse', textClass: 'text-red-300' },
  MEDIUM: { icon: 'info', iconClass: 'text-amber-400', textClass: 'text-amber-300' },
  LOW: { icon: 'check_circle', iconClass: 'text-emerald-400', textClass: 'text-emerald-300' }
};

export default function AITriageSection({ onOpenBooking }) {
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { showToast } = useToast();

  const handleTriage = (e) => {
    e?.preventDefault();
    if (!symptoms.trim()) {
      showToast('Vui lòng nhập hoặc chọn triệu chứng cần sàng lọc', 'warning');
      return;
    }

    setLoading(true);
    const triageResult = triageService.triageSymptoms(symptoms);
    setResult(triageResult);
    setLoading(false);
    showToast('Đã phân tích xong triệu chứng', 'success');
  };

  const handleQuickTag = (tagText) => {
    setSymptoms(tagText);
    const triageResult = triageService.triageSymptoms(tagText);
    setResult(triageResult);
  };

  const handleClear = () => {
    setSymptoms('');
    setResult(null);
  };

  const urgency = result ? URGENCY_STYLES[result.urgency] || URGENCY_STYLES.MEDIUM : null;

  return (
    <section id="ai-triage" className="py-20 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white relative overflow-hidden">
      {/* Nền trang trí */}
      <div aria-hidden="true" className="absolute top-1/4 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      <div aria-hidden="true" className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <span aria-hidden="true" className="material-symbols-outlined text-sm">smart_toy</span>
            Sàng lọc triệu chứng thông minh
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-white">
            Sàng Lọc Triệu Chứng & Gợi Ý Chuyên Khoa Bằng AI
          </h2>
          <p className="text-slate-300 text-base sm:text-lg">
            Trợ lý AI giúp nhận diện sớm dấu hiệu cần lưu ý, phân loại mức độ ưu tiên và gợi ý chuyên khoa phù hợp. Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Nhập triệu chứng */}
          <div className="lg:col-span-7 bg-slate-800/80 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-slate-700/60 shadow-2xl">
            <form onSubmit={handleTriage}>
              <div className="flex items-center justify-between mb-4">
                <label htmlFor="symptoms-input" className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-primary-fixed-dim text-lg">edit_note</span>
                  Mô tả tình trạng sức khỏe hoặc triệu chứng của bạn:
                </label>
                {symptoms && (
                  <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Xóa nội dung triệu chứng"
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Xóa
                  </button>
                )}
              </div>

              <textarea
                id="symptoms-input"
                rows="4"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Ví dụ: Tôi bị đau tức ngực trái 2 ngày nay, khó thở khi leo cầu thang kèm đánh trống ngực..."
                className="w-full bg-slate-900/90 text-white placeholder-slate-500 rounded-xl p-4 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-fixed-dim focus:border-transparent text-sm resize-none transition-all shadow-inner"
              />

              {/* Gợi ý nhanh */}
              <div className="mt-4">
                <p id="quick-tags-label" className="text-xs text-slate-400 mb-2 font-medium">Hoặc chọn nhanh triệu chứng phổ biến:</p>
                <div role="group" aria-labelledby="quick-tags-label" className="flex flex-wrap gap-2">
                  {QUICK_TAGS.map((tag) => (
                    <button
                      key={tag.label}
                      type="button"
                      onClick={() => handleQuickTag(tag.text)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors border border-slate-600/40"
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
                <button
                  type="submit"
                  id="btn-run-ai-triage"
                  disabled={loading}
                  className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/30 ring-1 ring-inset ring-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span aria-hidden="true" className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Đang phân tích triệu chứng...</span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true" className="material-symbols-outlined text-lg">psychology</span>
                      <span>Phân Tích Triệu Chứng Bằng AI</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Kết quả */}
          <div className="lg:col-span-5" aria-live="polite">
            {result ? (
              <div
                id="ai-triage-result"
                className="bg-slate-800/90 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-teal-500/40 shadow-2xl relative animate-fade-in"
              >
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-teal-300 text-2xl">clinical_notes</span>
                    <h3 className="font-bold text-white text-lg">Kết Quả Đánh Giá Lâm Sàng</h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-200 border border-slate-600 whitespace-nowrap">
                    Mang tính tham khảo
                  </span>
                </div>

                {/* Mức độ ưu tiên */}
                <div className="mt-5 p-3 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center gap-3">
                  <span aria-hidden="true" className={`material-symbols-outlined text-xl ${urgency.iconClass}`}>
                    {urgency.icon}
                  </span>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Mức độ ưu tiên</p>
                    <p className={`text-sm font-bold ${urgency.textClass}`}>{result.urgencyLabel}</p>
                  </div>
                </div>

                {result.urgency === 'HIGH' && (
                  <p className="mt-3 p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-xs leading-relaxed text-red-200">
                    Nếu triệu chứng nặng lên (đau ngực dữ dội, khó thở, ngất…), hãy gọi cấp cứu{' '}
                    <a href="tel:115" className="font-bold text-white underline">115</a> hoặc hotline bệnh viện{' '}
                    <a href="tel:0789065493" className="font-bold text-white underline whitespace-nowrap">0789 065 493</a>.
                  </p>
                )}

                {/* Chuyên khoa & bác sĩ gợi ý */}
                <div className="mt-5 space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-700/40 border border-slate-700">
                    <p className="text-xs text-slate-400 font-medium">Khoa chuyên môn khuyến nghị:</p>
                    <p className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                      <span aria-hidden="true" className="material-symbols-outlined text-teal-300 text-lg">medical_services</span>
                      {result.deptName}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-700/40 border border-slate-700">
                    <p className="text-xs text-slate-400 font-medium">Bác sĩ phụ trách phù hợp:</p>
                    <p className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                      <span aria-hidden="true" className="material-symbols-outlined text-teal-300 text-lg">person_pin</span>
                      {result.doctorName}
                    </p>
                  </div>
                </div>

                {/* Lời khuyên */}
                <div className="mt-5">
                  <p className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                    <span aria-hidden="true" className="material-symbols-outlined text-sm">tips_and_updates</span>
                    Lời khuyên y tế ban đầu:
                  </p>
                  <p className="text-xs leading-relaxed text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                    {result.advice}
                  </p>
                </div>

                {/* Đặt khám theo gợi ý */}
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <button
                    type="button"
                    id="btn-triage-book-now"
                    onClick={() =>
                      onOpenBooking({
                        departmentId: result.deptId,
                        doctorId: result.doctorId,
                        notes: `[Sàng lọc AI – ${result.urgencyLabel}]: ${symptoms}`
                      })
                    }
                    className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/30 ring-1 ring-inset ring-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-lg">calendar_month</span>
                    Đặt Lịch Khám Theo Gợi Ý Này
                  </button>
                  <p className="mt-3 text-xs text-slate-400 text-center leading-relaxed">
                    Kết quả do AI gợi ý, không thay thế chẩn đoán của bác sĩ.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full bg-slate-800/40 rounded-2xl border border-slate-800 p-8 flex flex-col items-center justify-center text-center text-slate-500 min-h-[350px]">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-500">
                  <span aria-hidden="true" className="material-symbols-outlined text-3xl">psychology_alt</span>
                </div>
                <h3 className="text-slate-300 font-bold text-base mb-1">Chưa có dữ liệu sàng lọc</h3>
                <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                  Nhập mô tả triệu chứng hoặc chọn các gợi ý bên trái và nhấn &quot;Phân Tích Triệu Chứng Bằng AI&quot; để nhận gợi ý chuyên khoa phù hợp.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
