import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import scheduleService from '../services/scheduleService';
import api from '../services/api';
import StaffScheduleModal from '../components/hr/StaffScheduleModal';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

describe('Staff & Schedule Module Suite (Sprint 8 - FR-8)', () => {

  // Lỗi mạng (máy chủ offline) → service dùng dữ liệu cục bộ.
  // Mặc định cho cả bộ test để kết quả không phụ thuộc việc có backend đang chạy trên máy hay không
  // (máy chủ trả 401/403/500 giờ được báo lỗi lên giao diện thay vì âm thầm dùng dữ liệu mẫu).
  const mockBackendOffline = () => {
    const networkError = Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });
    vi.spyOn(api, 'get').mockRejectedValue(networkError);
    vi.spyOn(api, 'post').mockRejectedValue(networkError);
    vi.spyOn(api, 'delete').mockRejectedValue(networkError);
  };

  beforeEach(() => {
    localStorage.clear();
    mockBackendOffline();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scheduleService Unit Tests', () => {
    it('lấy danh sách nhân viên y tế (bác sĩ, dược sĩ, điều dưỡng)', async () => {
      const staffList = await scheduleService.getStaffList();
      expect(staffList).toBeDefined();
      expect(staffList.length).toBeGreaterThan(0);
      expect(staffList.some(s => s.fullName.includes('Vi Mai Anh'))).toBe(true);
      expect(staffList.some(s => s.fullName.includes('Lê Hải Quang'))).toBe(true);
    });

    it('tra cứu lịch trực theo khoảng thời gian tuần', async () => {
      const today = new Date().toISOString().split('T')[0];
      const schedules = await scheduleService.getSchedules({ startDate: today });
      expect(schedules).toBeDefined();
      expect(schedules.length).toBeGreaterThan(0);
      expect(schedules[0].workDate).toBeDefined();
      expect(schedules[0].shift).toBeDefined();
    });

    it('xếp ca trực mới thành công', async () => {
      const newSchedule = await scheduleService.createSchedule({
        staffId: 1,
        departmentId: 1,
        workDate: '2026-10-25',
        shift: 'NIGHT',
        roomNo: 'P.Cấp cứu',
        note: 'Trực ca đêm tăng cường'
      });

      expect(newSchedule).toBeDefined();
      expect(newSchedule.staffId).toBe(1);
      expect(newSchedule.shift).toBe('NIGHT');
      expect(newSchedule.workDate).toBe('2026-10-25');
    });

    it('chặn xếp lịch trùng ca trong cùng ngày cho một nhân viên', async () => {
      const scheduleData = {
        staffId: 2,
        departmentId: 1,
        workDate: '2026-10-26',
        shift: 'MORNING'
      };

      await scheduleService.createSchedule(scheduleData);

      await expect(
        scheduleService.createSchedule(scheduleData)
      ).rejects.toThrow(/đã có lịch trực/);
    });

    it('thông báo trùng ca dùng nhãn ca tiếng Việt và ngày dd/MM/yyyy', async () => {
      const data = { staffId: 4, departmentId: 1, workDate: '2026-11-03', shift: 'NIGHT' };
      await scheduleService.createSchedule(data);
      await expect(scheduleService.createSchedule(data)).rejects.toThrow(/ca Đêm .*03\/11\/2026/);
    });

    it('báo lỗi khi máy chủ phản hồi lỗi thay vì âm thầm trả dữ liệu mẫu', async () => {
      vi.spyOn(api, 'get').mockRejectedValue(
        Object.assign(new Error('Request failed with status code 500'), {
          response: { status: 500, data: { message: 'Máy chủ lịch trực đang bảo trì' } }
        })
      );
      await expect(scheduleService.getSchedules({ startDate: '2026-10-12' })).rejects.toThrow('Máy chủ lịch trực đang bảo trì');
    });

    it('dùng lịch trực cục bộ khi không kết nối được máy chủ', async () => {
      const list = await scheduleService.getSchedules({ startDate: '2026-10-12', endDate: '2026-10-18' });
      expect(list.length).toBeGreaterThan(0);
    });

    it('xóa ca trực theo ID', async () => {
      const created = await scheduleService.createSchedule({
        staffId: 3,
        departmentId: 10,
        workDate: '2026-10-27',
        shift: 'AFTERNOON'
      });

      const deleted = await scheduleService.deleteSchedule(created.id);
      expect(deleted).toBe(true);

      const listAfter = await scheduleService.getSchedules();
      expect(listAfter.some(s => s.id === created.id)).toBe(false);
    });
  });

  describe('StaffScheduleModal UI Tests', () => {
    const loginAs = (roles) => {
      localStorage.setItem('hms_token', 'jwt_test_token');
      localStorage.setItem('hms_user', JSON.stringify({ id: 1, username: 'tester', fullName: 'Tester', roles }));
    };

    it('KHÔNG hiển thị lịch trực cho khách chưa đăng nhập', () => {
      render(
        <AuthProvider>
          <ToastProvider>
            <StaffScheduleModal isOpen={true} onClose={() => {}} onShowToast={() => {}} />
          </ToastProvider>
        </AuthProvider>
      );
      expect(screen.queryByText(/Lịch Trực Nhân Viên Y Tế/i)).not.toBeInTheDocument();
    });

    it('KHÔNG hiển thị lịch trực cho bệnh nhân (PATIENT)', () => {
      loginAs(['PATIENT']);
      render(
        <AuthProvider>
          <ToastProvider>
            <StaffScheduleModal isOpen={true} onClose={() => {}} onShowToast={() => {}} />
          </ToastProvider>
        </AuthProvider>
      );
      expect(screen.queryByText(/Lịch Trực Nhân Viên Y Tế/i)).not.toBeInTheDocument();
    });

    it('render modal hiển thị lịch trực 7 ngày trong tuần và các nút điều hướng', async () => {
      loginAs(['ADMIN']);
      render(
        <AuthProvider>
          <ToastProvider>
            <StaffScheduleModal isOpen={true} onClose={() => {}} onShowToast={() => {}} />
          </ToastProvider>
        </AuthProvider>
      );

      expect(screen.getByText(/Lịch Trực Nhân Viên Y Tế/i)).toBeInTheDocument();
      expect(screen.getByText(/Tuần này/i)).toBeInTheDocument();
      expect(screen.getByText(/Thứ 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Chủ nhật/i)).toBeInTheDocument();
      expect(screen.getByText(/Xếp ca trực/i)).toBeInTheDocument();
    });

    it('mở modal xếp ca trực mới hiển thị form đầy đủ các trường', async () => {
      loginAs(['ADMIN']);
      render(
        <AuthProvider>
          <ToastProvider>
            <StaffScheduleModal isOpen={true} onClose={() => {}} onShowToast={() => {}} />
          </ToastProvider>
        </AuthProvider>
      );

      const addBtn = screen.getByText(/Xếp ca trực/i);
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(screen.getByText(/Xếp Lịch Trực Cho Nhân Viên/i)).toBeInTheDocument();
        expect(screen.getByText(/Nhân viên y tế:/i)).toBeInTheDocument();
        expect(screen.getByText(/Ngày trực:/i)).toBeInTheDocument();
        expect(screen.getByText(/Ca trực:/i)).toBeInTheDocument();
        expect(screen.getByText(/Lưu ca trực/i)).toBeInTheDocument();
      });
    });

    const renderModal = (props = {}) => render(
      <AuthProvider>
        <ToastProvider>
          <StaffScheduleModal isOpen={true} onClose={() => {}} onShowToast={() => {}} {...props} />
        </ToastProvider>
      </AuthProvider>
    );

    it('hiển thị lịch dạng thẻ theo ngày (đáp ứng màn hình nhỏ) trong vùng có nhãn "Lịch trực tuần"', async () => {
      loginAs(['ADMIN']);
      renderModal();

      expect(screen.getByRole('dialog', { name: /Lịch Trực Nhân Viên Y Tế/i })).toBeInTheDocument();
      const region = screen.getByRole('region', { name: 'Lịch trực tuần' });

      // 7 thẻ ngày, mỗi thẻ có tiêu đề kèm ngày dd/MM/yyyy
      const dayHeadings = within(region).getAllByRole('heading', { level: 3 });
      expect(dayHeadings).toHaveLength(7);
      expect(dayHeadings[0]).toHaveTextContent(/Thứ 2/);
      expect(dayHeadings[6]).toHaveTextContent(/Chủ nhật/);
      dayHeadings.forEach(h => expect(h).toHaveTextContent(/\d{2}\/\d{2}\/\d{4}/));

      // Lưới xếp 1 cột trên điện thoại, 7 cột từ lg – không còn bề rộng cố định gây cuộn ngang
      const dayList = within(region).getAllByRole('list')[0];
      expect(dayList.className).toMatch(/grid-cols-1/);
      expect(dayList.className).toMatch(/lg:grid-cols-7/);
      expect(document.querySelector('[class*="min-w-[1050px]"]')).toBeNull();

      // Nhãn ca trực tiếng Việt
      expect((await within(region).findAllByText('Sáng')).length).toBeGreaterThan(0);
      expect(within(region).getAllByText('Chiều').length).toBeGreaterThan(0);
      expect(within(region).queryByText(/MORNING|AFTERNOON/)).not.toBeInTheDocument();
    });

    it('xóa ca trực: hỏi xác nhận (kèm nhân viên/ngày/ca) và KHÔNG xóa khi người dùng hủy', async () => {
      loginAs(['ADMIN']);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const deleteSpy = vi.spyOn(scheduleService, 'deleteSchedule');
      renderModal();

      const deleteButtons = await screen.findAllByRole('button', { name: /^Xóa ca /i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
      const prompt = confirmSpy.mock.calls[0][0];
      expect(prompt).toMatch(/Xóa ca trực này\?/);
      expect(prompt).toMatch(/Nhân viên: \S+/);
      expect(prompt).toMatch(/Ngày: (Thứ \d|Chủ nhật), \d{2}\/\d{2}\/\d{4}/);
      expect(prompt).toMatch(/Ca: (Sáng|Chiều|Đêm|Cả ngày)/);
      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it('xóa ca trực sau khi người dùng xác nhận', async () => {
      loginAs(['ADMIN']);
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const deleteSpy = vi.spyOn(scheduleService, 'deleteSchedule');
      const onShowToast = vi.fn();
      renderModal({ onShowToast });

      const deleteButtons = await screen.findAllByRole('button', { name: /^Xóa ca /i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => expect(deleteSpy).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(onShowToast).toHaveBeenCalledWith('Đã xóa ca trực.', 'success'));
    });

    it('hiển thị lỗi tải lịch trực kèm nút Thử lại', async () => {
      loginAs(['ADMIN']);
      const getSpy = vi.spyOn(scheduleService, 'getSchedules').mockRejectedValue(
        Object.assign(new Error('Request failed with status code 500'), {
          response: { status: 500, data: { message: 'Máy chủ lịch trực đang bảo trì' } }
        })
      );
      renderModal();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Máy chủ lịch trực đang bảo trì');

      getSpy.mockRestore();
      fireEvent.click(within(alert).getByRole('button', { name: /Thử lại/i }));

      await waitFor(() => expect(screen.queryByText('Máy chủ lịch trực đang bảo trì')).not.toBeInTheDocument());
      expect((await screen.findAllByRole('button', { name: /^Xóa ca /i })).length).toBeGreaterThan(0);
    });

    it('chỉ ADMIN mới thấy nút Xếp ca trực và nút xóa ca', async () => {
      loginAs(['DOCTOR']);
      renderModal();

      expect(screen.getByText(/Lịch Trực Nhân Viên Y Tế/i)).toBeInTheDocument();
      expect((await screen.findAllByText('Sáng')).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Xếp ca trực/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Xóa ca /i })).not.toBeInTheDocument();
    });
  });

});
