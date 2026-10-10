import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nurseService, isLabValueAbnormal, buildLabResultText } from '../../services/nurseService';
import {
  createEmptyVitalsForm,
  vitalsToForm,
  validateVitalSigns,
  toVitalSignsPayload,
  getVitalWarnings,
  isHttpUrl,
  LAB_ORDER_STATUS_LABELS
} from '../../services/visitService';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../common/ConfirmDialog';
import Modal from '../common/Modal';
import VitalSignsForm from '../clinical/VitalSignsForm';
import { formatDateTime, formatGender } from '../../utils/format';

const TABS = [
  { id: 'vitals', label: 'Đo sinh hiệu', icon: 'monitor_heart' },
  { id: 'lab', label: 'Kết quả cận lâm sàng', icon: 'biotech' }
];

const EMPTY_LAB_FORM = { value: '', unit: '', referenceRange: '', abnormalOverride: null, conclusion: '', fileUrl: '' };

/**
 * Trạm điều dưỡng & xét nghiệm.
 * - Hàng đợi = ca khám đang diễn ra (dữ liệu thật). Không còn số liệu "bình thường" điền sẵn.
 * - Đổi bệnh nhân → biểu mẫu sinh hiệu được nạp lại theo đúng bệnh nhân đó (không mang số của người trước).
 * - Kết quả xét nghiệm: tự đánh giá bất thường khi giá trị và khoảng tham chiếu đều là số (cho phép chỉnh tay).
 */
export const NurseStationModal = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('vitals');
  const tabRefs = useRef({});

  const [queue, setQueue] = useState({ status: 'idle', items: [], error: '' });
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [vitalsForm, setVitalsForm] = useState(createEmptyVitalsForm);
  const [vitalsBaseline, setVitalsBaseline] = useState(createEmptyVitalsForm);
  const [vitalErrors, setVitalErrors] = useState({});
  const [savingVitals, setSavingVitals] = useState(false);

  const [labs, setLabs] = useState({ status: 'idle', items: [], error: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [labForm, setLabForm] = useState(EMPTY_LAB_FORM);
  const [labErrors, setLabErrors] = useState({});
  const [savingLab, setSavingLab] = useState(false);

  const loadQueue = useCallback(async () => {
    setQueue((prev) => ({ ...prev, status: 'loading', error: '' }));
    try {
      const items = await nurseService.getVitalsQueue();
      setQueue({ status: 'ready', items, error: '' });
    } catch (err) {
      setQueue({ status: 'error', items: [], error: err.message });
    }
  }, []);

  const loadLabs = useCallback(async () => {
    setLabs((prev) => ({ ...prev, status: 'loading', error: '' }));
    try {
      const items = await nurseService.getPendingLabOrders();
      setLabs({ status: 'ready', items, error: '' });
    } catch (err) {
      setLabs({ status: 'error', items: [], error: err.message });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedVisit(null);
    setSelectedOrder(null);
    setVitalsForm(createEmptyVitalsForm());
    setVitalsBaseline(createEmptyVitalsForm());
    setLabForm(EMPTY_LAB_FORM);
    loadQueue();
    loadLabs();
  }, [isOpen, loadQueue, loadLabs]);

  const vitalsDirty = JSON.stringify(vitalsForm) !== JSON.stringify(vitalsBaseline);
  const labDirty = JSON.stringify(labForm) !== JSON.stringify(EMPTY_LAB_FORM);

  const vitalCheck = useMemo(() => validateVitalSigns(vitalsForm), [vitalsForm]);
  const vitalWarnings = useMemo(() => getVitalWarnings(vitalCheck.values), [vitalCheck.values]);

  const autoAbnormal = isLabValueAbnormal(labForm.value, labForm.referenceRange);
  const isAbnormal = labForm.abnormalOverride ?? autoAbnormal ?? false;

  const discardOk = (dirty) => (dirty
    ? confirm({ title: 'Bỏ dữ liệu đang nhập?', message: 'Số liệu chưa lưu của bệnh nhân hiện tại sẽ bị bỏ.', tone: 'warning', confirmText: 'Bỏ dữ liệu', cancelText: 'Ở lại' })
    : Promise.resolve(true));

  const handleClose = async () => {
    if (savingVitals || savingLab) return;
    if (!(await discardOk(vitalsDirty || labDirty))) return;
    onClose?.();
  };

  const handleSelectVisit = async (item) => {
    if (selectedVisit?.visitId === item.visitId) return;
    if (!(await discardOk(vitalsDirty))) return;
    const next = vitalsToForm(item.vitals);
    setSelectedVisit(item);
    setVitalsForm(next);
    setVitalsBaseline(next);
    setVitalErrors({});
  };

  const handleVitalChange = (key, value) => {
    setVitalsForm((prev) => ({ ...prev, [key]: value }));
    setVitalErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSaveVitals = async (e) => {
    e.preventDefault();
    if (!selectedVisit || savingVitals) return;
    setVitalErrors(vitalCheck.errors);
    if (Object.keys(vitalCheck.errors).length > 0) {
      showToast('Chỉ số sinh hiệu chưa hợp lệ – vui lòng kiểm tra các ô được đánh dấu.', 'error');
      return;
    }
    const payload = toVitalSignsPayload(vitalCheck.values);
    if (!payload) {
      showToast('Chưa nhập chỉ số sinh hiệu nào.', 'warning');
      return;
    }
    setSavingVitals(true);
    try {
      await nurseService.saveVitals(selectedVisit.visitId, payload);
      showToast(`Đã lưu sinh hiệu cho ${selectedVisit.fullName}.`, 'success');
      setSelectedVisit(null);
      setVitalsForm(createEmptyVitalsForm());
      setVitalsBaseline(createEmptyVitalsForm());
      loadQueue();
    } catch (err) {
      showToast(err.message || 'Không lưu được sinh hiệu', 'error');
    } finally {
      setSavingVitals(false);
    }
  };

  const handleSelectOrder = async (order) => {
    if (selectedOrder?.id === order.id) return;
    if (!(await discardOk(labDirty))) return;
    setSelectedOrder(order);
    setLabForm(EMPTY_LAB_FORM);
    setLabErrors({});
  };

  const setLabField = (field, value) => {
    setLabForm((prev) => ({ ...prev, [field]: value }));
    setLabErrors((prev) => (prev[field] || prev.form ? { ...prev, [field]: undefined, form: undefined } : prev));
  };

  const handleSubmitLab = async (e) => {
    e.preventDefault();
    if (!selectedOrder || savingLab) return;
    const errors = {};
    if (!labForm.value.trim() && !labForm.conclusion.trim()) errors.form = 'Nhập chỉ số đo được hoặc kết luận xét nghiệm.';
    if (labForm.fileUrl.trim() && !isHttpUrl(labForm.fileUrl.trim())) errors.fileUrl = 'Đường dẫn phải bắt đầu bằng http:// hoặc https://';
    setLabErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingLab(true);
    try {
      await nurseService.submitLabResult(selectedOrder.id, {
        resultText: buildLabResultText({ ...labForm, isAbnormal }),
        resultFileUrl: labForm.fileUrl.trim() || undefined
      });
      showToast(`Đã lưu kết quả "${selectedOrder.testType}" cho ${selectedOrder.patientName}.`, 'success');
      setSelectedOrder(null);
      setLabForm(EMPTY_LAB_FORM);
      loadLabs();
    } catch (err) {
      setLabErrors({ form: err.message });
      showToast(err.message || 'Không lưu được kết quả', 'error');
    } finally {
      setSavingLab(false);
    }
  };

  const handleTabKeyDown = (e, index) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = TABS[(index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    setActiveTab(next.id);
    tabRefs.current[next.id]?.focus();
  };

  const pendingLabCount = labs.items.filter((o) => o.status !== 'RESULTED').length;
  const waitingCount = queue.items.filter((q) => q.status !== 'VITALS_COMPLETED').length;

  const listState = (state, retry, emptyText) => {
    if (state.status === 'loading' && state.items.length === 0) {
      return <p className="p-6 text-center text-[13px] text-slate-600" aria-live="polite">Đang tải…</p>;
    }
    if (state.status === 'error') {
      return (
        <div role="alert" className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-900 space-y-2">
          <p>{state.error}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={retry}>
            <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
            Thử lại
          </button>
        </div>
      );
    }
    if (state.items.length === 0) return <p className="p-6 text-center text-[13px] text-slate-600 border border-dashed border-slate-300 rounded-xl">{emptyText}</p>;
    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Trạm điều dưỡng & xét nghiệm"
      subtitle="Đo sinh hiệu cho bệnh nhân đang khám và nhập kết quả cận lâm sàng"
      icon="vital_signs"
      size="xl"
      bodyClassName="p-0 flex flex-col min-h-0"
    >
      <div role="tablist" aria-label="Nghiệp vụ điều dưỡng" className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6">
        {TABS.map((tab, index) => {
          const selected = activeTab === tab.id;
          const count = tab.id === 'vitals' ? waitingCount : pendingLabCount;
          return (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[tab.id] = el; }}
              type="button"
              role="tab"
              id={`nurse-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`nurse-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${selected ? 'border-primary text-primary bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{tab.icon}</span>
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`nurse-panel-${activeTab}`}
        aria-labelledby={`nurse-tab-${activeTab}`}
        className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0"
      >
        {activeTab === 'vitals' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">Bệnh nhân đang khám</h3>
                <button type="button" onClick={loadQueue} disabled={queue.status === 'loading'} className="btn btn-ghost btn-sm">
                  <span className={`material-symbols-outlined ${queue.status === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true">refresh</span>
                  Làm mới
                </button>
              </div>
              {listState(queue, loadQueue, 'Không có bệnh nhân nào đang chờ đo sinh hiệu.') || (
                <ul className="space-y-2" aria-label="Bệnh nhân chờ đo sinh hiệu">
                  {queue.items.map((item) => {
                    const selected = selectedVisit?.visitId === item.visitId;
                    const done = item.status === 'VITALS_COMPLETED';
                    return (
                      <li key={item.visitId}>
                        <button
                          type="button"
                          onClick={() => handleSelectVisit(item)}
                          aria-current={selected ? 'true' : undefined}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${selected ? 'border-primary bg-primary-fixed' : 'border-slate-200 bg-white hover:border-slate-400'}`}
                        >
                          <span className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-sm text-slate-900">{item.fullName}</span>
                            <span className={`badge ${done ? 'badge-success' : 'badge-warning'}`}>{done ? 'Đã đo' : 'Chờ đo'}</span>
                          </span>
                          <span className="block text-[13px] text-slate-600">
                            {item.patientCode || '—'} · {formatGender(item.gender)}{item.age !== null ? ` · ${item.age} tuổi` : ''}
                          </span>
                          {item.reason && <span className="block text-[13px] text-slate-600 line-clamp-1 mt-0.5">Lý do khám: {item.reason}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="lg:col-span-7 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="mb-4 border-b border-slate-200 pb-3">
                <h3 className="font-bold text-sm text-slate-900">Phiếu ghi nhận sinh hiệu</h3>
                <p className="text-[13px] text-slate-600">
                  {selectedVisit
                    ? `Bệnh nhân: ${selectedVisit.fullName}${selectedVisit.patientCode ? ` (${selectedVisit.patientCode})` : ''} · Ca khám #${selectedVisit.visitId}`
                    : 'Chọn bệnh nhân ở danh sách bên trái.'}
                </p>
              </div>

              {selectedVisit ? (
                <form onSubmit={handleSaveVitals} noValidate className="space-y-4">
                  <VitalSignsForm
                    idPrefix="nurse-vs"
                    values={vitalsForm}
                    errors={vitalErrors}
                    onChange={handleVitalChange}
                    disabled={savingVitals}
                  />

                  {vitalWarnings.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-[13px]">
                      <p className="font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">warning</span>
                        Chỉ số bất thường – báo bác sĩ:
                      </p>
                      <ul className="list-disc pl-5 mt-1">
                        {vitalWarnings.map((w) => <li key={w}>{w}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button type="submit" disabled={savingVitals} className="btn btn-primary">
                      <span className="material-symbols-outlined" aria-hidden="true">save</span>
                      {savingVitals ? 'Đang lưu…' : 'Lưu sinh hiệu'}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-[13px] text-slate-600">Biểu mẫu sẽ hiển thị sau khi chọn bệnh nhân.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">Chỉ định cận lâm sàng</h3>
                <button type="button" onClick={loadLabs} disabled={labs.status === 'loading'} className="btn btn-ghost btn-sm">
                  <span className={`material-symbols-outlined ${labs.status === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true">refresh</span>
                  Làm mới
                </button>
              </div>
              {listState(labs, loadLabs, 'Không có chỉ định cận lâm sàng nào.') || (
                <ul className="space-y-2" aria-label="Chỉ định cận lâm sàng">
                  {labs.items.map((order) => {
                    const selected = selectedOrder?.id === order.id;
                    const resulted = order.status === 'RESULTED';
                    return (
                      <li key={order.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectOrder(order)}
                          aria-current={selected ? 'true' : undefined}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${selected ? 'border-primary bg-primary-fixed' : 'border-slate-200 bg-white hover:border-slate-400'}`}
                        >
                          <span className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-sm text-slate-900">{order.testType}</span>
                            <span className={`badge ${resulted ? 'badge-success' : 'badge-warning'}`}>
                              {LAB_ORDER_STATUS_LABELS[order.status] || 'Chờ kết quả'}
                            </span>
                          </span>
                          <span className="block text-[13px] text-slate-600">
                            Bệnh nhân: <span className="font-semibold text-slate-800">{order.patientName}</span>{order.patientCode ? ` (${order.patientCode})` : ''}
                          </span>
                          <span className="block text-xs text-slate-600 mt-0.5">Chỉ định lúc: {formatDateTime(order.orderedAt)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="lg:col-span-7 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 mb-1">Nhập kết quả xét nghiệm</h3>
              <p className="text-[13px] text-slate-600 mb-4 pb-2 border-b border-slate-200">
                {selectedOrder ? `${selectedOrder.testType} – ${selectedOrder.patientName}` : 'Chọn chỉ định ở danh sách bên trái.'}
              </p>

              {selectedOrder ? (
                <form onSubmit={handleSubmitLab} noValidate className="space-y-4">
                  {selectedOrder.results?.length > 0 && (
                    <div className="p-3 rounded-xl bg-white border border-slate-200 text-[13px]">
                      <p className="font-semibold text-slate-900 mb-1">Kết quả đã có (gần nhất):</p>
                      <p className="whitespace-pre-wrap text-slate-800">{selectedOrder.results[selectedOrder.results.length - 1].resultText}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="form-field">
                      <label htmlFor="lab-value" className="form-label">Chỉ số đo được</label>
                      <input id="lab-value" type="text" inputMode="decimal" value={labForm.value} onChange={(e) => setLabField('value', e.target.value)} className="input" />
                    </div>
                    <div className="form-field">
                      <label htmlFor="lab-range" className="form-label">Khoảng tham chiếu</label>
                      <input id="lab-range" type="text" placeholder="VD: 3,9 - 6,4" value={labForm.referenceRange} onChange={(e) => setLabField('referenceRange', e.target.value)} className="input" />
                    </div>
                    <div className="form-field">
                      <label htmlFor="lab-unit" className="form-label">Đơn vị</label>
                      <input id="lab-unit" type="text" placeholder="VD: mmol/L" value={labForm.unit} onChange={(e) => setLabField('unit', e.target.value)} className="input" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        id="lab-abnormal"
                        type="checkbox"
                        className="checkbox"
                        checked={isAbnormal}
                        onChange={(e) => setLabField('abnormalOverride', e.target.checked)}
                        aria-describedby="lab-abnormal-hint"
                      />
                      <label htmlFor="lab-abnormal" className="text-[13px] font-semibold text-red-800">
                        Chỉ số bất thường (cảnh báo bác sĩ)
                      </label>
                    </div>
                    <p id="lab-abnormal-hint" className="form-hint">
                      {autoAbnormal === null
                        ? 'Không tự đánh giá được – đánh dấu thủ công nếu bất thường.'
                        : `Tự đánh giá: ${autoAbnormal ? 'NGOÀI khoảng tham chiếu' : 'trong khoảng tham chiếu'}${labForm.abnormalOverride !== null && labForm.abnormalOverride !== autoAbnormal ? ' (đã chỉnh tay)' : ''}.`}
                    </p>
                  </div>

                  <div className="form-field">
                    <label htmlFor="lab-conclusion" className="form-label">Kết luận xét nghiệm</label>
                    <textarea id="lab-conclusion" rows={3} value={labForm.conclusion} onChange={(e) => setLabField('conclusion', e.target.value)} className="textarea" />
                  </div>

                  <div className="form-field">
                    <label htmlFor="lab-file" className="form-label">Đường dẫn tệp kết quả (không bắt buộc)</label>
                    <input
                      id="lab-file"
                      type="url"
                      placeholder="https://…"
                      value={labForm.fileUrl}
                      onChange={(e) => setLabField('fileUrl', e.target.value)}
                      aria-invalid={labErrors.fileUrl ? 'true' : undefined}
                      aria-describedby={labErrors.fileUrl ? 'lab-file-err' : undefined}
                      className={`input ${labErrors.fileUrl ? 'is-error' : ''}`}
                    />
                    {labErrors.fileUrl && <p id="lab-file-err" className="form-error">{labErrors.fileUrl}</p>}
                  </div>

                  {labErrors.form && <p role="alert" className="text-sm p-3 rounded-xl bg-red-50 border border-red-200 text-red-900">{labErrors.form}</p>}

                  <div className="pt-2 flex justify-end">
                    <button type="submit" disabled={savingLab} className="btn btn-primary">
                      <span className="material-symbols-outlined" aria-hidden="true">cloud_upload</span>
                      {savingLab ? 'Đang lưu…' : 'Lưu kết quả'}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-[13px] text-slate-600">Biểu mẫu sẽ hiển thị sau khi chọn chỉ định.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default NurseStationModal;
