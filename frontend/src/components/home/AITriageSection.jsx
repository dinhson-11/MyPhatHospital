import React, { useState } from 'react';
import { triageService } from '../../services/triageService';
import { useToast } from '../../context/useToast';

const QUICK_TAGS = [
  { label: 'Đau tức ngực, khó thở', text: 'Tôi bị đau tức ngực trái, hồi hộp đánh trống ngực và khó thở khi gắng sức' },
  { label: 'Ho nhiều, đau rát họng', text: 'Bị ho đờm nhiều ngày, khàn tiếng và đau rát cổ họng khi nuốt nước' },
  { label: 'Đau bụng, ợ chua dạ dày', text: 'Bị đau quặn thượng vị dạ dày, đầy hơi, ợ chua và buồn nôn sau khi ăn' },
  { label: 'Bé sốt cao, quấy khóc', text: 'Bé 3 tuổi bị sốt cao 39 độ, biếng ăn và quấy khóc liên tục' },
  { label: 'Ngứa da, mẩn đỏ', text: 'Da nổi mẩn đỏ, ngứa ngáy nhiều ở hai cánh tay sau khi ăn hải sản' },
  { label: 'Đau mỏi vai gáy, chóng mặt', text: 'Thường xuyên chóng mặt, hoa mắt, mất ngủ và đau mỏi vai gáy khi làm việc' }
];

// Đỏ = khẩn cấp, hổ phách = cần lưu ý, xanh lục = không khẩn cấp (luôn kèm chữ, không chỉ dựa vào màu)
const URGENCY_STYLES = {
  HIGH: 'border-red-700 text-red-800',
  MEDIUM: 'border-amber-700 text-amber-800',
  LOW: 'border-emerald-700 text-emerald-800'
};

export default function AITriageSection({ onOpenBooking }) {
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState(null);
  const { showToast } = useToast();

  const handleTriage = (e) => {
    e?.preventDefault();
    if (!symptoms.trim()) {
      showToast('Vui lòng nhập hoặc chọn triệu chứng cần sàng lọc', 'warning');
      return;
    }

    setResult(triageService.triageSymptoms(symptoms));
    showToast('Đã phân tích xong triệu chứng', 'success');
  };

  const handleQuickTag = (tagText) => {
    setSymptoms(tagText);
    setResult(triageService.triageSymptoms(tagText));
  };

  const handleClear = () => {
    setSymptoms('');
    setResult(null);
  };

  const urgencyClass = result ? URGENCY_STYLES[result.urgency] || URGENCY_STYLES.MEDIUM : '';

  return (
    <section id="ai-triage" className="bg-primary-fixed border-b border-primary-fixed-dim">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div aria-hidden="true" className="h-1 w-10 bg-primary mb-3" />
        <h2 className="text-3xl font-semibold text-slate-900 mb-2">Hỏi trợ lý về triệu chứng</h2>
        <p className="text-slate-700 max-w-2xl mb-8">
          Mô tả triệu chứng để được gợi ý khoa nên khám và mức độ ưu tiên. Kết quả chỉ để tham khảo, không thay thế chẩn đoán của bác sĩ.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <form onSubmit={handleTriage} className="lg:col-span-7 bg-white border border-slate-300 rounded-lg p-5 sm:p-6">
            <div className="flex items-baseline justify-between mb-2">
              <label htmlFor="symptoms-input" className="font-semibold text-slate-900">
                Mô tả tình trạng sức khỏe hoặc triệu chứng của bạn
              </label>
              {symptoms && (
                <button type="button" onClick={handleClear} aria-label="Xóa nội dung triệu chứng" className="link-btn text-sm">
                  Xóa
                </button>
              )}
            </div>

            <textarea
              id="symptoms-input"
              rows="4"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Ví dụ: đau tức ngực trái 2 ngày nay, khó thở khi leo cầu thang"
              className="textarea"
            />

            <p id="quick-tags-label" className="text-sm text-slate-600 mt-4 mb-2">Hoặc chọn nhanh một triệu chứng thường gặp:</p>
            <div role="group" aria-labelledby="quick-tags-label" className="flex flex-wrap gap-2">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => handleQuickTag(tag.text)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm text-slate-700 cursor-pointer"
                >
                  {tag.label}
                </button>
              ))}
            </div>

            <button type="submit" id="btn-run-ai-triage" className="btn btn-primary btn-lg mt-6">
              Phân tích triệu chứng
            </button>
          </form>

          <div className="lg:col-span-5" aria-live="polite">
            {result ? (
              <div id="ai-triage-result" className="bg-white border border-slate-300 p-5 rounded-lg">
                <h3 className="font-semibold text-slate-900 text-lg">Kết Quả Đánh Giá Lâm Sàng</h3>
                <p className="text-sm text-slate-600 mb-4">Mang tính tham khảo</p>

                <p className={`border-l-4 pl-3 py-1 font-semibold ${urgencyClass}`}>
                  <span className="block text-sm font-normal text-slate-600">Mức độ ưu tiên</span>
                  {result.urgencyLabel}
                </p>

                {result.urgency === 'HIGH' && (
                  <p className="mt-3 text-sm text-slate-800">
                    Nếu triệu chứng nặng lên (đau ngực dữ dội, khó thở, ngất…), hãy gọi cấp cứu{' '}
                    <a href="tel:115" className="font-semibold underline">115</a> hoặc hotline bệnh viện{' '}
                    <a href="tel:0386959342" className="font-semibold underline whitespace-nowrap">0386 959 342</a>.
                  </p>
                )}

                <dl className="mt-4 space-y-3">
                  <div>
                    <dt className="text-sm text-slate-600">Khoa nên khám</dt>
                    <dd className="font-semibold text-slate-900">{result.deptName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-slate-600">Bác sĩ phụ trách phù hợp</dt>
                    <dd className="font-semibold text-slate-900">{result.doctorName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-slate-600">Lời khuyên ban đầu</dt>
                    <dd className="text-slate-800">{result.advice}</dd>
                  </div>
                </dl>

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
                  className="btn btn-primary btn-block mt-5"
                >
                  Đặt Lịch Khám Theo Gợi Ý Này
                </button>
                <p className="mt-3 text-sm text-slate-600">Kết quả do AI gợi ý, không thay thế chẩn đoán của bác sĩ.</p>
              </div>
            ) : (
              <div className="bg-white/60 border border-dashed border-slate-400 p-5 rounded-lg text-slate-700">
                <p className="font-semibold text-slate-800 mb-1">Chưa có kết quả</p>
                <p className="text-sm">
                  Nhập mô tả triệu chứng hoặc chọn một gợi ý, rồi bấm &quot;Phân tích triệu chứng&quot;.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
