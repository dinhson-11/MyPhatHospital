import React, { useState, useMemo, useEffect } from 'react';
import { visitService, SEED_DRUGS } from '../../services/visitService';
import { aiAlertService } from '../../services/aiAlertService';
import { useToast } from '../../context/ToastContext';
import DrugInteractionAlert from './DrugInteractionAlert';

export default function PrescriptionForm({ visit, onPrescriptionAdded }) {
  const { showToast } = useToast();

  const [items, setItems] = useState([
    { drugId: '', dosage: '500mg', quantity: 10, instruction: 'Uống 1 viên x 2 lần/ngày sau bữa ăn' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // AI Safety Analysis State (Sprint 5)
  const [safetyAnalysis, setSafetyAnalysis] = useState(null);
  const [isCheckingSafety, setIsCheckingSafety] = useState(false);
  const [hasManualChecked, setHasManualChecked] = useState(false);

  // Lọc danh sách thuốc cho ô tìm kiếm
  const filteredDrugs = useMemo(() => {
    return visitService.getDrugs(searchTerm);
  }, [searchTerm]);

  // Danh sách các thuốc đang chọn trong đơn (kèm tên và thông tin đầy đủ)
  const selectedDrugs = useMemo(() => {
    return items
      .map(it => {
        if (!it.drugId) return null;
        const found = SEED_DRUGS.find(d => d.id === Number(it.drugId));
        return {
          id: Number(it.drugId),
          drugId: Number(it.drugId),
          code: found ? found.code : '',
          name: found ? found.name : `Thuốc #${it.drugId}`,
          dosage: it.dosage
        };
      })
      .filter(Boolean);
  }, [items]);

  // Tính tổng tiền thuốc dự kiến
  const estimatedTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      if (!item.drugId) return sum;
      const drug = SEED_DRUGS.find(d => d.id === Number(item.drugId));
      if (!drug) return sum;
      return sum + (drug.price * (Number(item.quantity) || 1));
    }, 0);
  }, [items]);

  // Tự động kiểm tra an toàn lâm sàng bằng AI khi danh sách thuốc thay đổi
  useEffect(() => {
    if (selectedDrugs.length === 0) {
      setSafetyAnalysis(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingSafety(true);
        const allergies = visit?.patient?.allergies || [];
        const result = await aiAlertService.checkPrescriptionSafety(visit?.id, selectedDrugs, allergies);
        setSafetyAnalysis(result);
      } catch (err) {
        console.error('Lỗi tự động kiểm tra an toàn AI:', err);
      } finally {
        setIsCheckingSafety(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [selectedDrugs, visit?.id, visit?.patient?.allergies]);

  const handleManualSafetyCheck = async () => {
    if (selectedDrugs.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 loại thuốc để kiểm tra an toàn', 'warning');
      return;
    }

    try {
      setIsCheckingSafety(true);
      setHasManualChecked(true);
      const allergies = visit?.patient?.allergies || [];
      const result = await aiAlertService.checkPrescriptionSafety(visit?.id, selectedDrugs, allergies);
      setSafetyAnalysis(result);

      if (result.has_warning) {
        showToast(
          `AI phát hiện ${result.interaction_count} tương tác thuốc và ${result.allergy_count} nguy cơ dị ứng!`,
          'warning'
        );
      } else {
        showToast('Đơn thuốc an toàn! AI không phát hiện tương tác hoặc dị ứng nguy hiểm.', 'success');
      }
    } catch (err) {
      showToast('Lỗi khi kiểm tra an toàn AI: ' + err.message, 'error');
    } finally {
      setIsCheckingSafety(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddRow = () => {
    setItems(prev => [
      ...prev,
      { drugId: '', dosage: '1 viên', quantity: 10, instruction: 'Uống sau bữa ăn' }
    ]);
  };

  const handleRemoveRow = (index) => {
    if (items.length === 1) {
      showToast('Đơn thuốc phải có ít nhất 1 dòng thuốc', 'warning');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const invalidItem = items.find(it => !it.drugId || !it.dosage || it.quantity < 1);
    if (invalidItem) {
      showToast('Vui lòng chọn thuốc, nhập liều lượng và số lượng hợp lệ cho tất cả dòng', 'error');
      return;
    }

    // Kiểm tra trùng thuốc
    const ids = items.map(it => it.drugId);
    if (new Set(ids).size !== ids.length) {
      showToast('Phát hiện thuốc bị kê trùng lặp trong đơn, vui lòng kiểm tra lại!', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await visitService.createPrescription(visit.id, { items });

      if (res && res.hasWarning) {
        showToast(
          'Đã lưu đơn thuốc, nhưng AI ghi nhận cảnh báo tương tác thuốc/dị ứng cần lưu ý!',
          'warning'
        );
      } else {
        showToast('Đã kê và lưu đơn thuốc điện tử thành công!', 'success');
      }

      if (onPrescriptionAdded) {
        onPrescriptionAdded(res);
      }

      // Reset form
      setItems([{ drugId: '', dosage: '500mg', quantity: 10, instruction: 'Uống sau bữa ăn' }]);
      setSafetyAnalysis(null);
      setHasManualChecked(false);
    } catch (err) {
      showToast(err.message || 'Không thể lưu đơn thuốc', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Existing Prescriptions in this Visit */}
      {visit.prescriptions && visit.prescriptions.length > 0 && (
        <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">prescriptions</span>
              <span>Đơn thuốc đã kê ({visit.prescriptions.length})</span>
            </h4>
            <span className="text-xs text-on-surface-variant font-label">
              Mã ca khám: #{visit.id}
            </span>
          </div>

          <div className="space-y-3">
            {visit.prescriptions.map((pres, pIdx) => (
              <div key={pres.id || pIdx} className="bg-white rounded-xl p-4 border border-outline-variant/20 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs text-on-surface-variant border-b border-surface-variant/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">Đơn #{pres.id || pIdx + 1}</span>
                    {pres.hasWarning && (
                      <span className="px-2 py-0.5 rounded-full bg-error-container text-error text-[10px] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">warning</span>
                        <span>Có cảnh báo AI</span>
                      </span>
                    )}
                  </div>
                  <span>{new Date(pres.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                </div>

                <div className="divide-y divide-surface-variant/10 text-sm">
                  {pres.items && pres.items.map((it, iIdx) => (
                    <div key={it.id || iIdx} className="py-2 flex items-start justify-between">
                      <div>
                        <div className="font-bold text-on-surface flex items-center gap-2">
                          <span>{iIdx + 1}. {it.drugName}</span>
                          <span className="text-xs font-normal px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                            {it.dosage}
                          </span>
                        </div>
                        <div className="text-xs text-on-surface-variant mt-0.5">
                          HD: {it.instruction || 'Theo chỉ dẫn của bác sĩ'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-primary">{it.quantity} {it.unit || 'viên'}</span>
                        {it.unitPrice && (
                          <div className="text-[11px] text-outline">
                            {(it.unitPrice * it.quantity).toLocaleString('vi-VN')} đ
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hiển thị cảnh báo AI đã ghi nhận trong đơn thuốc nếu có */}
                {pres.hasWarning && (pres.interactionWarnings?.length > 0 || pres.allergyAlerts?.length > 0) && (
                  <DrugInteractionAlert
                    interactions={pres.interactionWarnings}
                    allergyAlerts={pres.allergyAlerts}
                    disclaimer={pres.aiDisclaimer}
                  />
                )}

                {pres.estimatedTotalAmount > 0 && (
                  <div className="text-right pt-2 border-t border-surface-variant/20 text-xs">
                    <span className="text-on-surface-variant">Tổng tiền thuốc: </span>
                    <span className="font-bold text-primary text-sm">{pres.estimatedTotalAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Prescription Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">medication</span>
            <h4 className="font-headline text-base font-bold text-on-surface">Kê đơn thuốc điện tử</h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualSafetyCheck}
              disabled={isCheckingSafety || selectedDrugs.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary-container/80 text-on-secondary-container hover:bg-secondary-container font-label text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Phân tích tương tác thuốc & dị ứng bệnh nhân"
            >
              <span className={`material-symbols-outlined text-[16px] ${isCheckingSafety ? 'animate-spin' : ''}`}>
                {isCheckingSafety ? 'progress_activity' : 'smart_toy'}
              </span>
              <span>{isCheckingSafety ? 'AI đang phân tích...' : 'Kiểm tra an toàn (AI)'}</span>
            </button>

            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-label text-xs font-semibold transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Thêm loại thuốc</span>
            </button>
          </div>
        </div>

        {/* AI CLINICAL SAFETY ALERT BANNER (Sprint 5) */}
        {safetyAnalysis && (
          <DrugInteractionAlert
            safetyData={safetyAnalysis}
            showSafeStatus={hasManualChecked || selectedDrugs.length >= 2}
          />
        )}

        {/* Prescription Items List */}
        <div className="space-y-3">
          {items.map((item, index) => {
            const selectedDrug = SEED_DRUGS.find(d => d.id === Number(item.drugId));
            return (
              <div key={index} className="p-4 rounded-xl bg-slate-50 border border-outline-variant/30 space-y-3 relative group">
                <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
                  <span>Thuốc #{index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="text-error hover:text-error/80 p-1 rounded hover:bg-error-container/20 transition-colors"
                      title="Xóa thuốc này"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Chọn thuốc */}
                  <div className="md:col-span-6 space-y-1">
                    <label className="block text-xs font-medium text-on-surface-variant">
                      Tên thuốc / Biệt dược *
                    </label>
                    <select
                      value={item.drugId}
                      onChange={(e) => handleItemChange(index, 'drugId', e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-outline-variant/50 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    >
                      <option value="">-- Chọn danh mục thuốc --</option>
                      {SEED_DRUGS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code}) - {d.price.toLocaleString('vi-VN')} đ/{d.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Liều lượng */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="block text-xs font-medium text-on-surface-variant">
                      Liều dùng *
                    </label>
                    <input
                      type="text"
                      value={item.dosage}
                      onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                      placeholder="vd: 500mg, 1 viên"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-outline-variant/50 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    />
                  </div>

                  {/* Số lượng */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="block text-xs font-medium text-on-surface-variant">
                      Số lượng ({selectedDrug?.unit || 'viên'}) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-outline-variant/50 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    />
                  </div>

                  {/* Hướng dẫn sử dụng */}
                  <div className="md:col-span-12 space-y-1">
                    <label className="block text-xs font-medium text-on-surface-variant">
                      Hướng dẫn sử dụng & đường dùng
                    </label>
                    <input
                      type="text"
                      value={item.instruction}
                      onChange={(e) => handleItemChange(index, 'instruction', e.target.value)}
                      placeholder="vd: Uống 1 viên x 2 lần/ngày sau khi ăn sáng và tối"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-outline-variant/50 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Total and Submit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-surface-variant/20">
          <div>
            <span className="text-xs text-on-surface-variant font-label">Tổng tiền thuốc ước tính:</span>
            <div className="font-headline text-lg font-bold text-primary">
              {estimatedTotal.toLocaleString('vi-VN')} đ
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddRow}
              className="px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface font-label text-sm font-semibold hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              + Thêm thuốc
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-label text-sm font-semibold shadow-xs hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu đơn thuốc điện tử'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
