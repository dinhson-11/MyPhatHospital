import React, { useState } from 'react';
import { triageService } from '../../services/triageService';
import { useToast } from '../../context/ToastContext';

export default function AITriageSection({ onOpenBooking }) {
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { showToast } = useToast();

  const QUICK_TAGS = [
    { label: 'Đau tức ngực, khó thở', text: 'Tôi bị đau tức ngực trái, hồi hộp đánh trống ngực và khó thở khi gắng sức' },
    { label: 'Ho nhiều, đau rát họng', text: 'Bị ho đờm nhiều ngày, khàn tiếng và đau rát cổ họng khi nuốt nước' },
    { label: 'Đau bụng, ợ chua dạ dày', text: 'Bị đau quặn thượng vị dạ dày, đầy hơi, ợ chua và buồn nôn sau khi ăn' },
    { label: 'Bé sốt cao, quấy khóc', text: 'Bé 3 tuổi bị sốt cao 39 độ, biếng ăn và quấy khóc liên tục' },
    { label: 'Ngứa da, mẩn đỏ', text: 'Da nổi mẩn đỏ, ngứa ngáy nhiều ở hai cánh tay sau khi ăn hải sản' },
    { label: 'Đau mỏi vai gáy, chóng mặt', text: 'Thường xuyên chóng mặt, hoa mắt, mất ngủ và đau mỏi vai gáy khi làm việc' }
  ];

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
    showToast('Đã phân tích xong triệu chứng lâm sàng bằng AI!', 'success');
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

  return (
    <section id="ai-triage" className="py-20 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <span className="material-symbols-outlined text-sm animate-pulse">smart_toy</span>
            AI Triage Lâm Sàng Thông Minh
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-white">
            Sàng Lọc Triệu Chứng & Điều Hướng Y Khoa AI
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Mô hình AI y tế được huấn luyện trên hàng ngàn ca lâm sàng giúp nhận diện sớm dấu hiệu nguy cơ, phân loại mức độ khẩn cấp và đề xuất chuyên khoa tối ưu nhất.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Input & Form (7 cols) */}
          <div className="lg:col-span-7 bg-slate-800/80 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-slate-700/60 shadow-2xl">
            <form onSubmit={handleTriage}>
              <div className="flex items-center justify-between mb-4">
                <label htmlFor="symptoms-input" className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
                  Mô tả tình trạng sức khỏe hoặc triệu chứng của bạn:
                </label>
                {symptoms && (
                  <button
                    type="button"
                    onClick={handleClear}
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
                className="w-full bg-slate-900/90 text-white placeholder-slate-500 rounded-2xl p-4 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none transition-all shadow-inner"
              />

              {/* Quick Suggestion Tags */}
              <div className="mt-4">
                <p className="text-xs text-slate-400 mb-2 font-medium">Hoặc chọn nhanh triệu chứng phổ biến:</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TAGS.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickTag(tag.text)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors border border-slate-600/40"
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
                <button
                  type="submit"
                  id="btn-run-ai-triage"
                  disabled={loading}
                  className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Hệ thống AI đang phân tích dữ liệu lâm sàng...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">psychology</span>
                      <span>Chẩn Đoán Sàng Lọc Bằng AI</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* AI Output Result (5 cols) */}
          <div className="lg:col-span-5">
            {result ? (
              <div
                id="ai-triage-result"
                className="bg-slate-800/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-emerald-500/40 shadow-2xl relative animate-fade-in"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-2xl">check_circle</span>
                    <h3 className="font-bold text-white text-lg">Kết Quả Đánh Giá Lâm Sàng</h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Độ tin cậy: {result.confidence}
                  </span>
                </div>

                {/* Urgency Badge */}
                <div className="mt-5 p-3 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-xl ${
                      result.urgency === 'HIGH' ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                    }`}
                  >
                    {result.urgency === 'HIGH' ? 'warning' : 'info'}
                  </span>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Mức độ ưu tiên</p>
                    <p className={`text-sm font-bold ${result.urgency === 'HIGH' ? 'text-rose-300' : 'text-amber-300'}`}>
                      {result.urgencyLabel}
                    </p>
                  </div>
                </div>

                {/* Recommended Specialty & Doctor */}
                <div className="mt-5 space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-700/40 border border-slate-700">
                    <p className="text-xs text-slate-400 font-medium">Khoa chuyên môn khuyến nghị:</p>
                    <p className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                      <span className="material-symbols-outlined text-emerald-400 text-lg">medical_services</span>
                      {result.deptName}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-700/40 border border-slate-700">
                    <p className="text-xs text-slate-400 font-medium">Bác sĩ phụ trách phù hợp:</p>
                    <p className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                      <span className="material-symbols-outlined text-teal-400 text-lg">person_pin</span>
                      {result.doctorName}
                    </p>
                  </div>
                </div>

                {/* Clinical Advice */}
                <div className="mt-5">
                  <p className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">tips_and_updates</span>
                    Lời khuyên y tế ban đầu:
                  </p>
                  <p className="text-xs leading-relaxed text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                    {result.advice}
                  </p>
                </div>

                {/* Action CTA */}
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <button
                    type="button"
                    id="btn-triage-book-now"
                    onClick={() =>
                      onOpenBooking({
                        departmentId: result.deptId,
                        doctorId: result.doctorId,
                        notes: `[AI Sàng lọc - ${result.confidence}]: ${symptoms}`
                      })
                    }
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">calendar_month</span>
                    Đặt Khám Ngay Theo Phân Luồng Này
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full bg-slate-800/40 rounded-3xl border border-slate-800 p-8 flex flex-col items-center justify-center text-center text-slate-500 min-h-[350px]">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-600">
                  <span className="material-symbols-outlined text-3xl">psychology_alt</span>
                </div>
                <h4 className="text-slate-300 font-bold text-base mb-1">Chưa có dữ liệu sàng lọc</h4>
                <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                  Nhập mô tả triệu chứng hoặc chọn các gợi ý bên trái và nhấn &quot;Chẩn Đoán Sàng Lọc Bằng AI&quot; để nhận khuyến nghị phân luồng lâm sàng.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
