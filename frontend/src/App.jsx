import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
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
import { useToast } from './context/ToastContext';
import { useAuth } from './context/AuthContext';

function MainApp() {
  const { showToast } = useToast();
  const { isAuthenticated, isDoctor, isReceptionist, isNurse, isPharmacist, isAccountant, isAdmin } = useAuth();
  const isStaff = isDoctor || isReceptionist || isNurse || isPharmacist || isAccountant || isAdmin;

  // View mode: 'portal' (public hospital website) or 'workspace' (staff executive console)
  const [viewMode, setViewMode] = useState('portal');

  // Modal states
  const [authModal, setAuthModal] = useState({ open: false, tab: 'login' });
  const [bookingModal, setBookingModal] = useState({ open: false, initialData: {} });
  const [appointmentsModalOpen, setAppointmentsModalOpen] = useState(false);
  const [departmentsModalOpen, setDepartmentsModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [patientProfileModalOpen, setPatientProfileModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [clinicalModalOpen, setClinicalModalOpen] = useState(false);
  const [pharmacyModalOpen, setPharmacyModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [scheduleModalState, setScheduleModalState] = useState({ open: false, departmentId: '', staffId: '' });
  const [receptionModalOpen, setReceptionModalOpen] = useState(false);
  const [nurseModalOpen, setNurseModalOpen] = useState(false);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);

  // Handlers
  const handleOpenAuth = (tab = 'login') => {
    setAuthModal({ open: true, tab });
  };

  const handleOpenBooking = (initialData = {}) => {
    setBookingModal({ open: true, initialData });
  };

  const handleOpenSchedule = (opts = {}) => {
    setScheduleModalState({
      open: true,
      departmentId: opts?.departmentId ? String(opts.departmentId) : '',
      staffId: opts?.staffId ? String(opts.staffId) : ''
    });
  };

  const handleOpenAITriage = () => {
    const el = document.getElementById('ai-triage');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectDepartmentFromModal = (deptId) => {
    setDepartmentsModalOpen(false);
    handleOpenBooking({ departmentId: deptId });
  };

  const isStaffWorkspaceActive = viewMode === 'workspace' && isAuthenticated && isStaff;

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans text-slate-800 antialiased selection:bg-teal-600 selection:text-white">
      {isStaffWorkspaceActive ? (
        <StaffWorkspace
          onSwitchToPortal={() => setViewMode('portal')}
          onOpenReception={() => setReceptionModalOpen(true)}
          onOpenClinical={() => setClinicalModalOpen(true)}
          onOpenNurse={() => setNurseModalOpen(true)}
          onOpenPharmacy={() => setPharmacyModalOpen(true)}
          onOpenInvoice={() => setInvoiceModalOpen(true)}
          onOpenReports={() => setReportsModalOpen(true)}
          onOpenSchedule={handleOpenSchedule}
          onOpenAdmin={() => setAdminModalOpen(true)}
          onOpenProfile={() => setProfileModalOpen(true)}
          onOpenPatientProfile={() => setPatientProfileModalOpen(true)}
        />
      ) : (
        <>
          {/* Top Navigation */}
          <Navbar
            onOpenAuth={handleOpenAuth}
            onOpenBooking={() => handleOpenBooking()}
            onOpenMyAppointments={() => setAppointmentsModalOpen(true)}
            onOpenProfile={() => setProfileModalOpen(true)}
            onOpenPatientProfile={() => setPatientProfileModalOpen(true)}
            onOpenAdmin={() => setAdminModalOpen(true)}
            onOpenAbout={() => setAboutModalOpen(true)}
            onOpenContact={() => setContactModalOpen(true)}
            onOpenClinical={() => setClinicalModalOpen(true)}
            onOpenPharmacy={() => setPharmacyModalOpen(true)}
            onOpenInvoice={() => setInvoiceModalOpen(true)}
            onOpenSchedule={handleOpenSchedule}
            onOpenReception={() => setReceptionModalOpen(true)}
            onOpenNurse={() => setNurseModalOpen(true)}
            onOpenReports={() => setReportsModalOpen(true)}
            onOpenWorkspace={() => setViewMode('workspace')}
          />

          {/* Main Content */}
          <main className="flex-1 pt-20 w-full">
            <HeroSection
              onOpenBooking={handleOpenBooking}
              onOpenAllDepartments={() => setDepartmentsModalOpen(true)}
              onScrollToAI={handleOpenAITriage}
              onOpenMyAppointments={() => setAppointmentsModalOpen(true)}
            />

            <FeaturesSection
              onOpenAITriage={handleOpenAITriage}
              onOpenBooking={() => handleOpenBooking()}
              onOpenAllDepartments={() => setDepartmentsModalOpen(true)}
              onOpenMyAppointments={() => setAppointmentsModalOpen(true)}
            />

            <DepartmentsSection
              onOpenBooking={handleOpenBooking}
              onOpenAllDepartments={() => setDepartmentsModalOpen(true)}
            />

            <DoctorsSection
              onOpenBooking={handleOpenBooking}
              onOpenSchedule={handleOpenSchedule}
            />

            <AITriageSection onOpenBooking={handleOpenBooking} />

            <TestimonialsSection />

            <QuickCtaSection
              onOpenBooking={() => handleOpenBooking()}
              onOpenContact={() => setContactModalOpen(true)}
            />

            <HospitalMapSection />
          </main>

          {/* Footer */}
          <Footer
            onOpenAbout={() => setAboutModalOpen(true)}
            onOpenContact={() => setContactModalOpen(true)}
            onOpenAllDepts={() => setDepartmentsModalOpen(true)}
            onOpenBooking={() => handleOpenBooking()}
            onOpenMyAppointments={() => setAppointmentsModalOpen(true)}
            onFilterDept={(deptId) => handleOpenBooking({ departmentId: deptId })}
          />
        </>
      )}



      {/* Interactive Modals */}
      <AuthModal
        isOpen={authModal.open}
        initialTab={authModal.tab}
        onClose={() => setAuthModal({ open: false, tab: 'login' })}
      />

      <BookingModal
        isOpen={bookingModal.open}
        initialData={bookingModal.initialData}
        onClose={() => setBookingModal({ open: false, initialData: {} })}
        onViewAppointments={() => setAppointmentsModalOpen(true)}
      />

      <MyAppointmentsModal
        isOpen={appointmentsModalOpen}
        onClose={() => setAppointmentsModalOpen(false)}
        onOpenBooking={() => handleOpenBooking()}
      />

      <AllDepartmentsModal
        isOpen={departmentsModalOpen}
        onClose={() => setDepartmentsModalOpen(false)}
        onSelectDepartment={handleSelectDepartmentFromModal}
      />

      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
      />

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />

      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onOpenAppointments={() => setAppointmentsModalOpen(true)}
        onOpenPatientProfile={() => setPatientProfileModalOpen(true)}
      />

      <PatientProfileModal
        isOpen={patientProfileModalOpen}
        onClose={() => setPatientProfileModalOpen(false)}
      />

      <AdminPanelModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />

      <VisitDashboard
        isOpen={clinicalModalOpen}
        onClose={() => setClinicalModalOpen(false)}
      />

      <PharmacyDispenseModal
        isOpen={pharmacyModalOpen}
        onClose={() => setPharmacyModalOpen(false)}
        onShowToast={showToast}
      />

      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        onShowToast={showToast}
      />

      <StaffScheduleModal
        isOpen={scheduleModalState.open}
        onClose={() => setScheduleModalState({ open: false, departmentId: '', staffId: '' })}
        onShowToast={showToast}
        initialDeptId={scheduleModalState.departmentId}
        initialStaffId={scheduleModalState.staffId}
      />

      <ReceptionDashboardModal
        isOpen={receptionModalOpen}
        onClose={() => setReceptionModalOpen(false)}
        onShowToast={showToast}
      />

      <NurseStationModal
        isOpen={nurseModalOpen}
        onClose={() => setNurseModalOpen(false)}
        onShowToast={showToast}
      />

      <StatisticsDashboardModal
        isOpen={reportsModalOpen}
        onClose={() => setReportsModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Floating 24/7 AI Medical Chat Assistant */}
      <ChatWidget onOpenBooking={handleOpenBooking} />

      {/* Security Auto-Logout Timer */}
      <AutoLogoutTimer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}
