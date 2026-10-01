import React, { useState } from 'react';
import { visitService, STANDARD_LAB_TESTS } from '../../services/visitService';
import { useToast } from '../../context/ToastContext';

export default function LabOrderPanel({ visit, onOrderAdded, onResultUpdated }) {
  const { showToast } = useToast();

  const [selectedTestType, setSelectedTestType] = useState('');
  const [customTestType, setCustomTestType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal / Form nhập kết quả
  const [resultModal, setResultModal] = useState({ open: false, order: null });
  const [resultText, setResultText] = useState('');
  const [resultFileUrl, setResultFileUrl] = useState('');
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const finalTestType = customTestType.trim() || selectedTestType;

    if (!finalTestType) {
      showToast('Vui lòng chọn hoặc nhập tên chỉ định cận lâm sàng', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await visitService.createLabOrder(visit.id, { testType: finalTestType });
      showToast(`Đã chỉ định cận lâm sàng: "${finalTestType}" thành công!`, 'success');
      setSelectedTestType('');
      setCustomTestType('');
      if (onOrderAdded) {
        onOrderAdded(res);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tạo chỉ định cận lâm sàng', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenResultModal = (order) => {
    setResultModal({ open: true, order });
    const existingResult = order.results && order.results.length > 0 ? order.results[0] : null;
    setResultText(existingResult ? existingResult.resultText : '');
    setResultFileUrl(existingResult ? existingResult.resultFileUrl : '');
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (!resultText.trim()) {
      showToast('Vui lòng nhập kết luận / kết quả xét nghiệm', 'warning');
      return;
    }

    try {
      setIsSubmittingResult(true);
      const updated = await visitService.updateLabResult(resultModal.order.id, {
        resultText: resultText.trim(),
        resultFileUrl: resultFileUrl.trim()
      });
      showToast('Đã cập nhật kết quả cận lâm sàng thành công!', 'success');
      setResultModal({ open: false, order: null });
      if (onResultUpdated) {
        onResultUpdated(updated);
      }
    } catch (err) {
      showToast(err.message || 'Không thể cập nhật kết quả xét nghiệm', 'error');
    } finally {
      setIsSubmittingResult(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Existing Lab Orders */}
      <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">science</span>
            <span>Chỉ định cận lâm sàng của ca khám ({visit.labOrders?.length || 0})</span>
          </h4>
          <span className="text-xs text-on-surface-variant font-label">
            Mã ca khám: #{visit.id}
          </span>
        </div>

        {visit.labOrders && visit.labOrders.length > 0 ? (
          <div className="space-y-3">
            {visit.labOrders.map((order, idx) => {
              const isResulted = order.status === 'RESULTED';
              return (
                <div key={order.id || idx} className="bg-white rounded-xl p-4 border border-outline-variant/20 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-variant/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-on-surface">
                        {idx + 1}. {order.testType}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isResulted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {isResulted ? 'ĐÃ CÓ KẾT QUẢ' : 'CHỜ KẾT QUẢ'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-on-surface-variant">
                        {new Date(order.orderedAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenResultModal(order)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        {isResulted ? 'Xem / Sửa kết quả' : 'Nhập kết quả Lab'}
                      </button>
                    </div>
                  </div>

                  {/* Results display */}
                  {order.results && order.results.length > 0 ? (
                    <div className="p-3 rounded-lg bg-surface-container-low text-xs space-y-1.5 border border-outline-variant/20">
                      <div className="font-bold text-primary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">task_alt</span>
                        <span>Kết luận cận lâm sàng:</span>
                      </div>
                      <p className="text-on-surface whitespace-pre-wrap leading-relaxed">
                        {order.results[0].resultText}
                      </p>
                      {order.results[0].resultFileUrl && (
                        <div className="pt-1 text-[11px] text-primary">
                          <a href={order.results[0].resultFileUrl} target="_blank" rel="noreferrer" className="underline hover:text-primary-container">
                            Xem tài liệu đính kèm (Ảnh X-quang/PDF)
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-on-surface-variant italic">
                      Chưa có kết quả từ phòng xét nghiệm. Bấm "Nhập kết quả Lab" để cập nhật thủ công.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-on-surface-variant text-sm border border-dashed border-outline-variant/40 rounded-xl">
            Chưa có chỉ định cận lâm sàng nào trong lượt khám này.
          </div>
        )}
      </div>

      {/* New Lab Order Form */}
      <form onSubmit={handleCreateOrder} className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">biotech</span>
          <h4 className="font-headline text-base font-bold text-on-surface">Chỉ định cận lâm sàng mới</h4>
        </div>

        {/* Quick select tags */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-on-surface-variant">
            Chọn nhanh các xét nghiệm phổ biến:
          </label>
          <div className="flex flex-wrap gap-2">
            {STANDARD_LAB_TESTS.map(t => (
              <button
                key={t.code}
                type="button"
                onClick={() => {
                  setSelectedTestType(t.name);
                  setCustomTestType('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  selectedTestType === t.name
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface-container-low text-on-surface border-outline-variant/40 hover:bg-surface-container'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-on-surface-variant">
            Hoặc nhập tên xét nghiệm / chẩn đoán hình ảnh khác:
          </label>
          <input
            type="text"
            value={customTestType || selectedTestType}
            onChange={(e) => {
              setCustomTestType(e.target.value);
              setSelectedTestType('');
            }}
            placeholder="vd: Nội soi dạ dày gây mê NBI, Chụp MRI sọ não 1.5 Tesla..."
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-outline-variant/50 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-label text-sm font-semibold shadow-xs hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>{isSubmitting ? 'Đang tạo...' : 'Tạo chỉ định cận lâm sàng'}</span>
          </button>
        </div>
      </form>

      {/* Result Modal */}
      {resultModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">assignment</span>
                <h4 className="font-headline text-base font-bold text-on-surface">
                  Kết quả CLS: {resultModal.order?.testType}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setResultModal({ open: false, order: null })}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveResult} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-on-surface-variant">
                  Kết luận & Mô tả chi tiết xét nghiệm *
                </label>
                <textarea
                  rows="4"
                  value={resultText}
                  onChange={(e) => setResultText(e.target.value)}
                  placeholder="Nhập kết quả xét nghiệm, chỉ số sinh hóa, hình ảnh tổn thương..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-on-surface-variant">
                  Đường dẫn file ảnh / PDF kết quả (tùy chọn)
                </label>
                <input
                  type="text"
                  value={resultFileUrl}
                  onChange={(e) => setResultFileUrl(e.target.value)}
                  placeholder="https://hospital-storage.com/results/xray-123.jpg"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-variant/20">
                <button
                  type="button"
                  onClick={() => setResultModal({ open: false, order: null })}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface text-sm font-semibold hover:bg-surface-container"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResult}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  <span>{isSubmittingResult ? 'Đang lưu...' : 'Lưu kết quả'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
