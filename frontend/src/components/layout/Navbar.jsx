import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import logoHospital from '../../assets/logo.png';

export const Navbar = ({
  onOpenAuth,
  onOpenBooking,
  onOpenMyAppointments,
  onOpenProfile,
  onOpenPatientProfile,
  onOpenAdmin,
  onOpenAbout,
  onOpenContact,
  onOpenClinical,
  onOpenPharmacy,
  onOpenInvoice,
  onOpenSchedule,
  onOpenReception,
  onOpenNurse,
  onOpenReports,
  onOpenWorkspace
}) => {
  const {
    user,
    isAuthenticated,
    isAdmin,
    isDoctor,
    isReceptionist,
    isNurse,
    isPharmacist,
    isAccountant,
    logout
  } = useAuth();

  const isDoctorRole = isDoctor || isAdmin;
  const isPharmacistRole = isPharmacist || isAdmin;
  const isAccountantRole = isAccountant || isAdmin;
  const isReceptionistRole = isReceptionist || isAdmin;
  const isNurseRole = isNurse || isAdmin;
  const isStaff = isDoctorRole || isPharmacistRole || isAccountantRole || isReceptionistRole || isNurseRole || isAdmin;

  const getRoleBadgeTitle = () => {
    if (isAdmin) return 'QUẢN TRỊ VIÊN';
    if (isDoctor) return 'BÁC SĨ ĐIỀU TRỊ';
    if (isReceptionist) return 'LỄ TÂN TIẾP ĐÓN';
    if (isNurse) return 'ĐIỀU DƯỠNG VIÊN';
    if (isPharmacist) return 'DƯỢC SĨ';
    if (isAccountant) return 'KẾ TOÁN VIÊN';
    return 'BỆNH NHÂN';
  };
  const { showToast } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    showToast('Bạn đã đăng xuất tài khoản thành công', 'info');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(-2)
      .join('');
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-[0_1px_10px_rgba(15,41,34,0.06)] border-b border-slate-200/80">
      <div className="h-16 sm:h-17 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        {/* Logo & Hospital Brand with Luxury Typography */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="relative shrink-0">
              <img
                alt="Logo Mỹ Phát Hospital"
                className="h-10 sm:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-sm rounded-full bg-white p-0.5 border border-amber-200/60"
                src={logoHospital}
                onError={(e) => {
                  e.currentTarget.src = '/logo.png';
                }}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-logo-serif text-base sm:text-lg font-extrabold text-teal-950 tracking-wider transition-colors group-hover:text-teal-700 whitespace-nowrap">
                  MỸ PHÁT HOSPITAL
                </span>
              </div>
              <span className="font-sans text-[11px] text-teal-800/90 font-medium tracking-wide whitespace-nowrap truncate max-w-[260px] md:max-w-md hidden xs:block">
                1170 Quang Trung, Chũ • Sáng Y Đức, Vững Chuyên Môn
              </span>
            </div>
          </a>
        </div>

        {/* Minimalist Desktop Action Navigation: Unified height, whitespace-nowrap, neat & compact */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <a
            href="tel:0789065493"
            className="hidden xl:inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-label text-xs font-bold transition-all shadow-2xs group whitespace-nowrap"
            title="Đường dây nóng Cấp cứu & Tư vấn 24/7"
          >
            <span className="material-symbols-outlined text-[15px] text-rose-600 animate-pulse">call</span>
            <span className="whitespace-nowrap">0789 065 493</span>
          </a>

          {isStaff && onOpenWorkspace && (
            <button
              id="headerWorkspaceBtn"
              onClick={onOpenWorkspace}
              className="inline-flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-label text-xs font-semibold shadow-2xs hover:-translate-y-0.5 transition-all duration-200 cursor-pointer whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px] text-teal-300">dashboard</span>
              <span className="whitespace-nowrap">Workspace</span>
            </button>
          )}

          {isStaff && onOpenSchedule && (
            <button
              id="headerScheduleBtn"
              onClick={() => onOpenSchedule && onOpenSchedule()}
              className="inline-flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-xl border border-teal-200/80 bg-teal-50/70 hover:bg-teal-100/90 text-teal-900 font-label text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-2xs whitespace-nowrap"
              title="Lịch trực Bác sĩ & Nhân viên y tế Mỹ Phát Hospital"
            >
              <span className="material-symbols-outlined text-[16px] text-teal-700">calendar_month</span>
              <span className="whitespace-nowrap">Lịch trực</span>
            </button>
          )}

          {!isStaff && isAuthenticated && onOpenMyAppointments && (
            <button
              id="headerMyAppointmentsBtn"
              onClick={onOpenMyAppointments}
              className="inline-flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-xl border border-teal-200/80 bg-teal-50/70 hover:bg-teal-100/90 text-teal-900 font-label text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px] text-teal-700">event_note</span>
              <span className="whitespace-nowrap">Lịch khám</span>
            </button>
          )}

          <button
            id="headerBookBtn"
            onClick={() => onOpenBooking()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-label text-xs font-bold shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">event_available</span>
            <span className="whitespace-nowrap">Đặt lịch khám</span>
          </button>

          {/* User Account / Auth */}
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                id="userMenuBtn"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="h-9 flex items-center gap-2 pl-1 pr-2 rounded-full border border-teal-200/80 bg-white hover:bg-teal-50/50 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
                  {getInitials(user.fullName || user.username)}
                </div>
                <div className="flex flex-col text-left hidden sm:flex pr-0.5 leading-tight">
                  <span className="font-label text-xs font-bold text-slate-800 max-w-[105px] xl:max-w-[125px] truncate whitespace-nowrap">
                    {user.fullName || user.username}
                  </span>
                  <span className="font-label text-[9px] text-teal-700 font-bold uppercase tracking-wider whitespace-nowrap">
                    {getRoleBadgeTitle()}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-slate-400">
                  expand_more
                </span>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  id="userDropdownMenu"
                  className="absolute right-0 top-12 w-64 rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-teal-100 py-2 z-50 animate-fade-in"
                >
                  <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-teal-50/60 to-transparent">
                    <div className="font-headline text-sm font-bold text-slate-900">
                      {user.fullName || user.username}
                    </div>
                    <div className="font-label text-xs text-slate-500 truncate">
                      {user.email || 'Mỹ Phát Hospital'}
                    </div>
                    <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-label text-[10px] font-semibold">
                      {getRoleBadgeTitle()}
                    </div>
                  </div>
                  <div className="py-1">
                    {isStaff && onOpenWorkspace && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenWorkspace();
                        }}
                        className="w-full px-4 py-2.5 text-left font-body text-sm font-bold text-teal-900 bg-teal-50 hover:bg-teal-100 flex items-center gap-2.5 transition-colors cursor-pointer border-b border-teal-100/80"
                      >
                        <span className="material-symbols-outlined text-teal-700 text-[20px]">
                          dashboard
                        </span>
                        <span>Không gian làm việc (Workspace)</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenMyAppointments();
                      }}
                      className="w-full px-4 py-2 text-left font-body text-sm text-slate-700 hover:bg-teal-50/70 hover:text-teal-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-teal-600 text-[18px]">
                        event_note
                      </span>
                      <span>Lịch khám của tôi</span>
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full px-4 py-2 text-left font-body text-sm text-slate-700 hover:bg-teal-50/70 hover:text-teal-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-teal-600 text-[18px]">
                        badge
                      </span>
                      <span>Thông tin tài khoản</span>
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        if (onOpenPatientProfile) onOpenPatientProfile();
                      }}
                      className="w-full px-4 py-2 text-left font-body text-sm text-slate-700 hover:bg-teal-50/70 hover:text-teal-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-teal-600 text-[18px]">
                        medical_information
                      </span>
                      <span>Hồ sơ sức khỏe & Dị ứng</span>
                    </button>
                    {isReceptionistRole && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          if (onOpenReception) onOpenReception();
                        }}
                        className="w-full px-4 py-2 text-left font-body text-sm text-amber-700 font-semibold hover:bg-amber-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-amber-600 text-[18px]">
                          desk
                        </span>
                        <span>Quầy Tiếp đón & Lịch hẹn (Reception)</span>
                      </button>
                    )}
                    {isNurseRole && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          if (onOpenNurse) onOpenNurse();
                        }}
                        className="w-full px-4 py-2 text-left font-body text-sm text-rose-700 font-semibold hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-rose-600 text-[18px]">
                          vital_signs
                        </span>
                        <span>Trạm Điều dưỡng & Lab (Nurse)</span>
                      </button>
                    )}
                    {isDoctor && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          if (onOpenClinical) onOpenClinical();
                        }}
                        className="w-full px-4 py-2 text-left font-body text-sm text-teal-700 font-semibold hover:bg-teal-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-teal-600 text-[18px]">
                          stethoscope
                        </span>
                        <span>Phòng khám Bác sĩ (Clinical)</span>
                      </button>
                    )}
                    {(isPharmacist || isAdmin) && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          if (onOpenPharmacy) onOpenPharmacy();
                        }}
                        className="w-full px-4 py-2 text-left font-body text-sm text-emerald-700 font-semibold hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                          medication
                        </span>
                        <span>Nhà thuốc & Cấp phát (Pharmacy)</span>
                      </button>
                    )}
                    {(isAccountant || isAdmin) && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          if (onOpenInvoice) onOpenInvoice();
                        }}
                        className="w-full px-4 py-2 text-left font-body text-sm text-sky-700 font-semibold hover:bg-sky-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sky-600 text-[18px]">
                          receipt_long
                        </span>
                        <span>Hóa đơn & Viện phí (Billing)</span>
                      </button>
                    )}
                    {(isAdmin || isAccountant) && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          if (onOpenReports) onOpenReports();
                        }}
                        className="w-full px-4 py-2 text-left font-body text-sm text-indigo-700 font-semibold hover:bg-indigo-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-indigo-600 text-[18px]">
                          query_stats
                        </span>
                        <span>Báo cáo & Thống kê (BI)</span>
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full px-4 py-2 text-left font-body text-sm text-teal-800 font-semibold hover:bg-teal-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-teal-700 text-[18px]">
                          admin_panel_settings
                        </span>
                        <span>Quản lý hệ thống (Admin)</span>
                      </button>
                    )}
                  </div>
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left font-body text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-rose-600 text-[18px]">
                        logout
                      </span>
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              id="headerAuthBtn"
              onClick={() => onOpenAuth('login')}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-xl border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-800 font-label text-xs font-semibold hover:bg-teal-50/40 transition-colors duration-150 cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px] text-slate-500">login</span>
              <span>Đăng nhập</span>
            </button>
          )}

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors cursor-pointer border border-slate-200/80"
            aria-label="Menu"
          >
            <span className="material-symbols-outlined text-[22px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white/98 backdrop-blur-md border-b border-slate-200 shadow-xl px-6 py-4 space-y-3 animate-fade-in">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="block w-full text-left py-2 font-label text-sm text-on-surface font-medium hover:text-primary"
          >
            Trang chủ
          </button>
          <a
            href="#departments"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full text-left py-2 font-label text-sm text-on-surface font-medium hover:text-primary"
          >
            Khoa/Chuyên môn
          </a>
          <a
            href="#doctors"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full text-left py-2 font-label text-sm text-on-surface font-medium hover:text-primary"
          >
            Đội ngũ bác sĩ
          </a>
          {isStaff && onOpenSchedule && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenSchedule) onOpenSchedule();
              }}
              className="block w-full text-left py-2 font-label text-sm text-teal-800 font-semibold hover:text-teal-900 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px] text-teal-700">calendar_month</span>
              <span>Lịch trực Bác sĩ</span>
            </button>
          )}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenAbout();
            }}
            className="block w-full text-left py-2 font-label text-sm text-on-surface font-medium hover:text-primary"
          >
            Về chúng tôi
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenContact();
            }}
            className="block w-full text-left py-2 font-label text-sm text-on-surface font-medium hover:text-primary"
          >
            Liên hệ
          </button>
          {isReceptionistRole && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenReception) onOpenReception();
              }}
              className="w-full py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 font-label text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">desk</span>
              <span>Quầy Tiếp đón & Hẹn</span>
            </button>
          )}
          {isNurseRole && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenNurse) onOpenNurse();
              }}
              className="w-full py-2.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 font-label text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">vital_signs</span>
              <span>Trạm Điều dưỡng & Lab</span>
            </button>
          )}
          {isDoctorRole && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenClinical) onOpenClinical();
              }}
              className="w-full py-2.5 rounded-xl border border-teal-300 bg-teal-50 text-teal-800 font-label text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">stethoscope</span>
              <span>Phòng khám Bác sĩ</span>
            </button>
          )}
          {(isAdmin || isAccountantRole) && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenReports) onOpenReports();
              }}
              className="w-full py-2.5 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-800 font-label text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">query_stats</span>
              <span>Báo cáo & Thống kê (BI)</span>
            </button>
          )}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenBooking();
            }}
            className="w-full mt-2 py-3 rounded-xl bg-primary text-white font-label text-sm font-semibold flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <span>Đặt lịch khám ngay</span>
          </button>
        </div>
      )}
    </header>
  );
};
