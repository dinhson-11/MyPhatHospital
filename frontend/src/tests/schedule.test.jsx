import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import scheduleService from '../services/scheduleService';
import StaffScheduleModal from '../components/hr/StaffScheduleModal';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

describe('Staff & Schedule Module Suite (Sprint 8 - FR-8)', () => {

  beforeEach(() => {
    localStorage.clear();
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
    it('render modal hiển thị lịch trực 7 ngày trong tuần và các nút điều hướng', async () => {
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
  });

});
