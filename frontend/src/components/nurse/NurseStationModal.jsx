import React, { useState, useEffect } from 'react';
import { nurseService } from '../../services/nurseService';
import { useToast } from '../../context/ToastContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export const NurseStationModal = ({ isOpen, onClose }) => {
  useEscapeKey(isOpen, onClose);
  const [activeTab, setActiveTab] = useState('vitals'); // 'vitals' | 'lab'
  const [vitalsQueue, setVitalsQueue] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [labOrders, setLabOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { showToast } = useToast();

  // Vitals Form State
  const [vitalsForm, setVitalsForm] = useState({
    pulse: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    temperature: '',
    respiratoryRate: '',
    spO2: '',
    heightCm: '',
    weightKg: ''
  });

  // Lab Result Form State
  const [labForm, setLabForm] = useState({
    value: '',
    referenceRange: '',
    unit: '',
    isAbnormal: false,
    conclusion: ''
  });

  const loadData = () => {
    const vq = nurseService.getVitalsQueue();
    setVitalsQueue(vq);
    const lo = nurseService.getLabOrders();
    setLabOrders(lo);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const bmiResult = nurseService.calculateBmi(
    parseFloat(vitalsForm.weightKg),
    parseFloat(vitalsForm.heightCm)
  );

  const handleSelectVisitForVitals = (item) => {
    setSelectedVisit(item);
    if (item.vitals) {
      setVitalsForm({
        pulse: item.vitals.pulse || '',
        bloodPressureSystolic: item.vitals.bloodPressureSystolic || '',
        bloodPressureDiastolic: item.vitals.bloodPressureDiastolic || '',
        temperature: item.vitals.temperature || '',
        respiratoryRate: item.vitals.respiratoryRate || '',
        spO2: item.vitals.spO2 || '',
        heightCm: item.vitals.heightCm || '',
        weightKg: item.vitals.weightKg || ''
      });
    } else {
      setVitalsForm({
        pulse: '78',
        bloodPressureSystolic: '120',
        bloodPressureDiastolic: '80',
        temperature: '36.8',
        respiratoryRate: '18',
        spO2: '98',
        heightCm: '168',
        weightKg: '65'
      });
    }
  };

  const handleSaveVitals = async (e) => {
    e.preventDefault();
    if (!selectedVisit) {
      showToast('Vui lòng chọn bệnh nhân cần đo sinh hiệu', 'warning');
      return;
    }
    const payload = {
      ...vitalsForm,
      bmi: bmiResult ? bmiResult.bmi : null,
      bmiCategory: bmiResult ? bmiResult.category : null,
      recordedAt: new Date().toISOString()
    };
    await nurseService.saveVitals(selectedVisit.visitId, payload);
    showToast(`Đã lưu sinh hiệu thành công cho ${selectedVisit.fullName}`, 'success');
    setSelectedVisit(null);
    loadData();
  };

  const handleSelectOrderForLab = (order) => {
    setSelectedOrder(order);
    if (order.result) {
      setLabForm(order.result);
    } else {
      setLabForm({
        value: '5.2',
        referenceRange: '3.9 - 6.4',
        unit: 'mmol/L',
        isAbnormal: false,
        conclusion: 'Chỉ số trong giới hạn sinh lý bình thường'
      });
    }
  };

  const handleSubmitLabResult = async (e) => {
    e.preventDefault();
    if (!selectedOrder) {
      showToast('Vui lòng chọn chỉ định xét nghiệm', 'warning');
      return;
    }
    await nurseService.submitLabResult(selectedOrder.id, labForm);
    showToast(`Đã lưu kết quả cận lâm sàng cho ${selectedOrder.patientName}`, 'success');
    setSelectedOrder(null);
    loadData();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-teal-100 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 via-teal-700 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <span className="material-symbols-outlined text-white text-[24px]">vital_signs</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Trạm Điều Dưỡng & Phòng Xét Nghiệm</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase">
                  Nurse & Lab Station
                </span>
              </div>
              <p className="text-xs text-teal-100">Đo chỉ số sinh tồn (Vitals), tự động tính BMI và cập nhật kết quả Cận lâm sàng</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-teal-100/70 border border-teal-100/25 rounded">
              ESC
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <span className="material-symbols-outlined text-white text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 pt-2">
          <button
            id="tabVitalsBtn"
            onClick={() => setActiveTab('vitals')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'vitals'
                ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">monitor_heart</span>
            <span>Đo Sinh Hiệu Khám Bệnh ({vitalsQueue.length})</span>
          </button>
          <button
            id="tabLabBtn"
            onClick={() => setActiveTab('lab')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'lab'
                ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">biotechnology</span>
            <span>Kết Quả Cận Lâm Sàng & Lab ({labOrders.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'vitals' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Waiting Patient List */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Bệnh Nhân Chờ Đo Sinh Hiệu
                  </h3>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {vitalsQueue.length} ca chờ
                  </span>
                </div>
                <div className="space-y-2">
                  {vitalsQueue.map((item) => (
                    <div
                      key={item.visitId}
                      onClick={() => handleSelectVisitForVitals(item)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        selectedVisit?.visitId === item.visitId
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-400'
                          : 'border-slate-200 hover:border-emerald-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-sm text-slate-900">{item.fullName}</div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'VITALS_COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status === 'VITALS_COMPLETED' ? 'Đã đo' : 'Chờ đo'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mb-1.5">
                        {item.patientCode} • {item.gender === 'MALE' ? 'Nam' : 'Nữ'} • {item.age} tuổi
                      </div>
                      <div className="text-xs text-slate-600 line-clamp-1 italic">
                        Lý do khám: {item.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vitals Form */}
              <div className="lg:col-span-7 bg-slate-50/70 p-5 rounded-3xl border border-slate-200">
                <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Phiếu Ghi Nhận Chỉ Số Sinh Tồn
                    </h3>
                    <div className="text-xs text-slate-500">
                      {selectedVisit ? `Đang đo cho: ${selectedVisit.fullName} (${selectedVisit.patientCode})` : 'Chọn bệnh nhân từ danh sách bên trái'}
                    </div>
                  </div>
                  {bmiResult && (
                    <div className={`px-3 py-1.5 rounded-xl border text-center font-bold text-xs ${
                      bmiResult.category === 'Bình thường' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-amber-50 border-amber-300 text-amber-800'
                    }`}>
                      BMI: {bmiResult.bmi} ({bmiResult.category})
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveVitals} className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Huyết Áp TT (mmHg)
                      </label>
                      <input
                        id="bpSystolicInput"
                        type="number"
                        placeholder="120"
                        value={vitalsForm.bloodPressureSystolic}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressureSystolic: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Huyết Áp TTr (mmHg)
                      </label>
                      <input
                        id="bpDiastolicInput"
                        type="number"
                        placeholder="80"
                        value={vitalsForm.bloodPressureDiastolic}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressureDiastolic: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Mạch (lần/phút)
                      </label>
                      <input
                        id="pulseInput"
                        type="number"
                        placeholder="75"
                        value={vitalsForm.pulse}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, pulse: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Thân Nhiệt (°C)
                      </label>
                      <input
                        id="temperatureInput"
                        type="number"
                        step="0.1"
                        placeholder="36.5"
                        value={vitalsForm.temperature}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        SpO2 (%)
                      </label>
                      <input
                        id="spo2Input"
                        type="number"
                        placeholder="98"
                        value={vitalsForm.spO2}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, spO2: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Nhịp Thở (lần/phút)
                      </label>
                      <input
                        type="number"
                        placeholder="18"
                        value={vitalsForm.respiratoryRate}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, respiratoryRate: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Chiều Cao (cm)
                      </label>
                      <input
                        id="heightInput"
                        type="number"
                        placeholder="168"
                        value={vitalsForm.heightCm}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, heightCm: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Cân Nặng (kg)
                      </label>
                      <input
                        id="weightInput"
                        type="number"
                        step="0.5"
                        placeholder="65"
                        value={vitalsForm.weightKg}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, weightKg: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Cảnh báo lâm sàng nếu có chỉ số vượt ngưỡng */}
                  {(Number(vitalsForm.bloodPressureSystolic) >= 140 ||
                    Number(vitalsForm.bloodPressureDiastolic) >= 90 ||
                    Number(vitalsForm.temperature) >= 38.0 ||
                    (vitalsForm.spO2 && Number(vitalsForm.spO2) < 95) ||
                    Number(vitalsForm.pulse) > 100 ||
                    (vitalsForm.pulse && Number(vitalsForm.pulse) < 60)) && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-wrap items-center gap-2">
                      <span className="font-bold flex items-center gap-1 text-amber-700">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        Phát hiện chỉ số bất thường:
                      </span>
                      {Number(vitalsForm.bloodPressureSystolic) >= 140 && <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold">• Huyết áp cao (≥140)</span>}
                      {Number(vitalsForm.temperature) >= 38.0 && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">• Sốt cao (≥38°C)</span>}
                      {vitalsForm.spO2 && Number(vitalsForm.spO2) < 95 && <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold">• SpO2 giảm (&lt;95%)</span>}
                      {Number(vitalsForm.pulse) > 100 && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">• Nhịp tim nhanh (&gt;100 bpm)</span>}
                    </div>
                  )}

                  <div className="pt-3 flex justify-end">
                    <button
                      id="saveVitalsBtn"
                      type="submit"
                      disabled={!selectedVisit}
                      className="px-6 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      <span>Lưu Chỉ Số Sinh Tồn</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Lab Orders & Results */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Lab Orders List */}
              <div className="lg:col-span-5 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Chỉ Định Cận Lâm Sàng Chờ Trả Kết Quả
                </h3>
                <div className="space-y-2">
                  {labOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => handleSelectOrderForLab(order)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        selectedOrder?.id === order.id
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-400'
                          : 'border-slate-200 hover:border-emerald-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-sm text-slate-900">{order.testType}</div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status === 'COMPLETED' ? 'Đã có KQ' : 'Chờ xét nghiệm'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Bệnh nhân: <span className="font-semibold text-slate-700">{order.patientName}</span> ({order.patientCode})
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">Chỉ định lúc: {order.orderedAt}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lab Result Entry Form */}
              <div className="lg:col-span-7 bg-slate-50/70 p-5 rounded-3xl border border-slate-200">
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  Nhập Kết Quả Xét Nghiệm & Đánh Giá
                </h3>
                <div className="text-xs text-slate-500 mb-4 pb-2 border-b border-slate-200">
                  {selectedOrder ? `Chỉ định: ${selectedOrder.testType} – BN: ${selectedOrder.patientName}` : 'Chọn chỉ định xét nghiệm từ danh sách bên trái'}
                </div>

                <form onSubmit={handleSubmitLabResult} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Chỉ số đo được</label>
                      <input
                        id="labValueInput"
                        type="text"
                        placeholder="5.2"
                        value={labForm.value}
                        onChange={(e) => setLabForm({ ...labForm, value: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Khoảng tham chiếu</label>
                      <input
                        type="text"
                        placeholder="3.9 - 6.4"
                        value={labForm.referenceRange}
                        onChange={(e) => setLabForm({ ...labForm, referenceRange: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị</label>
                      <input
                        type="text"
                        placeholder="mmol/L"
                        value={labForm.unit}
                        onChange={(e) => setLabForm({ ...labForm, unit: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id="isAbnormalCheck"
                      type="checkbox"
                      checked={labForm.isAbnormal}
                      onChange={(e) => setLabForm({ ...labForm, isAbnormal: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
                    />
                    <label htmlFor="isAbnormalCheck" className="text-xs font-semibold text-rose-700">
                      Đánh dấu chỉ số bất thường (Cảnh báo bác sĩ)
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kết luận xét nghiệm</label>
                    <textarea
                      id="labConclusionInput"
                      rows={2}
                      placeholder="Ghi chú nhận định lâm sàng của kỹ thuật viên/điều dưỡng..."
                      value={labForm.conclusion}
                      onChange={(e) => setLabForm({ ...labForm, conclusion: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      id="submitLabResultBtn"
                      type="submit"
                      disabled={!selectedOrder}
                      className="px-6 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                      <span>Lưu Kết Quả Cận Lâm Sàng</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default NurseStationModal;
