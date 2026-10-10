import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  visitService,
  COMMON_ICD10_CODES,
  findIcd10,
  vitalsToForm,
  validateVitalSigns,
  toVitalSignsPayload,
  getVitalWarnings,
  VITAL_SIGN_FIELDS
} from '../../services/visitService';
import { patientService } from '../../services/patientService';
import { aiAlertService, AI_DISCLAIMER_TEXT } from '../../services/aiAlertService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../common/ConfirmDialog';
import Modal from '../common/Modal';
import PatientSafetyBanner from '../common/PatientSafetyBanner';
import SensitiveMask from '../common/SensitiveMask';
import { formatDate, formatDateTime, formatGender, SEVERITY_LABELS, VISIT_STATUS_LABELS, labelOf } from '../../utils/format';
import PrescriptionForm from './PrescriptionForm';
import LabOrderPanel from './LabOrderPanel';
import DiagnosisSuggestBox from './DiagnosisSuggestBox';
import VitalSignsForm from './VitalSignsForm';

const TABS = [
  { id: 'clinical', label: 'Sinh hiệu & chẩn đoán', icon: 'monitor_heart' },
  { id: 'prescription', label: 'Kê đơn thuốc', icon: 'prescriptions' },
  { id: 'lab', label: 'Cận lâm sàng', icon: 'science' },
  { id: 'summary', label: 'Phiếu khám tổng hợp', icon: 'description' },
  { id: 'ai_audit', label: 'Lịch sử phân tích AI', icon: 'history_edu' }
];

const AI_TYPE_LABELS = {
  DRUG_INTERACTION: 'Kiểm tra an toàn đơn thuốc',
  ALLERGY_ALERT: 'Cảnh báo dị ứng',
  DIAGNOSIS_SUGGESTION: 'Gợi ý chẩn đoán'
};

const STATUS_FILTERS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'IN_PROGRESS', label: 'Đang khám' },
  { id: 'COMPLETED', label: 'Đã hoàn tất' }
];

const formFromVisit = (visit) => ({
  chiefComplaint: visit?.chiefComplaint || '',
  diagnosisCode: visit?.diagnosisCode || '',
  diagnosisNote: visit?.diagnosisNote || '',
  vitals: vitalsToForm(visit?.vitalSigns)
});

const sameForm = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function ageFrom(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function formatVitalValue(field, value) {
  if (value === null || value === undefined || value === '') return '—';
  return `${String(value).replace('.', ',')} ${field.unit}`;
}

/** Tóm tắt nội dung nhật ký AI (outputContent là JSON) thành các dòng dễ đọc. */
function summarizeAiOutput(raw) {
  if (!raw) return [];
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  const lines = [];
  if (Array.isArray(data?.interactions)) {
    if (data.interactions.length === 0) lines.push('Không phát hiện tương tác thuốc.');
    data.interactions.forEach((i) => lines.push(
      `Tương tác ${i.drug_a_name || i.drugAName} + ${i.drug_b_name || i.drugBName}: ${labelOf(SEVERITY_LABELS, String(i.severity || '').toUpperCase(), 'Cần lưu ý')}`
    ));
  }
  const allergyAlerts = data?.allergy_alerts || data?.allergyAlerts;
  if (Array.isArray(allergyAlerts)) {
    allergyAlerts.forEach((a) => lines.push(
      `Dị ứng: ${a.drug_name || a.drugName} – ${a.allergen} (${labelOf(SEVERITY_LABELS, String(a.severity || '').toUpperCase(), 'Cần lưu ý')})`
    ));
  }
  if (Array.isArray(data?.suggestions)) {
    data.suggestions.forEach((s) => lines.push(`Gợi ý ${s.code} – ${s.name}`));
  }
  return lines;
}

export default function VisitDashboard({ isOpen, onClose }) {
  const { user, isDoctor } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [visits, setVisits] = useState([]);
  const [listState, setListState] = useState({ status: 'idle', error: '' });
  const [activeVisitId, setActiveVisitId] = useState(null);
  const [activeTab, setActiveTab] = useState('clinical');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState(formFromVisit(null));
  const [baseline, setBaseline] = useState(formFromVisit(null));
  const [vitalErrors, setVitalErrors] = useState({});
  const [diagnosisError, setDiagnosisError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [allergyState, setAllergyState] = useState({ status: 'idle', items: [] });
  const [audit, setAudit] = useState({ status: 'idle', items: [], error: '' });

  const tabRefs = useRef({});
  const activeIdRef = useRef(null);
  useEffect(() => { activeIdRef.current = activeVisitId; }, [activeVisitId]);

  const activeVisit = useMemo(() => visits.find((v) => v.id === activeVisitId) || null, [visits, activeVisitId]);
  const isDirty = Boolean(activeVisit) && !sameForm(form, baseline);
  const isCompleted = activeVisit?.status === 'COMPLETED';
  const canEdit = Boolean(activeVisit) && isDoctor && !isCompleted;
  const readOnlyReason = isCompleted
    ? 'Ca khám đã hoàn tất – hồ sơ đã khóa, không thể thay đổi.'
    : 'Chỉ bác sĩ phụ trách ca khám mới được chẩn đoán, kê đơn và chỉ định.';

  const applyVisit = useCallback((visit) => {
    const next = formFromVisit(visit);
    setActiveVisitId(visit ? visit.id : null);
    setForm(next);
    setBaseline(next);
    setVitalErrors({});
    setDiagnosisError('');
    setAudit({ status: 'idle', items: [], error: '' });
  }, []);

  const replaceVisit = useCallback((updated) => {
    if (!updated?.id) return;
    setVisits((prev) => prev.map((v) => (v.id === updated.id ? { ...v, ...updated } : v)));
  }, []);

  const loadVisits = useCallback(async () => {
    setListState({ status: 'loading', error: '' });
    try {
      const list = await visitService.getVisits();
      setVisits(list);
      setListState({ status: 'ready', error: '' });
      const current = activeIdRef.current;
      if (!(current && list.some((v) => v.id === current))) applyVisit(list[0] || null);
    } catch (err) {
      setListState({ status: 'error', error: err.message });
    }
  }, [applyVisit]);

  useEffect(() => {
    if (isOpen) loadVisits();
  }, [isOpen, loadVisits]);

  // Dị ứng thật của bệnh nhân – nguồn duy nhất cho thanh cảnh báo và kiểm tra an toàn đơn thuốc
  const patientId = activeVisit?.patientId;
  const loadAllergies = useCallback(async () => {
    if (!patientId) {
      setAllergyState({ status: 'error', items: [] });
      return;
    }
    setAllergyState({ status: 'loading', items: [] });
    try {
      const items = await patientService.getAllergies(patientId);
      setAllergyState({ status: 'ready', items });
    } catch {
      setAllergyState({ status: 'error', items: [] });
    }
  }, [patientId]);

  useEffect(() => {
    if (isOpen && activeVisitId) loadAllergies();
  }, [isOpen, activeVisitId, loadAllergies]);

  const loadAudit = useCallback(async () => {
    if (!activeVisitId) return;
    setAudit((prev) => ({ ...prev, status: 'loading', error: '' }));
    try {
      const items = await aiAlertService.getVisitAuditLogs(activeVisitId);
      setAudit({ status: 'ready', items, error: '' });
    } catch (err) {
      setAudit({ status: 'error', items: [], error: err.message });
    }
  }, [activeVisitId]);

  useEffect(() => {
    if (activeTab === 'ai_audit' && audit.status === 'idle' && activeVisitId) loadAudit();
  }, [activeTab, audit.status, activeVisitId, loadAudit]);

  const vitalCheck = useMemo(() => validateVitalSigns(form.vitals), [form.vitals]);
  const vitalWarnings = useMemo(() => getVitalWarnings(vitalCheck.values), [vitalCheck.values]);

  const confirmDiscard = async (title) => {
    if (!isDirty) return true;
    return confirm({
      title,
      message: 'Các thay đổi chưa lưu của ca khám hiện tại sẽ bị bỏ.',
      tone: 'warning',
      confirmText: 'Bỏ thay đổi',
      cancelText: 'Ở lại'
    });
  };

  const handleSelectVisit = async (visit) => {
    if (visit.id === activeVisitId) return;
    if (!(await confirmDiscard('Chuyển sang bệnh nhân khác?'))) return;
    applyVisit(visit);
  };

  const handleClose = async () => {
    if (isSaving) return;
    if (!(await confirmDiscard('Đóng phòng khám?'))) return;
    onClose?.();
  };

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setVital = (key, value) => {
    setForm((prev) => ({ ...prev, vitals: { ...prev.vitals, [key]: value } }));
    setVitalErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const buildUpdate = () => ({
    chiefComplaint: form.chiefComplaint.trim(),
    diagnosisCode: form.diagnosisCode.trim().toUpperCase(),
    diagnosisNote: form.diagnosisNote.trim(),
    vitalSigns: toVitalSignsPayload(vitalCheck.values)
  });

  const checkVitalsOrWarn = () => {
    setVitalErrors(vitalCheck.errors);
    if (Object.keys(vitalCheck.errors).length > 0) {
      setActiveTab('clinical');
      showToast('Chỉ số sinh hiệu chưa hợp lệ – vui lòng kiểm tra các ô được đánh dấu.', 'error');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!activeVisit || !canEdit || isSaving) return;
    if (!checkVitalsOrWarn()) return;
    setIsSaving(true);
    try {
      const updated = await visitService.updateVisit(activeVisit.id, buildUpdate());
      if (updated?.id) {
        replaceVisit(updated);
        const next = formFromVisit({ ...activeVisit, ...updated });
        setForm(next);
        setBaseline(next);
      } else {
        setBaseline(form);
      }
      showToast('Đã lưu sinh hiệu và chẩn đoán.', 'success');
    } catch (err) {
      showToast(err.message || 'Không lưu được thông tin ca khám', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!activeVisit || !canEdit || isSaving) return;
    const code = form.diagnosisCode.trim().toUpperCase();
    if (!code) {
      setDiagnosisError('Bắt buộc nhập mã chẩn đoán ICD-10 trước khi hoàn tất ca khám.');
      setActiveTab('clinical');
      showToast('Chưa có mã chẩn đoán ICD-10 – không thể hoàn tất ca khám.', 'warning');
      return;
    }
    if (!checkVitalsOrWarn()) return;

    const prescriptions = activeVisit.prescriptions || [];
    const drugCount = prescriptions.reduce((n, p) => n + (p.items?.length || 0), 0);
    const labOrders = activeVisit.labOrders || [];
    const pendingLabs = labOrders.filter((o) => o.status !== 'RESULTED');
    const icd = findIcd10(code);

    const ok = await confirm({
      title: 'Hoàn tất ca khám?',
      message: 'Sau khi hoàn tất, hồ sơ ca khám bị khóa: không thể sửa chẩn đoán, kê thêm đơn thuốc hoặc chỉ định cận lâm sàng.',
      details: [
        `Bệnh nhân: ${activeVisit.patientName}${activeVisit.patientCode ? ` (${activeVisit.patientCode})` : ''}`,
        `Chẩn đoán: ${code}${icd ? ` – ${icd.name}` : ''}`,
        prescriptions.length ? `Đơn thuốc: ${prescriptions.length} đơn, ${drugCount} loại thuốc` : 'Đơn thuốc: chưa kê đơn',
        pendingLabs.length
          ? `Cận lâm sàng CHƯA có kết quả (${pendingLabs.length}): ${pendingLabs.map((o) => o.testType).join(', ')}`
          : `Cận lâm sàng: ${labOrders.length ? 'đã có đủ kết quả' : 'không chỉ định'}`
      ],
      tone: pendingLabs.length ? 'warning' : 'primary',
      confirmText: 'Hoàn tất ca khám'
    });
    if (!ok) return;

    setIsSaving(true);
    try {
      const upd = buildUpdate();
      const updated = await visitService.updateVisit(activeVisit.id, upd);
      const completed = await visitService.completeVisit(activeVisit.id);
      const merged = {
        ...activeVisit,
        chiefComplaint: upd.chiefComplaint,
        diagnosisCode: upd.diagnosisCode,
        diagnosisNote: upd.diagnosisNote,
        vitalSigns: { ...(activeVisit.vitalSigns || {}), ...(upd.vitalSigns || {}) },
        ...(updated || {}),
        ...(completed || {}),
        status: completed?.status || 'COMPLETED'
      };
      replaceVisit(merged);
      const next = formFromVisit(merged);
      setForm(next);
      setBaseline(next);
      showToast(`Đã hoàn tất ca khám của ${merged.patientName}.`, 'success');
    } catch (err) {
      showToast(err.message || 'Không hoàn tất được ca khám', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Phím tắt F9: lưu nhanh (dùng ref để luôn gọi phiên bản mới nhất)
  const saveRef = useRef(handleSave);
  useEffect(() => { saveRef.current = handleSave; });
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'F9') {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleTabKeyDown = (e, index) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
    if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = TABS.length - 1;
    setActiveTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  const refreshActiveVisit = async () => {
    if (!activeVisitId) return;
    try {
      const fresh = await visitService.getVisitById(activeVisitId);
      if (fresh) replaceVisit(fresh);
    } catch {
      loadVisits();
    }
  };

  const term = searchTerm.trim().toLowerCase();
  const filteredVisits = visits.filter((v) => {
    const matchesStatus = filterStatus === 'ALL' || v.status === filterStatus;
    const matchesSearch = !term
      || (v.patientName || '').toLowerCase().includes(term)
      || (v.patientCode || '').toLowerCase().includes(term)
      || (v.patientPhone || '').includes(term);
    return matchesStatus && matchesSearch;
  });

  const icdMatch = findIcd10(form.diagnosisCode);
  const tabCount = (id) => {
    if (id === 'prescription') return activeVisit?.prescriptions?.length || 0;
    if (id === 'lab') return activeVisit?.labOrders?.length || 0;
    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Phòng khám bác sĩ"
      subtitle={user?.fullName ? `Bác sĩ: ${user.fullName}` : 'Khám bệnh, chẩn đoán, kê đơn và chỉ định cận lâm sàng'}
      icon="stethoscope"
      size="full"
      className="h-[100dvh] sm:h-[92vh]"
      bodyClassName="p-0 flex flex-col md:flex-row overflow-hidden"
    >
      {/* Cột trái: danh sách ca khám */}
      <aside className="w-full md:w-80 lg:w-96 shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col min-h-0 max-h-[40vh] md:max-h-none">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">Danh sách ca khám ({filteredVisits.length})</h3>
            <button
              type="button"
              onClick={loadVisits}
              disabled={listState.status === 'loading'}
              className="btn btn-ghost btn-sm"
            >
              <span className={`material-symbols-outlined ${listState.status === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true">refresh</span>
              Làm mới
            </button>
          </div>
          <div className="flex rounded-lg bg-slate-100 p-1 text-[13px]" role="group" aria-label="Lọc theo trạng thái">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filterStatus === f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-colors ${filterStatus === f.id ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="input-group">
            <span className="material-symbols-outlined input-icon" aria-hidden="true">search</span>
            <label htmlFor="visit-search" className="sr-only">Lọc bệnh nhân</label>
            <input
              id="visit-search"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tên, mã hồ sơ hoặc SĐT"
              className="input"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {listState.status === 'loading' && visits.length === 0 ? (
            <p className="p-8 text-center text-[13px] text-slate-600" aria-live="polite">Đang tải danh sách ca khám…</p>
          ) : listState.status === 'error' ? (
            <div role="alert" className="p-6 text-center space-y-3">
              <p className="text-sm text-red-800">{listState.error || 'Không tải được danh sách ca khám.'}</p>
              <button type="button" onClick={loadVisits} className="btn btn-secondary btn-sm">
                <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
                Thử lại
              </button>
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-slate-600 space-y-1">
              <p>Không có ca khám nào phù hợp.</p>
              <p>Ca khám mới được tạo khi quầy tiếp đón check-in bệnh nhân.</p>
            </div>
          ) : (
            <ul aria-label="Ca khám" className="divide-y divide-slate-100">
              {filteredVisits.map((v) => {
                const isSelected = v.id === activeVisitId;
                const isDone = v.status === 'COMPLETED';
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectVisit(v)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`w-full text-left p-4 border-l-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 ${isSelected ? 'bg-primary-fixed border-l-primary' : 'border-l-transparent hover:bg-slate-50'}`}
                    >
                      <span className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-sm text-slate-900">{v.patientName}</span>
                        <span className={`badge ${isDone ? 'badge-success' : 'badge-warning'}`}>
                          {labelOf(VISIT_STATUS_LABELS, v.status, 'Không rõ')}
                        </span>
                      </span>
                      <span className="block text-[13px] text-slate-600">
                        {v.patientCode || '—'} · {formatGender(v.patientGender)} · {formatDateTime(v.visitTime)}
                      </span>
                      {v.chiefComplaint && (
                        <span className="block text-[13px] text-slate-600 mt-1 line-clamp-1">{v.chiefComplaint}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Cột phải: không gian khám */}
      {activeVisit ? (
        <section className="flex-1 flex flex-col min-h-0 bg-slate-50" aria-label={`Ca khám của ${activeVisit.patientName}`}>
          <div className="bg-white border-b border-slate-200 px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-11 h-11 shrink-0 rounded-xl bg-primary-fixed text-primary font-bold flex items-center justify-center" aria-hidden="true">
                {(activeVisit.patientName || '?').trim().split(/\s+/).slice(-1)[0]?.[0] || '?'}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-slate-900">{activeVisit.patientName}</h3>
                  {activeVisit.patientCode && <span className="badge badge-primary">{activeVisit.patientCode}</span>}
                  <span className={`badge ${isCompleted ? 'badge-success' : 'badge-warning'}`}>
                    {labelOf(VISIT_STATUS_LABELS, activeVisit.status, 'Không rõ')}
                  </span>
                </div>
                <p className="text-[13px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>Giới tính: <strong className="text-slate-900">{formatGender(activeVisit.patientGender)}</strong></span>
                  <span>
                    Ngày sinh: <strong className="text-slate-900">{formatDate(activeVisit.patientDob)}</strong>
                    {ageFrom(activeVisit.patientDob) !== null && ` (${ageFrom(activeVisit.patientDob)} tuổi)`}
                  </span>
                  <span>SĐT: <SensitiveMask value={activeVisit.patientPhone} type="phone" /></span>
                  <span>Ca khám #{activeVisit.id} · {formatDateTime(activeVisit.visitTime)}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 sm:px-6 py-3 bg-white border-b border-slate-200">
            <PatientSafetyBanner
              allergies={allergyState.items}
              allergiesStatus={allergyState.status === 'idle' ? 'loading' : allergyState.status}
              onRetryAllergies={loadAllergies}
              vitalWarnings={vitalWarnings}
            />
          </div>

          <div role="tablist" aria-label="Nội dung ca khám" className="bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center gap-1 overflow-x-auto">
            {TABS.map((tab, index) => {
              const selected = activeTab === tab.id;
              const count = tabCount(tab.id);
              return (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[tab.id] = el; }}
                  type="button"
                  role="tab"
                  id={`visit-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`visit-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={`py-3 px-3 text-[13px] font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:bg-primary-fixed ${selected ? 'border-primary text-primary' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{tab.icon}</span>
                  {tab.label}{count !== null ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`visit-panel-${activeTab}`}
            aria-labelledby={`visit-tab-${activeTab}`}
            className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-6"
          >
            {activeTab === 'clinical' && (
              <>
                <section className="card p-5 sm:p-6 space-y-4" aria-labelledby="vitals-title">
                  <h4 id="vitals-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">vital_signs</span>
                    Chỉ số sinh hiệu
                  </h4>
                  <VitalSignsForm
                    idPrefix={`visit-${activeVisit.id}-vs`}
                    values={form.vitals}
                    errors={vitalErrors}
                    onChange={setVital}
                    disabled={!canEdit}
                  />
                </section>

                <section className="card p-5 sm:p-6 space-y-5" aria-labelledby="dx-title">
                  <h4 id="dx-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">medical_information</span>
                    Khám lâm sàng & chẩn đoán
                  </h4>

                  <div className="form-field">
                    <label htmlFor="visit-complaint" className="form-label">Lý do khám & triệu chứng</label>
                    <textarea
                      id="visit-complaint"
                      rows={2}
                      value={form.chiefComplaint}
                      onChange={(e) => setField('chiefComplaint', e.target.value)}
                      disabled={!canEdit}
                      placeholder="Triệu chứng bệnh nhân khai báo, thời gian xuất hiện, tính chất…"
                      className="textarea"
                    />
                  </div>

                  <DiagnosisSuggestBox
                    symptomsText={form.chiefComplaint}
                    visitId={activeVisit.id}
                    disabled={!canEdit}
                    onSelectDiagnosis={(code, name) => {
                      setField('diagnosisCode', code);
                      setDiagnosisError('');
                      showToast(`Đã điền mã gợi ý ${code} – ${name}. Vui lòng xác nhận lại trước khi lưu.`, 'info');
                    }}
                  />

                  <div className="form-field">
                    <label htmlFor="visit-icd" className="form-label">
                      Mã chẩn đoán ICD-10 <span className="required">*</span>
                    </label>
                    <input
                      id="visit-icd"
                      type="text"
                      list="visit-icd-options"
                      value={form.diagnosisCode}
                      onChange={(e) => { setField('diagnosisCode', e.target.value); setDiagnosisError(''); }}
                      disabled={!canEdit}
                      placeholder="VD: I10"
                      aria-invalid={diagnosisError ? 'true' : undefined}
                      aria-describedby="visit-icd-hint"
                      className={`input max-w-md uppercase ${diagnosisError ? 'is-error' : ''}`}
                    />
                    <datalist id="visit-icd-options">
                      {COMMON_ICD10_CODES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </datalist>
                    {diagnosisError ? (
                      <p id="visit-icd-hint" role="alert" className="form-error">{diagnosisError}</p>
                    ) : (
                      <p id="visit-icd-hint" className="form-hint">
                        {icdMatch ? `${icdMatch.code} – ${icdMatch.name}` : 'Bắt buộc khi hoàn tất ca khám. Chọn từ danh sách gợi ý hoặc nhập mã.'}
                      </p>
                    )}
                  </div>

                  <div className="form-field">
                    <label htmlFor="visit-note" className="form-label">Ghi chú lâm sàng, lời dặn & kế hoạch điều trị</label>
                    <textarea
                      id="visit-note"
                      rows={3}
                      value={form.diagnosisNote}
                      onChange={(e) => setField('diagnosisNote', e.target.value)}
                      disabled={!canEdit}
                      className="textarea"
                    />
                  </div>
                </section>
              </>
            )}

            {activeTab === 'prescription' && (
              <PrescriptionForm
                key={activeVisit.id}
                visit={activeVisit}
                allergies={allergyState.items}
                allergiesStatus={allergyState.status}
                readOnly={!canEdit}
                readOnlyReason={readOnlyReason}
                onPrescriptionAdded={(pres) => {
                  if (!pres) return;
                  setVisits((prev) => prev.map((v) => (v.id === activeVisit.id
                    ? { ...v, prescriptions: [...(v.prescriptions || []), pres] }
                    : v)));
                }}
              />
            )}

            {activeTab === 'lab' && (
              <LabOrderPanel
                key={activeVisit.id}
                visit={activeVisit}
                readOnly={!canEdit}
                readOnlyReason={readOnlyReason}
                canEnterResults={isDoctor}
                onOrderAdded={(order) => {
                  if (!order) return;
                  setVisits((prev) => prev.map((v) => (v.id === activeVisit.id
                    ? { ...v, labOrders: [...(v.labOrders || []), order] }
                    : v)));
                }}
                onResultUpdated={refreshActiveVisit}
              />
            )}

            {activeTab === 'summary' && (
              <article className="card p-6 sm:p-8 space-y-5 max-w-3xl mx-auto print:p-0 print:border-none print:shadow-none">
                <header className="text-center border-b border-slate-200 pb-4">
                  <h4 className="text-xl font-bold text-primary">BỆNH VIỆN MỸ PHÁT</h4>
                  <p className="text-[13px] text-slate-600">1170 Quang Trung, Thị trấn Chũ, Lục Ngạn, Bắc Giang · Hotline: 0789 065 493</p>
                  <h5 className="text-lg font-bold text-slate-900 mt-3">PHIẾU KHÁM BỆNH & TÓM TẮT ĐIỀU TRỊ</h5>
                  <p className="text-[13px] text-slate-600">Ca khám #{activeVisit.id} · Ngày khám: {formatDate(activeVisit.visitTime)}</p>
                </header>

                {isDirty && (
                  <p className="text-[13px] p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 print:hidden">
                    Có thay đổi chưa lưu – phiếu dưới đây hiển thị dữ liệu đã lưu trên hệ thống.
                  </p>
                )}

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                  <div><dt className="inline text-slate-600">Họ và tên: </dt><dd className="inline font-bold">{activeVisit.patientName}</dd></div>
                  <div><dt className="inline text-slate-600">Mã bệnh nhân: </dt><dd className="inline font-bold">{activeVisit.patientCode || '—'}</dd></div>
                  <div><dt className="inline text-slate-600">Giới tính: </dt><dd className="inline font-bold">{formatGender(activeVisit.patientGender)}</dd></div>
                  <div><dt className="inline text-slate-600">Ngày sinh: </dt><dd className="inline font-bold">{formatDate(activeVisit.patientDob)}</dd></div>
                </dl>

                <div className="p-3 rounded-lg bg-slate-50 text-[13px]">
                  <p className="font-semibold mb-1">Sinh hiệu</p>
                  <p>
                    {VITAL_SIGN_FIELDS.map((f) => `${f.label}: ${formatVitalValue(f, activeVisit.vitalSigns?.[f.key])}`).join(' · ')}
                  </p>
                </div>

                <div className="text-[13px] space-y-1.5 border-t border-slate-200 pt-3">
                  <p>Lý do khám: <span className="font-medium">{activeVisit.chiefComplaint || '—'}</span></p>
                  <p>
                    Chẩn đoán: <strong className="text-primary text-sm">{activeVisit.diagnosisCode || 'Chưa có'}</strong>
                    {findIcd10(activeVisit.diagnosisCode) && ` – ${findIcd10(activeVisit.diagnosisCode).name}`}
                  </p>
                  <p>Lời dặn: <span>{activeVisit.diagnosisNote || '—'}</span></p>
                  <p>
                    Dị ứng: {allergyState.status === 'ready'
                      ? (allergyState.items.length ? allergyState.items.map((a) => a.allergen).join(', ') : 'Chưa ghi nhận')
                      : 'Chưa xác định'}
                  </p>
                </div>

                {(activeVisit.prescriptions || []).length > 0 && (
                  <div className="text-[13px] space-y-2 border-t border-slate-200 pt-3">
                    <p className="font-bold text-primary">Đơn thuốc</p>
                    {activeVisit.prescriptions.map((p, idx) => (
                      <ol key={p.id || idx} className="pl-3 space-y-1">
                        {(p.items || []).map((it, iIdx) => (
                          <li key={it.id || iIdx} className="flex justify-between gap-3">
                            <span>{iIdx + 1}. {it.drugName} – {it.dosage}{it.instruction ? ` (${it.instruction})` : ''}</span>
                            <span className="font-bold shrink-0">{it.quantity} {it.unit || ''}</span>
                          </li>
                        ))}
                      </ol>
                    ))}
                  </div>
                )}

                <footer className="flex justify-between items-end pt-6 text-[13px] border-t border-slate-200">
                  <p>Trạng thái: <strong>{labelOf(VISIT_STATUS_LABELS, activeVisit.status, '—')}</strong></p>
                  <div className="text-center">
                    <p className="italic mb-8">Bác sĩ khám bệnh</p>
                    <p className="font-bold text-sm text-primary">{activeVisit.doctorName || ''}</p>
                  </div>
                </footer>

                <div className="flex justify-end pt-2 print:hidden">
                  <button type="button" onClick={() => window.print()} className="btn btn-primary">
                    <span className="material-symbols-outlined" aria-hidden="true">print</span>
                    In phiếu khám
                  </button>
                </div>
              </article>
            )}

            {activeTab === 'ai_audit' && (
              <section className="card p-5 sm:p-6 space-y-4" aria-labelledby="ai-audit-title">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <h4 id="ai-audit-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">history_edu</span>
                      Lịch sử phân tích AI của ca khám
                    </h4>
                    <p className="text-[13px] text-slate-600 mt-1">
                      Mọi lần kiểm tra an toàn đơn thuốc và gợi ý chẩn đoán đều được ghi lại để truy vết.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadAudit}
                    disabled={audit.status === 'loading'}
                    className="btn btn-secondary btn-sm"
                  >
                    <span className={`material-symbols-outlined ${audit.status === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true">refresh</span>
                    {audit.status === 'loading' ? 'Đang tải…' : 'Làm mới'}
                  </button>
                </div>

                {audit.status === 'loading' || audit.status === 'idle' ? (
                  <p className="py-10 text-center text-[13px] text-slate-600" aria-live="polite">Đang tải lịch sử phân tích…</p>
                ) : audit.status === 'error' ? (
                  <div role="alert" className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-sm flex flex-wrap items-center gap-3">
                    <span>{audit.error}</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={loadAudit}>Thử lại</button>
                  </div>
                ) : audit.items.length === 0 ? (
                  <p className="py-10 text-center text-[13px] text-slate-600 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    Chưa có lần phân tích AI nào cho ca khám này.
                  </p>
                ) : (
                  <ol className="space-y-3">
                    {audit.items.map((logItem, idx) => {
                      const lines = summarizeAiOutput(logItem.outputContent);
                      const pct = logItem.confidenceScore != null ? Math.round(Number(logItem.confidenceScore) * 100) : null;
                      return (
                        <li key={logItem.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between text-[13px] flex-wrap gap-2">
                            <span className={`badge ${logItem.suggestionType === 'DIAGNOSIS_SUGGESTION' ? 'badge-info' : 'badge-warning'}`}>
                              {labelOf(AI_TYPE_LABELS, logItem.suggestionType, 'Phân tích AI')}
                            </span>
                            <span className="text-slate-600">
                              {formatDateTime(logItem.createdAt)}
                              {pct !== null && Number.isFinite(pct) ? ` · Độ tin cậy ${pct}%` : ''}
                            </span>
                          </div>
                          {lines.length > 0 && (
                            <ul className="list-disc pl-5 text-[13px] text-slate-900 space-y-0.5">
                              {lines.map((l, i) => <li key={i}>{l}</li>)}
                            </ul>
                          )}
                          {logItem.outputContent && (
                            <details className="text-[13px]">
                              <summary className="cursor-pointer text-primary font-semibold">Xem dữ liệu gốc</summary>
                              <pre className="mt-2 whitespace-pre-wrap break-words bg-white rounded-lg p-3 border border-slate-200 text-xs">{logItem.outputContent}</pre>
                            </details>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}

                <p className="pt-3 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-600 italic">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">verified_user</span>
                  {AI_DISCLAIMER_TEXT}
                </p>
              </section>
            )}
          </div>

          <div className="bg-white border-t border-slate-200 px-5 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[13px] text-slate-600" aria-live="polite">
              {isCompleted
                ? 'Ca khám đã hoàn tất – hồ sơ đã khóa.'
                : isDirty ? 'Có thay đổi chưa lưu (F9 để lưu nhanh).' : 'Mọi thay đổi đã được lưu.'}
            </p>
            {canEdit && (
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleSave} disabled={isSaving} className="btn btn-secondary">
                  <span className="material-symbols-outlined" aria-hidden="true">save</span>
                  {isSaving ? 'Đang lưu…' : 'Lưu ca khám'}
                </button>
                <button type="button" onClick={handleComplete} disabled={isSaving} className="btn btn-primary">
                  <span className="material-symbols-outlined" aria-hidden="true">task_alt</span>
                  Hoàn tất ca khám
                </button>
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-slate-600 text-sm text-center">
          {listState.status === 'ready'
            ? 'Chọn một ca khám ở danh sách bên trái để bắt đầu.'
            : listState.status === 'error' ? 'Không có dữ liệu ca khám để hiển thị.' : 'Đang tải…'}
        </div>
      )}
    </Modal>
  );
}
