import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { receptionService } from '../services/receptionService';
import { ReceptionDashboardModal } from '../components/reception/ReceptionDashboardModal';
import { ToastProvider } from '../context/ToastContext';

describe('Reception Module Suite (Sprint 9 - RECEPTIONIST Role)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('receptionService Unit Tests', () => {
    it('lấy danh sách hàng đợi tiếp đón mặc định thành công', async () => {
      const queue = await receptionService.getWaitingQueue();
      expect(queue).toBeDefined();
      expect(Array.isArray(queue)).toBe(true);
      expect(queue.length).toBeGreaterThan(0);
      expect(queue[0]).toHaveProperty('patientName');
      expect(queue[0]).toHaveProperty('ticketNumber');
      expect(queue[0]).toHaveProperty('status');
    });

    it('tìm kiếm bệnh nhân trong hàng đợi theo tên hoặc mã hồ sơ', async () => {
      const all = await receptionService.getWaitingQueue();
      const firstPatientName = all[0].patientName;
      const searchResults = await receptionService.searchWaitingPatients(firstPatientName.split(' ')[0]);
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].patientName).toContain(firstPatientName.split(' ')[0]);
    });

    it('check-in bệnh nhân chuyển vào phòng khám bác sĩ', async () => {
      const queue = await receptionService.getWaitingQueue();
      const target = queue.find((q) => q.status !== 'CHECKED_IN') || queue[0];
      const res = await receptionService.checkInPatient(target.id, 'Phòng khám Nội 1 - BS. Hùng');
      expect(res).toBeDefined();
      expect(res.status).toBe('CHECKED_IN');
      expect(res.assignedRoom).toBe('Phòng khám Nội 1 - BS. Hùng');

      // Kiểm tra lại danh sách hàng đợi
      const updatedQueue = await receptionService.getWaitingQueue();
      const updatedItem = updatedQueue.find((q) => q.id === target.id);
      expect(updatedItem.status).toBe('CHECKED_IN');
    });

    it('tạo hồ sơ bệnh nhân mới tại quầy tiếp đón', async () => {
      const newPatientData = {
        fullName: 'Trần Thị Mỹ Duyên',
        phoneNumber: '0988776655',
        dob: '1995-08-20',
        gender: 'FEMALE',
        nationalId: '001195000123',
        address: 'Huyện Lục Ngạn, Bắc Giang',
        bloodType: 'B+'
      };

      const result = await receptionService.createPatientProfile(newPatientData);
      expect(result).toBeDefined();
      expect(result.fullName).toBe('Trần Thị Mỹ Duyên');
      expect(result.patientCode).toMatch(/^BN-2026-/);
      expect(result.bloodType).toBe('B+');

      // Tự động thêm vào hàng đợi tiếp đón
      const queue = await receptionService.getWaitingQueue();
      const inQueue = queue.find((q) => q.fullName === 'Trần Thị Mỹ Duyên');
      expect(inQueue).toBeDefined();
      expect(inQueue.patientCode).toBe(result.patientCode);
    });

    it('xác nhận lịch hẹn khám của bệnh nhân đặt trước', async () => {
      const result = await receptionService.confirmAppointment(102);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('ReceptionDashboardModal Component Tests', () => {
    it('render modal tiếp đón hiển thị tiêu đề và danh sách chờ khám', async () => {
      render(
        <ToastProvider>
          <ReceptionDashboardModal isOpen={true} onClose={() => {}} />
        </ToastProvider>
      );

      expect(screen.getByText(/Quầy Tiếp Đón & Lễ Tân/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText(/Hàng Đợi Tiếp Nhận/i)).toBeInTheDocument();
      });
    });

    it('chuyển tab Tiếp Nhận Bệnh Nhân Mới', async () => {
      render(
        <ToastProvider>
          <ReceptionDashboardModal isOpen={true} onClose={() => {}} />
        </ToastProvider>
      );

      const tabCreateBtn = screen.getByText(/Tiếp Nhận Bệnh Nhân Mới/i);
      fireEvent.click(tabCreateBtn);

      expect(screen.getByText(/Tạo Hồ Sơ Bệnh Nhân/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Nguyễn Văn A')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0912345678')).toBeInTheDocument();
    });

    it('thực hiện check-in ca khám từ giao diện modal', async () => {
      render(
        <ToastProvider>
          <ReceptionDashboardModal isOpen={true} onClose={() => {}} />
        </ToastProvider>
      );

      await waitFor(() => {
        const checkInBtns = screen.getAllByText('Check-in');
        expect(checkInBtns.length).toBeGreaterThan(0);
        fireEvent.click(checkInBtns[0]);
      });

      await waitFor(() => {
        expect(screen.getAllByText(/Đã vào phòng khám/i).length).toBeGreaterThan(0);
      });
    });
  });
});
