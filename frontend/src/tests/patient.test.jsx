import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockRejectedValue(new Error('offline')),
    put: vi.fn().mockRejectedValue(new Error('offline')),
    post: vi.fn().mockRejectedValue(new Error('offline')),
    delete: vi.fn().mockRejectedValue(new Error('offline'))
  }
}));

const showToast = vi.fn();
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ showToast }) }));
const mockUser = { id: 1, username: 'benhnhan', role: 'PATIENT' };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
}));

import { patientService, validatePatientProfile } from '../services/patientService';
import PatientProfileModal from '../components/modals/PatientProfileModal';

describe('Sprint 2 – Hồ sơ bệnh nhân & dị ứng', () => {
  beforeEach(() => {
    localStorage.clear();
    showToast.mockClear();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  describe('validatePatientProfile', () => {
    it('hồ sơ hợp lệ → không có lỗi', () => {
      expect(validatePatientProfile({
        fullName: 'Nguyễn Văn A', phone: '0901234567', bloodType: 'O+', dob: '1990-01-01'
      })).toEqual({});
    });

    it('thiếu họ tên → báo lỗi', () => {
      expect(validatePatientProfile({ fullName: '  ' }).fullName).toBeDefined();
    });

    it('SĐT sai định dạng → báo lỗi', () => {
      expect(validatePatientProfile({ fullName: 'A', phone: '12345' }).phone).toBeDefined();
    });

    it('nhóm máu không hợp lệ → báo lỗi', () => {
      expect(validatePatientProfile({ fullName: 'A', bloodType: 'Z+' }).bloodType).toBeDefined();
    });

    it('ngày sinh ở tương lai → báo lỗi', () => {
      expect(validatePatientProfile({ fullName: 'A', dob: '2999-01-01' }).dob).toBeDefined();
    });
  });

  describe('patientService (offline fallback)', () => {
    it('lấy hồ sơ mặc định có nhóm máu', async () => {
      const profile = await patientService.getMyProfile();
      expect(profile.fullName).toBeTruthy();
      expect(profile.bloodType).toBe('O+');
    });

    it('cập nhật hồ sơ được lưu và đọc lại', async () => {
      await patientService.updateMyProfile({ address: 'Hà Nội', bloodType: 'A-' });
      const profile = await patientService.getMyProfile();
      expect(profile.address).toBe('Hà Nội');
      expect(profile.bloodType).toBe('A-');
    });

    it('thêm dị ứng mới', async () => {
      const before = await patientService.getAllergies(1);
      const added = await patientService.addAllergy(1, { allergen: 'Aspirin', severity: 'SEVERE' });
      const after = await patientService.getAllergies(1);
      expect(added.allergen).toBe('Aspirin');
      expect(after.length).toBe(before.length + 1);
    });

    it('xóa dị ứng', async () => {
      const [first] = await patientService.getAllergies(1);
      await patientService.deleteAllergy(1, first.id);
      const after = await patientService.getAllergies(1);
      expect(after.find(a => a.id === first.id)).toBeUndefined();
    });
  });

  describe('PatientProfileModal', () => {
    it('hiển thị hồ sơ và danh sách dị ứng', async () => {
      render(<PatientProfileModal isOpen onClose={() => {}} />);
      expect(await screen.findByText('Trần Đức Minh')).toBeInTheDocument();
      expect(await screen.findByText('Penicillin')).toBeInTheDocument();
    });

    it('chặn lưu khi SĐT sai và hiển thị lỗi', async () => {
      render(<PatientProfileModal isOpen onClose={() => {}} />);
      await screen.findByText('Trần Đức Minh');
      fireEvent.click(screen.getByText('Chỉnh sửa'));
      const phoneInput = screen.getByDisplayValue('0912345678');
      fireEvent.change(phoneInput, { target: { value: 'abc' } });
      fireEvent.click(screen.getByText('Lưu'));
      expect(await screen.findByRole('alert')).toHaveTextContent('Số điện thoại không hợp lệ');
      expect(JSON.parse(localStorage.getItem('hms_patient_profile')).phone).toBe('0912345678');
    });

    it('lưu thành công khi dữ liệu hợp lệ', async () => {
      render(<PatientProfileModal isOpen onClose={() => {}} />);
      await screen.findByText('Trần Đức Minh');
      fireEvent.click(screen.getByText('Chỉnh sửa'));
      fireEvent.change(screen.getByDisplayValue('0912345678'), { target: { value: '0987654321' } });
      fireEvent.click(screen.getByText('Lưu'));
      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith('Cập nhật hồ sơ thành công!', 'success');
      });
    });
  });
});
