import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { useConfirm } from '../common/ConfirmDialog';
import scheduleService, { SHIFT_ORDER, getShiftInfo } from '../../services/scheduleService';
import { getErrorMessage } from '../../services/apiError';
import { useAuth } from '../../context/AuthContext';
import { formatDate, todayISO } from '../../utils/format';

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

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const DEFAULT_ROOM = 'Phòng khám ban đầu 101 (Tầng 1)';

/** Màu phân loại ca (không dùng đỏ/vàng để tránh nhầm với cảnh báo) + biểu tượng để không chỉ dựa vào màu. */
const SHIFT_STYLE = {
  MORNING: { icon: 'light_mode', badge: 'bg-sky-50 text-sky-800 border-sky-200' },
  AFTERNOON: { icon: 'wb_twilight', badge: 'bg-teal-50 text-teal-800 border-teal-200' },
  NIGHT: { icon: 'dark_mode', badge: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  FULL_DAY: { icon: 'schedule', badge: 'bg-slate-100 text-slate-700 border-slate-200' }
};

const pad = (n) => String(n).padStart(2, '0');
/** yyyy-MM-dd theo giờ máy (không dùng toISOString để tránh lệch ngày do UTC). */
const toLocalISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function getWeekDays(weekOffset) {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekOffset * 7);
  return DAY_NAMES.map((dayName, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { dateStr: toLocalISODate(d), dayName };
  });
}

const shiftRank = (shift) => {
  const idx = SHIFT_ORDER.indexOf(shift);
  return idx === -1 ? SHIFT_ORDER.length : idx;
};

function ShiftItem({ item, dayName, canDelete, onDelete }) {
  const info = getShiftInfo(item.shift);
  const style = SHIFT_STYLE[item.shift] || SHIFT_STYLE.FULL_DAY;
  const department = item.specialty || item.departmentName;

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-xs">
      <div className="flex items-start justify-between gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${style.badge}`}>
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{style.icon}</span>
          {info.label}
        </span>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(item, dayName)}
            aria-label={`Xóa ca ${info.label} ngày ${formatDate(item.workDate)} của ${item.staffName}`}
            title="Xóa ca trực"
            className="-mt-1 -mr-1 w-8 h-8 shrink-0 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
          </button>
        )}
      </div>
      <p className="mt-1 text-slate-500 tabular-nums">{info.time}</p>
      <p className="mt-1.5 text-sm font-semibold text-slate-900 leading-snug break-words">{item.staffName}</p>
      {department && (
        <p className="text-slate-600 line-clamp-2" title={department}>{department}</p>
      )}
      <p className="mt-1.5 flex items-start gap-1 text-slate-600">
        <span className="material-symbols-outlined text-[14px] text-slate-400 mt-px" aria-hidden="true">meeting_room</span>
        <span className="break-words min-w-0">{item.roomNo || 'Phòng trực'}</span>
      </p>
      {item.note && (
        <p className="mt-1 text-slate-500 italic line-clamp-2" title={item.note}>{item.note}</p>
      )}
    </li>
  );
}

export default function StaffScheduleModal({
  isOpen,
  onClose,
  onShowToast,
  initialDeptId = '',
  initialStaffId = ''
}) {
  const { isAdmin, isAuthenticated, isDoctor, isReceptionist, isNurse, isPharmacist, isAccountant } = useAuth();
  const canView = isAuthenticated && (isAdmin || isDoctor || isReceptionist || isNurse || isPharmacist || isAccountant);
  const active = Boolean(isOpen && canView);
  const confirm = useConfirm();

  const [selectedDeptId, setSelectedDeptId] = useState(initialDeptId || '');
  const [selectedStaffId, setSelectedStaffId] = useState(initialStaffId || '');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);

  // Kết quả tải dữ liệu gắn với "khóa truy vấn": khóa khác kết quả hiện có ⇒ đang tải
  const [scheduleResult, setScheduleResult] = useState({ key: null, data: [], error: '' });
  const [scheduleReloadToken, setScheduleReloadToken] = useState(0);
  const [staffResult, setStaffResult] = useState({ token: null, list: [], error: '' });
  const [staffReloadToken, setStaffReloadToken] = useState(0);

  // Form xếp lịch trực mới (Admin)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaffId, setNewStaffId] = useState('');
  const [newDeptId, setNewDeptId] = useState('1');
  const [newDate, setNewDate] = useState(todayISO());
  const [newShift, setNewShift] = useState('MORNING');
  const [newRoom, setNewRoom] = useState(DEFAULT_ROOM);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const ids = {
    form: useId(),
    dept: useId(),
    staff: useId(),
    search: useId(),
    newStaff: useId(),
    newDate: useId(),
    newShift: useId(),
    newDept: useId(),
    newRoom: useId(),
    newNote: useId()
  };

  // Đồng bộ bộ lọc khi modal được mở lại với bác sĩ/khoa khác (điều chỉnh state ngay khi render)
  const openSyncKey = `${Boolean(isOpen)}|${initialDeptId}|${initialStaffId}`;
  const [prevOpenSyncKey, setPrevOpenSyncKey] = useState(openSyncKey);
  if (openSyncKey !== prevOpenSyncKey) {
    setPrevOpenSyncKey(openSyncKey);
    if (isOpen) {
      setSelectedDeptId(initialDeptId || '');
      setSelectedStaffId(initialStaffId || '');
    } else {
      setShowAddModal(false);
    }
  }

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const weekStart = weekDays[0].dateStr;
  const weekEnd = weekDays[6].dateStr;
  const todayStr = todayISO();

  const scheduleKey = [selectedDeptId, selectedStaffId, weekStart, weekEnd, scheduleReloadToken].join('|');
  const loading = active && scheduleResult.key !== scheduleKey;
  const schedules = scheduleResult.data;
  const loadError = loading ? '' : scheduleResult.error;
  const staffList = staffResult.list;
  const staffError = staffResult.token === staffReloadToken ? staffResult.error : '';

  const reloadSchedules = useCallback(() => setScheduleReloadToken(t => t + 1), []);
  const reloadStaff = useCallback(() => setStaffReloadToken(t => t + 1), []);

  // Tải danh bạ nhân sự mỗi lần mở
  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    scheduleService.getStaffList().then(
      (list) => {
        if (!cancelled) setStaffResult({ token: staffReloadToken, list: Array.isArray(list) ? list : [], error: '' });
      },
      (err) => {
        if (!cancelled) {
          setStaffResult(prev => ({
            token: staffReloadToken,
            list: prev.list,
            error: getErrorMessage(err, 'Không tải được danh sách nhân viên y tế.')
          }));
        }
      }
    );
    return () => { cancelled = true; };
  }, [active, staffReloadToken]);

  // Tải lịch trực theo tuần + bộ lọc; phản hồi cũ (đổi tuần liên tục) bị bỏ qua
  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    scheduleService.getSchedules({
      departmentId: selectedDeptId || undefined,
      staffId: selectedStaffId || undefined,
      startDate: weekStart,
      endDate: weekEnd
    }).then(
      (data) => {
        if (!cancelled) setScheduleResult({ key: scheduleKey, data: Array.isArray(data) ? data : [], error: '' });
      },
      (err) => {
        if (!cancelled) {
          setScheduleResult({
            key: scheduleKey,
            data: [],
            error: getErrorMessage(err, 'Không tải được lịch trực. Vui lòng thử lại.')
          });
        }
      }
    );
    return () => { cancelled = true; };
  }, [active, scheduleKey, selectedDeptId, selectedStaffId, weekStart, weekEnd]);

  const applyStaffDefaults = (staff) => {
    if (!staff) return;
    setNewStaffId(String(staff.id));
    if (staff.departmentId) setNewDeptId(String(staff.departmentId));
    setNewRoom(staff.roomNo || DEFAULT_ROOM);
  };

  const openAddForm = () => {
    if (!newStaffId && staffList.length > 0) applyStaffDefaults(staffList[0]);
    setNewDate(todayISO());
    setFormError('');
    setShowAddModal(true);
  };

  const closeAddForm = () => {
    setShowAddModal(false);
    setFormError('');
  };

  const handleStaffSelectInAdd = (staffIdStr) => {
    const staff = staffList.find(item => String(item.id) === staffIdStr);
    if (staff) {
      applyStaffDefaults(staff);
    } else {
      setNewStaffId(staffIdStr);
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!newStaffId || !newDate) {
      setFormError('Vui lòng chọn nhân viên và ngày trực.');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
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
      reloadSchedules();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Không xếp được lịch trực. Vui lòng thử lại.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (item, dayName) => {
    const info = getShiftInfo(item.shift);
    const ok = await confirm({
      title: 'Xóa ca trực này?',
      message: 'Ca trực sẽ bị xóa khỏi bảng phân công. Thao tác này không thể hoàn tác.',
      details: [
        `Nhân viên: ${item.staffName}`,
        `Ngày: ${dayName ? `${dayName}, ` : ''}${formatDate(item.workDate)}`,
        `Ca: ${info.label} (${info.time})`,
        item.roomNo ? `Phòng: ${item.roomNo}` : null
      ].filter(Boolean),
      confirmText: 'Xóa ca trực',
      tone: 'danger'
    });
    if (!ok) return;
    try {
      await scheduleService.deleteSchedule(item.id);
      onShowToast?.('Đã xóa ca trực.', 'success');
      reloadSchedules();
    } catch (err) {
      onShowToast?.(getErrorMessage(err, 'Không xóa được ca trực. Vui lòng thử lại.'), 'error');
    }
  };

  // Lọc thêm theo từ khóa tìm kiếm
  const keyword = searchKeyword.trim().toLowerCase();
  const filteredSchedules = useMemo(() => {
    if (!keyword) return schedules;
    return schedules.filter(item =>
      [item.staffName, item.specialty, item.departmentName, item.roomNo, item.note]
        .some(v => v && String(v).toLowerCase().includes(keyword))
    );
  }, [schedules, keyword]);

  const schedulesByDay = useMemo(() => {
    const map = {};
    filteredSchedules.forEach(item => {
      (map[item.workDate] = map[item.workDate] || []).push(item);
    });
    Object.values(map).forEach(list =>
      list.sort((a, b) => shiftRank(a.shift) - shiftRank(b.shift)
        || String(a.staffName || '').localeCompare(String(b.staffName || ''), 'vi'))
    );
    return map;
  }, [filteredSchedules]);

  const todaySchedulesCount = schedules.filter(s => s.workDate === todayStr).length;

  if (!canView) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Lịch Trực Nhân Viên Y Tế"
        subtitle={(
          <>
            Phân công trực bác sĩ chuyên khoa &amp; điều dưỡng · Cấp cứu 24/24:{' '}
            <a href="tel:0789065493" className="font-semibold text-primary hover:underline whitespace-nowrap">
              0789 065 493
            </a>
          </>
        )}
        icon="calendar_month"
        size="full"
        bodyClassName="overflow-y-auto bg-slate-50 sm:rounded-b-2xl"
      >
        {/* Thanh công cụ: điều hướng tuần, bộ lọc, xếp ca */}
        <div className="lg:sticky lg:top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div role="group" aria-label="Chọn tuần" className="inline-flex items-center rounded-xl border border-slate-300 bg-white p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setWeekOffset(prev => prev - 1)}
                  aria-label="Tuần trước"
                  title="Tuần trước"
                  className="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  aria-pressed={weekOffset === 0}
                  className={`h-9 px-3 text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    weekOffset === 0 ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Tuần này
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  aria-label="Tuần sau"
                  title="Tuần sau"
                  className="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
                </button>
              </div>

              <p className="text-sm text-slate-700 tabular-nums" aria-live="polite">
                <strong>{formatDate(weekStart)}</strong> – <strong>{formatDate(weekEnd)}</strong>
              </p>
            </div>

            {isAdmin && (
              <button type="button" onClick={openAddForm} className="btn btn-primary btn-sm">
                <span className="material-symbols-outlined" aria-hidden="true">add</span>
                <span>Xếp ca trực</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label htmlFor={ids.dept} className="sr-only">Lọc theo khoa phòng</label>
              <select
                id={ids.dept}
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="select"
              >
                {DEPARTMENTS_LIST.map((dept) => (
                  <option key={dept.id || 'all'} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={ids.staff} className="sr-only">Lọc theo nhân viên</label>
              <select
                id={ids.staff}
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="select"
              >
                <option value="">Tất cả bác sĩ &amp; nhân sự</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label htmlFor={ids.search} className="sr-only">Tìm theo tên, chuyên khoa, phòng</label>
              <span className="input-icon material-symbols-outlined" aria-hidden="true">search</span>
              <input
                id={ids.search}
                type="search"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm tên bác sĩ, phòng..."
                className="input"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            {weekOffset === 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true"></span>
                <span>Hôm nay có <strong className="text-slate-900">{todaySchedulesCount}</strong> ca trực</span>
              </span>
            )}
            <span>Tổng <strong className="text-slate-900">{filteredSchedules.length}</strong> ca trong tuần</span>
            <span role="status" className="inline-flex items-center gap-1.5 text-primary">
              {loading && (
                <>
                  <span className="spinner" aria-hidden="true"></span>
                  <span>Đang tải lịch trực...</span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="px-4 sm:px-6 pt-4 space-y-3 empty:hidden">
          {loadError && (
            <div className="alert alert-error" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Lỗi tải lịch trực</p>
                <p>{loadError}</p>
              </div>
              <button type="button" onClick={reloadSchedules} className="btn btn-secondary btn-sm shrink-0">
                <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {staffError && (
            <div className="alert alert-warning" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">warning</span>
              <p className="flex-1 min-w-0">{staffError}</p>
              <button type="button" onClick={reloadStaff} className="btn btn-secondary btn-sm shrink-0">
                <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {keyword && !loading && schedules.length > 0 && filteredSchedules.length === 0 && (
            <div className="alert alert-info">
              <span className="material-symbols-outlined" aria-hidden="true">search_off</span>
              <p className="flex-1 min-w-0">Không có ca trực nào khớp với “{searchKeyword.trim()}”.</p>
              <button type="button" onClick={() => setSearchKeyword('')} className="btn btn-secondary btn-sm shrink-0">
                Xóa tìm kiếm
              </button>
            </div>
          )}
        </div>

        {/* Lịch trực 7 ngày: thẻ xếp chồng trên màn hình nhỏ, lưới 7 cột từ lg trở lên */}
        <section role="region" aria-label="Lịch trực tuần" aria-busy={loading} className="p-4 sm:p-6">
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 lg:gap-2">
            {weekDays.map((day) => {
              const daySchedules = schedulesByDay[day.dateStr] || [];
              const isToday = day.dateStr === todayStr;
              const headingId = `${ids.form}-day-${day.dateStr}`;

              return (
                <li
                  key={day.dateStr}
                  aria-labelledby={headingId}
                  className={`min-w-0 flex flex-col rounded-xl border bg-white overflow-hidden ${
                    isToday ? 'border-primary ring-2 ring-primary/15' : 'border-slate-200'
                  }`}
                >
                  <h3
                    id={headingId}
                    className={`flex flex-wrap items-center justify-between lg:flex-col lg:justify-center gap-x-2 gap-y-0.5 px-3 py-2 border-b ${
                      isToday ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold">{day.dayName}</span>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-semibold">Hôm nay</span>
                      )}
                    </span>
                    <span className={`text-xs tabular-nums ${isToday ? 'text-white/90' : 'text-slate-600'}`}>
                      {formatDate(day.dateStr)}
                      <span className="lg:hidden"> · {daySchedules.length} ca</span>
                    </span>
                  </h3>

                  {daySchedules.length > 0 ? (
                    <ul className="flex-1 p-2 space-y-2">
                      {daySchedules.map((item) => (
                        <ShiftItem
                          key={item.id}
                          item={item}
                          dayName={day.dayName}
                          canDelete={isAdmin}
                          onDelete={handleDeleteSchedule}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="flex-1 flex items-center justify-center gap-1.5 px-3 py-4 lg:py-8 text-xs text-slate-500">
                      <span className="material-symbols-outlined text-[18px] text-slate-400" aria-hidden="true">event_busy</span>
                      <span>Không có ca trực</span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </Modal>

      {/* Form xếp ca trực mới (Admin) – hộp thoại lồng, Esc chỉ đóng hộp thoại này */}
      <Modal
        isOpen={Boolean(isOpen && isAdmin && showAddModal)}
        onClose={closeAddForm}
        title="Xếp Lịch Trực Cho Nhân Viên"
        icon="event_available"
        size="md"
        footer={(
          <>
            <button type="button" onClick={closeAddForm} className="btn btn-light">Hủy</button>
            <button type="submit" form={ids.form} disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Đang lưu...' : 'Lưu ca trực'}
            </button>
          </>
        )}
      >
        <form id={ids.form} onSubmit={handleAddSchedule} className="space-y-4">
          {formError && (
            <div className="alert alert-error" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <p className="flex-1 min-w-0">{formError}</p>
            </div>
          )}

          <div className="form-field">
            <label htmlFor={ids.newStaff} className="form-label">
              Nhân viên y tế:<span className="required">*</span>
            </label>
            <select
              id={ids.newStaff}
              data-autofocus
              value={newStaffId}
              onChange={(e) => handleStaffSelectInAdd(e.target.value)}
              className="select"
              required
            >
              {!newStaffId && <option value="">-- Chọn nhân viên --</option>}
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.fullName}{s.specialty ? ` (${s.specialty})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-field">
              <label htmlFor={ids.newDate} className="form-label">
                Ngày trực:<span className="required">*</span>
              </label>
              <input
                id={ids.newDate}
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="input"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor={ids.newShift} className="form-label">Ca trực:</label>
              <select
                id={ids.newShift}
                value={newShift}
                onChange={(e) => setNewShift(e.target.value)}
                className="select"
              >
                {SHIFT_ORDER.map(shift => {
                  const info = getShiftInfo(shift);
                  return (
                    <option key={shift} value={shift}>{info.label} ({info.time})</option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-field">
              <label htmlFor={ids.newDept} className="form-label">Khoa / Phòng ban:</label>
              <select
                id={ids.newDept}
                value={newDeptId}
                onChange={(e) => setNewDeptId(e.target.value)}
                className="select"
              >
                {DEPARTMENTS_LIST.filter(d => d.id !== '').map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor={ids.newRoom} className="form-label">Phòng trực:</label>
              <input
                id={ids.newRoom}
                type="text"
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                placeholder="VD: Phòng khám ban đầu 101"
                className="input"
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor={ids.newNote} className="form-label">Ghi chú phân công:</label>
            <input
              id={ids.newNote}
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="VD: Phụ trách ca khám ngoại trú, sơ cấp cứu..."
              className="input"
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
