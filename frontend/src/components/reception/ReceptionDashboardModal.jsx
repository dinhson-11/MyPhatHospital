import React, { useCallback, useEffect, useRef, useState } from 'react';
import { receptionService } from '../../services/receptionService';
import {
  patientService,
  validatePatientProfile,
  normalizeInsuranceNumber,
  insuranceStatus,
  BLOOD_TYPES
} from '../../services/patientService';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../common/ConfirmDialog';
import Modal from '../common/Modal';
import { APPOINTMENT_STATUS_LABELS, formatDate, formatGender, labelOf, todayISO } from '../../utils/format';

const maskPhone = (phone) => (phone && String(phone).length >= 7 ? `${String(phone).slice(0, 4)}***${String(phone).slice(-3)}` : (phone || '—'));

const TABS = [
  { id: 'queue', label: 'Hàng đợi tiếp nhận', icon: 'how_to_reg' },
  { id: 'patient', label: 'Hồ sơ bệnh nhân', icon: 'person_add' }
];

const EMPTY_PATIENT = {
  fullName: '',
  phone: '',
  dob: '',
  gender: '',
  nationalId: '',
  bloodType: '',
  address: '',
  insuranceNumber: '',
  insuranceValidFrom: '',
  insuranceValidTo: ''
};

const QUEUE_STATUS = {
  CHECKED_IN: { label: 'Đã vào phòng khám', badge: 'badge-success' },
  CONFIRMED: { label: APPOINTMENT_STATUS_LABELS.CONFIRMED, badge: 'badge-info' },
  BOOKED: { label: APPOINTMENT_STATUS_LABELS.BOOKED, badge: 'badge-warning' },
  COMPLETED: { label: APPOINTMENT_STATUS_LABELS.COMPLETED, badge: 'badge-neutral' },
  CANCELLED: { label: APPOINTMENT_STATUS_LABELS.CANCELLED, badge: 'badge-neutral' },
  NO_SHOW: { label: APPOINTMENT_STATUS_LABELS.NO_SHOW, badge: 'badge-neutral' }
};

const toForm = (p) => ({
  fullName: p?.fullName || '',
  phone: p?.phone || '',
  dob: p?.dob ? String(p.dob).slice(0, 10) : '',
  gender: p?.gender || '',
  nationalId: p?.nationalId || '',
  bloodType: p?.bloodType || '',
  address: p?.address || '',
  insuranceNumber: p?.insuranceNumber || '',
  insuranceValidFrom: p?.insuranceValidFrom ? String(p.insuranceValidFrom).slice(0, 10) : '',
  insuranceValidTo: p?.insuranceValidTo ? String(p.insuranceValidTo).slice(0, 10) : ''
});

/** Ô nhập có nhãn gắn htmlFor + lỗi ngay dưới ô. */
function Field({ id, label, required, error, hint, children }) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}{required && <span className="required">*</span>}
      </label>
      {children}
      {error
        ? <p id={`${id}-msg`} className="form-error">{error}</p>
        : hint ? <p id={`${id}-msg`} className="form-hint">{hint}</p> : null}
    </div>
  );
}

/**
 * Quầy tiếp đón: hàng đợi lịch hẹn thật, xác nhận lịch, check-in (tạo ca khám) và hồ sơ bệnh nhân (kèm thẻ BHYT).
 */
export const ReceptionDashboardModal = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('queue');
  const tabRefs = useRef({});

  const [queue, setQueue] = useState({ status: 'idle', items: [], error: '' });
  const [queueDate, setQueueDate] = useState(todayISO());
  const [searchTerm, setSearchTerm] = useState('');
  const [busy, setBusy] = useState(null); // { id, action }

  const [patientForm, setPatientForm] = useState(EMPTY_PATIENT);
  const [editingPatient, setEditingPatient] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [savingPatient, setSavingPatient] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState({ status: 'idle', items: [], error: '' });

  const loadQueue = useCallback(async (date) => {
    setQueue((prev) => ({ ...prev, status: 'loading', error: '' }));
    try {
      const items = await receptionService.getTodayQueue({ date });
      setQueue({ status: 'ready', items, error: '' });
    } catch (err) {
      setQueue({ status: 'error', items: [], error: err.message });
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadQueue(queueDate);
  }, [isOpen, queueDate, loadQueue]);

  const handleConfirm = async (item) => {
    if (busy) return;
    setBusy({ id: item.id, action: 'confirm' });
    try {
      await receptionService.confirmAppointment(item.id);
      showToast(`Đã xác nhận lịch hẹn của ${item.fullName}.`, 'success');
      await loadQueue(queueDate);
    } catch (err) {
      showToast(err.message || 'Không xác nhận được lịch hẹn', 'error');
    } finally {
      setBusy(null);
    }
  };

  // Máy chủ chỉ cho ghi nhận vắng mặt sau giờ hẹn → khóa nút trước giờ hẹn để không bấm nhầm
  const notYetDue = (item) => Boolean(item.scheduledAt) && new Date(item.scheduledAt).getTime() > Date.now();

  const handleCancel = async (item) => {
    if (busy) return;
    const reason = await confirm({
      title: 'Hủy lịch hẹn?',
      message: `Hủy lịch hẹn của ${item.fullName} lúc ${item.appointmentTime || '—'} ngày ${formatDate(item.date)}.`,
      requireReason: true,
      reasonLabel: 'Lý do hủy',
      reasonPlaceholder: 'Ví dụ: bệnh nhân gọi báo bận, đổi sang ngày khác',
      confirmText: 'Hủy lịch',
      tone: 'danger'
    });
    if (!reason) return;
    setBusy({ id: item.id, action: 'cancel' });
    try {
      await receptionService.cancelAppointment(item.id, reason);
      showToast(`Đã hủy lịch hẹn của ${item.fullName}.`, 'success');
      await loadQueue(queueDate);
    } catch (err) {
      showToast(err.message || 'Không hủy được lịch hẹn', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleNoShow = async (item) => {
    if (busy) return;
    const ok = await confirm({
      title: 'Đánh dấu bệnh nhân không đến?',
      message: `${item.fullName} sẽ được ghi nhận là vắng mặt; lịch hẹn kết thúc và không check-in được nữa.`,
      confirmText: 'Ghi nhận vắng mặt',
      tone: 'warning'
    });
    if (!ok) return;
    setBusy({ id: item.id, action: 'noshow' });
    try {
      await receptionService.markNoShow(item.id);
      showToast(`Đã ghi nhận ${item.fullName} không đến khám.`, 'success');
      await loadQueue(queueDate);
    } catch (err) {
      showToast(err.message || 'Không cập nhật được trạng thái lịch hẹn', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleCheckIn = async (item) => {
    if (busy) return;
    const ok = await confirm({
      title: 'Check-in bệnh nhân vào phòng khám?',
      message: 'Hệ thống sẽ mở ca khám mới và chuyển hồ sơ đến bác sĩ phụ trách.',
      details: [
        `Bệnh nhân: ${item.fullName}${item.patientCode ? ` (${item.patientCode})` : ''}`,
        `Bác sĩ: ${item.doctorName || '—'}${item.departmentName ? ` – ${item.departmentName}` : ''}`,
        `Giờ hẹn: ${item.appointmentTime || '—'} ngày ${formatDate(item.date)}`
      ],
      confirmText: 'Check-in'
    });
    if (!ok) return;
    setBusy({ id: item.id, action: 'checkin' });
    try {
      const res = await receptionService.checkInPatient(item);
      showToast(`Đã check-in ${item.fullName}${res.visitId ? ` – ca khám #${res.visitId}` : ''}.`, 'success');
      await loadQueue(queueDate);
    } catch (err) {
      showToast(err.message || 'Check-in không thành công', 'error');
    } finally {
      setBusy(null);
    }
  };

  // ---------- Hồ sơ bệnh nhân ----------
  const setField = (field, value) => {
    setPatientForm((prev) => ({ ...prev, [field]: field === 'insuranceNumber' ? normalizeInsuranceNumber(value) : value }));
    setFormErrors((prev) => (prev[field] || prev.form ? { ...prev, [field]: undefined, form: undefined } : prev));
  };

  const resetPatientForm = () => {
    setPatientForm(EMPTY_PATIENT);
    setEditingPatient(null);
    setFormErrors({});
  };

  const searchPatients = async (e) => {
    e.preventDefault();
    if (patientQuery.trim().length < 2) {
      setPatientResults({ status: 'error', items: [], error: 'Nhập ít nhất 2 ký tự để tìm.' });
      return;
    }
    setPatientResults({ status: 'loading', items: [], error: '' });
    try {
      const items = await patientService.searchPatients(patientQuery);
      setPatientResults({ status: 'ready', items, error: '' });
    } catch (err) {
      setPatientResults({ status: 'error', items: [], error: err.message });
    }
  };

  const pickPatient = (p) => {
    setEditingPatient(p);
    setPatientForm(toForm(p));
    setFormErrors({});
  };

  const handleSavePatient = async (e) => {
    e.preventDefault();
    if (savingPatient) return;
    const errors = validatePatientProfile(patientForm, { requirePhone: true, includeInsurance: true });
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      showToast('Hồ sơ chưa hợp lệ – vui lòng kiểm tra các ô được đánh dấu.', 'error');
      return;
    }
    setSavingPatient(true);
    try {
      if (editingPatient) {
        const updated = await receptionService.updatePatientProfile(editingPatient.id, patientForm);
        showToast(`Đã cập nhật hồ sơ ${updated?.patientCode || editingPatient.patientCode || ''} – ${patientForm.fullName}.`, 'success');
        if (updated) pickPatient(updated);
      } else {
        const res = await receptionService.quickRegisterPatient(patientForm);
        showToast(`Đã tạo hồ sơ ${res.patient?.patientCode || ''} – ${res.patient?.fullName || patientForm.fullName}.`, 'success');
        resetPatientForm();
      }
    } catch (err) {
      setFormErrors({ form: err.message });
      showToast(err.message || 'Không lưu được hồ sơ', 'error');
    } finally {
      setSavingPatient(false);
    }
  };

  const handleTabKeyDown = (e, index) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = TABS[(index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    setActiveTab(next.id);
    tabRefs.current[next.id]?.focus();
  };

  const term = searchTerm.trim().toLowerCase();
  const filteredQueue = queue.items.filter((item) =>
    !term
    || (item.fullName || '').toLowerCase().includes(term)
    || (item.patientCode || '').toLowerCase().includes(term));

  const ins = insuranceStatus(patientForm);
  const describedBy = (field) => (formErrors[field] ? `rp-${field}-msg` : undefined);
  const inputProps = (field, extra = {}) => ({
    id: `rp-${field}`,
    value: patientForm[field],
    onChange: (e) => setField(field, e.target.value),
    'aria-invalid': formErrors[field] ? 'true' : undefined,
    'aria-describedby': describedBy(field),
    className: `${extra.select ? 'select' : 'input'} ${formErrors[field] ? 'is-error' : ''}`
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!busy && !savingPatient) onClose?.(); }}
      title="Quầy tiếp đón"
      subtitle="Tiếp nhận bệnh nhân, xác nhận lịch hẹn và check-in vào phòng khám"
      icon="desk"
      size="xl"
      bodyClassName="p-0 flex flex-col min-h-0"
    >
      <div role="tablist" aria-label="Nghiệp vụ tiếp đón" className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6">
        {TABS.map((tab, index) => {
          const isSel = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[tab.id] = el; }}
              type="button"
              role="tab"
              id={`reception-tab-${tab.id}`}
              aria-selected={isSel}
              aria-controls={`reception-panel-${tab.id}`}
              tabIndex={isSel ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${isSel ? 'border-primary text-primary bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{tab.icon}</span>
              {tab.label}{tab.id === 'queue' ? ` (${queue.items.length})` : ''}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`reception-panel-${activeTab}`} aria-labelledby={`reception-tab-${activeTab}`} className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
        {activeTab === 'queue' ? (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-end">
              <div className="form-field">
                <label htmlFor="queue-date" className="form-label">Ngày hẹn</label>
                <input id="queue-date" type="date" value={queueDate} onChange={(e) => setQueueDate(e.target.value)} className="input" />
              </div>
              <div className="form-field flex-1">
                <label htmlFor="queue-search" className="form-label">Tìm trong danh sách</label>
                <input
                  id="queue-search"
                  type="search"
                  placeholder="Tên bệnh nhân hoặc mã hồ sơ"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input"
                />
              </div>
              <button type="button" onClick={() => loadQueue(queueDate)} disabled={queue.status === 'loading'} className="btn btn-secondary">
                <span className={`material-symbols-outlined ${queue.status === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true">refresh</span>
                Làm mới
              </button>
            </div>

            {queue.status === 'error' ? (
              <div role="alert" className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-900 flex flex-wrap items-center gap-3">
                <span>{queue.error}</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => loadQueue(queueDate)}>Thử lại</button>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Lịch hẹn ngày {formatDate(queueDate)}</caption>
                  <thead>
                    <tr className="bg-slate-50 text-[13px] font-semibold text-slate-700 border-b border-slate-200">
                      <th scope="col" className="px-4 py-3">Bệnh nhân</th>
                      <th scope="col" className="px-4 py-3">Khoa & bác sĩ</th>
                      <th scope="col" className="px-4 py-3">Giờ hẹn</th>
                      <th scope="col" className="px-4 py-3">Lý do khám</th>
                      <th scope="col" className="px-4 py-3">Trạng thái</th>
                      <th scope="col" className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-600 text-[13px]">
                          {queue.status === 'loading'
                            ? 'Đang tải danh sách lịch hẹn…'
                            : term ? `Không có bệnh nhân khớp với "${searchTerm}".` : `Không có lịch hẹn nào ngày ${formatDate(queueDate)}.`}
                        </td>
                      </tr>
                    ) : filteredQueue.map((item) => {
                      const st = QUEUE_STATUS[item.status] || { label: labelOf(APPOINTMENT_STATUS_LABELS, item.status, 'Không rõ'), badge: 'badge-neutral' };
                      const rowBusy = busy?.id === item.id;
                      const missing = !item.patientId ? 'Lịch hẹn chưa gắn hồ sơ bệnh nhân' : !item.doctorId ? 'Chưa phân công bác sĩ' : '';
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{item.fullName || '—'}</div>
                            <div className="text-[13px] text-slate-600 font-mono">{item.patientCode || '—'}</div>
                          </td>
                          <td className="px-4 py-3 text-[13px]">
                            <div className="font-semibold text-slate-800">{item.departmentName || '—'}</div>
                            <div className="text-slate-600">{item.doctorName || 'Chưa phân công'}</div>
                          </td>
                          <td className="px-4 py-3 text-[13px] font-semibold">{item.appointmentTime || '—'}</td>
                          <td className="px-4 py-3 text-[13px] text-slate-700 max-w-[220px] truncate" title={item.symptoms}>{item.symptoms || '—'}</td>
                          <td className="px-4 py-3"><span className={`badge ${st.badge}`}>{st.label}</span></td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              {item.status === 'BOOKED' && (
                                <button type="button" onClick={() => handleConfirm(item)} disabled={Boolean(busy)} className="btn btn-secondary btn-sm">
                                  {rowBusy && busy.action === 'confirm' ? 'Đang xác nhận…' : 'Xác nhận'}
                                </button>
                              )}
                              {item.status === 'CONFIRMED' && (
                                <button
                                  type="button"
                                  onClick={() => handleCheckIn(item)}
                                  disabled={Boolean(busy) || Boolean(missing)}
                                  title={missing || undefined}
                                  aria-label={`Check-in ${item.fullName}`}
                                  className="btn btn-primary btn-sm"
                                >
                                  <span className="material-symbols-outlined" aria-hidden="true">login</span>
                                  {rowBusy && busy.action === 'checkin' ? 'Đang check-in…' : 'Check-in'}
                                </button>
                              )}
                              {(item.status === 'BOOKED' || item.status === 'CONFIRMED') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleNoShow(item)}
                                    disabled={Boolean(busy) || notYetDue(item)}
                                    title={notYetDue(item) ? 'Chỉ ghi nhận vắng mặt sau giờ hẹn' : undefined}
                                    aria-label={`Ghi nhận ${item.fullName} không đến`}
                                    className="btn btn-light btn-sm"
                                  >
                                    Vắng mặt
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCancel(item)}
                                    disabled={Boolean(busy)}
                                    aria-label={`Hủy lịch hẹn của ${item.fullName}`}
                                    className="btn btn-light btn-sm"
                                  >
                                    {rowBusy && busy.action === 'cancel' ? 'Đang hủy…' : 'Hủy lịch'}
                                  </button>
                                </>
                              )}
                              {item.status === 'CONFIRMED' && missing && (
                                <span className="text-xs text-amber-800 w-full text-right">{missing}</span>
                              )}
                              {item.status === 'CHECKED_IN' && item.visitId && (
                                <span className="text-[13px] text-emerald-800 font-semibold">Ca khám #{item.visitId}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-4 space-y-3" aria-labelledby="patient-search-title">
              <h3 id="patient-search-title" className="text-sm font-bold text-slate-900">Tìm hồ sơ có sẵn để cập nhật</h3>
              <form onSubmit={searchPatients} noValidate className="flex gap-2">
                <label htmlFor="patient-query" className="sr-only">Tên, SĐT hoặc mã bệnh nhân</label>
                <input
                  id="patient-query"
                  type="search"
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  placeholder="Tên, SĐT hoặc mã BN"
                  className="input"
                />
                <button type="submit" className="btn btn-secondary" disabled={patientResults.status === 'loading'}>Tìm</button>
              </form>
              {patientResults.status === 'error' && <p role="alert" className="form-error">{patientResults.error}</p>}
              {patientResults.status === 'loading' && <p className="text-[13px] text-slate-600">Đang tìm…</p>}
              {patientResults.status === 'ready' && (
                patientResults.items.length === 0
                  ? <p className="text-[13px] text-slate-600">Không tìm thấy hồ sơ phù hợp.</p>
                  : (
                    <ul className="space-y-2" aria-label="Kết quả tìm hồ sơ">
                      {patientResults.items.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => pickPatient(p)}
                            aria-current={editingPatient?.id === p.id ? 'true' : undefined}
                            className={`w-full text-left p-3 rounded-xl border text-[13px] ${editingPatient?.id === p.id ? 'border-primary bg-primary-fixed' : 'border-slate-200 bg-white hover:border-slate-400'}`}
                          >
                            <span className="block font-bold text-sm text-slate-900">{p.fullName}</span>
                            <span className="block text-slate-600">{p.patientCode} · {formatGender(p.gender)} · {formatDate(p.dob)}</span>
                            <span className="block text-slate-600">SĐT: {maskPhone(p.phone)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )
              )}
            </section>

            <form onSubmit={handleSavePatient} noValidate className="lg:col-span-8 space-y-4" aria-labelledby="patient-form-title">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 id="patient-form-title" className="text-sm font-bold text-slate-900">
                  {editingPatient ? `Cập nhật hồ sơ ${editingPatient.patientCode || ''}` : 'Tạo hồ sơ bệnh nhân mới'}
                </h3>
                {editingPatient && (
                  <button type="button" onClick={resetPatientForm} className="btn btn-ghost btn-sm">
                    <span className="material-symbols-outlined" aria-hidden="true">add</span>
                    Tạo hồ sơ mới
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="rp-fullName" label="Họ và tên" required error={formErrors.fullName}>
                  <input type="text" autoComplete="off" {...inputProps('fullName')} />
                </Field>
                <Field id="rp-phone" label="Số điện thoại" required error={formErrors.phone} hint="Số di động 10–11 chữ số, bắt đầu bằng 0">
                  <input type="tel" inputMode="tel" {...inputProps('phone')} aria-describedby="rp-phone-msg" />
                </Field>
                <Field id="rp-dob" label="Ngày sinh" error={formErrors.dob}>
                  <input type="date" max={todayISO()} {...inputProps('dob')} />
                </Field>
                <Field id="rp-gender" label="Giới tính">
                  <select {...inputProps('gender', { select: true })}>
                    <option value="">Chưa chọn</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </Field>
                <Field id="rp-nationalId" label="Số CCCD / định danh" error={formErrors.nationalId}>
                  <input type="text" inputMode="numeric" maxLength={20} {...inputProps('nationalId')} />
                </Field>
                <Field id="rp-bloodType" label="Nhóm máu" error={formErrors.bloodType}>
                  <select {...inputProps('bloodType', { select: true })}>
                    <option value="">Chưa rõ</option>
                    {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field id="rp-address" label="Địa chỉ thường trú" error={formErrors.address}>
                    <input type="text" maxLength={255} {...inputProps('address')} />
                  </Field>
                </div>
              </div>

              <fieldset className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <legend className="px-1 text-sm font-bold text-slate-900">Thẻ bảo hiểm y tế (BHYT)</legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field
                    id="rp-insuranceNumber"
                    label="Mã thẻ BHYT"
                    error={formErrors.insuranceNumber}
                    hint="15 ký tự, VD: DN4010123456789"
                  >
                    <input
                      type="text"
                      maxLength={15}
                      autoCapitalize="characters"
                      spellCheck={false}
                      {...inputProps('insuranceNumber')}
                      aria-describedby="rp-insuranceNumber-msg"
                      className={`input font-mono uppercase ${formErrors.insuranceNumber ? 'is-error' : ''}`}
                    />
                  </Field>
                  <Field id="rp-insuranceValidFrom" label="Hiệu lực từ" error={formErrors.insuranceValidFrom}>
                    <input type="date" {...inputProps('insuranceValidFrom')} />
                  </Field>
                  <Field id="rp-insuranceValidTo" label="Hiệu lực đến" error={formErrors.insuranceValidTo}>
                    <input type="date" {...inputProps('insuranceValidTo')} />
                  </Field>
                </div>
                {patientForm.insuranceNumber && ins.code !== 'VALID' && ins.code !== 'NONE' && (
                  <p className="text-[13px] text-amber-900 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">warning</span>
                    {ins.label} – bệnh nhân có thể không được hưởng BHYT cho lượt khám này.
                  </p>
                )}
              </fieldset>

              {formErrors.form && <p role="alert" className="text-sm p-3 rounded-xl bg-red-50 border border-red-200 text-red-900">{formErrors.form}</p>}

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-200">
                <button type="button" onClick={resetPatientForm} className="btn btn-secondary" disabled={savingPatient}>Nhập lại</button>
                <button id="submitRegisterPatientBtn" type="submit" disabled={savingPatient} className="btn btn-primary">
                  <span className="material-symbols-outlined" aria-hidden="true">check</span>
                  {savingPatient ? 'Đang lưu…' : editingPatient ? 'Lưu thay đổi' : 'Tạo hồ sơ bệnh nhân'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ReceptionDashboardModal;
