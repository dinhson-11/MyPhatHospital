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

// Modals
import AuthModal from './components/modals/AuthModal';
import BookingModal from './components/modals/BookingModal';
import MyAppointmentsModal from './components/modals/MyAppointmentsModal';
import AllDepartmentsModal from './components/modals/AllDepartmentsModal';
import AboutModal from './components/modals/AboutModal';
import ContactModal from './components/modals/ContactModal';
import UserProfileModal from './components/modals/UserProfileModal';
import AdminPanelModal from './components/modals/AdminPanelModal';

function MainApp() {
  // Modal states
  const [authModal, setAuthModal] = useState({ open: false, tab: 'login' });
  const [bookingModal, setBookingModal] = useState({ open: false, initialData: {} });
  const [appointmentsModalOpen, setAppointmentsModalOpen] = useState(false);
  const [departmentsModalOpen, setDepartmentsModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  // Handlers
  const handleOpenAuth = (tab = 'login') => {
    setAuthModal({ open: true, tab });
  };

  const handleOpenBooking = (initialData = {}) => {
    setBookingModal({ open: true, initialData });
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onOpenAuth={handleOpenAuth}
        onOpenBooking={() => handleOpenBooking()}
        onOpenMyAppointments={() => setAppointmentsModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenAdmin={() => setAdminModalOpen(true)}
        onOpenAbout={() => setAboutModalOpen(true)}
        onOpenContact={() => setContactModalOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1">
        <HeroSection
          onOpenBooking={handleOpenBooking}
          onOpenAllDepartments={() => setDepartmentsModalOpen(true)}
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

        <DoctorsSection onOpenBooking={handleOpenBooking} />

        <AITriageSection onOpenBooking={handleOpenBooking} />

        <TestimonialsSection />

        <QuickCtaSection
          onOpenBooking={() => handleOpenBooking()}
          onOpenContact={() => setContactModalOpen(true)}
        />
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
      />

      <AdminPanelModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />
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
