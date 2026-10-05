import React, { useState, useEffect } from 'react';
import scheduleService from '../../services/scheduleService';
import { useAuth } from '../../context/AuthContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';

const DEPARTMENTS_LIST = [
  { id: '', name: 'Tất cả khoa phòng' },
  { id: '1', name: 'Khoa Khám bệnh / Cấp cứu ban đầu' },
  { id: '2', name: 'Ngoại khoa & Phẫu thuật / Tiểu phẫu' },
  { id: '3', name: 'Sản - Phụ khoa' },
  { id: '10', name: 'Tai Mũi Họng' },
  { id: '12', name: 'Phòng Dược & Cung ứng thuốc' },
  { id: '13', name: 'Khoa Y học cổ truyền – Phục hồi chức năng' },
  { id: '14', name: 'Dịch vụ Thẩm mỹ / Tạo hình' },
  { id: '15', name: 'Khoa Chẩn đoán hình ảnh' },
  { id: '16', name: 'Khoa Xét nghiệm' },
  { id: '17', name: 'Dịch vụ Bảo hiểm Y tế (BHYT)' }
];

export default function StaffScheduleModal({
  isOpen,
  onClose,
  onShowToast,
  initialDeptId = '',
  initialStaffId = ''
}) {
  const { user, isAdmin } = useAuth();
  useEscapeKey(isOpen, () => {
    if (showAddModal) {
      setShowAddModal(false);
    } else {
      onClose();
    }
  });

  const [schedules, setSchedules] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(initialDeptId || '');
  const [selectedStaffId, setSelectedStaffId] = useState(initialStaffId || '');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  // Tuần hiện tại
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Form xếp lịch trực mới (Admin)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaffId, setNewStaffId] = useState('');
  const [newDeptId, setNewDeptId] = useState('1');
  const [newDate, setNewDate] = useState('');
  const [newShift, setNewShift] = useState('MORNING');
  const [newRoom, setNewRoom] = useState('Phòng khám ban đầu 101 (Tầng 1)');
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStaff();
      // Set default newDate là ngày hôm nay
      setNewDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadSchedules();
    }
  }, [isOpen, currentWeekOffset, selectedDeptId, selectedStaffId]);

  const loadStaff = async () => {
    try {
      const list = await scheduleService.getStaffList();
      setStaffList(list);
      if (list && list.length > 0 && !newStaffId) {
        setNewStaffId(String(list[0].id));
        setNewDeptId(String(list[0].departmentId || 1));
        setNewRoom(list[0].roomNo || 'Phòng khám ban đầu 101 (Tầng 1)');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStaffSelectInAdd = (staffIdStr) => {
    setNewStaffId(staffIdStr);
    const s = staffList.find(item => item.id === Number(staffIdStr));
    if (s) {
      if (s.departmentId) setNewDeptId(String(s.departmentId));
      if (s.roomNo) setNewRoom(s.roomNo);
    }
  };

  const getWeekDays = () => {
    const today = new Date();
    // Chuyển về Thứ 2 của tuần này
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) + currentWeekOffset * 7;
    const monday = new Date(today.setDate(diff));

    const week = [];
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push({
        dateStr: d.toISOString().split('T')[0],
        dayName: dayNames[i],
        displayDate: `${d.getDate()}/${d.getMonth() + 1}`
      });
    }
    return week;
  };

  const weekDays = getWeekDays();

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const startDate = weekDays[0].dateStr;
      const endDate = weekDays[6].dateStr;
      const data = await scheduleService.getSchedules({
        departmentId: selectedDeptId || undefined,
        staffId: selectedStaffId || undefined,
        startDate,
        endDate
      });
      setSchedules(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!newStaffId || !newDate) return;
    setIsSubmitting(true);
    try {
      await scheduleService.createSchedule({
        staffId: Number(newStaffId),
        departmentId: Number(newDeptId),
        workDate: newDate,
        shift: newShift,
        roomNo: newRoom,
        note: newNote
      });
      onShowToast?.('Xếp lịch trực thành công!', 'success');
      setShowAddModal(false);
      setNewNote('');
      loadSchedules();
    } catch (err) {
      onShowToast?.(err.message || 'Lỗi khi xếp lịch trực', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id, staffName) => {
    if (!window.confirm(`Xác nhận xóa ca trực của ${staffName}?`)) return;
    try {
      await scheduleService.deleteSchedule(id);
      onShowToast?.('Đã xóa ca trực!', 'success');
      loadSchedules();
    } catch (err) {
      onShowToast?.('Lỗi khi xóa ca trực', 'error');
    }
  };

  const getShiftBadge = (shift) => {
    switch (shift) {
      case 'MORNING':
        return {
          label: 'Sáng (07:30 - 11:30)',
          short: 'Ca Sáng',
          time: '07:30 - 11:30',
          class: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
        };
      case 'AFTERNOON':
        return {
          label: 'Chiều (13:30 - 17:00)',
          short: 'Ca Chiều',
          time: '13:30 - 17:00',
          class: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800'
        };
      case 'NIGHT':
        return {
          label: 'Đêm (17:00 - 07:30)',
          short: 'Trực Đêm Cấp Cứu',
          time: '17:00 - 07:30',
          class: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
        };
      default:
        return {
          label: 'Cả ngày (07:30 - 17:00)',
          short: 'Cả ngày',
          time: '07:30 - 17:00',
          class: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
        };
    }
  };

  // Lọc thêm theo từ khóa tìm kiếm nếu có
  const filteredSchedules = schedules.filter(item => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      (item.staffName && item.staffName.toLowerCase().includes(kw)) ||
      (item.specialty && item.specialty.toLowerCase().includes(kw)) ||
      (item.roomNo && item.roomNo.toLowerCase().includes(kw)) ||
      (item.note && item.note.toLowerCase().includes(kw))
    );
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySchedulesCount = schedules.filter(s => s.workDate === todayStr).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-teal-100 dark:border-slate-800 w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-800 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md shrink-0 shadow-sm border border-white/20">
              <span className="material-symbols-outlined text-white text-[26px]">calendar_month</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Lịch Trực Nhân Viên Y Tế</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 uppercase tracking-wider">
                  Mỹ Phát Hospital
                </span>
              </div>
              <p className="text-xs text-teal-100/90 mt-0.5">
                Bảng phân công trực ban bác sĩ chuyên khoa & điều dưỡng • Cấp cứu trực 24/24: <strong className="text-white">0789 065 493</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-2.5 py-1 text-[10px] font-mono text-teal-100/80 border border-teal-100/30 rounded-lg">
              ESC
            </span>
            <button 
              onClick={onClose} 
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <span className="material-symbols-outlined text-white text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Điều hướng tuần, lọc khoa & nút Thêm lịch */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-2xs">
              <button
                onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                title="Tuần trước"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
              <button
                onClick={() => setCurrentWeekOffset(0)}
                className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  currentWeekOffset === 0
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Tuần này
              </button>
              <button
                onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                title="Tuần sau"
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 ml-1 hidden md:block">
              Từ <strong>{weekDays[0].displayDate}</strong> đến <strong>{weekDays[6].displayDate}</strong>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Lọc chuyên khoa */}
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none"
            >
              {DEPARTMENTS_LIST.map((dept) => (
                <option key={dept.id || 'all'} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>

            {/* Lọc đích danh Bác sĩ */}
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none max-w-[200px] truncate"
            >
              <option value="">Tất cả Bác sĩ & Nhân sự</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>

            {/* Tìm kiếm nhanh */}
            <div className="relative hidden xl:block">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm tên bác sĩ, phòng..."
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 w-44 focus:w-56 transition-all focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
                search
              </span>
            </div>

            {/* Quyền ADMIN: xếp lịch trực mới */}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs hover:shadow flex items-center gap-1.5 transition-all cursor-pointer hover:scale-102"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Xếp ca trực</span>
            </button>
          </div>
        </div>

        {/* Thông tin tóm tắt & Ca trực hôm nay */}
        <div className="px-6 py-2 bg-teal-50/60 dark:bg-slate-800/30 border-b border-teal-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-medium text-teal-900 dark:text-teal-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Hôm nay có <strong>{todaySchedulesCount}</strong> ca trực sẵn sàng phục vụ</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="hidden sm:inline">Tổng <strong>{filteredSchedules.length}</strong> ca trực trong tuần</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>Sáng (07:30 - 11:30)</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
              <span>Chiều (13:30 - 17:00)</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Đêm Cấp Cứu (17:00 - 07:30)</span>
            </span>
          </div>
        </div>

        {/* Lịch trực 7 ngày trong tuần */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-slate-100/50 dark:bg-slate-950/40 relative">
          {loading && (
            <div className="absolute top-2 right-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-800 text-white text-[11px] font-semibold shadow-md animate-pulse">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Đang cập nhật...</span>
            </div>
          )}

          <div className="grid grid-cols-7 gap-3 min-w-[1050px]">
            {weekDays.map((day, idx) => {
              const daySchedules = filteredSchedules.filter(s => s.workDate === day.dateStr);
              const isToday = day.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  className={`flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isToday
                      ? 'border-teal-500 bg-teal-50/20 dark:bg-teal-950/20 shadow-md ring-2 ring-teal-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs'
                  }`}
                >
                  {/* Cột Header ngày */}
                  <div className={`p-3 text-center border-b ${
                    isToday
                      ? 'bg-gradient-to-r from-teal-700 to-emerald-700 text-white font-bold'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold'
                  }`}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs uppercase tracking-wide">{day.dayName}</span>
                      {isToday && (
                        <span className="px-1.5 py-0.2 rounded-full bg-white/25 text-[9px] font-extrabold uppercase">
                          Hôm nay
                        </span>
                      )}
                    </div>
                    <div className="text-base font-black mt-0.5">{day.displayDate}</div>
                  </div>

                  {/* Danh sách ca trực trong ngày */}
                  <div className="flex-1 p-2.5 space-y-2.5 min-h-[300px] overflow-y-auto">
                    {daySchedules.length > 0 ? (
                      daySchedules.map((item) => {
                        const shiftBadge = getShiftBadge(item.shift);
                        return (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl border bg-white dark:bg-slate-800/90 shadow-2xs space-y-1.5 text-xs transition-all duration-200 hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border tracking-tight ${shiftBadge.class}`}>
                                {shiftBadge.short}
                              </span>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteSchedule(item.id, item.staffName)}
                                  className="text-slate-300 hover:text-red-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Hủy ca trực"
                                >
                                  <span className="material-symbols-outlined text-[15px]">delete</span>
                                </button>
                              )}
                            </div>

                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                {item.staffName}
                              </p>
                              <p className="text-[11px] text-teal-800 dark:text-teal-300 font-medium truncate mt-0.5">
                                {item.specialty || item.departmentName}
                              </p>
                            </div>

                            <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-0.5">
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 font-mono">
                                <span className="material-symbols-outlined text-[13px] text-teal-600">meeting_room</span>
                                <span className="truncate">{item.roomNo || 'Phòng trực'}</span>
                              </p>
                              {item.note && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic truncate" title={item.note}>
                                  {item.note}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600 text-[11px] italic py-10">
                        <span className="material-symbols-outlined text-2xl text-slate-200 dark:text-slate-700 mb-1">event_busy</span>
                        <span>Không có ca trực</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Thêm ca trực (Admin) */}
        {showAddModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 w-full max-w-lg space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-700">event_available</span>
                  Xếp Lịch Trực Cho Nhân Viên
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <form onSubmit={handleAddSchedule} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Nhân viên y tế:</label>
                  <select
                    value={newStaffId}
                    onChange={(e) => handleStaffSelectInAdd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    required
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.specialty})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Ngày trực:</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Ca trực:</label>
                    <select
                      value={newShift}
                      onChange={(e) => setNewShift(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    >
                      <option value="MORNING">Ca Sáng (07:30 - 11:30)</option>
                      <option value="AFTERNOON">Ca Chiều (13:30 - 17:00)</option>
                      <option value="NIGHT">Ca Đêm / Cấp cứu (17:00 - 07:30)</option>
                      <option value="FULL_DAY">Ca Cả ngày (07:30 - 17:00)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Khoa / Phòng ban:</label>
                    <select
                      value={newDeptId}
                      onChange={(e) => setNewDeptId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    >
                      {DEPARTMENTS_LIST.filter(d => d.id !== '').map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Phòng trực:</label>
                    <input
                      type="text"
                      value={newRoom}
                      onChange={(e) => setNewRoom(e.target.value)}
                      placeholder="VD: Phòng khám ban đầu 101"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Ghi chú phân công:</label>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="VD: Phụ trách ca khám ngoại trú, sơ cấp cứu..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-sm cursor-pointer transition-colors"
                  >
                    {isSubmitting ? 'Đang lưu...' : 'Lưu ca trực'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
