import React, { useState, useEffect } from 'react';
import { receptionService } from '../../services/receptionService';
import { useToast } from '../../context/ToastContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import SensitiveMask from '../common/SensitiveMask';

export const ReceptionDashboardModal = ({ isOpen, onClose }) => {
  useEscapeKey(isOpen, onClose);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'register'
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();

  // Form đăng ký nhanh bệnh nhân
  const [regForm, setRegForm] = useState({
    fullName: '',
    dob: '',
    gender: 'MALE',
    phone: '',
    nationalId: '',
    address: '',
    bloodType: 'O+'
  });

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await receptionService.getTodayQueue();
      setQueue(data);
    } catch {
      showToast('Không thể tải danh sách tiếp đón', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadQueue();
    }
  }, [isOpen]);

  const handleConfirm = async (item) => {
    await receptionService.confirmAppointment(item.id);
    showToast(`Đã xác nhận lịch hẹn của bệnh nhân ${item.fullName}`, 'success');
    loadQueue();
  };

  const handleCheckIn = async (item) => {
    await receptionService.checkInPatient(item);
    showToast(`Đã check-in ${item.fullName} vào ${item.departmentName}`, 'success');
    loadQueue();
  };

  const handleQuickRegister = async (e) => {
    e.preventDefault();
    if (!regForm.fullName || !regForm.phone) {
      showToast('Vui lòng điền họ tên và số điện thoại', 'warning');
      return;
    }
    const res = await receptionService.quickRegisterPatient(regForm);
    if (res.success) {
      showToast(`Đã tạo hồ sơ bệnh nhân mới: ${res.patient.patientCode} - ${res.patient.fullName}`, 'success');
      setRegForm({
        fullName: '',
        dob: '',
        gender: 'MALE',
        phone: '',
        nationalId: '',
        address: '',
        bloodType: 'O+'
      });
      setActiveTab('queue');
      loadQueue();
    }
  };

  const filteredQueue = queue.filter(
    (item) =>
      item.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.patientCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone?.includes(searchTerm)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-teal-100 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <span className="material-symbols-outlined text-white text-[24px]">desk</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Quầy Tiếp Đón & Lễ Tân</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase">
                  Reception Desk
                </span>
              </div>
              <p className="text-xs text-teal-100">Tiếp nhận bệnh nhân, xác nhận hẹn và check-in vào buồng khám</p>
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

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 pt-2">
          <button
            id="tabQueueBtn"
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'border-teal-700 text-teal-900 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
            <span>Hàng Đợi Tiếp Nhận ({queue.length})</span>
          </button>
          <button
            id="tabRegisterBtn"
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'border-teal-700 text-teal-900 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Tiếp Nhận Bệnh Nhân Mới</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'queue' ? (
            <div className="space-y-4">
              {/* Search & Actions Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-slate-400 text-[20px]">
                    search
                  </span>
                  <input
                    id="searchPatientInput"
                    type="text"
                    placeholder="Tìm theo tên bệnh nhân, mã hồ sơ hoặc số điện thoại..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-9 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Xóa tìm kiếm"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={loadQueue}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 cursor-pointer justify-center"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Làm mới</span>
                </button>
              </div>

              {/* Patient Queue Table */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="px-4 py-3">Mã & Họ Tên</th>
                      <th className="px-4 py-3">Khoa & Bác Sĩ</th>
                      <th className="px-4 py-3">Khung Giờ</th>
                      <th className="px-4 py-3">Triệu chứng ban đầu</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Thao tác Tiếp đón</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-10 text-slate-400">
                          {loading ? (
                            'Đang nạp dữ liệu hàng đợi...'
                          ) : searchTerm ? (
                            <div className="py-4 space-y-2">
                              <span className="material-symbols-outlined text-3xl text-slate-300">person_search</span>
                              <p className="text-sm font-medium text-slate-600">Không tìm thấy bệnh nhân nào khớp với "{searchTerm}"</p>
                              <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="text-xs text-teal-700 hover:text-teal-800 font-semibold underline cursor-pointer"
                              >
                                Xóa bộ lọc tìm kiếm
                              </button>
                            </div>
                          ) : (
                            'Chưa có bệnh nhân nào trong danh sách tiếp nhận hôm nay'
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredQueue.map((item) => (
                        <tr key={item.id} className="hover:bg-teal-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{item.fullName}</div>
                            <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                              <span>{item.patientCode}</span>
                              <span>•</span>
                              <span>SĐT: <SensitiveMask value={item.phone} type="phone" /></span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-semibold text-teal-800">{item.departmentName}</div>
                            <div className="text-xs text-slate-500">{item.doctorName}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                              <span className="material-symbols-outlined text-[14px]">schedule</span>
                              {item.appointmentTime}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate" title={item.symptoms}>
                            {item.symptoms}
                          </td>
                          <td className="px-4 py-3">
                            {item.status === 'CHECKED_IN' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                Đã vào phòng khám
                              </span>
                            ) : item.status === 'CONFIRMED' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                                Đã xác nhận hẹn
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                Chờ tiếp đón
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {item.status === 'BOOKED' && (
                                <button
                                  onClick={() => handleConfirm(item)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 cursor-pointer"
                                >
                                  Xác nhận
                                </button>
                              )}
                              {item.status !== 'CHECKED_IN' ? (
                                <button
                                  id={`checkInBtn-${item.id}`}
                                  onClick={() => handleCheckIn(item)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-600 hover:to-emerald-500 text-white shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">login</span>
                                  <span>Check-in</span>
                                </button>
                              ) : (
                                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                  Đang khám
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Quick Patient Registration Form */
            <form onSubmit={handleQuickRegister} className="max-w-2xl mx-auto space-y-4">
              <div className="bg-mint-50/70 p-4 rounded-2xl border border-teal-200/60 mb-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-teal-700 text-[22px]">badge</span>
                <div className="text-xs text-teal-900 leading-relaxed">
                  Lễ tân nhập thông tin định danh của bệnh nhân đến khám lần đầu. Mã hồ sơ bệnh nhân (Patient Code) sẽ được hệ thống tự động sinh theo quy chuẩn của Mỹ Phát Hospital.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và Tên Bệnh Nhân <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="regFullName"
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={regForm.fullName}
                    onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số Điện Thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="regPhone"
                    type="tel"
                    required
                    placeholder="0912345678"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày Sinh</label>
                  <input
                    type="date"
                    value={regForm.dob}
                    onChange={(e) => setRegForm({ ...regForm, dob: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giới Tính</label>
                  <select
                    value={regForm.gender}
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số CCCD / Định Danh</label>
                  <input
                    type="text"
                    placeholder="001202000000"
                    value={regForm.nationalId}
                    onChange={(e) => setRegForm({ ...regForm, nationalId: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nhóm Máu</label>
                  <select
                    value={regForm.bloodType}
                    onChange={(e) => setRegForm({ ...regForm, bloodType: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="O+">O Rh+</option>
                    <option value="A+">A Rh+</option>
                    <option value="B+">B Rh+</option>
                    <option value="AB+">AB Rh+</option>
                    <option value="O-">O Rh-</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Địa Chỉ Thường Trú</label>
                  <input
                    type="text"
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                    value={regForm.address}
                    onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('queue')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  id="submitRegisterPatientBtn"
                  type="submit"
                  className="px-6 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-600 hover:to-emerald-500 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  <span>Tạo Hồ Sơ Bệnh Nhân</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default ReceptionDashboardModal;
