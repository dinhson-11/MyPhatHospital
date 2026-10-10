import React, { useState } from 'react';
import { visitService, STANDARD_LAB_TESTS, LAB_ORDER_STATUS_LABELS, isHttpUrl } from '../../services/visitService';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/format';
import Modal from '../common/Modal';

const normalizeTest = (t) => String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Chỉ định & kết quả cận lâm sàng của ca khám.
 * - Chặn chỉ định trùng một xét nghiệm đang chờ kết quả.
 * - Đường dẫn tệp kết quả chỉ được dùng làm liên kết khi là http(s).
 *
 * Props: visit, readOnly (không cho tạo chỉ định), readOnlyReason, canEnterResults, onOrderAdded, onResultUpdated.
 */
export default function LabOrderPanel({
  visit,
  readOnly = false,
  readOnlyReason,
  canEnterResults = true,
  onOrderAdded,
  onResultUpdated
}) {
  const { showToast } = useToast();

  const [testType, setTestType] = useState('');
  const [orderError, setOrderError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [resultOrder, setResultOrder] = useState(null);
  const [resultText, setResultText] = useState('');
  const [resultFileUrl, setResultFileUrl] = useState('');
  const [resultErrors, setResultErrors] = useState({});
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);

  const orders = visit?.labOrders || [];
  const pendingTests = new Set(orders.filter((o) => o.status !== 'RESULTED').map((o) => normalizeTest(o.testType)));

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const finalTest = testType.trim();
    if (!finalTest) {
      setOrderError('Vui lòng chọn hoặc nhập tên xét nghiệm / chẩn đoán hình ảnh');
      return;
    }
    if (pendingTests.has(normalizeTest(finalTest))) {
      setOrderError(`"${finalTest}" đã được chỉ định và đang chờ kết quả – không tạo chỉ định trùng.`);
      return;
    }
    setIsSubmitting(true);
    setOrderError('');
    try {
      const created = await visitService.createLabOrder(visit.id, { testType: finalTest });
      showToast(`Đã chỉ định: ${finalTest}`, 'success');
      setTestType('');
      onOrderAdded?.(created);
    } catch (err) {
      setOrderError(err.message);
      showToast(err.message || 'Không tạo được chỉ định cận lâm sàng', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openResult = (order) => {
    const latest = order.results?.length ? order.results[order.results.length - 1] : null;
    setResultOrder(order);
    setResultText(latest?.resultText || '');
    setResultFileUrl(latest?.resultFileUrl || '');
    setResultErrors({});
  };

  const closeResult = () => {
    if (isSubmittingResult) return;
    setResultOrder(null);
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!resultText.trim()) errors.resultText = 'Vui lòng nhập kết luận / kết quả';
    if (resultFileUrl.trim() && !isHttpUrl(resultFileUrl.trim())) {
      errors.resultFileUrl = 'Đường dẫn phải bắt đầu bằng http:// hoặc https://';
    }
    setResultErrors(errors);
    if (Object.keys(errors).length) return;

    setIsSubmittingResult(true);
    try {
      const saved = await visitService.updateLabResult(resultOrder.id, {
        resultText: resultText.trim(),
        resultFileUrl: resultFileUrl.trim()
      });
      showToast('Đã lưu kết quả cận lâm sàng.', 'success');
      const orderId = resultOrder.id;
      setResultOrder(null);
      onResultUpdated?.(orderId, saved);
    } catch (err) {
      setResultErrors({ form: err.message });
      showToast(err.message || 'Không lưu được kết quả', 'error');
    } finally {
      setIsSubmittingResult(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4" aria-labelledby="lab-list-title">
        <h4 id="lab-list-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">science</span>
          Chỉ định cận lâm sàng của ca khám ({orders.length})
        </h4>

        {orders.length > 0 ? (
          <ol className="space-y-3">
            {orders.map((order, idx) => {
              const isResulted = order.status === 'RESULTED';
              const latest = order.results?.length ? order.results[order.results.length - 1] : null;
              const safeUrl = latest?.resultFileUrl && isHttpUrl(latest.resultFileUrl) ? latest.resultFileUrl : null;
              return (
                <li key={order.id || idx} className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{idx + 1}. {order.testType}</span>
                      <span className={`badge ${isResulted ? 'badge-success' : 'badge-warning'}`}>
                        {LAB_ORDER_STATUS_LABELS[order.status] || 'Chờ kết quả'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-slate-600">{formatDateTime(order.orderedAt)}</span>
                      {canEnterResults && (
                        <button type="button" onClick={() => openResult(order)} className="btn btn-soft btn-sm">
                          {isResulted ? 'Cập nhật kết quả' : 'Nhập kết quả'}
                        </button>
                      )}
                    </div>
                  </div>

                  {latest ? (
                    <div className="p-3 rounded-lg bg-slate-50 text-[13px] space-y-1.5 border border-slate-200">
                      <div className="font-bold text-primary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">task_alt</span>
                        Kết quả ({formatDateTime(latest.resultedAt)}):
                      </div>
                      <p className="text-slate-900 whitespace-pre-wrap leading-relaxed">{latest.resultText}</p>
                      {safeUrl && (
                        <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-[13px]">
                          Xem tệp kết quả đính kèm
                        </a>
                      )}
                      {latest.resultFileUrl && !safeUrl && (
                        <p className="text-xs text-amber-800">Tệp đính kèm có đường dẫn không hợp lệ nên không mở được.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[13px] text-slate-600 italic">Chưa có kết quả từ phòng xét nghiệm.</p>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="p-6 text-center text-slate-600 text-sm border border-dashed border-slate-300 rounded-xl">
            Chưa có chỉ định cận lâm sàng nào trong lượt khám này.
          </p>
        )}
      </section>

      {readOnly ? (
        <p className="p-4 rounded-xl border border-dashed border-slate-300 text-sm text-slate-600 bg-white">
          {readOnlyReason || 'Không thể tạo thêm chỉ định cho ca khám này.'}
        </p>
      ) : (
        <form onSubmit={handleCreateOrder} noValidate className="bg-white rounded-2xl p-6 border border-slate-200 space-y-5" aria-labelledby="lab-form-title">
          <h4 id="lab-form-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]" aria-hidden="true">biotech</span>
            Chỉ định cận lâm sàng mới
          </h4>

          <fieldset className="space-y-2">
            <legend className="form-label mb-2">Chọn nhanh xét nghiệm phổ biến</legend>
            <div className="flex flex-wrap gap-2">
              {STANDARD_LAB_TESTS.map((t) => {
                const selected = testType === t.name;
                const pending = pendingTests.has(normalizeTest(t.name));
                return (
                  <button
                    key={t.code}
                    type="button"
                    aria-pressed={selected}
                    disabled={pending}
                    title={pending ? 'Đã chỉ định, đang chờ kết quả' : undefined}
                    onClick={() => { setTestType(t.name); setOrderError(''); }}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      selected ? 'bg-primary text-white border-primary' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {t.name}{pending ? ' (đang chờ)' : ''}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="form-field">
            <label htmlFor={`lab-test-${visit?.id}`} className="form-label">Tên xét nghiệm / chẩn đoán hình ảnh</label>
            <input
              id={`lab-test-${visit?.id}`}
              type="text"
              value={testType}
              onChange={(e) => { setTestType(e.target.value); setOrderError(''); }}
              placeholder="VD: Nội soi dạ dày, Chụp MRI sọ não…"
              aria-invalid={orderError ? 'true' : undefined}
              aria-describedby={orderError ? 'lab-order-error' : undefined}
              className={`input ${orderError ? 'is-error' : ''}`}
            />
            {orderError && <p id="lab-order-error" role="alert" className="form-error">{orderError}</p>}
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
              {isSubmitting ? 'Đang tạo…' : 'Tạo chỉ định'}
            </button>
          </div>
        </form>
      )}

      <Modal
        isOpen={Boolean(resultOrder)}
        onClose={closeResult}
        title="Kết quả cận lâm sàng"
        subtitle={resultOrder?.testType}
        icon="assignment"
        size="md"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={closeResult} disabled={isSubmittingResult}>Đóng</button>
            <button type="submit" form="lab-result-form" className="btn btn-primary" disabled={isSubmittingResult}>
              <span className="material-symbols-outlined" aria-hidden="true">check</span>
              {isSubmittingResult ? 'Đang lưu…' : 'Lưu kết quả'}
            </button>
          </>
        )}
      >
        <form id="lab-result-form" onSubmit={handleSaveResult} noValidate className="space-y-4">
          <div className="form-field">
            <label htmlFor="lab-result-text" className="form-label">Kết luận & mô tả kết quả <span className="required">*</span></label>
            <textarea
              id="lab-result-text"
              data-autofocus
              rows={5}
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              aria-invalid={resultErrors.resultText ? 'true' : undefined}
              aria-describedby={resultErrors.resultText ? 'lab-result-text-err' : undefined}
              className={`textarea ${resultErrors.resultText ? 'is-error' : ''}`}
            />
            {resultErrors.resultText && <p id="lab-result-text-err" className="form-error">{resultErrors.resultText}</p>}
          </div>
          <div className="form-field">
            <label htmlFor="lab-result-url" className="form-label">Đường dẫn tệp kết quả (không bắt buộc)</label>
            <input
              id="lab-result-url"
              type="url"
              value={resultFileUrl}
              onChange={(e) => setResultFileUrl(e.target.value)}
              placeholder="https://…"
              aria-invalid={resultErrors.resultFileUrl ? 'true' : undefined}
              aria-describedby={resultErrors.resultFileUrl ? 'lab-result-url-err' : undefined}
              className={`input ${resultErrors.resultFileUrl ? 'is-error' : ''}`}
            />
            {resultErrors.resultFileUrl && <p id="lab-result-url-err" className="form-error">{resultErrors.resultFileUrl}</p>}
          </div>
          {resultErrors.form && (
            <p role="alert" className="text-sm p-3 rounded-xl bg-red-50 border border-red-200 text-red-900">{resultErrors.form}</p>
          )}
        </form>
      </Modal>
    </div>
  );
}
