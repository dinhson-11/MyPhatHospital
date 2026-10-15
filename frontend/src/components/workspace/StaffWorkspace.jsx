import React, { useState, useEffect, useRef, useId } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import WorkspaceDashboard from './WorkspaceDashboard';
import logoHospital from '../../assets/logo.png';
import GlobalPatientSearch from '../common/GlobalPatientSearch';
import { hoursCompact } from '../../services/hospitalHours';
import { formatDate } from '../../utils/format';
import Avatar from '../common/Avatar';

/** Tên hiển thị của từng phân hệ (dùng cho thanh bên và đường dẫn vị trí trên thanh trên cùng). */
const MODULE_LABELS = {
  reception: 'Quầy tiếp đón',
  nurse: 'Trạm điều dưỡng & xét nghiệm',
  clinical: 'Phòng khám bác sĩ',
  pharmacy: 'Nhà thuốc & dược lâm sàng',
  invoice: 'Hóa đơn & viện phí',
  reports: 'Báo cáo & thống kê',
  schedule: 'Lịch trực nhân viên',
  admin: 'Quản trị hệ thống'
};

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{name}</span>
);

export default function StaffWorkspace({
  onSwitchToPortal,
  onOpenReception,
  onOpenClinical,
  onOpenNurse,
  onOpenPharmacy,
  onOpenInvoice,
  onOpenReports,
  onOpenSchedule,
  onOpenAdmin,
  onOpenProfile,
  onOpenPatientProfile,
  activeModule = null
}) {
  const {
    user,
    isAdmin,
    isDoctor,
    isReceptionist,
    isNurse,
    isPharmacist,
    logout
  } = useAuth();
  const { showToast } = useToast();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const userMenuRef = useRef(null);
  const userMenuButtonRef = useRef(null);
  const contentRef = useRef(null);
  const sidebarId = useId();
  const userMenuId = useId();

  // Phím tắt toàn cục: Ctrl+K hoặc F2 mở tìm kiếm bệnh nhân (không mở chồng lên một phân hệ đang mở)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && (e.key === 'k' || e.key === 'K')) || e.key === 'F2') {
        if (activeModule) return;
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModule]);

  // Menu tài khoản: đóng khi bấm ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!userDropdownOpen) return undefined;
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setUserDropdownOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setUserDropdownOpen(false);
        userMenuButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userDropdownOpen]);

  // Thanh bên trên di động: Esc để đóng
  useEffect(() => {
    if (!mobileSidebarOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMobileSidebarOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileSidebarOpen]);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    showToast(`Đã chọn bệnh nhân ${patient.fullName}${patient.patientCode ? ` (${patient.patientCode})` : ''}`, 'info');
    // Mở phân hệ chính theo vai trò để xử lý tiếp
    if (isDoctor && onOpenClinical) onOpenClinical();
    else if (isReceptionist && onOpenReception) onOpenReception();
    else if (isNurse && onOpenNurse) onOpenNurse();
  };

  const roleTitle = isAdmin
    ? 'Quản trị viên'
    : isDoctor
    ? 'Bác sĩ điều trị'
    : isReceptionist
    ? 'Lễ tân - Kế toán'
    : isNurse
    ? 'Điều dưỡng viên'
    : isPharmacist
    ? 'Dược sĩ'
    : 'Nhân viên';

  const handleLogout = () => {
    setUserDropdownOpen(false);
    logout();
    showToast('Bạn đã đăng xuất tài khoản.', 'info');
  };

  const navGroups = [
    {
      label: 'Lâm sàng & tiếp nhận',
      items: [
        { key: 'reception', id: 'sidebarReceptionBtn', icon: 'desk', show: isReceptionist, action: onOpenReception },
        { key: 'nurse', id: 'sidebarNurseBtn', icon: 'vital_signs', show: isNurse, action: onOpenNurse },
        { key: 'clinical', id: 'sidebarClinicalBtn', icon: 'stethoscope', show: isDoctor, action: onOpenClinical }
      ]
    },
    {
      label: 'Dược & viện phí',
      items: [
        { key: 'pharmacy', id: 'sidebarPharmacyBtn', icon: 'medication', show: isPharmacist, action: onOpenPharmacy },
        { key: 'invoice', id: 'sidebarInvoiceBtn', icon: 'receipt_long', show: isReceptionist, action: () => onOpenInvoice?.() }
      ]
    },
    {
      label: 'Vận hành & báo cáo',
      items: [
        { key: 'reports', id: 'sidebarReportsBtn', icon: 'query_stats', show: isReceptionist, action: onOpenReports },
        { key: 'schedule', id: 'sidebarScheduleBtn', icon: 'calendar_month', show: true, action: () => onOpenSchedule?.() },
        { key: 'admin', id: 'sidebarAdminBtn', icon: 'admin_panel_settings', show: isAdmin, action: onOpenAdmin }
      ]
    }
  ]
    .map((group) => ({ ...group, items: group.items.filter((item) => item.show && item.action) }))
    .filter((group) => group.items.length > 0);

  const runNav = (action) => {
    setMobileSidebarOpen(false);
    action?.();
  };

  const goDashboard = () => {
    setMobileSidebarOpen(false);
    contentRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const currentLabel = activeModule ? MODULE_LABELS[activeModule] : 'Bảng điều khiển';
  const displayName = user?.fullName || user?.username;

  return (
    <div className="ws-shell">
      {/* Nền mờ khi mở thanh bên trên di động */}
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Đóng menu điều hướng"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden cursor-default"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Thanh bên */}
      <aside
        id={sidebarId}
        aria-label="Điều hướng không gian làm việc"
        className={`ws-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''} ${mobileSidebarOpen ? 'is-mobile-open' : ''}`}
      >
        {/* Thương hiệu */}
        <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed border border-primary-fixed-dim p-1 flex items-center justify-center shrink-0">
              <img
                src={logoHospital}
                alt=""
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png';
                }}
              />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm text-primary leading-tight truncate">MỸ PHÁT HOSPITAL</span>
                <span className="text-xs text-slate-500 font-medium truncate">Không gian làm việc</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 items-center justify-center cursor-pointer transition-colors"
            aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            aria-expanded={!sidebarCollapsed}
            aria-controls={sidebarId}
            title={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            <Icon name={sidebarCollapsed ? 'chevron_right' : 'chevron_left'} className="text-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center"
            aria-label="Đóng menu điều hướng"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Vai trò */}
        {!sidebarCollapsed && (
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">Vai trò</span>
            <span className="badge badge-primary">{roleTitle}</span>
          </div>
        )}

        {/* Điều hướng */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1" aria-label="Phân hệ nghiệp vụ">
          <div className="nav-group-label">Tổng quan</div>
          <button
            type="button"
            onClick={goDashboard}
            className={`nav-item ${!activeModule ? 'is-active' : ''}`}
            aria-current={!activeModule ? 'page' : undefined}
            data-tooltip="Bảng điều khiển"
            aria-label={sidebarCollapsed ? 'Bảng điều khiển' : undefined}
          >
            <Icon name="dashboard" />
            <span className="nav-label">Bảng điều khiển</span>
          </button>

          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => {
                const isActive = activeModule === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    id={item.id}
                    onClick={() => runNav(item.action)}
                    className={`nav-item ${isActive ? 'is-active' : ''}`}
                    aria-current={isActive ? 'true' : undefined}
                    data-tooltip={MODULE_LABELS[item.key]}
                    aria-label={sidebarCollapsed ? MODULE_LABELS[item.key] : undefined}
                  >
                    <Icon name={item.icon} />
                    <span className="nav-label">{MODULE_LABELS[item.key]}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Chân thanh bên */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2 shrink-0">
          <button
            type="button"
            onClick={onSwitchToPortal}
            className="w-full flex items-center justify-center lg:justify-start gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-primary hover:bg-primary-fixed border border-slate-200 bg-white transition-colors cursor-pointer shadow-xs"
            aria-label={sidebarCollapsed ? 'Xem cổng thông tin bệnh viện' : undefined}
            title="Chuyển sang cổng thông tin & website bệnh viện"
          >
            <Icon name="public" className="text-primary text-[18px]" />
            {!sidebarCollapsed && <span>Xem cổng thông tin</span>}
          </button>

          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/80">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Avatar name={displayName} src={user?.avatarUrl} className="avatar avatar-sm" />
              {!sidebarCollapsed && (
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-slate-800 truncate">{displayName}</span>
                  <span className="text-xs text-slate-500 truncate">{user?.email || 'Mỹ Phát Hospital'}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-8 h-8 shrink-0 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              <Icon name="logout" className="text-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Cột chính */}
      <div className="ws-main">
        <header className="ws-topbar justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden w-9 h-9 shrink-0 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Mở menu điều hướng"
              aria-expanded={mobileSidebarOpen}
              aria-controls={sidebarId}
            >
              <Icon name="menu" />
            </button>

            <nav aria-label="Vị trí hiện tại" className="hidden sm:flex items-center gap-2 text-xs text-slate-500 min-w-0">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                <Icon name="local_hospital" className="text-primary text-[18px]" />
                Không gian làm việc
              </span>
              <span aria-hidden="true">/</span>
              <span className="text-primary font-bold truncate" aria-current="page">{currentLabel}</span>
            </nav>

            {/* Bệnh nhân đang chọn từ ô tìm kiếm nhanh */}
            {selectedPatient && (
              <div
                className="flex items-center gap-2 min-w-0 pl-2.5 pr-1 py-1 rounded-full bg-primary-fixed border border-primary-fixed-dim text-xs text-primary"
                data-testid="selected-patient-chip"
              >
                <Icon name="person" className="text-[16px]" />
                <span className="truncate max-w-[140px] sm:max-w-[220px]">
                  <span className="sr-only">Bệnh nhân đang chọn: </span>
                  <strong className="font-semibold">{selectedPatient.fullName}</strong>
                  {selectedPatient.patientCode && <span className="hidden md:inline"> · {selectedPatient.patientCode}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="w-6 h-6 rounded-full hover:bg-primary-fixed-dim flex items-center justify-center"
                  aria-label={`Bỏ chọn bệnh nhân ${selectedPatient.fullName}`}
                >
                  <Icon name="close" className="text-[14px]" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 hover:text-slate-900 hover:border-primary transition-colors cursor-pointer"
              aria-label="Tìm bệnh nhân (Ctrl + K)"
              aria-keyshortcuts="Control+K F2"
              title="Tìm kiếm bệnh nhân nhanh (Ctrl + K hoặc F2)"
            >
              <Icon name="search" className="text-primary text-[18px]" />
              <span className="hidden lg:inline font-medium">Tìm bệnh nhân (tên, SĐT, CCCD)…</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded-lg bg-white text-xs font-mono text-slate-500 border border-slate-200">
                Ctrl K
              </kbd>
            </button>

            {/* Giờ khám của bệnh viện hôm nay (theo mùa) */}
            <div
              className="hidden xl:flex items-center gap-2 h-9 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-medium whitespace-nowrap"
              title="Giờ khám bệnh theo mùa – cấp cứu hoạt động 24/24"
            >
              <Icon name="schedule" className="text-[16px] text-slate-500" />
              <span>
                {formatDate(new Date())} · Giờ khám: <strong>{hoursCompact()}</strong>
              </span>
            </div>

            <button type="button" onClick={onSwitchToPortal} className="btn btn-sm btn-secondary hidden md:inline-flex">
              <Icon name="open_in_new" className="text-primary" />
              <span>Cổng thông tin</span>
            </button>

            {/* Menu tài khoản */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                ref={userMenuButtonRef}
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                aria-expanded={userDropdownOpen}
                aria-controls={userMenuId}
                aria-haspopup="true"
                aria-label={`Tài khoản: ${displayName} (${roleTitle})`}
                className="flex items-center gap-2 p-1 pr-2 rounded-full border border-slate-200 hover:border-primary-fixed-dim bg-white cursor-pointer transition-colors"
              >
                <Avatar name={displayName} src={user?.avatarUrl} className="avatar avatar-sm" />
                <span className="hidden sm:inline text-xs font-bold text-slate-800">
                  {user?.fullName?.split(' ').slice(-1)[0] || user?.username}
                </span>
                <Icon name={userDropdownOpen ? 'expand_less' : 'expand_more'} className="text-slate-500 text-[18px]" />
              </button>

              {userDropdownOpen && (
                <div id={userMenuId} className="dropdown right-0 top-12 w-64">
                  <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    <span className="badge badge-primary mt-1.5">{roleTitle}</span>
                  </div>
                  {onOpenProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenProfile();
                      }}
                      className="dropdown-item"
                    >
                      <Icon name="badge" />
                      <span>Thông tin cá nhân</span>
                    </button>
                  )}
                  {onOpenPatientProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenPatientProfile();
                      }}
                      className="dropdown-item"
                    >
                      <Icon name="medical_information" />
                      <span>Hồ sơ sức khỏe của tôi</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onSwitchToPortal();
                    }}
                    className="dropdown-item"
                  >
                    <Icon name="public" />
                    <span>Cổng thông tin công khai</span>
                  </button>
                  <div className="dropdown-divider" />
                  <button type="button" onClick={handleLogout} className="dropdown-item is-danger">
                    <Icon name="logout" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main ref={contentRef} className="ws-content overflow-y-auto" id="workspace-content">
          <WorkspaceDashboard
            onOpenReception={onOpenReception}
            onOpenClinical={onOpenClinical}
            onOpenNurse={onOpenNurse}
            onOpenPharmacy={onOpenPharmacy}
            onOpenInvoice={onOpenInvoice}
            onOpenReports={onOpenReports}
            onOpenSchedule={onOpenSchedule}
            onOpenAdmin={onOpenAdmin}
          />
        </main>
      </div>

      <GlobalPatientSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectPatient={handleSelectPatient}
      />
    </div>
  );
}
