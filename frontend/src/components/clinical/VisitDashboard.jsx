import React, { useState, useEffect, useMemo } from 'react';
import { visitService, COMMON_ICD10_CODES } from '../../services/visitService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PrescriptionForm from './PrescriptionForm';
import LabOrderPanel from './LabOrderPanel';
import DiagnosisSuggestBox from './DiagnosisSuggestBox';
import { aiAlertService, AI_DISCLAIMER_TEXT } from '../../services/aiAlertService';

export default function VisitDashboard({ isOpen, onClose }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [visits, setVisits] = useState([]);
  const [activeVisitId, setActiveVisitId] = useState(null);
  const [activeTab, setActiveTab] = useState('clinical'); // 'clinical' | 'prescription' | 'lab' | 'summary' | 'ai_audit'
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Form states for active visit
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [diagnosisNote, setDiagnosisNote] = useState('');
  const [vitalSigns, setVitalSigns] = useState({
    pulse: 80,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    temperature: 36.8,
    respiratoryRate: 18,
    spO2: 98,
    weight: 65,
    height: 170
  });

  // Modal tạo ca khám mới trực tiếp
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientComplaint, setNewPatientComplaint] = useState('');

  // Load visits
  const loadVisits = async () => {
    try {
      setIsLoading(true);
      const list = await visitService.getVisits();
      setVisits(list);
      if (list.length > 0 && !activeVisitId) {
        selectVisit(list[0]);
      }
    } catch (err) {
      showToast('Không thể tải danh sách ca khám', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVisits();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeVisitId && activeTab === 'ai_audit') {
      const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
          const data = await aiAlertService.getVisitAuditLogs(activeVisitId);
          setAuditLogs(data || []);
        } catch (err) {
          console.error('Không thể tải audit log AI:', err);
        } finally {
          setIsLoadingLogs(false);
        }
      };
      fetchLogs();
    }
  }, [activeVisitId, activeTab]);

  const activeVisit = useMemo(() => {
    return visits.find(v => v.id === activeVisitId) || null;
  }, [visits, activeVisitId]);

  const selectVisit = (visit) => {
    setActiveVisitId(visit.id);
    setChiefComplaint(visit.chiefComplaint || '');
    setDiagnosisCode(visit.diagnosisCode || '');
    setDiagnosisNote(visit.diagnosisNote || '');
    if (visit.vitalSigns) {
      setVitalSigns({
        pulse: visit.vitalSigns.pulse ?? 80,
        bloodPressureSystolic: visit.vitalSigns.bloodPressureSystolic ?? 120,
        bloodPressureDiastolic: visit.vitalSigns.bloodPressureDiastolic ?? 80,
        temperature: visit.vitalSigns.temperature ?? 36.8,
        respiratoryRate: visit.vitalSigns.respiratoryRate ?? 18,
        spO2: visit.vitalSigns.spO2 ?? 98,
        weight: visit.vitalSigns.weight ?? 65,
        height: visit.vitalSigns.height ?? 170
      });
    }
  };

  // Tính chỉ số BMI tự động
  const bmi = useMemo(() => {
    if (!vitalSigns.weight || !vitalSigns.height) return null;
    const h = vitalSigns.height / 100;
    return (vitalSigns.weight / (h * h)).toFixed(1);
  }, [vitalSigns.weight, vitalSigns.height]);

  // Cảnh báo sinh hiệu bất thường
  const vitalWarnings = useMemo(() => {
    const warnings = [];
    if (vitalSigns.pulse > 100) warnings.push('Mạch nhanh (>100 bpm)');
    if (vitalSigns.pulse < 60) warnings.push('Mạch chậm (<60 bpm)');
    if (vitalSigns.bloodPressureSystolic >= 140 || vitalSigns.bloodPressureDiastolic >= 90) {
      warnings.push('Huyết áp cao (≥140/90 mmHg)');
    }
    if (vitalSigns.temperature >= 38.0) warnings.push('Sốt cao (≥38.0°C)');
    if (vitalSigns.spO2 && vitalSigns.spO2 < 95) warnings.push('SpO2 giảm thấp (<95%)');
    return warnings;
  }, [vitalSigns]);

  const handleSaveClinicalData = async () => {
    if (!activeVisit) return;
    try {
      setIsSaving(true);
      const updated = await visitService.updateVisit(activeVisit.id, {
        chiefComplaint,
        diagnosisCode,
        diagnosisNote,
        vitalSigns
      });
      showToast('Đã lưu chẩn đoán & sinh hiệu ca khám thành công!', 'success');
      setVisits(prev => prev.map(v => v.id === updated.id ? updated : v));
    } catch (err) {
      showToast(err.message || 'Lỗi lưu thông tin ca khám', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteVisit = async () => {
    if (!activeVisit) return;
    if (!diagnosisCode) {
      showToast('Vui lòng chọn hoặc nhập mã chẩn đoán ICD-10 trước khi hoàn tất khám!', 'warning');
      return;
    }

    try {
      setIsSaving(true);
      // Lưu thông tin trước khi hoàn tất
      await visitService.updateVisit(activeVisit.id, {
        chiefComplaint,
        diagnosisCode,
        diagnosisNote,
        vitalSigns
      });

      const completed = await visitService.completeVisit(activeVisit.id);
      showToast(`Đã hoàn tất ca khám của bệnh nhân ${completed.patientName}!`, 'success');
      setVisits(prev => prev.map(v => v.id === completed.id ? completed : v));
    } catch (err) {
      showToast(err.message || 'Không thể hoàn tất ca khám', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewVisit = async (e) => {
    e.preventDefault();
    if (!newPatientName.trim()) {
      showToast('Vui lòng nhập họ tên bệnh nhân', 'warning');
      return;
    }

    try {
      const newV = await visitService.createVisit({
        patientId: Date.now() % 10000,
        patientName: newPatientName.trim(),
        patientPhone: newPatientPhone.trim(),
        patientGender: 'MALE',
        doctorId: 1,
        doctorName: user?.fullName || 'TS. BS. Nguyễn Văn Hùng',
        doctorSpecialty: 'Tim mạch',
        departmentName: 'Khoa Tim mạch',
        chiefComplaint: newPatientComplaint.trim(),
        vitalSigns: {
          pulse: 80,
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
          temperature: 37.0,
          respiratoryRate: 18,
          spO2: 98
        }
      });

      showToast(`Đã tiếp nhận bệnh nhân ${newV.patientName} vào phòng khám!`, 'success');
      setVisits(prev => [newV, ...prev]);
      selectVisit(newV);
      setShowNewVisitModal(false);
      setNewPatientName('');
      setNewPatientPhone('');
      setNewPatientComplaint('');
    } catch (err) {
      showToast(err.message || 'Lỗi tiếp nhận bệnh nhân', 'error');
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  if (!isOpen) return null;

  const filteredVisits = visits.filter(v => {
    if (filterStatus === 'ALL') return true;
    return v.status === filterStatus;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-50 rounded-3xl w-full max-w-[1400px] h-[92vh] flex flex-col shadow-2xl border border-outline-variant/30 overflow-hidden animate-fade-in">
        
        {/* Top Clinical Header */}
        <div className="bg-white border-b border-surface-container-high px-6 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[24px]">stethoscope</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline text-lg font-bold text-on-surface">
                  Phòng Khám Bác Sĩ – Bệnh Viện Thanh Sơn
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  Sprint 4 Clinical
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-label">
                Bác sĩ phụ trách: <span className="font-bold text-on-surface">{user?.fullName || 'TS. BS. Nguyễn Văn Hùng'}</span> • Chuyên khoa Tim mạch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewVisitModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white font-label text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Tiếp nhận ca mới</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors cursor-pointer"
              title="Đóng phòng khám"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Main Body: 2 Columns */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Queue & Patient List */}
          <div className="w-full md:w-80 lg:w-96 bg-white border-r border-surface-container-high flex flex-col overflow-hidden">
            {/* Filter bar */}
            <div className="p-4 border-b border-surface-variant/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-headline text-sm font-bold text-on-surface">
                  Danh sách ca khám ({filteredVisits.length})
                </span>
                <span className="text-xs text-on-surface-variant">Hôm nay</span>
              </div>
              <div className="flex rounded-lg bg-surface-container-low p-1 border border-outline-variant/30 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className={`flex-1 py-1.5 rounded-md font-semibold transition-colors ${filterStatus === 'ALL' ? 'bg-white text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('IN_PROGRESS')}
                  className={`flex-1 py-1.5 rounded-md font-semibold transition-colors ${filterStatus === 'IN_PROGRESS' ? 'bg-white text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Đang khám
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('COMPLETED')}
                  className={`flex-1 py-1.5 rounded-md font-semibold transition-colors ${filterStatus === 'COMPLETED' ? 'bg-white text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Đã hoàn tất
                </button>
              </div>
            </div>

            {/* Visits List */}
            <div className="flex-1 overflow-y-auto divide-y divide-surface-variant/10">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-on-surface-variant">
                  Đang tải danh sách ca khám...
                </div>
              ) : filteredVisits.length === 0 ? (
                <div className="p-8 text-center text-xs text-on-surface-variant">
                  Không có ca khám nào theo bộ lọc.
                </div>
              ) : (
                filteredVisits.map((v) => {
                  const isSelected = v.id === activeVisitId;
                  const isDone = v.status === 'COMPLETED';
                  return (
                    <div
                      key={v.id}
                      onClick={() => selectVisit(v)}
                      className={`p-4 cursor-pointer transition-all border-l-4 ${
                        isSelected
                          ? 'bg-surface-container-lowest border-l-primary shadow-xs'
                          : 'hover:bg-slate-50 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-on-surface">
                          {v.patientName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isDone ? 'HOÀN TẤT' : 'ĐANG KHÁM'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <span>{v.patientCode}</span>
                        <span>•</span>
                        <span>{v.patientGender === 'MALE' ? 'Nam' : 'Nữ'}</span>
                      </div>
                      <div className="text-xs text-on-surface-variant mt-1.5 line-clamp-1 italic">
                        {v.chiefComplaint || 'Khám tổng quát'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Clinical Examination Workspace */}
          {activeVisit ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
              
              {/* Patient Banner */}
              <div className="bg-white border-b border-surface-container-high px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-bold text-base flex items-center justify-center">
                    {activeVisit.patientName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-headline text-lg font-bold text-on-surface">
                        {activeVisit.patientName}
                      </h4>
                      <span className="font-label text-xs font-semibold px-2 py-0.5 rounded bg-surface-container text-primary">
                        {activeVisit.patientCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-0.5 font-label">
                      <span>SĐT: <strong className="text-on-surface">{activeVisit.patientPhone || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Giới tính: <strong className="text-on-surface">{activeVisit.patientGender === 'MALE' ? 'Nam' : 'Nữ'}</strong></span>
                      <span>•</span>
                      <span>Ngày sinh: <strong className="text-on-surface">{activeVisit.patientDob || 'N/A'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-error flex items-center gap-1 bg-error-container/20 px-3 py-1.5 rounded-lg border border-error/20">
                    <span className="material-symbols-outlined text-[16px]">emergency</span>
                    <span>Tiền sử: Dị ứng Penicillin</span>
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="bg-white border-b border-surface-container px-6 flex items-center gap-6 text-sm">
                <button
                  type="button"
                  onClick={() => setActiveTab('clinical')}
                  className={`py-3 font-label font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'clinical'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">monitor_heart</span>
                  <span>Sinh hiệu & Chẩn đoán</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('prescription')}
                  className={`py-3 font-label font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'prescription'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">prescriptions</span>
                  <span>Kê đơn thuốc ({activeVisit.prescriptions?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('lab')}
                  className={`py-3 font-label font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'lab'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">science</span>
                  <span>Chỉ định Cận lâm sàng ({activeVisit.labOrders?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className={`py-3 font-label font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'summary'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">description</span>
                  <span>Phiếu khám tổng hợp (EMR)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ai_audit')}
                  className={`py-3 font-label font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'ai_audit'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                  <span>Lịch sử AI Audit (NFR-8)</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* TAB 1: CLINICAL & VITAL SIGNS */}
                {activeTab === 'clinical' && (
                  <div className="space-y-6">
                    {/* Vital warnings banner */}
                    {vitalWarnings.length > 0 && (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center gap-3 text-amber-900 text-xs font-semibold">
                        <span className="material-symbols-outlined text-amber-600 text-[22px]">warning</span>
                        <div>
                          <span>Cảnh báo chỉ số sinh hiệu bất thường: </span>
                          <strong className="text-amber-800">{vitalWarnings.join(' • ')}</strong>
                        </div>
                      </div>
                    )}

                    {/* VITAL SIGNS WIDGET */}
                    <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[20px]">vital_signs</span>
                          <span>Chỉ số sinh hiệu (Vital Signs)</span>
                        </h4>
                        {bmi && (
                          <span className="text-xs font-label px-3 py-1 rounded-full bg-surface-container font-semibold text-primary">
                            BMI: {bmi} kg/m² ({bmi < 18.5 ? 'Gầy' : bmi < 24.9 ? 'Bình thường' : 'Thừa cân'})
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* Pulse */}
                        <div className={`p-3 rounded-xl border ${
                          vitalSigns.pulse < 60 || vitalSigns.pulse > 100
                            ? 'bg-red-50 border-red-300 text-red-900'
                            : 'bg-slate-50 border-outline-variant/30 text-on-surface'
                        }`}>
                          <span className="block text-[11px] font-medium opacity-80">Mạch (bpm)</span>
                          <input
                            type="number"
                            value={vitalSigns.pulse}
                            onChange={(e) => setVitalSigns(prev => ({ ...prev, pulse: Number(e.target.value) }))}
                            className="w-full mt-1 bg-transparent font-headline text-xl font-bold focus:outline-none"
                          />
                          <span className="text-[10px] opacity-70">Chuẩn: 60-100</span>
                        </div>

                        {/* Blood Pressure Systolic */}
                        <div className={`p-3 rounded-xl border ${
                          vitalSigns.bloodPressureSystolic >= 140
                            ? 'bg-red-50 border-red-300 text-red-900'
                            : 'bg-slate-50 border-outline-variant/30 text-on-surface'
                        }`}>
                          <span className="block text-[11px] font-medium opacity-80">HA Tâm thu (mmHg)</span>
                          <input
                            type="number"
                            value={vitalSigns.bloodPressureSystolic}
                            onChange={(e) => setVitalSigns(prev => ({ ...prev, bloodPressureSystolic: Number(e.target.value) }))}
                            className="w-full mt-1 bg-transparent font-headline text-xl font-bold focus:outline-none"
                          />
                          <span className="text-[10px] opacity-70">Chuẩn: 90-120</span>
                        </div>

                        {/* Blood Pressure Diastolic */}
                        <div className={`p-3 rounded-xl border ${
                          vitalSigns.bloodPressureDiastolic >= 90
                            ? 'bg-red-50 border-red-300 text-red-900'
                            : 'bg-slate-50 border-outline-variant/30 text-on-surface'
                        }`}>
                          <span className="block text-[11px] font-medium opacity-80">HA Tâm trương (mmHg)</span>
                          <input
                            type="number"
                            value={vitalSigns.bloodPressureDiastolic}
                            onChange={(e) => setVitalSigns(prev => ({ ...prev, bloodPressureDiastolic: Number(e.target.value) }))}
                            className="w-full mt-1 bg-transparent font-headline text-xl font-bold focus:outline-none"
                          />
                          <span className="text-[10px] opacity-70">Chuẩn: 60-80</span>
                        </div>

                        {/* Temperature */}
                        <div className={`p-3 rounded-xl border ${
                          vitalSigns.temperature >= 38.0
                            ? 'bg-red-50 border-red-300 text-red-900'
                            : 'bg-slate-50 border-outline-variant/30 text-on-surface'
                        }`}>
                          <span className="block text-[11px] font-medium opacity-80">Nhiệt độ (°C)</span>
                          <input
                            type="number"
                            step="0.1"
                            value={vitalSigns.temperature}
                            onChange={(e) => setVitalSigns(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                            className="w-full mt-1 bg-transparent font-headline text-xl font-bold focus:outline-none"
                          />
                          <span className="text-[10px] opacity-70">Chuẩn: 36.5-37.5</span>
                        </div>

                        {/* SpO2 */}
                        <div className={`p-3 rounded-xl border ${
                          vitalSigns.spO2 < 95
                            ? 'bg-red-50 border-red-300 text-red-900'
                            : 'bg-slate-50 border-outline-variant/30 text-on-surface'
                        }`}>
                          <span className="block text-[11px] font-medium opacity-80">SpO2 (%)</span>
                          <input
                            type="number"
                            value={vitalSigns.spO2}
                            onChange={(e) => setVitalSigns(prev => ({ ...prev, spO2: Number(e.target.value) }))}
                            className="w-full mt-1 bg-transparent font-headline text-xl font-bold focus:outline-none"
                          />
                          <span className="text-[10px] opacity-70">Chuẩn: ≥ 95%</span>
                        </div>

                        {/* Weight */}
                        <div className="p-3 rounded-xl border bg-slate-50 border-outline-variant/30 text-on-surface">
                          <span className="block text-[11px] font-medium opacity-80">Cân nặng (kg)</span>
                          <input
                            type="number"
                            value={vitalSigns.weight}
                            onChange={(e) => setVitalSigns(prev => ({ ...prev, weight: Number(e.target.value) }))}
                            className="w-full mt-1 bg-transparent font-headline text-xl font-bold focus:outline-none"
                          />
                          <span className="text-[10px] opacity-70">Chiều cao: {vitalSigns.height}cm</span>
                        </div>
                      </div>
                    </div>

                    {/* CLINICAL SYMPTOMS & ICD-10 DIAGNOSIS */}
                    <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-5">
                      <h4 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">medical_information</span>
                        <span>Khám lâm sàng & Chẩn đoán bệnh</span>
                      </h4>

                      {/* Lý do đến khám */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-on-surface-variant">
                          Lý do đến khám & Triệu chứng khởi phát (Chief Complaint) *
                        </label>
                        <textarea
                          rows="2"
                          value={chiefComplaint}
                          onChange={(e) => setChiefComplaint(e.target.value)}
                          placeholder="Mô tả triệu chứng bệnh nhân khai báo, thời gian xuất hiện, tính chất đau..."
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>

                      {/* Gợi ý chẩn đoán AI (Sprint 6 - FR-11.3) */}
                      <DiagnosisSuggestBox
                        symptomsText={chiefComplaint}
                        onSelectDiagnosis={(code, name) => {
                          setDiagnosisCode(code);
                          showToast(`Đã áp dụng mã ICD-10 gợi ý từ AI: ${code} - ${name}`, 'success');
                        }}
                      />

                      {/* Mã chẩn đoán ICD-10 */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5 space-y-1.5">
                          <label className="block text-xs font-semibold text-on-surface-variant">
                            Mã bệnh quốc tế ICD-10 *
                          </label>
                          <select
                            value={diagnosisCode}
                            onChange={(e) => setDiagnosisCode(e.target.value)}
                            className="w-full px-3 py-2.5 text-sm rounded-xl border border-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                          >
                            <option value="">-- Chọn mã ICD-10 thông dụng --</option>
                            {COMMON_ICD10_CODES.map(c => (
                              <option key={c.code} value={c.code}>
                                [{c.code}] {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-7 space-y-1.5">
                          <label className="block text-xs font-semibold text-on-surface-variant">
                            Hoặc nhập mã / tên chẩn đoán xác định tự do
                          </label>
                          <input
                            type="text"
                            value={diagnosisCode}
                            onChange={(e) => setDiagnosisCode(e.target.value)}
                            placeholder="vd: I10 - Tăng huyết áp vô căn..."
                            className="w-full px-4 py-2.5 text-sm rounded-xl border border-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                          />
                        </div>
                      </div>

                      {/* Ghi chú điều trị */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-on-surface-variant">
                          Ghi chú lâm sàng, lời dặn & kế hoạch điều trị
                        </label>
                        <textarea
                          rows="3"
                          value={diagnosisNote}
                          onChange={(e) => setDiagnosisNote(e.target.value)}
                          placeholder="Chế độ ăn giảm muối, hạn chế mỡ động vật, tái khám sau 14 ngày hoặc khi có dấu hiệu bất thường..."
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: PRESCRIPTION FORM */}
                {activeTab === 'prescription' && (
                  <PrescriptionForm
                    visit={activeVisit}
                    onPrescriptionAdded={(newPres) => {
                      setVisits(prev => prev.map(v => {
                        if (v.id === activeVisit.id) {
                          return {
                            ...v,
                            prescriptions: [...(v.prescriptions || []), newPres]
                          };
                        }
                        return v;
                      }));
                    }}
                  />
                )}

                {/* TAB 3: LAB ORDER PANEL */}
                {activeTab === 'lab' && (
                  <LabOrderPanel
                    visit={activeVisit}
                    onOrderAdded={(newOrder) => {
                      setVisits(prev => prev.map(v => {
                        if (v.id === activeVisit.id) {
                          return {
                            ...v,
                            labOrders: [...(v.labOrders || []), newOrder]
                          };
                        }
                        return v;
                      }));
                    }}
                    onResultUpdated={(result) => {
                      loadVisits();
                    }}
                  />
                )}

                {/* TAB 4: PRINT SUMMARY (EMR) */}
                {activeTab === 'summary' && (
                  <div className="bg-white rounded-2xl p-8 border border-outline-variant/30 shadow-xs space-y-6 max-w-3xl mx-auto print:p-0 print:border-none">
                    <div className="text-center border-b border-surface-variant/30 pb-4">
                      <h2 className="font-headline text-xl font-bold text-primary">BỆNH VIỆN ĐA KHOA THANH SƠN</h2>
                      <p className="text-xs text-on-surface-variant">Địa chỉ: Thị trấn Thanh Sơn, Phú Thọ • Hotline: 1900 6868</p>
                      <h3 className="font-headline text-lg font-bold text-on-surface mt-3">PHIẾU KHÁM BỆNH & TÓM TẮT ĐIỀU TRỊ</h3>
                      <p className="text-xs text-on-surface-variant font-label">Mã hồ sơ: #{activeVisit.id} • Ngày khám: {new Date(activeVisit.visitTime).toLocaleDateString('vi-VN')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>Họ và tên: <strong className="text-sm">{activeVisit.patientName}</strong></div>
                      <div>Mã bệnh nhân: <strong>{activeVisit.patientCode}</strong></div>
                      <div>Giới tính: <strong>{activeVisit.patientGender === 'MALE' ? 'Nam' : 'Nữ'}</strong></div>
                      <div>Số điện thoại: <strong>{activeVisit.patientPhone || 'N/A'}</strong></div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 text-xs space-y-1">
                      <div>Sinh hiệu: <strong>Mạch: {vitalSigns.pulse} bpm • HA: {vitalSigns.bloodPressureSystolic}/{vitalSigns.bloodPressureDiastolic} mmHg • Thân nhiệt: {vitalSigns.temperature}°C • SpO2: {vitalSigns.spO2}%</strong></div>
                    </div>

                    <div className="text-xs space-y-1.5 border-t border-surface-variant/20 pt-3">
                      <div>Lý do khám: <span className="font-medium">{chiefComplaint}</span></div>
                      <div>Chẩn đoán xác định: <strong className="text-primary text-sm">[{diagnosisCode}]</strong></div>
                      <div>Lời dặn bác sĩ: <span>{diagnosisNote || 'Theo dõi định kỳ.'}</span></div>
                    </div>

                    {activeVisit.prescriptions && activeVisit.prescriptions.length > 0 && (
                      <div className="text-xs space-y-2 border-t border-surface-variant/20 pt-3">
                        <strong className="text-primary">Đơn thuốc chỉ định:</strong>
                        {activeVisit.prescriptions.map((p, idx) => (
                          <div key={idx} className="pl-3 space-y-1">
                            {p.items?.map((it, iIdx) => (
                              <div key={iIdx} className="flex justify-between">
                                <span>{iIdx + 1}. {it.drugName} - {it.dosage} ({it.instruction})</span>
                                <span className="font-bold">{it.quantity} {it.unit}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-end pt-8 text-xs border-t border-surface-variant/20">
                      <div>
                        <span>Trạng thái: </span>
                        <strong className={activeVisit.status === 'COMPLETED' ? 'text-emerald-700' : 'text-amber-700'}>
                          {activeVisit.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Đang điều trị'}
                        </strong>
                      </div>
                      <div className="text-center">
                        <p className="italic mb-8">Bác sĩ khám bệnh</p>
                        <p className="font-bold text-sm text-primary">{activeVisit.doctorName || 'TS. BS. Nguyễn Văn Hùng'}</p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-variant/20 print:hidden">
                      <button
                        type="button"
                        onClick={handlePrintSummary}
                        className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold flex items-center gap-2 hover:bg-primary/90"
                      >
                        <span className="material-symbols-outlined text-[18px]">print</span>
                        <span>In phiếu khám EMR</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 5: AI CLINICAL AUDIT LOG (NFR-8) */}
                {activeTab === 'ai_audit' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h4 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[22px]">history_edu</span>
                            <span>Nhật ký truy vết lâm sàng AI (Audit Log)</span>
                          </h4>
                          <p className="text-xs text-on-surface-variant mt-1">
                            Tuân thủ NFR-8: Toàn bộ gợi ý, phân tích và cảnh báo lâm sàng từ AI Service đều được ghi vết lưu trữ tự động.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            setIsLoadingLogs(true);
                            const data = await aiAlertService.getVisitAuditLogs(activeVisit.id);
                            setAuditLogs(data || []);
                            setIsLoadingLogs(false);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-semibold flex items-center gap-1.5 hover:bg-surface-container cursor-pointer"
                        >
                          <span className={`material-symbols-outlined text-[16px] ${isLoadingLogs ? 'animate-spin' : ''}`}>
                            refresh
                          </span>
                          <span>Làm mới</span>
                        </button>
                      </div>

                      {isLoadingLogs ? (
                        <div className="py-12 text-center text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined animate-spin text-[28px] text-primary block mb-2">
                            progress_activity
                          </span>
                          <span>Đang tải lịch sử audit AI...</span>
                        </div>
                      ) : auditLogs.length === 0 ? (
                        <div className="py-12 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl border border-dashed border-outline-variant/50 space-y-2">
                          <span className="material-symbols-outlined text-[36px] text-outline">verified</span>
                          <p className="font-medium text-on-surface">Chưa có bản ghi phân tích an toàn AI nào cho ca khám này.</p>
                          <p className="text-[11px]">Bản ghi sẽ tự động được tạo khi bác sĩ thực hiện kê đơn hoặc kiểm tra tương tác thuốc.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {auditLogs.map((logItem, idx) => (
                            <div key={logItem.id || idx} className="p-4 rounded-xl border border-outline-variant/30 bg-slate-50 space-y-2">
                              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                                    logItem.suggestionType === 'DRUG_INTERACTION'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : 'bg-purple-100 text-purple-900 border border-purple-300'
                                  }`}>
                                    {logItem.suggestionType}
                                  </span>
                                  <span className="font-bold text-on-surface">Bản ghi #{logItem.id}</span>
                                </div>
                                <div className="text-on-surface-variant text-[11px] flex items-center gap-2">
                                  <span>Độ tin cậy: <strong className="text-primary font-bold">{Math.round((logItem.confidenceScore || 0.95) * 100)}%</strong></span>
                                  <span>•</span>
                                  <span>{new Date(logItem.createdAt || Date.now()).toLocaleString('vi-VN')}</span>
                                </div>
                              </div>

                              <div className="text-xs bg-white rounded-lg p-3 border border-outline-variant/20 font-mono text-[11px] overflow-x-auto text-on-surface">
                                <div className="font-bold font-sans text-on-surface-variant mb-1">Chi tiết phân tích AI (JSON Output):</div>
                                <pre className="whitespace-pre-wrap">{logItem.outputContent}</pre>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-3 border-t border-surface-variant/20 flex items-center gap-2 text-[11px] text-on-surface-variant italic">
                        <span className="material-symbols-outlined text-[16px] text-outline">verified_user</span>
                        <span>{AI_DISCLAIMER_TEXT}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Action Footer */}
              <div className="bg-white border-t border-surface-container-high px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-on-surface-variant">
                  Ca khám: <strong className="text-on-surface">#{activeVisit.id}</strong> • Trạng thái: 
                  <span className={`ml-1.5 px-2 py-0.5 rounded font-bold ${activeVisit.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {activeVisit.status === 'COMPLETED' ? 'Đã hoàn tất khám' : 'Đang khám'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveClinicalData}
                    disabled={isSaving || activeVisit.status === 'COMPLETED'}
                    className="px-5 py-2.5 rounded-xl border border-outline-variant text-on-surface font-label text-xs font-semibold hover:bg-surface-container-low disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>Lưu cập nhật ca khám</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCompleteVisit}
                    disabled={isSaving || activeVisit.status === 'COMPLETED'}
                    className="px-6 py-2.5 rounded-xl bg-emerald-700 text-white font-label text-xs font-semibold hover:bg-emerald-800 shadow-xs disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>Hoàn tất ca khám (EMR)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-on-surface-variant text-sm">
              Chọn một ca khám từ danh sách bên trái hoặc tiếp nhận bệnh nhân mới để bắt đầu khám bệnh.
            </div>
          )}
        </div>
      </div>

      {/* New Visit Modal */}
      {showNewVisitModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-variant/20 pb-3">
              <h4 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">person_add</span>
                <span>Tiếp nhận ca khám mới</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowNewVisitModal(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewVisit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-on-surface-variant">Họ tên bệnh nhân *</label>
                <input
                  type="text"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="vd: Nguyễn Hoàng Anh"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-on-surface-variant">Số điện thoại</label>
                <input
                  type="tel"
                  value={newPatientPhone}
                  onChange={(e) => setNewPatientPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-on-surface-variant">Lý do đến khám</label>
                <textarea
                  rows="2"
                  value={newPatientComplaint}
                  onChange={(e) => setNewPatientComplaint(e.target.value)}
                  placeholder="vd: Đau đầu, chóng mặt, đo kiểm tra huyết áp..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-outline-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-variant/20">
                <button
                  type="button"
                  onClick={() => setShowNewVisitModal(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-semibold hover:bg-surface-container"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Bắt đầu khám</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
