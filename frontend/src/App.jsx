import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ConfirmProvider } from './components/common/ConfirmDialog';
import Modal from './components/common/Modal';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import HeroSection from './components/home/HeroSection';
import FeaturesSection from './components/home/FeaturesSection';
import DepartmentsSection from './components/home/DepartmentsSection';
import DoctorsSection from './components/home/DoctorsSection';
import AITriageSection from './components/home/AITriageSection';
import TestimonialsSection from './components/home/TestimonialsSection';
import QuickCtaSection from './components/home/QuickCtaSection';
import HospitalMapSection from './components/home/HospitalMapSection';

// Modals
import AuthModal from './components/modals/AuthModal';
import BookingModal from './components/modals/BookingModal';
import MyAppointmentsModal from './components/modals/MyAppointmentsModal';
import MyInvoicesModal from './components/billing/MyInvoicesModal';
import AllDepartmentsModal from './components/modals/AllDepartmentsModal';
import AboutModal from './components/modals/AboutModal';
import ContactModal from './components/modals/ContactModal';
import UserProfileModal from './components/modals/UserProfileModal';
import PatientProfileModal from './components/modals/PatientProfileModal';
import AdminPanelModal from './components/modals/AdminPanelModal';
import VisitDashboard from './components/clinical/VisitDashboard';
import ChatWidget from './components/chat/ChatWidget';
import PharmacyDispenseModal from './components/pharmacy/PharmacyDispenseModal';
import InvoiceModal from './components/billing/InvoiceModal';
import StaffScheduleModal from './components/hr/StaffScheduleModal';
import ReceptionDashboardModal from './components/reception/ReceptionDashboardModal';
import NurseStationModal from './components/nurse/NurseStationModal';
import StatisticsDashboardModal from './components/reporting/StatisticsDashboardModal';
import StaffWorkspace from './components/workspace/StaffWorkspace';
import AutoLogoutTimer from './components/common/AutoLogoutTimer';
import { getCatalogStatus, getCatalogVersion, subscribeCatalog } from './services/dataService';

/** Phân hệ nghiệp vụ của nhân viên – chứa dữ liệu bệnh nhân/tài chính, chỉ mở khi đăng nhập đúng vai trò. */
const STAFF_MODULES = ['reception', 'nurse', 'clinical', 'pharmacy', 'invoice', 'reports', 'schedule', 'admin'];
/** Cửa sổ chỉ dành cho người đã đăng nhập – đóng toàn bộ khi đăng xuất / hết phiên / đổi tài khoản. */
const AUTH_ONLY_MODALS = new Set([...STAFF_MODULES, 'profile', 'patientProfile', 'myInvoices']);

let modalSeq = 0;

/**
 * Trạng thái các cửa sổ: { [tên]: payload } – có mặt nghĩa là đang mở.
 * Cho phép nhiều cửa sổ mở chồng nhau (VD: Lịch khám của tôi → Đặt lịch).
 */
function useModalRegistry() {
  const [modals, setModals] = useState({});

  const openModal = useCallback((name, payload = {}) => {
    modalSeq += 1;
    setModals((prev) => ({ ...prev, [name]: { ...payload, seq: modalSeq } }));
  }, []);

  const closeModal = useCallback((name) => {
    setModals((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const closeWhere = useCallback((predicate) => {
    setModals((prev) => {
      const keys = Object.keys(prev).filter(predicate);
      if (keys.length === 0) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  return { modals, openModal, closeModal, closeWhere };
}

function MainApp() {
  const { showToast } = useToast();
  const {
    user,
    isAuthenticated,
    isStaff,
    isDoctor,
    isReceptionist,
    isNurse,
    isPharmacist,
    isAdmin
  } = useAuth();

  // 'portal' (website công khai) hoặc 'workspace' (không gian làm việc của nhân viên)
  const [viewMode, setViewMode] = useState('portal');
  const { modals, openModal, closeModal, closeWhere } = useModalRegistry();

  // Danh mục bác sĩ đồng bộ nền từ backend (main.jsx) – đặt lịch chờ đồng bộ xong để dùng đúng mã bác sĩ
  const catalogStatus = useSyncExternalStore(subscribeCatalog, getCatalogStatus, getCatalogStatus);
  const catalogVersion = useSyncExternalStore(subscribeCatalog, getCatalogVersion, getCatalogVersion);
  const catalogPending = catalogStatus === 'pending';

  // Quyền mở từng cửa sổ (Admin có mọi vai trò nghiệp vụ – xem AuthContext)
  const access = {
    reception: isAuthenticated && isReceptionist,
    nurse: isAuthenticated && isNurse,
    clinical: isAuthenticated && isDoctor,
    pharmacy: isAuthenticated && isPharmacist,
    invoice: isAuthenticated && isReceptionist,
    reports: isAuthenticated && isReceptionist,
    schedule: isStaff,
    admin: isAuthenticated && isAdmin,
    profile: isAuthenticated,
    patientProfile: isAuthenticated,
    myInvoices: isAuthenticated
  };
  const isOpen = (name) => Boolean(modals[name]) && (access[name] ?? true);

  // Đăng xuất (thủ công, tự động hết phiên, 401) hoặc đổi tài khoản → đóng mọi cửa sổ chứa dữ liệu
  // bệnh nhân / tài chính và quay về cổng thông tin. Việc chặn hiển thị theo quyền ở trên có hiệu lực ngay
  // trong cùng lần render; effect này dọn trạng thái để cửa sổ không tự mở lại khi đăng nhập lần sau.
  // (Cập nhật trạng thái ngay trong lần render phát hiện thay đổi phiên – mẫu "lưu giá trị của lần render trước".)
  const sessionKey = isAuthenticated ? `${user?.id ?? ''}:${user?.username ?? ''}` : null;
  const [previousSessionKey, setPreviousSessionKey] = useState(sessionKey);
  if (previousSessionKey !== sessionKey) {
    setPreviousSessionKey(sessionKey);
    closeWhere((name) => AUTH_ONLY_MODALS.has(name));
    if (!sessionKey) setViewMode('portal');
  }

  // Handlers
  const handleOpenAuth = (tab = 'login') => openModal('auth', { tab });
  const handleOpenBooking = (initialData = {}) => {
    // Bỏ qua đối tượng sự kiện khi handler được gắn thẳng vào onClick
    const data = initialData && typeof initialData === 'object' && !('nativeEvent' in initialData) ? initialData : {};
    openModal('booking', { initialData: data });
  };
  const handleOpenSchedule = (opts) => {
    openModal('schedule', {
      departmentId: opts?.departmentId ? String(opts.departmentId) : '',
      staffId: opts?.staffId ? String(opts.staffId) : ''
    });
  };
  const handleOpenInvoice = (opts) => openModal('invoice', { visitId: opts?.visitId ?? undefined });
  const handleOpenAITriage = () => {
    document.getElementById('ai-triage')?.scrollIntoView({ behavior: 'smooth' });
  };
  const handleSelectDepartmentFromModal = (deptId) => {
    closeModal('departments');
    handleOpenBooking({ departmentId: deptId });
  };

  const moduleHandlers = {
    onOpenReception: () => openModal('reception'),
    onOpenClinical: () => openModal('clinical'),
    onOpenNurse: () => openModal('nurse'),
    onOpenPharmacy: () => openModal('pharmacy'),
    onOpenInvoice: handleOpenInvoice,
    onOpenReports: () => openModal('reports'),
    onOpenSchedule: handleOpenSchedule,
    onOpenAdmin: () => openModal('admin'),
    onOpenProfile: () => openModal('profile'),
    onOpenPatientProfile: () => openModal('patientProfile'),
    onOpenMyInvoices: () => openModal('myInvoices')
  };

  // Phân hệ đang mở trên cùng → làm nổi mục tương ứng ở thanh bên của workspace
  const activeModule = STAFF_MODULES
    .filter((name) => isOpen(name))
    .sort((a, b) => (modals[b]?.seq ?? 0) - (modals[a]?.seq ?? 0))[0] || null;

  const isStaffWorkspaceActive = viewMode === 'workspace' && isStaff;

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans text-slate-800 antialiased">
      {isStaffWorkspaceActive ? (
        <StaffWorkspace
          {...moduleHandlers}
          activeModule={activeModule}
          onSwitchToPortal={() => setViewMode('portal')}
        />
      ) : (
        <>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-white focus:text-sm focus:font-semibold"
          >
            Bỏ qua đến nội dung chính
          </a>

          {/* Top Navigation */}
          <Navbar
            {...moduleHandlers}
            onOpenAuth={handleOpenAuth}
            onOpenBooking={() => handleOpenBooking()}
            onOpenMyAppointments={() => openModal('appointments')}
            onOpenAbout={() => openModal('about')}
            onOpenContact={() => openModal('contact')}
            onOpenWorkspace={() => setViewMode('workspace')}
          />

          {/* Main Content */}
          <main id="main-content" tabIndex={-1} className="flex-1 pt-16 w-full outline-none">
            <HeroSection
              onOpenBooking={handleOpenBooking}
              onOpenAllDepartments={() => openModal('departments')}
              onScrollToAI={handleOpenAITriage}
              onOpenMyAppointments={() => openModal('appointments')}
            />

            <FeaturesSection
              onOpenAITriage={handleOpenAITriage}
              onOpenBooking={() => handleOpenBooking()}
              onOpenAllDepartments={() => openModal('departments')}
              onOpenMyAppointments={() => openModal('appointments')}
            />

            <DepartmentsSection
              onOpenBooking={handleOpenBooking}
              onOpenAllDepartments={() => openModal('departments')}
            />

            {/* key: vẽ lại khi danh mục bác sĩ đồng bộ xong (mã bác sĩ / trạng thái nhận lịch) */}
            <DoctorsSection key={`doctors-${catalogVersion}`} onOpenBooking={handleOpenBooking} />

            <AITriageSection onOpenBooking={handleOpenBooking} />

            <TestimonialsSection />

            <QuickCtaSection
              onOpenBooking={() => handleOpenBooking()}
              onOpenContact={() => openModal('contact')}
            />

            <HospitalMapSection />
          </main>

          {/* Footer */}
          <Footer
            onOpenAbout={() => openModal('about')}
            onOpenContact={() => openModal('contact')}
            onOpenAllDepts={() => openModal('departments')}
            onOpenBooking={() => handleOpenBooking()}
            onOpenMyAppointments={() => openModal('appointments')}
            onFilterDept={(deptId) => handleOpenBooking({ departmentId: deptId })}
          />
        </>
      )}

      {/* ===== Cửa sổ công khai ===== */}
      <AuthModal
        isOpen={isOpen('auth')}
        initialTab={modals.auth?.tab || 'login'}
        onClose={() => closeModal('auth')}
      />

      <BookingModal
        isOpen={isOpen('booking') && !catalogPending}
        initialData={modals.booking?.initialData || {}}
        onClose={() => closeModal('booking')}
        onViewAppointments={() => openModal('appointments')}
      />

      {/* Đặt lịch được yêu cầu khi danh mục bác sĩ còn đang đồng bộ (tối đa ~3 giây) */}
      <Modal
        isOpen={isOpen('booking') && catalogPending}
        onClose={() => closeModal('booking')}
        title="Đặt lịch khám"
        icon="event_available"
        size="sm"
      >
        <div className="flex items-center gap-3 py-4" role="status">
          <span className="spinner" aria-hidden="true" />
          <span className="text-sm text-slate-600">Đang tải danh sách bác sĩ, vui lòng chờ trong giây lát…</span>
        </div>
      </Modal>

      <MyAppointmentsModal
        isOpen={isOpen('appointments')}
        onClose={() => closeModal('appointments')}
        onOpenBooking={() => handleOpenBooking()}
      />

      <AllDepartmentsModal
        isOpen={isOpen('departments')}
        onClose={() => closeModal('departments')}
        onSelectDepartment={handleSelectDepartmentFromModal}
      />

      <AboutModal isOpen={isOpen('about')} onClose={() => closeModal('about')} />

      <ContactModal isOpen={isOpen('contact')} onClose={() => closeModal('contact')} />

      {/* ===== Cửa sổ cần đăng nhập ===== */}
      <UserProfileModal
        isOpen={isOpen('profile')}
        onClose={() => closeModal('profile')}
        onOpenAppointments={() => openModal('appointments')}
        onOpenPatientProfile={() => openModal('patientProfile')}
        onOpenMyInvoices={() => openModal('myInvoices')}
      />

      <PatientProfileModal
        isOpen={isOpen('patientProfile')}
        onClose={() => closeModal('patientProfile')}
      />

      <MyInvoicesModal isOpen={isOpen('myInvoices')} onClose={() => closeModal('myInvoices')} />

      {/* ===== Phân hệ nhân viên – chỉ render khi đúng vai trò ===== */}
      {access.admin && (
        <AdminPanelModal isOpen={isOpen('admin')} onClose={() => closeModal('admin')} />
      )}

      {access.clinical && (
        <VisitDashboard isOpen={isOpen('clinical')} onClose={() => closeModal('clinical')} />
      )}

      {access.pharmacy && (
        <PharmacyDispenseModal
          isOpen={isOpen('pharmacy')}
          onClose={() => closeModal('pharmacy')}
          onShowToast={showToast}
        />
      )}

      {access.invoice && (
        <InvoiceModal
          isOpen={isOpen('invoice')}
          onClose={() => closeModal('invoice')}
          onShowToast={showToast}
          defaultVisitId={modals.invoice?.visitId}
        />
      )}

      {access.schedule && (
        <StaffScheduleModal
          isOpen={isOpen('schedule')}
          onClose={() => closeModal('schedule')}
          onShowToast={showToast}
          initialDeptId={modals.schedule?.departmentId || ''}
          initialStaffId={modals.schedule?.staffId || ''}
        />
      )}

      {access.reception && (
        <ReceptionDashboardModal
          isOpen={isOpen('reception')}
          onClose={() => closeModal('reception')}
          onShowToast={showToast}
        />
      )}

      {access.nurse && (
        <NurseStationModal
          isOpen={isOpen('nurse')}
          onClose={() => closeModal('nurse')}
          onShowToast={showToast}
        />
      )}

      {access.reports && (
        <StatisticsDashboardModal
          isOpen={isOpen('reports')}
          onClose={() => closeModal('reports')}
          onShowToast={showToast}
        />
      )}

      {/* Trợ lý AI y tế 24/7 */}
      <ChatWidget onOpenBooking={handleOpenBooking} />

      {/* Tự động đăng xuất khi không thao tác */}
      <AutoLogoutTimer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <MainApp />
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
