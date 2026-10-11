import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: ''
}));

const showToast = vi.fn();
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ showToast }) }));
const mockUser = { id: 1, username: 'benhnhan', role: 'PATIENT' };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
}));

import api from '../services/api';
import { patientService, validatePatientProfile } from '../services/patientService';
import { NETWORK_ERROR_MESSAGE } from '../services/apiError';
import PatientProfileModal from '../components/modals/PatientProfileModal';
import AllergiesSection from '../components/modals/AllergiesSection';

const ok = (data) => Promise.resolve({ success: true, data, message: 'OK' });
const networkError = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
const backendError = (status, message, errorCode = 'BUSINESS_ERROR') =>
  Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { errorCode, message } }
  }));

const profile = {
  id: 1,
  patientCode: 'BN-261012-001',
  fullName: 'Trần Đức Minh',
  dob: '1990-05-01',
  gender: 'MALE',
  nationalId: '012345678901',
  phone: '0912345678',
  address: 'Hà Nội',
  bloodType: 'O+',
  insuranceNumber: 'GD4010123456789',
  insuranceValidFrom: '2026-01-01',
  insuranceValidTo: '2099-12-31'
};
const allergies = [
  { id: 11, allergen: 'Penicillin', severity: 'SEVERE', note: 'Nổi mề đay' },
  { id: 12, allergen: 'Hải sản', severity: 'MILD' }
];

function routeGet(overrides = {}) {
  api.get.mockImplementation((url) => {
    if (overrides[url]) return overrides[url]();
    if (url === '/patients/me') return ok(profile);
    if (url === '/patients/1/allergies') return ok(allergies);
    return networkError();
  });
}

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

describe('patientService (gọi API thật, không còn dữ liệu giả)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('lấy hồ sơ của tôi từ máy chủ', async () => {
    routeGet();
    const p = await patientService.getMyProfile();
    expect(api.get).toHaveBeenCalledWith('/patients/me');
    expect(p.fullName).toBe('Trần Đức Minh');
    expect(p.bloodType).toBe('O+');
  });

  it('mất mạng khi tải hồ sơ → ném lỗi, KHÔNG trả hồ sơ mặc định', async () => {
    api.get.mockImplementation(networkError);
    await expect(patientService.getMyProfile()).rejects.toThrow(NETWORK_ERROR_MESSAGE);
    expect(localStorage.length).toBe(0);
  });

  it('cập nhật hồ sơ: gửi PUT /patients/me, chuẩn hóa dữ liệu và KHÔNG gửi thông tin thẻ BHYT', async () => {
    api.put.mockReturnValue(ok({ ...profile, address: 'Hà Nội', bloodType: 'A-' }));
    const updated = await patientService.updateMyProfile({
      fullName: ' Trần Đức Minh ', phone: '0912 345.678', address: '', bloodType: 'A-',
      insuranceNumber: 'GD4010123456789', unknownField: 'x'
    });
    expect(api.put).toHaveBeenCalledWith('/patients/me', {
      fullName: 'Trần Đức Minh', phone: '0912345678', address: null, bloodType: 'A-'
    });
    expect(updated.bloodType).toBe('A-');
  });

  it('mất mạng khi cập nhật hồ sơ → ném lỗi, không ghi cục bộ', async () => {
    api.put.mockImplementation(networkError);
    await expect(patientService.updateMyProfile({ address: 'Hà Nội' })).rejects.toThrow(NETWORK_ERROR_MESSAGE);
    expect(localStorage.length).toBe(0);
  });

  it('lỗi kiểm tra từ máy chủ được chuyển nguyên văn', async () => {
    api.put.mockImplementation(() => backendError(400, 'Số điện thoại đã được dùng cho hồ sơ khác'));
    await expect(patientService.updateMyProfile({ phone: '0912345678' })).rejects.toThrow(/đã được dùng/);
  });

  it('lấy danh sách dị ứng từ máy chủ', async () => {
    routeGet();
    const list = await patientService.getAllergies(1);
    expect(api.get).toHaveBeenCalledWith('/patients/1/allergies');
    expect(list.map((a) => a.allergen)).toEqual(['Penicillin', 'Hải sản']);
  });

  it('không tải được dị ứng → ném lỗi, KHÔNG trả danh sách mẫu (dữ liệu an toàn người bệnh)', async () => {
    api.get.mockImplementation(networkError);
    await expect(patientService.getAllergies(1)).rejects.toThrow(NETWORK_ERROR_MESSAGE);
    await expect(patientService.getAllergies(undefined)).rejects.toThrow(/Thiếu mã bệnh nhân/);
  });

  it('thêm dị ứng: gửi POST với mức độ mặc định MILD và trả dữ liệu máy chủ', async () => {
    api.post.mockReturnValue(ok({ id: 13, allergen: 'Aspirin', severity: 'SEVERE' }));
    const added = await patientService.addAllergy(1, { allergen: ' Aspirin ', severity: 'SEVERE' });
    expect(api.post).toHaveBeenCalledWith('/patients/1/allergies', { allergen: 'Aspirin', severity: 'SEVERE', note: undefined });
    expect(added.id).toBe(13);

    await patientService.addAllergy(1, { allergen: 'Bụi' });
    expect(api.post).toHaveBeenLastCalledWith('/patients/1/allergies', { allergen: 'Bụi', severity: 'MILD', note: undefined });
  });

  it('mất mạng khi thêm dị ứng → ném lỗi, không báo thành công', async () => {
    api.post.mockImplementation(networkError);
    await expect(patientService.addAllergy(1, { allergen: 'Aspirin' })).rejects.toThrow(NETWORK_ERROR_MESSAGE);
  });

  it('xóa dị ứng: gửi DELETE đúng đường dẫn; lỗi mạng → ném lỗi', async () => {
    api.delete.mockReturnValue(ok(null));
    await expect(patientService.deleteAllergy(1, 11)).resolves.toBe(true);
    expect(api.delete).toHaveBeenCalledWith('/patients/1/allergies/11');

    api.delete.mockImplementation(networkError);
    await expect(patientService.deleteAllergy(1, 11)).rejects.toThrow(NETWORK_ERROR_MESSAGE);
  });
});

describe('PatientProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    routeGet();
  });

  const openAndEdit = async () => {
    render(<PatientProfileModal isOpen onClose={() => {}} />);
    await screen.findByText('Trần Đức Minh');
    fireEvent.click(screen.getByText('Chỉnh sửa'));
  };

  it('hiển thị hồ sơ và danh sách dị ứng lấy từ máy chủ', async () => {
    render(<PatientProfileModal isOpen onClose={() => {}} />);
    expect(await screen.findByText('Trần Đức Minh')).toBeInTheDocument();
    expect(await screen.findByText('Penicillin')).toBeInTheDocument();
    expect(screen.getByText('Hải sản')).toBeInTheDocument();
    expect(screen.getByText('GD4010123456789')).toBeInTheDocument();
  });

  it('không tải được hồ sơ → hiển thị lỗi và nút Thử lại, không có hồ sơ giả', async () => {
    routeGet({ '/patients/me': networkError });
    render(<PatientProfileModal isOpen onClose={() => {}} />);
    expect(await screen.findByText(/Không kết nối được máy chủ/)).toBeInTheDocument();
    expect(screen.queryByText('Trần Đức Minh')).not.toBeInTheDocument();

    routeGet();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Trần Đức Minh')).toBeInTheDocument();
  });

  it('không tải được dị ứng → báo lỗi + Thử lại, KHÔNG hiển thị "chưa ghi nhận dị ứng"', async () => {
    routeGet({ '/patients/1/allergies': networkError });
    render(<PatientProfileModal isOpen onClose={() => {}} />);
    await screen.findByText('Trần Đức Minh');
    expect(await screen.findByText(/Không kết nối được máy chủ/)).toBeInTheDocument();
    expect(screen.queryByText('Chưa ghi nhận dị ứng nào.')).not.toBeInTheDocument();
    expect(screen.queryByText('Penicillin')).not.toBeInTheDocument();
  });

  it('chặn lưu khi SĐT sai và hiển thị lỗi, không gọi máy chủ', async () => {
    await openAndEdit();
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByText('Lưu'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Số điện thoại không hợp lệ');
    expect(api.put).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalledWith(expect.anything(), 'success');
  });

  it('lưu thành công khi dữ liệu hợp lệ: gửi lên máy chủ rồi mới báo thành công', async () => {
    api.put.mockReturnValue(ok({ ...profile, phone: '0987654321' }));
    await openAndEdit();
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0987654321' } });
    fireEvent.click(screen.getByText('Lưu'));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Cập nhật hồ sơ thành công!', 'success'));
    expect(api.put).toHaveBeenCalledWith('/patients/me', expect.objectContaining({ phone: '0987654321', fullName: 'Trần Đức Minh' }));
    expect(await screen.findByText('0987654321')).toBeInTheDocument();
  });

  it('lỗi mạng khi lưu: hiển thị lỗi, KHÔNG báo thành công và giữ chế độ chỉnh sửa', async () => {
    api.put.mockImplementation(networkError);
    await openAndEdit();
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0987654321' } });
    fireEvent.click(screen.getByText('Lưu'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Không kết nối được máy chủ/);
    expect(showToast).toHaveBeenCalledWith(NETWORK_ERROR_MESSAGE, 'error');
    expect(showToast).not.toHaveBeenCalledWith(expect.anything(), 'success');
    expect(screen.getByLabelText('Số điện thoại')).toHaveValue('0987654321');
  });

  it('thêm dị ứng: gọi máy chủ rồi hiển thị mục mới', async () => {
    api.post.mockReturnValue(ok({ id: 13, allergen: 'Aspirin', severity: 'SEVERE' }));
    render(<PatientProfileModal isOpen onClose={() => {}} />);
    await screen.findByText('Penicillin');
    fireEvent.click(screen.getByRole('button', { name: /Thêm$/ }));
    fireEvent.change(screen.getByLabelText(/Chất gây dị ứng/), { target: { value: 'Aspirin' } });
    fireEvent.change(screen.getByLabelText('Mức độ'), { target: { value: 'SEVERE' } });
    fireEvent.click(screen.getByRole('button', { name: /Thêm dị ứng/ }));

    expect(await screen.findByText('Aspirin')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/patients/1/allergies', { allergen: 'Aspirin', severity: 'SEVERE', note: undefined });
  });

  it('lỗi mạng khi thêm dị ứng: báo lỗi, KHÔNG thêm vào danh sách', async () => {
    api.post.mockImplementation(networkError);
    render(<PatientProfileModal isOpen onClose={() => {}} />);
    await screen.findByText('Penicillin');
    fireEvent.click(screen.getByRole('button', { name: /Thêm$/ }));
    fireEvent.change(screen.getByLabelText(/Chất gây dị ứng/), { target: { value: 'Aspirin' } });
    fireEvent.click(screen.getByRole('button', { name: /Thêm dị ứng/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Không kết nối được máy chủ/);
    expect(screen.queryByText('Aspirin')).not.toBeInTheDocument();
    expect(showToast).not.toHaveBeenCalledWith(expect.anything(), 'success');
  });

  it('bệnh nhân không thấy nút xóa dị ứng (chỉ bác sĩ/điều dưỡng được xóa; máy chủ trả 403 cho bệnh nhân)', async () => {
    render(<PatientProfileModal isOpen onClose={() => {}} />);
    await screen.findByText('Penicillin');
    expect(screen.queryByRole('button', { name: /Xóa dị ứng/ })).not.toBeInTheDocument();
  });

  it('xóa dị ứng: sau xác nhận gọi máy chủ rồi gỡ khỏi danh sách', async () => {
    api.delete.mockReturnValue(ok(null));
    render(<AllergiesSection patientId={1} canDelete />);
    await screen.findByText('Penicillin');
    fireEvent.click(screen.getByRole('button', { name: 'Xóa dị ứng Penicillin' }));

    await waitFor(() => expect(screen.queryByText('Penicillin')).not.toBeInTheDocument());
    expect(api.delete).toHaveBeenCalledWith('/patients/1/allergies/11');
    expect(screen.getByText('Hải sản')).toBeInTheDocument();
  });

  it('lỗi mạng khi xóa dị ứng: dị ứng VẪN hiển thị và báo lỗi', async () => {
    api.delete.mockImplementation(networkError);
    render(<AllergiesSection patientId={1} canDelete />);
    await screen.findByText('Penicillin');
    fireEvent.click(screen.getByRole('button', { name: 'Xóa dị ứng Penicillin' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(NETWORK_ERROR_MESSAGE, 'error'));
    expect(screen.getByText('Penicillin')).toBeInTheDocument();
  });
});
