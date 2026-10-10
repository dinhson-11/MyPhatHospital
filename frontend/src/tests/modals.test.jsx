import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { appointmentService } from '../services/appointmentService';
import { DEPARTMENTS } from '../services/dataService';
import AboutModal from '../components/modals/AboutModal';
import ContactModal from '../components/modals/ContactModal';
import AllDepartmentsModal from '../components/modals/AllDepartmentsModal';
import UserProfileModal from '../components/modals/UserProfileModal';
import AdminPanelModal from '../components/modals/AdminPanelModal';

// Hermetic: không gọi backend thật
vi.mock('../services/api', () => {
  const offline = () => Promise.reject(new Error('Network Error'));
  return { default: { get: offline, post: offline, put: offline, patch: offline, delete: offline }, BASE_URL: '' };
});

vi.mock('../services/appointmentService', () => ({
  appointmentService: { getAppointments: vi.fn(), getMyAppointments: vi.fn() }
}));

const withProviders = (ui) => (
  <ToastProvider>
    <AuthProvider>{ui}</AuthProvider>
  </ToastProvider>
);

const SAMPLE_APPOINTMENTS = [
  {
    id: 1,
    ticketCode: 'HMS-2026-0001',
    patientName: 'Trần Đức Minh',
    patientPhone: '0912345678',
    departmentName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    doctorName: 'TS.BS Vi Mai Anh',
    appointmentDate: '2026-09-29',
    timeSlot: '08:30 - 09:00',
    status: 'CONFIRMED',
    createdAt: '2026-09-20T07:05:00'
  },
  {
    id: 2,
    ticketCode: 'HMS-2026-0002',
    patientName: 'Lê Thị Hoa',
    phoneNumber: '0987654321',
    departmentName: 'Sản - Phụ khoa',
    appointmentDate: '2026-10-05',
    timeSlot: '13:30 - 14:00',
    status: 'BOOKED'
  },
  {
    id: 3,
    ticketCode: 'HMS-2026-0003',
    patientName: 'Phạm Văn Bình',
    patientPhone: '0909000111',
    departmentName: 'Tai Mũi Họng',
    appointmentDate: '2026-08-15',
    timeSlot: '09:00 - 09:30',
    status: 'CANCELLED'
  }
];

describe('Shared Modal migration – accessible dialogs', () => {
  it.each([
    ['AboutModal', AboutModal, 'Về Mỹ Phát Hospital'],
    ['ContactModal', ContactModal, 'Liên Hệ & Hỗ Trợ'],
    ['AllDepartmentsModal', AllDepartmentsModal, 'Danh Mục Khoa Phòng & Dịch Vụ']
  ])('%s renders role="dialog" with an accessible name and closes via the "Đóng" button', (_name, Component, title) => {
    const onClose = vi.fn();
    render(withProviders(<Component isOpen onClose={onClose} onSelectDepartment={vi.fn()} />));

    const dialog = screen.getByRole('dialog', { name: title });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    render(withProviders(<AboutModal isOpen={false} onClose={vi.fn()} />));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes informational modals with Esc', () => {
    const onClose = vi.fn();
    render(withProviders(<AboutModal isOpen onClose={onClose} />));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ContactModal / AboutModal – hospital contact details', () => {
  it.each([
    ['ContactModal', ContactModal],
    ['AboutModal', AboutModal]
  ])('%s shows the hotline, address and Facebook page with safe external links', (_name, Component) => {
    render(withProviders(<Component isOpen onClose={vi.fn()} />));
    const dialog = screen.getByRole('dialog');

    const hotlines = within(dialog).getAllByRole('link', { name: /0789 065 493/ });
    expect(hotlines.length).toBeGreaterThan(0);
    hotlines.forEach((a) => expect(a).toHaveAttribute('href', 'tel:0789065493'));

    expect(within(dialog).getAllByText(/1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang/).length).toBeGreaterThan(0);

    const facebook = within(dialog).getByRole('link', { name: /facebook\.com\/MyPhatHospital/ });
    expect(facebook).toHaveAttribute('href', 'https://www.facebook.com/MyPhatHospital');
    expect(facebook).toHaveAttribute('target', '_blank');
    expect(facebook).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('ContactModal does not pretend to send: validates required fields and explains the email hand-off', () => {
    render(withProviders(<ContactModal isOpen onClose={vi.fn()} />));

    expect(screen.queryByText(/Đã gửi thông tin liên hệ/)).not.toBeInTheDocument();
    expect(screen.getByText(/sẽ được mở trong ứng dụng email của bạn/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Mở ứng dụng email để gửi/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng điền họ tên, số điện thoại và nội dung cần hỗ trợ.');
    expect(screen.getByLabelText(/Họ tên/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Số điện thoại/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nội dung cần hỗ trợ/)).toBeInTheDocument();
  });
});

describe('AllDepartmentsModal', () => {
  it('filters by category with pressed-state buttons and books a department', () => {
    const onClose = vi.fn();
    const onSelectDepartment = vi.fn();
    render(withProviders(<AllDepartmentsModal isOpen onClose={onClose} onSelectDepartment={onSelectDepartment} />));

    const support = screen.getByRole('button', { name: /^Cận lâm sàng & Tiện ích/ });
    fireEvent.click(support);
    expect(support).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryAllByRole('button', { name: /^Đặt khám/ })).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /^Tất cả/ }));
    const bookable = DEPARTMENTS.find((d) => d.canBook !== false);
    fireEvent.click(screen.getByRole('button', { name: `Đặt khám ${bookable.name}` }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelectDepartment).toHaveBeenCalledWith(bookable.id);
  });

  it('shows an empty state when the search has no results', () => {
    render(withProviders(<AllDepartmentsModal isOpen onClose={vi.fn()} onSelectDepartment={vi.fn()} />));

    fireEvent.change(screen.getByLabelText('Tìm kiếm chuyên khoa'), { target: { value: 'zzz-khong-co' } });
    expect(screen.getByText('Không tìm thấy khoa phòng phù hợp')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    expect(screen.queryByText('Không tìm thấy khoa phòng phù hợp')).not.toBeInTheDocument();
  });
});

describe('UserProfileModal', () => {
  beforeEach(() => {
    localStorage.setItem('hms_token', 'jwt_mock_doctor');
    localStorage.setItem('hms_user', JSON.stringify({
      id: 11, username: 'bs.maianh', fullName: 'TS.BS Vi Mai Anh', roles: ['DOCTOR'], email: 'bs.maianh@myphathospital.com'
    }));
  });

  it('renders an accessible dialog with Vietnamese role labels and no fabricated phone number', () => {
    render(withProviders(
      <UserProfileModal isOpen onClose={vi.fn()} onOpenAppointments={vi.fn()} onOpenPatientProfile={vi.fn()} />
    ));

    const dialog = screen.getByRole('dialog', { name: 'Thông Tin Tài Khoản' });
    expect(within(dialog).getByText('Bác sĩ')).toBeInTheDocument();
    expect(within(dialog).queryByText('DOCTOR')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('0789 065 493')).not.toBeInTheDocument();
  });

  it('opens the appointments list and closes itself', () => {
    const onClose = vi.fn();
    const onOpenAppointments = vi.fn();
    render(withProviders(
      <UserProfileModal isOpen onClose={onClose} onOpenAppointments={onOpenAppointments} onOpenPatientProfile={vi.fn()} />
    ));

    fireEvent.click(screen.getByRole('button', { name: /Xem lịch khám của tôi/ }));
    expect(onClose).toHaveBeenCalled();
    expect(onOpenAppointments).toHaveBeenCalled();
  });

  it('does not render without a signed-in user', () => {
    localStorage.clear();
    render(withProviders(<UserProfileModal isOpen onClose={vi.fn()} />));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('AdminPanelModal', () => {
  beforeEach(() => {
    appointmentService.getAppointments.mockReset();
  });

  it('lists all appointments with dd/MM/yyyy dates and Vietnamese status labels', async () => {
    appointmentService.getAppointments.mockResolvedValue(SAMPLE_APPOINTMENTS);
    render(withProviders(<AdminPanelModal isOpen onClose={vi.fn()} />));

    const dialog = screen.getByRole('dialog', { name: 'Bảng Điều Khiển Quản Trị' });
    const table = await within(dialog).findByRole('table');

    expect(within(table).getByText('29/09/2026')).toBeInTheDocument();
    expect(within(table).getByText('05/10/2026')).toBeInTheDocument();
    expect(within(table).queryByText('2026-09-29')).not.toBeInTheDocument();
    expect(within(table).getByText('Đã xác nhận')).toBeInTheDocument();
    expect(within(table).getByText('Đã đặt – chờ xác nhận')).toBeInTheDocument();
    expect(within(table).getByText('Đã hủy')).toBeInTheDocument();
    expect(within(table).getByText('Tạo lúc 07:05 20/09/2026')).toBeInTheDocument();
    expect(within(table).queryByText('CONFIRMED')).not.toBeInTheDocument();

    // Không còn chữ tiếng Anh / mã nội bộ trong giao diện
    expect(dialog).not.toHaveTextContent(/Sprint|Management Console|Flyway|Port 8080/);
    expect(appointmentService.getAppointments).toHaveBeenCalledTimes(1);
  });

  it('filters by status using a pressed-state segmented control', async () => {
    appointmentService.getAppointments.mockResolvedValue(SAMPLE_APPOINTMENTS);
    render(withProviders(<AdminPanelModal isOpen onClose={vi.fn()} />));
    await screen.findByRole('table');

    const cancelled = screen.getByRole('button', { name: 'Đã hủy (1)' });
    fireEvent.click(cancelled);
    expect(cancelled).toHaveAttribute('aria-pressed', 'true');
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(2); // header + 1 dòng
    expect(screen.getByText('Phạm Văn Bình')).toBeInTheDocument();
  });

  it('shows an empty state when there are no appointments', async () => {
    appointmentService.getAppointments.mockResolvedValue([]);
    render(withProviders(<AdminPanelModal isOpen onClose={vi.fn()} />));

    expect(await screen.findByText('Chưa có lịch khám nào')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a Vietnamese error with a retry button instead of failing silently', async () => {
    appointmentService.getAppointments
      .mockRejectedValueOnce({ response: { status: 500, data: {} }, message: 'Request failed with status code 500' })
      .mockResolvedValueOnce(SAMPLE_APPOINTMENTS);
    render(withProviders(<AdminPanelModal isOpen onClose={vi.fn()} />));

    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang gặp sự cố, vui lòng thử lại sau.');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
    expect(appointmentService.getAppointments).toHaveBeenCalledTimes(2);
  });
});
