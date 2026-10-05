import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import WorkspaceDashboard from './WorkspaceDashboard';
import logoHospital from '../../assets/logo.png';
import GlobalPatientSearch from '../common/GlobalPatientSearch';
import NightShiftToggle from '../common/NightShiftToggle';

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
  onOpenPatientProfile
}) {
  const {
    user,
    isAdmin,
    isDoctor,
    isReceptionist,
    isNurse,
    isPharmacist,
    isAccountant,
    logout
  } = useAuth();
  const { showToast } = useToast();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Phím tắt toàn cục: Ctrl+K hoặc F2 để mở tìm kiếm bệnh nhân nhanh
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && e.key === 'k') || e.key === 'F2') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectPatient = (patient) => {
    showToast(`Đã chọn bệnh nhân ${patient.fullName} (${patient.patientCode})`, 'info');
    if (isDoctor && onOpenClinical) {
      onOpenClinical();
    } else if (isReceptionist && onOpenReception) {
      onOpenReception();
    } else if (isNurse && onOpenNurse) {
      onOpenNurse();
    } else if (onOpenPatientProfile) {
      onOpenPatientProfile();
    }
  };

  const roleTitle = isAdmin
    ? 'QUẢN TRỊ VIÊN'
    : isDoctor
    ? 'BÁC SĨ ĐIỀU TRỊ'
    : isReceptionist
    ? 'LỄ TÂN TIẾP ĐÓN'
    : isNurse
    ? 'ĐIỀU DƯỠNG VIÊN'
    : isPharmacist
    ? 'DƯỢC SĨ'
    : isAccountant
    ? 'KẾ TOÁN VIÊN'
    : 'NHÂN VIÊN';

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(-2)
      .join('');
  };

  const handleLogout = () => {
    logout();
    showToast('Bạn đã đăng xuất tài khoản thành công', 'info');
  };

  return (
    <div className="ws-shell">
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`ws-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''} ${
          mobileSidebarOpen ? 'is-mobile-open' : ''
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 p-1 flex items-center justify-center shrink-0">
              <img
                src={logoHospital}
                alt="Logo Mỹ Phát Hospital"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png';
                }}
              />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm text-slate-900 leading-tight truncate">
                  MỸ PHÁT HOSPITAL
                </span>
                <span className="text-[11px] text-teal-700 font-medium truncate">
                  1170 Quang Trung, Chũ, Bắc Giang
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 items-center justify-center cursor-pointer transition-colors"
            title={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        {/* User Role Pill */}
        {!sidebarCollapsed && (
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Phân Hệ Làm Việc
            </span>
            <span className="badge badge-primary text-[10px] uppercase font-bold">
              {roleTitle}
            </span>
          </div>
        )}

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="nav-group-label">Tổng Quan</div>
          <button
            type="button"
            className="nav-item is-active"
            data-tooltip="Tổng quan"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="nav-label">Bảng Điều Khiển (Dashboard)</span>
          </button>

          <div className="nav-group-label">Lâm Sàng & Tiếp Nhận</div>
          {(isReceptionist || isAdmin) && (
            <button
              type="button"
              id="sidebarReceptionBtn"
              onClick={onOpenReception}
              className="nav-item"
              data-tooltip="Quầy Tiếp đón"
            >
              <span className="material-symbols-outlined">desk</span>
              <span className="nav-label">Quầy Tiếp Đón</span>
            </button>
          )}

          {(isNurse || isAdmin) && (
            <button
              type="button"
              id="sidebarNurseBtn"
              onClick={onOpenNurse}
              className="nav-item"
              data-tooltip="Trạm Điều dưỡng"
            >
              <span className="material-symbols-outlined">vital_signs</span>
              <span className="nav-label">Trạm Điều Dưỡng & Lab</span>
            </button>
          )}

          {(isDoctor || isAdmin) && (
            <button
              type="button"
              id="sidebarClinicalBtn"
              onClick={onOpenClinical}
              className="nav-item"
              data-tooltip="Phòng khám Bác sĩ"
            >
              <span className="material-symbols-outlined">stethoscope</span>
              <span className="nav-label">Phòng Khám Bác Sĩ</span>
            </button>
          )}

          <div className="nav-group-label">Dược & Viện Phí</div>
          {(isPharmacist || isAdmin) && (
            <button
              type="button"
              id="sidebarPharmacyBtn"
              onClick={onOpenPharmacy}
              className="nav-item"
              data-tooltip="Nhà thuốc"
            >
              <span className="material-symbols-outlined">medication</span>
              <span className="nav-label">Nhà Thuốc & Dược Lâm Sàng</span>
            </button>
          )}

          {(isAccountant || isAdmin) && (
            <button
              type="button"
              id="sidebarInvoiceBtn"
              onClick={onOpenInvoice}
              className="nav-item"
              data-tooltip="Viện phí"
            >
              <span className="material-symbols-outlined">receipt_long</span>
              <span className="nav-label">Hóa Đơn & Viện Phí</span>
            </button>
          )}

          <div className="nav-group-label">Vận Hành & Báo Cáo</div>
          {(isAccountant || isAdmin) && (
            <button
              type="button"
              id="sidebarReportsBtn"
              onClick={onOpenReports}
              className="nav-item"
              data-tooltip="Báo cáo BI"
            >
              <span className="material-symbols-outlined">query_stats</span>
              <span className="nav-label">Báo Cáo & Thống Kê BI</span>
            </button>
          )}

          <button
            type="button"
            id="sidebarScheduleBtn"
            onClick={onOpenSchedule}
            className="nav-item"
            data-tooltip="Lịch trực"
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="nav-label">Lịch Trực Nhân Viên</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              id="sidebarAdminBtn"
              onClick={onOpenAdmin}
              className="nav-item"
              data-tooltip="Admin"
            >
              <span className="material-symbols-outlined">admin_panel_settings</span>
              <span className="nav-label">Quản Trị Hệ Thống</span>
            </button>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2 shrink-0">
          <button
            type="button"
            onClick={onSwitchToPortal}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-teal-800 hover:bg-teal-50 border border-slate-200 bg-white transition-all cursor-pointer shadow-xs"
            title="Chuyển sang xem Cổng thông tin & Website Bệnh viện"
          >
            <span className="material-symbols-outlined text-teal-700 text-[18px]">public</span>
            {!sidebarCollapsed && <span>Xem Cổng Thông Tin BV</span>}
          </button>

          {/* User mini card */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="avatar avatar-sm bg-gradient-to-br from-teal-700 to-emerald-700">
                {getInitials(user?.fullName || user?.username)}
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {user?.fullName || user?.username}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate">
                    {user?.email || 'Mỹ Phát Hospital'}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
              title="Đăng xuất"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="ws-main">
        {/* Topbar */}
        <header className="ws-topbar justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-teal-700 text-sm">local_hospital</span>
                HMS-AI Workspace
              </span>
              <span>/</span>
              <span className="text-teal-800 font-bold">Bảng Điều Khiển Tổng Quan</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Patient Search Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:border-teal-500 dark:hover:border-teal-400 transition-all cursor-pointer shadow-xs"
              title="Tìm kiếm bệnh nhân nhanh (Ctrl + K hoặc F2)"
            >
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-sm">search</span>
              <span className="hidden lg:inline font-medium">Tìm bệnh nhân (Tên, SĐT, CCCD)...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-[10px] font-mono text-slate-500 border border-slate-200 dark:border-slate-700">
                Ctrl K
              </kbd>
            </button>

            {/* Night Shift Mode Toggle */}
            <NightShiftToggle />

            {/* Shift & Time indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Ca trực: <strong>07:00 - 17:00</strong></span>
            </div>

            {/* Switch to Portal button */}
            <button
              type="button"
              onClick={onSwitchToPortal}
              className="btn btn-sm btn-secondary hidden sm:inline-flex"
            >
              <span className="material-symbols-outlined text-teal-700 text-sm">open_in_new</span>
              <span>Cổng thông tin BV</span>
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full border border-slate-200 hover:border-teal-300 bg-white cursor-pointer transition-all"
              >
                <div className="avatar avatar-sm bg-gradient-to-br from-teal-700 to-emerald-700">
                  {getInitials(user?.fullName || user?.username)}
                </div>
                <span className="hidden sm:inline text-xs font-bold text-slate-800">
                  {user?.fullName?.split(' ').slice(-1)[0] || user?.username}
                </span>
                <span className="material-symbols-outlined text-slate-400 text-sm">expand_more</span>
              </button>

              {userDropdownOpen && (
                <div
                  className="dropdown right-0 top-12 w-60"
                  onMouseLeave={() => setUserDropdownOpen(false)}
                >
                  <div className="p-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user?.fullName || user?.username}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <span className="badge badge-primary text-[10px] mt-1.5">{roleTitle}</span>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenProfile();
                      }}
                      className="dropdown-item"
                    >
                      <span className="material-symbols-outlined">badge</span>
                      <span>Thông tin cá nhân</span>
                    </button>
                    {onOpenPatientProfile && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenPatientProfile();
                        }}
                        className="dropdown-item"
                      >
                        <span className="material-symbols-outlined">medical_information</span>
                        <span>Hồ sơ sức khỏe</span>
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
                      <span className="material-symbols-outlined">public</span>
                      <span>Cổng thông tin công khai</span>
                    </button>
                  </div>
                  <div className="dropdown-divider"></div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="dropdown-item is-danger"
                    >
                      <span className="material-symbols-outlined">logout</span>
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content body */}
        <main className="ws-content overflow-y-auto">
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

      {/* Global Patient Search Modal */}
      <GlobalPatientSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectPatient={handleSelectPatient}
      />
    </div>
  );
}
