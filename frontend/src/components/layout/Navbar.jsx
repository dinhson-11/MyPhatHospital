import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const Navbar = ({
  onOpenAuth,
  onOpenBooking,
  onOpenMyAppointments,
  onOpenProfile,
  onOpenAdmin,
  onOpenAbout,
  onOpenContact,
  onOpenClinical
}) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const isDoctor = user?.roles?.includes('DOCTOR') || user?.roles?.includes('ROLE_DOCTOR') || isAdmin;
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
    <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(15,41,34,0.04)] border-b border-surface-container-high/40">
      <div className="h-20 max-w-[1280px] mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 group"
          >
            <img
              alt="MedCare AI Logo"
              className="h-8 w-auto object-contain"
              src="https://lh3.googleusercontent.com/aida/AEtjO1UiRWu2wLJay3lT_fWD9uSnZwpyzXsqXTN23B5n65vVxCCKFWO0uY_aHFTZ3q8Zb0t9OMuCKJk1BULORIm00sbTn12gVTVFaupVh2ejX4LidWdE9kHz7uchf5izU4WJtjC1U6HzFjdnrrg9O60URWslQRlB3JFYILY9lig9lF5a1ZJM_s4W0YBcvag2CaJpZWJJ9CPjYjecLH3sNLqPlYolUiuvdwpNPXZKfYagNZdMk-ZNzRVf99q0aWak"
            />
            <div className="flex flex-col">
              <span className="font-headline text-lg font-bold text-primary tracking-tight">
                MedCare AI
              </span>
              <span className="font-label text-xs text-on-surface-variant font-medium">
                Bệnh viện Thanh Sơn
              </span>
            </div>
          </a>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden xl:flex items-center gap-6">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="font-label text-sm text-on-surface-variant hover:text-primary transition-colors py-2 cursor-pointer font-medium"
          >
            Trang chủ
          </button>
          <a
            href="#departments"
            className="font-label text-sm text-on-surface-variant hover:text-primary transition-colors py-2 cursor-pointer font-medium"
          >
            Khoa/Chuyên môn
          </a>
          <a
            href="#doctors"
            className="font-label text-sm text-on-surface-variant hover:text-primary transition-colors py-2 cursor-pointer font-medium"
          >
            Đội ngũ bác sĩ
          </a>
          <button
            onClick={onOpenAbout}
            className="font-label text-sm text-on-surface-variant hover:text-primary transition-colors py-2 cursor-pointer font-medium"
          >
            Về chúng tôi
          </button>
          <button
            onClick={onOpenContact}
            className="font-label text-sm text-on-surface-variant hover:text-primary transition-colors py-2 cursor-pointer font-medium"
          >
            Liên hệ
          </button>
        </nav>

        {/* Auth & CTA Buttons */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                id="userMenuBtn"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-primary/20 bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {getInitials(user.fullName || user.username)}
                </div>
                <div className="flex flex-col text-left hidden sm:flex">
                  <span className="font-label text-xs font-bold text-on-surface leading-tight">
                    {user.fullName || user.username}
                  </span>
                  <span className="font-label text-[11px] text-primary font-medium">
                    {isAdmin ? 'Quản trị viên' : 'Bệnh nhân'}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-outline">
                  expand_more
                </span>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  id="userDropdownMenu"
                  className="absolute right-0 top-12 w-64 rounded-xl bg-white shadow-xl border border-outline-variant/30 py-2 z-50 animate-fade-in"
                >
                  <div className="px-4 py-3 border-b border-surface-variant/20">
                    <div className="font-headline text-sm font-bold text-on-surface">
                      {user.fullName || user.username}
                    </div>
                    <div className="font-label text-xs text-on-surface-variant">
                      {user.email || 'Bệnh viện Thanh Sơn'}
                    </div>
                    <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container text-primary font-label text-[10px] font-semibold">
                      {isAdmin ? 'QUẢN TRỊ VIÊN' : 'BỆNH NHÂN'}
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenMyAppointments();
                      }}
                      className="w-full px-4 py-2 text-left font-body text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-primary text-[18px]">
                        event_note
                      </span>
                      <span>Lịch khám của tôi</span>
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full px-4 py-2 text-left font-body text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-primary text-[18px]">
                        badge
                      </span>
                      <span>Thông tin tài khoản</span>
                    </button>
                    {isDoctor && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          if (onOpenClinical) onOpenClinical();
                        }}
                        className="w-full px-4 py-2 text-left font-body text-sm text-primary font-semibold hover:bg-surface-container-low flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-primary text-[18px]">
                          stethoscope
                        </span>
                        <span>Phòng khám Bác sĩ (Clinical)</span>
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full px-4 py-2 text-left font-body text-sm text-primary font-semibold hover:bg-surface-container-low flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-primary text-[18px]">
                          admin_panel_settings
                        </span>
                        <span>Quản lý hệ thống (Admin)</span>
                      </button>
                    )}
                  </div>
                  <div className="pt-1 border-t border-surface-variant/20">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left font-body text-sm text-error hover:bg-error-container/20 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-error text-[18px]">
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
              className="px-4 py-2.5 rounded-lg border border-primary-container text-primary-container font-label text-sm font-semibold hover:bg-surface-container-low transition-colors duration-150 cursor-pointer"
            >
              Đăng nhập
            </button>
          )}

          {isDoctor && (
            <button
              id="headerClinicalBtn"
              onClick={() => onOpenClinical && onOpenClinical()}
              className="hidden md:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-primary/40 bg-primary/10 text-primary font-label text-sm font-semibold hover:bg-primary/20 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">stethoscope</span>
              <span>Phòng khám Bác sĩ</span>
            </button>
          )}

          <button
            id="headerBookBtn"
            onClick={() => onOpenBooking()}
            className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary-container text-white font-label text-sm font-semibold shadow-[0_2px_4px_rgba(15,110,86,0.15)] hover:shadow-[0_4px_12px_rgba(15,110,86,0.25)] hover:-translate-y-0.5 transition-all duration-150 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <span>Đặt lịch khám</span>
          </button>

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="xl:hidden w-9 h-9 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors cursor-pointer"
            aria-label="Menu"
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-surface-container-high px-6 py-4 space-y-3 animate-fade-in">
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
          {isDoctor && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenClinical) onOpenClinical();
              }}
              className="w-full py-2.5 rounded-xl border border-primary/40 bg-primary/10 text-primary font-label text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">stethoscope</span>
              <span>Phòng khám Bác sĩ</span>
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
