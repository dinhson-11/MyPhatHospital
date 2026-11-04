import React, { useState, useRef, useEffect, useId } from 'react';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import logoHospital from '../../assets/logo.png';
import TextSizeControl from '../common/TextSizeControl';
import Avatar from '../common/Avatar';

const HOTLINE = '0386959342';
const HOTLINE_DISPLAY = '0386 959 342';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{name}</span>
);

export const Navbar = ({
  onOpenAuth,
  onOpenBooking,
  onOpenMyAppointments,
  onOpenProfile,
  onOpenPatientProfile,
  onOpenMyInvoices,
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
    isStaff,
    isAdmin,
    isDoctor,
    isReceptionist,
    isNurse,
    isPharmacist,
    logout
  } = useAuth();
  const { showToast } = useToast();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuButtonRef = useRef(null);
  const mobileToggleRef = useRef(null);
  const userMenuId = useId();
  const mobileMenuId = useId();

  const roleTitle = (() => {
    if (isAdmin) return 'Quản trị viên';
    if (isDoctor) return 'Bác sĩ điều trị';
    if (isReceptionist) return 'Lễ tân - Kế toán';
    if (isNurse) return 'Điều dưỡng viên';
    if (isPharmacist) return 'Dược sĩ';
    return 'Bệnh nhân';
  })();

  // Phân hệ nghiệp vụ theo quyền – dùng chung cho menu tài khoản và menu di động
  const staffModules = [
    isReceptionist && onOpenReception && { key: 'reception', icon: 'desk', label: 'Quầy tiếp đón & lịch hẹn', action: onOpenReception },
    isNurse && onOpenNurse && { key: 'nurse', icon: 'vital_signs', label: 'Trạm điều dưỡng & xét nghiệm', action: onOpenNurse },
    isDoctor && onOpenClinical && { key: 'clinical', icon: 'stethoscope', label: 'Phòng khám bác sĩ', action: onOpenClinical },
    isPharmacist && onOpenPharmacy && { key: 'pharmacy', icon: 'medication', label: 'Nhà thuốc & cấp phát', action: onOpenPharmacy },
    isReceptionist && onOpenInvoice && { key: 'invoice', icon: 'receipt_long', label: 'Hóa đơn & viện phí', action: () => onOpenInvoice() },
    isReceptionist && onOpenReports && { key: 'reports', icon: 'query_stats', label: 'Báo cáo & thống kê', action: onOpenReports },
    isStaff && onOpenSchedule && { key: 'schedule', icon: 'calendar_month', label: 'Lịch trực nhân viên', action: () => onOpenSchedule() },
    isAdmin && onOpenAdmin && { key: 'admin', icon: 'admin_panel_settings', label: 'Quản trị hệ thống', action: onOpenAdmin }
  ].filter(Boolean);

  // Đóng menu tài khoản khi bấm ra ngoài hoặc nhấn Esc (trả focus về nút mở)
  useEffect(() => {
    if (!dropdownOpen) return undefined;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  // Esc đóng menu di động
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        mobileToggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    logout();
    showToast('Bạn đã đăng xuất tài khoản.', 'info');
  };

  const runFromMenu = (action) => {
    setDropdownOpen(false);
    action?.();
  };

  const runFromMobile = (action) => {
    setMobileMenuOpen(false);
    action?.();
  };

  const scrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const actionBtn =
    'touch-target inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap';
  const mobileLink =
    'flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-primary text-left';
  const navLink = 'px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-primary whitespace-nowrap';
  // Khi đã đăng nhập, thanh trên có thêm nút Không gian làm việc và menu tài khoản nên chỉ đủ chỗ cho
  // các liên kết mục từ màn 2xl; dưới mức đó người dùng dùng menu (nút ☰) như trên điện thoại.
  const wideNavClass = isAuthenticated ? 'hidden 2xl:flex' : 'hidden xl:flex';
  const narrowOnlyClass = isAuthenticated ? '2xl:hidden' : 'xl:hidden';

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white border-b border-slate-200">
      <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        {/* Chỉ hiển thị logo; tên đọc cho trình đọc màn hình qua aria-label (ảnh là trang trí nên alt rỗng) */}
        <a
          href="#top"
          onClick={scrollToTop}
          aria-label="Mỹ Phát Hospital – về đầu trang"
          className="shrink-0 rounded-full"
        >
          <img
            alt=""
            className="h-12 w-12 rounded-full object-cover"
            src={logoHospital}
            onError={(e) => {
              e.currentTarget.src = '/logo.png';
            }}
          />
        </a>

        {/* Liên kết tới các mục trên trang (màn rộng; màn hẹp dùng menu) */}
        <nav aria-label="Các mục trên trang" className={`${wideNavClass} items-center gap-1 mr-auto ml-6`}>
          <a href="#departments" className={navLink}>Khoa phòng</a>
          <a href="#doctors" className={navLink}>Bác sĩ</a>
          <a href="#ai-triage" className={navLink}>Hỏi triệu chứng</a>
          <a href="#hospital-map" className={navLink}>Giờ khám & liên hệ</a>
        </nav>

        {/* Thao tác chính */}
        <div className="flex items-center gap-2 shrink-0">
          <TextSizeControl className="hidden lg:inline-flex" />
          <a
            href={`tel:${HOTLINE}`}
            className={`${actionBtn} hidden 2xl:inline-flex text-slate-900 font-semibold hover:bg-slate-100`}
            aria-label={`Gọi đường dây nóng cấp cứu và tư vấn 24/7: ${HOTLINE_DISPLAY}`}
          >
            <Icon name="call" className="text-[1rem]" />
            <span>{HOTLINE_DISPLAY}</span>
          </a>

          {isStaff && onOpenWorkspace && (
            <button
              type="button"
              id="headerWorkspaceBtn"
              onClick={onOpenWorkspace}
              className={`${actionBtn} border border-slate-300 bg-white hover:bg-slate-50 text-slate-800`}
              aria-label="Không gian làm việc"
              title="Mở không gian làm việc của nhân viên"
            >
              <Icon name="dashboard" className="text-[1.125rem]" />
              <span className="hidden xl:inline">Không gian làm việc</span>
            </button>
          )}

          {/* "Lịch trực" và "Lịch khám của tôi" nằm trong menu tài khoản, không lặp lại trên thanh trên cho đỡ chật */}
          <button
            type="button"
            id="headerBookBtn"
            onClick={() => onOpenBooking()}
            className={`${actionBtn} hidden sm:inline-flex bg-primary hover:bg-primary-dark text-white font-semibold`}
          >
            <span>Đặt lịch khám</span>
          </button>

          {/* Tài khoản */}
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                id="userMenuBtn"
                ref={menuButtonRef}
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-expanded={dropdownOpen}
                aria-controls={userMenuId}
                aria-haspopup="true"
                aria-label={`Tài khoản: ${user?.fullName || user?.username} (${roleTitle})`}
                className="touch-target h-9 flex items-center gap-2 pl-1 pr-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Avatar name={user?.fullName || user?.username} src={user?.avatarUrl} className="avatar w-7 h-7 text-xs" />
                <span className="hidden xl:flex flex-col text-left pr-0.5 leading-tight">
                  <span className="text-xs font-bold text-slate-800 max-w-[110px] xl:max-w-[130px] truncate">
                    {user?.fullName || user?.username}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{roleTitle}</span>
                </span>
                <Icon name={dropdownOpen ? 'expand_less' : 'expand_more'} className="text-[1.125rem] text-slate-500" />
              </button>

              {dropdownOpen && (
                <div id={userMenuId} className="dropdown right-0 top-12 w-72 max-h-[calc(100vh-5.5rem)] overflow-y-auto">
                  <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                    <div className="text-sm font-bold text-slate-900 truncate">{user?.fullName || user?.username}</div>
                    <div className="text-xs text-slate-500 truncate">{user?.email || 'Mỹ Phát Hospital'}</div>
                    <span className="badge badge-primary mt-1.5">{roleTitle}</span>
                  </div>

                  {isStaff && onOpenWorkspace && (
                    <button type="button" onClick={() => runFromMenu(onOpenWorkspace)} className="dropdown-item font-semibold text-primary">
                      <Icon name="dashboard" />
                      <span>Không gian làm việc</span>
                    </button>
                  )}
                  {onOpenMyAppointments && (
                    <button type="button" onClick={() => runFromMenu(onOpenMyAppointments)} className="dropdown-item">
                      <Icon name="event_note" />
                      <span>Lịch khám của tôi</span>
                    </button>
                  )}
                  {!isStaff && onOpenMyInvoices && (
                    <button type="button" onClick={() => runFromMenu(onOpenMyInvoices)} className="dropdown-item">
                      <Icon name="receipt_long" />
                      <span>Hóa đơn của tôi</span>
                    </button>
                  )}
                  {onOpenProfile && (
                    <button type="button" onClick={() => runFromMenu(onOpenProfile)} className="dropdown-item">
                      <Icon name="badge" />
                      <span>Thông tin tài khoản</span>
                    </button>
                  )}
                  {onOpenPatientProfile && (
                    <button type="button" onClick={() => runFromMenu(onOpenPatientProfile)} className="dropdown-item">
                      <Icon name="medical_information" />
                      <span>Hồ sơ sức khỏe & dị ứng</span>
                    </button>
                  )}

                  {staffModules.length > 0 && (
                    <>
                      <div className="dropdown-divider" />
                      <div className="dropdown-label">Nghiệp vụ</div>
                      {staffModules.map((m) => (
                        <button key={m.key} type="button" onClick={() => runFromMenu(m.action)} className="dropdown-item">
                          <Icon name={m.icon} />
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </>
                  )}

                  <div className="dropdown-divider" />
                  <button type="button" onClick={handleLogout} className="dropdown-item is-danger">
                    <Icon name="logout" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              id="headerAuthBtn"
              onClick={() => onOpenAuth('login')}
              className={`${actionBtn} hidden sm:inline-flex border border-slate-200 bg-white hover:bg-slate-50 text-slate-700`}
            >
              <Icon name="login" className="text-[1.125rem] text-slate-500" />
              <span>Đăng nhập</span>
            </button>
          )}

          {/* Nút menu di động */}
          <button
            type="button"
            ref={mobileToggleRef}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={`touch-target ${narrowOnlyClass} w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors cursor-pointer border border-slate-300`}
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls={mobileMenuId}
          >
            <Icon name={mobileMenuOpen ? 'close' : 'menu'} className="text-[1.375rem]" />
          </button>
        </div>
      </div>

      {/* Menu di động */}
      {mobileMenuOpen && (
        <nav
          id={mobileMenuId}
          aria-label="Menu chính"
          className={`${narrowOnlyClass} bg-white border-b border-slate-200 px-4 sm:px-6 py-3 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto`}
        >
          <div className="lg:hidden flex items-center justify-between px-3 py-2">
            <span className="text-sm font-semibold text-slate-700">Cỡ chữ</span>
            <TextSizeControl />
          </div>
          <button
            type="button"
            onClick={() => runFromMobile(() => onOpenBooking())}
            className="w-full py-3 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-semibold flex items-center justify-center gap-2"
          >
            <span>Đặt lịch khám ngay</span>
          </button>
          {!isAuthenticated && (
            <button type="button" onClick={() => runFromMobile(() => onOpenAuth('login'))} className={`${mobileLink} font-semibold text-primary`}>
              <Icon name="login" className="text-[1.25rem]" />
              <span>Đăng nhập</span>
            </button>
          )}
          <a href="#top" onClick={(e) => { setMobileMenuOpen(false); scrollToTop(e); }} className={mobileLink}>
            <Icon name="home" className="text-[1.25rem] text-slate-500" />
            <span>Trang chủ</span>
          </a>
          <a href="#departments" onClick={() => setMobileMenuOpen(false)} className={mobileLink}>
            <Icon name="local_hospital" className="text-[1.25rem] text-slate-500" />
            <span>Khoa / chuyên môn</span>
          </a>
          <a href="#doctors" onClick={() => setMobileMenuOpen(false)} className={mobileLink}>
            <Icon name="groups" className="text-[1.25rem] text-slate-500" />
            <span>Đội ngũ bác sĩ</span>
          </a>
          {onOpenAbout && (
            <button type="button" onClick={() => runFromMobile(onOpenAbout)} className={mobileLink}>
              <Icon name="info" className="text-[1.25rem] text-slate-500" />
              <span>Về chúng tôi</span>
            </button>
          )}
          {onOpenContact && (
            <button type="button" onClick={() => runFromMobile(onOpenContact)} className={mobileLink}>
              <Icon name="contact_support" className="text-[1.25rem] text-slate-500" />
              <span>Liên hệ</span>
            </button>
          )}
          {isAuthenticated && !isStaff && onOpenMyAppointments && (
            <button type="button" onClick={() => runFromMobile(onOpenMyAppointments)} className={mobileLink}>
              <Icon name="event_note" className="text-[1.25rem] text-slate-500" />
              <span>Lịch khám của tôi</span>
            </button>
          )}
          {isAuthenticated && !isStaff && onOpenMyInvoices && (
            <button type="button" onClick={() => runFromMobile(onOpenMyInvoices)} className={mobileLink}>
              <Icon name="receipt_long" className="text-[1.25rem] text-slate-500" />
              <span>Hóa đơn của tôi</span>
            </button>
          )}
          <a href={`tel:${HOTLINE}`} className={`${mobileLink} font-semibold`}>
            <Icon name="call" className="text-[1.25rem]" />
            <span>Đường dây nóng 24/7: {HOTLINE_DISPLAY}</span>
          </a>

          {isStaff && (
            <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
              <p className="text-overline px-3 pt-1 pb-1">Nghiệp vụ nhân viên</p>
              {onOpenWorkspace && (
                <button type="button" onClick={() => runFromMobile(onOpenWorkspace)} className={`${mobileLink} text-primary font-semibold`}>
                  <Icon name="dashboard" className="text-[1.25rem]" />
                  <span>Không gian làm việc</span>
                </button>
              )}
              {staffModules.map((m) => (
                <button key={m.key} type="button" onClick={() => runFromMobile(m.action)} className={mobileLink}>
                  <Icon name={m.icon} className="text-[1.25rem] text-slate-500" />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          )}

        </nav>
      )}
    </header>
  );
};
