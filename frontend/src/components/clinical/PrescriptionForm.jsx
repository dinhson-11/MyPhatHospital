import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { visitService, isDrugExpired } from '../../services/visitService';
import { aiAlertService, getBlockingFindings } from '../../services/aiAlertService';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../common/ConfirmDialog';
import { formatDate, formatDateTime, formatVND } from '../../utils/format';
import DrugInteractionAlert from './DrugInteractionAlert';

const MAX_OVERRIDE_LENGTH = 500;
let rowSeq = 0;
const newRow = () => ({ key: `rx-${(rowSeq += 1)}`, drugId: '', dosage: '', quantity: '', instruction: '' });
const rowHasData = (r) => Boolean(r.drugId || r.dosage.trim() || String(r.quantity).trim() || r.instruction.trim());

/**
 * Kê đơn thuốc điện tử.
 * - Danh mục thuốc lấy từ kho thật (không dùng danh mục giả có thể lệch mã thuốc).
 * - Kiểm tra an toàn (tương tác + dị ứng) tự động khi đổi thuốc; nút lưu bị khóa trong lúc kiểm tra.
 * - Cảnh báo nghiêm trọng hoặc backend trả PRESCRIPTION_SAFETY_BLOCK → bắt buộc nhập lý do lâm sàng
 *   (overrideReason) mới được lưu; hủy hộp thoại → không lưu gì.
 *
 * Props: visit, allergies (dị ứng thật của bệnh nhân – cùng nguồn với thanh cảnh báo),
 * allergiesStatus, readOnly, readOnlyReason, onPrescriptionAdded.
 */
export default function PrescriptionForm({
  visit,
  allergies = [],
  allergiesStatus = 'ready',
  readOnly = false,
  readOnlyReason,
  onPrescriptionAdded
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [catalog, setCatalog] = useState({ status: 'loading', items: [], error: '' });
  const [rows, setRows] = useState(() => [newRow()]);
  const [rowErrors, setRowErrors] = useState({});
  const [drugFilter, setDrugFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [safetyAnalysis, setSafetyAnalysis] = useState(null);
  const [isCheckingSafety, setIsCheckingSafety] = useState(false);
  const [hasManualChecked, setHasManualChecked] = useState(false);

  const loadCatalog = useCallback(async (force = false) => {
    setCatalog((prev) => ({ ...prev, status: 'loading', error: '' }));
    try {
      const items = await visitService.getDrugCatalog({ force });
      setCatalog({ status: 'ready', items, error: '' });
    } catch (err) {
      setCatalog({ status: 'error', items: [], error: err.message });
    }
  }, []);

  useEffect(() => {
    if (!readOnly) loadCatalog();
  }, [readOnly, loadCatalog]);

  const drugById = useMemo(() => {
    const map = new Map();
    catalog.items.forEach((d) => map.set(String(d.id), d));
    return map;
  }, [catalog.items]);

  // Khóa kiểm tra an toàn theo tập thuốc đã chọn (không chạy lại khi chỉ sửa liều dùng)
  const drugKey = rows.map((r) => r.drugId).filter(Boolean).sort().join(',');
  const selectedDrugs = useMemo(() => drugKey
    .split(',')
    .filter(Boolean)
    .map((id) => {
      const d = drugById.get(id);
      return { id: Number(id), drugId: Number(id), code: d?.code || '', name: d?.name || `Thuốc #${id}` };
    }), [drugKey, drugById]);

  const allergiesRef = useRef(allergies);
  useEffect(() => { allergiesRef.current = allergies; }, [allergies]);
  const allergyKey = (Array.isArray(allergies) ? allergies : []).map((a) => `${a?.allergen || a}:${a?.severity || ''}`).join('|');

  useEffect(() => {
    if (readOnly || selectedDrugs.length === 0) {
      setSafetyAnalysis(null);
      setIsCheckingSafety(false);
      return undefined;
    }
    let cancelled = false;
    setIsCheckingSafety(true);
    const timer = setTimeout(async () => {
      try {
        const result = await aiAlertService.checkPrescriptionSafety(visit?.id, selectedDrugs, allergiesRef.current);
        if (!cancelled) setSafetyAnalysis(result);
      } catch {
        if (!cancelled) setSafetyAnalysis(null);
      } finally {
        if (!cancelled) setIsCheckingSafety(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedDrugs, visit?.id, allergyKey, readOnly]);

  const estimatedTotal = useMemo(() => rows.reduce((sum, r) => {
    const d = drugById.get(String(r.drugId));
    const qty = Number(r.quantity);
    return d && Number.isFinite(qty) && qty > 0 ? sum + Number(d.price || 0) * qty : sum;
  }, 0), [rows, drugById]);

  const handleManualSafetyCheck = async () => {
    if (selectedDrugs.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 thuốc để kiểm tra an toàn', 'warning');
      return;
    }
    setIsCheckingSafety(true);
    setHasManualChecked(true);
    try {
      const result = await aiAlertService.checkPrescriptionSafety(visit?.id, selectedDrugs, allergies);
      setSafetyAnalysis(result);
      if (result.has_warning) {
        showToast(`Phát hiện ${result.interaction_count} tương tác thuốc và ${result.allergy_count} nguy cơ dị ứng.`, 'warning');
      } else {
        showToast('Không phát hiện tương tác hoặc dị ứng nguy hiểm.', 'success');
      }
    } catch (err) {
      showToast(`Không kiểm tra được an toàn đơn thuốc: ${err.message}`, 'error');
    } finally {
      setIsCheckingSafety(false);
    }
  };

  const updateRow = (key, field, value) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    setRowErrors((prev) => (prev[key]?.[field] ? { ...prev, [key]: { ...prev[key], [field]: undefined } } : prev));
    setSubmitError('');
  };

  const handleAddRow = () => setRows((prev) => [...prev, newRow()]);

  const handleRemoveRow = async (row, index) => {
    if (rows.length === 1) return;
    if (rowHasData(row)) {
      const drugName = drugById.get(String(row.drugId))?.name;
      const ok = await confirm({
        title: 'Xóa dòng thuốc?',
        message: `Xóa ${drugName ? `"${drugName}"` : `dòng thuốc #${index + 1}`} khỏi đơn đang soạn?`,
        tone: 'warning',
        confirmText: 'Xóa dòng'
      });
      if (!ok) return;
    }
    setRows((prev) => prev.filter((r) => r.key !== row.key));
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[row.key];
      return next;
    });
  };

  const validateRows = () => {
    const errors = {};
    const seen = new Set();
    rows.forEach((r) => {
      const e = {};
      if (!r.drugId) e.drugId = 'Chọn thuốc';
      else if (seen.has(r.drugId)) e.drugId = 'Thuốc bị trùng với dòng khác';
      else {
        const d = drugById.get(String(r.drugId));
        if (d && isDrugExpired(d)) e.drugId = 'Thuốc đã hết hạn sử dụng';
      }
      if (r.drugId) seen.add(r.drugId);
      if (!r.dosage.trim()) e.dosage = 'Nhập liều dùng';
      const qty = Number(r.quantity);
      if (String(r.quantity).trim() === '' || !Number.isInteger(qty) || qty < 1) e.quantity = 'Số lượng là số nguyên ≥ 1';
      else if (qty > 1000) e.quantity = 'Số lượng tối đa 1000';
      if (Object.keys(e).length) errors[r.key] = e;
    });
    return errors;
  };

  const askOverrideReason = async (details) => {
    const reason = await confirm({
      title: 'Đơn thuốc có cảnh báo an toàn nghiêm trọng',
      message: 'Hệ thống phát hiện nguy cơ cho người bệnh. Nếu vẫn kê đơn, bác sĩ phải ghi rõ lý do lâm sàng – lý do được lưu kèm đơn thuốc.',
      details,
      tone: 'danger',
      requireReason: true,
      reasonLabel: 'Lý do lâm sàng vẫn kê đơn',
      reasonMinLength: 10,
      confirmText: 'Vẫn kê đơn',
      cancelText: 'Quay lại sửa đơn'
    });
    if (!reason) return null;
    if (reason.length > MAX_OVERRIDE_LENGTH) {
      showToast(`Lý do tối đa ${MAX_OVERRIDE_LENGTH} ký tự – đơn thuốc chưa được lưu.`, 'error');
      return null;
    }
    return reason;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isCheckingSafety || readOnly) return;
    const errors = validateRows();
    setRowErrors(errors);
    if (Object.keys(errors).length > 0) {
      showToast('Đơn thuốc chưa hợp lệ – vui lòng kiểm tra các ô được đánh dấu', 'error');
      return;
    }

    const items = rows.map((r) => ({
      drugId: Number(r.drugId),
      dosage: r.dosage.trim(),
      quantity: Number(r.quantity),
      instruction: r.instruction.trim()
    }));

    let overrideReason = null;
    const findings = getBlockingFindings(safetyAnalysis, allergies);
    if (findings.length > 0) {
      overrideReason = await askOverrideReason(findings);
      if (!overrideReason) {
        showToast('Đơn thuốc chưa được lưu.', 'info');
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      let saved;
      try {
        saved = await visitService.createPrescription(visit.id, { items, overrideReason: overrideReason || undefined });
      } catch (err) {
        if (err?.errorCode !== 'PRESCRIPTION_SAFETY_BLOCK' || overrideReason) throw err;
        const reason = await askOverrideReason(err.details?.length ? err.details : [err.message]);
        if (!reason) {
          showToast('Đơn thuốc chưa được lưu.', 'info');
          return;
        }
        saved = await visitService.createPrescription(visit.id, { items, overrideReason: reason });
      }

      showToast(saved?.overrideReason
        ? 'Đã lưu đơn thuốc kèm lý do vượt cảnh báo an toàn.'
        : 'Đã lưu đơn thuốc điện tử.', 'success');
      onPrescriptionAdded?.(saved);
      setRows([newRow()]);
      setRowErrors({});
      setSafetyAnalysis(null);
      setHasManualChecked(false);
    } catch (err) {
      setSubmitError(err.message);
      showToast(err.message || 'Không lưu được đơn thuốc', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filterText = drugFilter.trim().toLowerCase();
  const optionsFor = (row) => catalog.items.filter((d) =>
    String(d.id) === String(row.drugId)
    || !filterText
    || String(d.name || '').toLowerCase().includes(filterText)
    || String(d.code || '').toLowerCase().includes(filterText));

  const chosenElsewhere = (row) => new Set(rows.filter((r) => r.key !== row.key && r.drugId).map((r) => String(r.drugId)));

  const prescriptions = visit?.prescriptions || [];

  return (
    <div className="space-y-6">
      {prescriptions.length > 0 && (
        <section className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4" aria-labelledby="rx-existing-title">
          <div className="flex items-center justify-between">
            <h4 id="rx-existing-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">prescriptions</span>
              Đơn thuốc đã kê ({prescriptions.length})
            </h4>
          </div>

          <ul className="space-y-3">
            {prescriptions.map((pres, pIdx) => (
              <li key={pres.id || pIdx} className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-[13px] text-slate-600 border-b border-slate-100 pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-primary">Đơn #{pres.id || pIdx + 1}</span>
                    {pres.overrideReason && (
                      <span className="badge badge-error">
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">gpp_maybe</span>
                        Kê vượt cảnh báo
                      </span>
                    )}
                  </div>
                  <span>{formatDateTime(pres.createdAt)}</span>
                </div>

                <ol className="divide-y divide-slate-100 text-sm">
                  {(pres.items || []).map((it, iIdx) => (
                    <li key={it.id || iIdx} className="py-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                          <span>{iIdx + 1}. {it.drugName}</span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">{it.dosage}</span>
                        </div>
                        {it.instruction && <div className="text-[13px] text-slate-600 mt-0.5">Cách dùng: {it.instruction}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-primary">{it.quantity} {it.unit || ''}</span>
                        {it.unitPrice != null && (
                          <div className="text-xs text-slate-500">{formatVND(Number(it.unitPrice) * Number(it.quantity || 0))}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>

                {pres.overrideReason && (
                  <p className="text-[13px] p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-900">
                    <strong>Lý do vẫn kê đơn: </strong>{pres.overrideReason}
                  </p>
                )}

                {(pres.interactionWarnings?.length > 0 || pres.allergyAlerts?.length > 0) && (
                  <DrugInteractionAlert
                    interactions={pres.interactionWarnings}
                    allergyAlerts={pres.allergyAlerts}
                    disclaimer={pres.aiDisclaimer}
                  />
                )}

                {Number(pres.estimatedTotalAmount) > 0 && (
                  <div className="text-right pt-2 border-t border-slate-100 text-[13px]">
                    <span className="text-slate-600">Tổng tiền thuốc: </span>
                    <span className="font-bold text-primary text-sm">{formatVND(pres.estimatedTotalAmount)}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {readOnly ? (
        <p className="p-4 rounded-xl border border-dashed border-slate-300 text-sm text-slate-600 bg-white">
          {readOnlyReason || 'Không thể kê thêm đơn thuốc cho ca khám này.'}
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl p-6 border border-slate-200 space-y-5" aria-labelledby="rx-form-title">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h4 id="rx-form-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]" aria-hidden="true">medication</span>
              Kê đơn thuốc điện tử
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleManualSafetyCheck}
                disabled={isCheckingSafety || selectedDrugs.length === 0}
                className="btn btn-soft btn-sm"
              >
                <span className={`material-symbols-outlined ${isCheckingSafety ? 'animate-spin' : ''}`} aria-hidden="true">
                  {isCheckingSafety ? 'progress_activity' : 'health_and_safety'}
                </span>
                {isCheckingSafety ? 'Đang kiểm tra an toàn…' : 'Kiểm tra an toàn'}
              </button>
              <button type="button" onClick={handleAddRow} className="btn btn-secondary btn-sm">
                <span className="material-symbols-outlined" aria-hidden="true">add</span>
                Thêm loại thuốc
              </button>
            </div>
          </div>

          {allergiesStatus === 'error' && (
            <p role="alert" className="text-[13px] p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950">
              Chưa tải được tiền sử dị ứng của bệnh nhân – kết quả kiểm tra dị ứng có thể chưa đầy đủ.
            </p>
          )}

          {safetyAnalysis && (
            <DrugInteractionAlert
              safetyData={safetyAnalysis}
              showSafeStatus={hasManualChecked || selectedDrugs.length >= 2}
            />
          )}

          {catalog.status === 'error' ? (
            <div role="alert" className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-sm flex flex-wrap items-center gap-3">
              <span>{catalog.error || 'Không tải được danh mục thuốc.'}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => loadCatalog(true)}>
                <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
                Thử lại
              </button>
            </div>
          ) : (
            <div className="form-field max-w-md">
              <label htmlFor="rx-drug-filter" className="form-label">Lọc danh mục thuốc</label>
              <input
                id="rx-drug-filter"
                type="search"
                value={drugFilter}
                onChange={(e) => setDrugFilter(e.target.value)}
                placeholder="Nhập tên hoặc mã thuốc để thu gọn danh sách chọn"
                className="input"
              />
              {catalog.status === 'loading' && <p className="form-hint">Đang tải danh mục thuốc…</p>}
            </div>
          )}

          <ol className="space-y-3">
            {rows.map((row, index) => {
              const errs = rowErrors[row.key] || {};
              const drug = drugById.get(String(row.drugId));
              const taken = chosenElsewhere(row);
              const p = row.key;
              return (
                <li key={row.key} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-[13px] font-semibold text-slate-700">
                    <span>Thuốc #{index + 1}</span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row, index)}
                        className="btn btn-ghost btn-sm btn-icon text-red-700"
                        aria-label={`Xóa thuốc #${index + 1}`}
                        title="Xóa dòng thuốc"
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-6 form-field">
                      <label htmlFor={`${p}-drug`} className="form-label">Thuốc <span className="required">*</span></label>
                      <select
                        id={`${p}-drug`}
                        value={row.drugId}
                        onChange={(e) => updateRow(row.key, 'drugId', e.target.value)}
                        disabled={catalog.status !== 'ready'}
                        aria-invalid={errs.drugId ? 'true' : undefined}
                        aria-describedby={errs.drugId ? `${p}-drug-err` : undefined}
                        className={`select ${errs.drugId ? 'is-error' : ''}`}
                      >
                        <option value="">-- Chọn thuốc trong kho --</option>
                        {optionsFor(row).map((d) => {
                          const expired = isDrugExpired(d);
                          const dup = taken.has(String(d.id));
                          const outOfStock = Number(d.stockQuantity) <= 0;
                          const suffix = expired
                            ? ` – hết hạn ${formatDate(d.expiryDate)}`
                            : dup ? ' – đã có trong đơn' : outOfStock ? ' – hết hàng' : '';
                          return (
                            <option key={d.id} value={String(d.id)} disabled={expired || dup}>
                              {d.name} ({d.code}) – {formatVND(d.price)}/{d.unit}{suffix}
                            </option>
                          );
                        })}
                      </select>
                      {errs.drugId && <p id={`${p}-drug-err`} className="form-error">{errs.drugId}</p>}
                      {drug && Number(drug.stockQuantity) <= 0 && !errs.drugId && (
                        <p className="form-hint text-amber-800">Kho hiện hết thuốc này – nhà thuốc có thể chưa cấp phát được.</p>
                      )}
                    </div>

                    <div className="md:col-span-3 form-field">
                      <label htmlFor={`${p}-dosage`} className="form-label">Liều dùng <span className="required">*</span></label>
                      <input
                        id={`${p}-dosage`}
                        type="text"
                        value={row.dosage}
                        onChange={(e) => updateRow(row.key, 'dosage', e.target.value)}
                        placeholder="VD: 1 viên/lần"
                        aria-invalid={errs.dosage ? 'true' : undefined}
                        aria-describedby={errs.dosage ? `${p}-dosage-err` : undefined}
                        className={`input ${errs.dosage ? 'is-error' : ''}`}
                      />
                      {errs.dosage && <p id={`${p}-dosage-err`} className="form-error">{errs.dosage}</p>}
                    </div>

                    <div className="md:col-span-3 form-field">
                      <label htmlFor={`${p}-qty`} className="form-label">
                        Số lượng{drug?.unit ? ` (${drug.unit})` : ''} <span className="required">*</span>
                      </label>
                      <input
                        id={`${p}-qty`}
                        type="number"
                        min="1"
                        max="1000"
                        step="1"
                        inputMode="numeric"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.key, 'quantity', e.target.value)}
                        aria-invalid={errs.quantity ? 'true' : undefined}
                        aria-describedby={errs.quantity ? `${p}-qty-err` : undefined}
                        className={`input ${errs.quantity ? 'is-error' : ''}`}
                      />
                      {errs.quantity && <p id={`${p}-qty-err`} className="form-error">{errs.quantity}</p>}
                    </div>

                    <div className="md:col-span-12 form-field">
                      <label htmlFor={`${p}-instruction`} className="form-label">Cách dùng</label>
                      <input
                        id={`${p}-instruction`}
                        type="text"
                        value={row.instruction}
                        onChange={(e) => updateRow(row.key, 'instruction', e.target.value)}
                        placeholder="VD: Uống sau ăn sáng và tối"
                        className="input"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {submitError && (
            <p role="alert" className="text-sm p-3 rounded-xl bg-red-50 border border-red-200 text-red-900">{submitError}</p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div>
              <span className="text-[13px] text-slate-600">Tổng tiền thuốc ước tính</span>
              <div className="text-lg font-bold text-primary">{formatVND(estimatedTotal)}</div>
            </div>
            <div className="flex items-center gap-3">
              {isCheckingSafety && (
                <span className="text-[13px] text-slate-600" aria-live="polite">Đang kiểm tra an toàn đơn thuốc…</span>
              )}
              <button
                type="submit"
                disabled={isSubmitting || isCheckingSafety || catalog.status !== 'ready'}
                className="btn btn-primary"
              >
                <span className="material-symbols-outlined" aria-hidden="true">save</span>
                {isSubmitting ? 'Đang lưu…' : 'Lưu đơn thuốc'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
