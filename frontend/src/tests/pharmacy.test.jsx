import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: ''
}));

import api from '../services/api';
import pharmacyService from '../services/pharmacyService';
import PharmacyDispenseModal from '../components/pharmacy/PharmacyDispenseModal';
import { ToastProvider } from '../context/ToastContext';
import { ConfirmProvider } from '../components/common/ConfirmDialog';

const ok = (data) => Promise.resolve({ success: true, data, message: 'OK' });
const networkError = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
const backendError = (status, message, errorCode = 'BUSINESS_ERROR') =>
  Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { errorCode, message } }
  }));

// Ngày hạn dùng tính theo ngày chạy test để không bị lỗi thời
const isoDay = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const drugs = [
  { id: 1, code: 'DRUG-PARA-500', name: 'Paracetamol 500mg', unit: 'Viên', price: 1500, stockQuantity: 2500, expiryDate: isoDay(700) },
  { id: 9, code: 'DRUG-AMLO-5', name: 'Amlodipine 5mg', unit: 'Viên', price: 3000, stockQuantity: 1600, expiryDate: isoDay(700) },
  { id: 4, code: 'DRUG-WAR-5', name: 'Warfarin 5mg', unit: 'Viên', price: 4000, stockQuantity: 15, expiryDate: isoDay(700) },
  { id: 7, code: 'DRUG-DIAZ-5', name: 'Diazepam 5mg', unit: 'Viên', price: 5000, stockQuantity: 300, expiryDate: isoDay(20) }
];

const prescription = {
  id: 501,
  visitId: 125,
  createdAt: '2026-10-12T09:30:00',
  items: [
    { id: 1, drugId: 9, drugCode: 'DRUG-AMLO-5', drugName: 'Amlodipine 5mg', dosage: '1 viên/lần', instruction: 'Uống sáng', quantity: 30, unit: 'Viên' }
  ]
};

function routeGet(overrides = {}) {
  api.get.mockImplementation((url, config) => {
    if (overrides[url]) return overrides[url](config);
    if (url === '/drugs/all') return ok(drugs);
    if (url === '/visits/125/prescriptions') return ok([prescription]);
    if (url === '/prescriptions/501/is-dispensed') return ok(false);
    return networkError();
  });
}

describe('pharmacyService – gọi máy chủ thật (không còn kho giả lập)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('lấy danh mục thuốc từ máy chủ, hỗ trợ cả mảng lẫn dữ liệu phân trang', async () => {
    api.get.mockReturnValueOnce(ok(drugs));
    expect(await pharmacyService.getDrugs()).toEqual(drugs);
    expect(api.get).toHaveBeenCalledWith('/drugs/all', { params: undefined });

    api.get.mockReturnValueOnce(ok({ content: [drugs[0]], totalElements: 1 }));
    expect(await pharmacyService.getDrugs()).toEqual([drugs[0]]);

    api.get.mockReturnValueOnce(ok(null));
    expect(await pharmacyService.getDrugs()).toEqual([]);
  });

  it('tìm kiếm thuốc gửi từ khóa lên máy chủ thay vì lọc cục bộ', async () => {
    api.get.mockReturnValue(ok([drugs[2]]));
    const results = await pharmacyService.getDrugs('Warfarin');
    expect(api.get).toHaveBeenCalledWith('/drugs/all', { params: { keyword: 'Warfarin' } });
    expect(results).toHaveLength(1);
  });

  it('mất mạng khi tải danh mục → báo lỗi, KHÔNG trả danh sách rỗng/giả', async () => {
    api.get.mockImplementation(networkError);
    const err = await pharmacyService.getDrugs().catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/Không kết nối được máy chủ/);
    expect(err.isNetworkError).toBe(true);
    expect(localStorage.length).toBe(0);
  });

  it('lấy đơn thuốc theo ca khám; ca khám không tồn tại → lỗi tiếng Việt nêu mã ca', async () => {
    api.get.mockReturnValueOnce(ok([prescription]));
    expect(await pharmacyService.getPrescriptionsByVisit(125)).toEqual([prescription]);
    expect(api.get).toHaveBeenCalledWith('/visits/125/prescriptions');

    api.get.mockImplementationOnce(() => backendError(404, 'Visit not found', 'RESOURCE_NOT_FOUND'));
    await expect(pharmacyService.getPrescriptionsByVisit(999)).rejects.toThrow('Không tìm thấy ca khám #999.');
  });

  it('cấp phát đơn thuốc gọi đúng endpoint, kèm ghi chú nếu có, và trả kết quả từ máy chủ', async () => {
    const dispense = { id: 1, prescriptionId: 501, dispensedAt: '2026-10-12T10:00:00', dispensedByName: 'DS. Lan' };
    api.post.mockReturnValue(ok(dispense));

    expect(await pharmacyService.dispensePrescription(501, { note: 'Uống sau ăn' })).toEqual(dispense);
    expect(api.post).toHaveBeenLastCalledWith('/prescriptions/501/dispense', { note: 'Uống sau ăn' });

    await pharmacyService.dispensePrescription(501);
    expect(api.post).toHaveBeenLastCalledWith('/prescriptions/501/dispense', {});
  });

  it('chặn cấp phát lại: lỗi nghiệp vụ của máy chủ được chuyển nguyên văn', async () => {
    api.post.mockImplementation(() => backendError(400, 'Đơn thuốc #777 đã được cấp phát trước đó'));
    await expect(pharmacyService.dispensePrescription(777)).rejects.toThrow(/đã được cấp phát trước đó/);
  });

  it('không đủ tồn kho hoặc thuốc hết hạn: thông điệp máy chủ được giữ nguyên, có errorCode', async () => {
    api.post.mockImplementation(() => backendError(400, 'Thuốc Warfarin 5mg không đủ tồn kho', 'INSUFFICIENT_STOCK'));
    const err = await pharmacyService.dispensePrescription(501).catch((e) => e);
    expect(err.message).toBe('Thuốc Warfarin 5mg không đủ tồn kho');
    expect(err.errorCode).toBe('INSUFFICIENT_STOCK');
    expect(err.status).toBe(400);
  });

  it('mất mạng khi cấp phát → ném lỗi "CHƯA được lưu", không báo thành công', async () => {
    api.post.mockImplementation(networkError);
    const err = await pharmacyService.dispensePrescription(501).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/Không kết nối được máy chủ/);
    expect(err.message).toMatch(/CHƯA được lưu/);
    expect(localStorage.length).toBe(0);
  });

  it('isDispensed đọc trạng thái từ máy chủ và báo lỗi khi mất mạng', async () => {
    api.get.mockReturnValueOnce(ok(true));
    expect(await pharmacyService.isDispensed(501)).toBe(true);
    expect(api.get).toHaveBeenCalledWith('/prescriptions/501/is-dispensed');

    api.get.mockReturnValueOnce(ok(false));
    expect(await pharmacyService.isDispensed(501)).toBe(false);

    api.get.mockImplementationOnce(networkError);
    await expect(pharmacyService.isDispensed(501)).rejects.toThrow(/Không kết nối được máy chủ/);
  });

  it('chi tiết lượt cấp phát: chưa cấp phát (404) → null, lỗi khác vẫn được ném ra', async () => {
    api.get.mockImplementationOnce(() => backendError(404, 'Chưa cấp phát', 'RESOURCE_NOT_FOUND'));
    expect(await pharmacyService.getDispenseByPrescriptionId(501)).toBeNull();

    api.get.mockImplementationOnce(() => backendError(500, undefined, 'INTERNAL_ERROR'));
    await expect(pharmacyService.getDispenseByPrescriptionId(501)).rejects.toThrow(/Máy chủ đang gặp sự cố/);
  });

  it('thuốc sắp hết hàng và sắp hết hạn được lọc bởi máy chủ với đúng tham số', async () => {
    api.get.mockReturnValue(ok([drugs[2]]));
    const lowStock = await pharmacyService.getLowStockDrugs(20);
    expect(api.get).toHaveBeenLastCalledWith('/drugs/low-stock', { params: { threshold: 20 } });
    expect(lowStock[0].code).toBe('DRUG-WAR-5');

    api.get.mockReturnValue(ok([drugs[3]]));
    const expiring = await pharmacyService.getExpiringSoonDrugs(45);
    expect(api.get).toHaveBeenLastCalledWith('/drugs/expiring-soon', { params: { days: 45 } });
    expect(expiring[0].code).toBe('DRUG-DIAZ-5');

    api.get.mockImplementation(networkError);
    await expect(pharmacyService.getLowStockDrugs()).rejects.toThrow(/Không kết nối được máy chủ/);
    await expect(pharmacyService.getExpiringSoonDrugs()).rejects.toThrow(/Không kết nối được máy chủ/);
  });

  it('nhập/xuất kho gửi đúng dữ liệu và trả tồn kho do máy chủ tính', async () => {
    api.put.mockReturnValueOnce(ok({ ...drugs[0], stockQuantity: 3000 }));
    const imported = await pharmacyService.updateStock(1, { quantity: '500', adjustmentType: 'IMPORT', note: 'Nhập lô mới' });
    expect(api.put).toHaveBeenLastCalledWith('/drugs/1/stock', { quantity: 500, adjustmentType: 'IMPORT', note: 'Nhập lô mới' });
    expect(imported.stockQuantity).toBe(3000);

    api.put.mockReturnValueOnce(ok({ ...drugs[0], stockQuantity: 2800 }));
    const exported = await pharmacyService.updateStock(1, { quantity: 200, adjustmentType: 'EXPORT' });
    expect(api.put).toHaveBeenLastCalledWith('/drugs/1/stock', { quantity: 200, adjustmentType: 'EXPORT', note: undefined });
    expect(exported.stockQuantity).toBe(2800);
  });

  it('cập nhật tồn kho: số lượng không hợp lệ bị chặn trước khi gọi máy chủ', async () => {
    for (const quantity of [0, -5, 1.5, 'abc', undefined]) {
      await expect(pharmacyService.updateStock(1, { quantity, adjustmentType: 'IMPORT' }))
        .rejects.toThrow('Số lượng phải là số nguyên lớn hơn 0.');
    }
    expect(api.put).not.toHaveBeenCalled();
  });

  it('cập nhật tồn kho: xuất quá tồn (máy chủ từ chối) và mất mạng đều báo lỗi', async () => {
    api.put.mockImplementationOnce(() => backendError(400, 'Không thể xuất quá tồn kho hiện có'));
    await expect(pharmacyService.updateStock(1, { quantity: 99999, adjustmentType: 'EXPORT' }))
      .rejects.toThrow('Không thể xuất quá tồn kho hiện có');

    api.put.mockImplementationOnce(networkError);
    await expect(pharmacyService.updateStock(1, { quantity: 5, adjustmentType: 'IMPORT' }))
      .rejects.toThrow(/Không kết nối được máy chủ/);
  });

  it('thêm thuốc mới qua API và báo lỗi nghiệp vụ (trùng mã) nguyên văn', async () => {
    api.post.mockReturnValueOnce(ok({ id: 20, code: 'DRUG-NEW', name: 'Thuốc mới' }));
    const created = await pharmacyService.createDrug({ code: 'DRUG-NEW', name: 'Thuốc mới' });
    expect(api.post).toHaveBeenLastCalledWith('/drugs', { code: 'DRUG-NEW', name: 'Thuốc mới' });
    expect(created.id).toBe(20);

    api.post.mockImplementationOnce(() => backendError(409, 'Mã thuốc đã tồn tại', 'DUPLICATE_RESOURCE'));
    await expect(pharmacyService.createDrug({ code: 'DRUG-NEW' })).rejects.toThrow('Mã thuốc đã tồn tại');
  });
});

describe('PharmacyDispenseModal – giao diện nhà thuốc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    routeGet();
  });

  const renderModal = (onShowToast = vi.fn()) => {
    render(
      <ToastProvider>
        <ConfirmProvider>
          <PharmacyDispenseModal isOpen onClose={() => {}} onShowToast={onShowToast} />
        </ConfirmProvider>
      </ToastProvider>
    );
    return { onShowToast };
  };

  const lookupVisit = async (visitId = '125') => {
    fireEvent.change(screen.getByLabelText('Mã ca khám'), { target: { value: visitId } });
    fireEvent.click(screen.getByRole('button', { name: /Tra cứu/ }));
  };

  it('thêm thuốc mới: chặn dữ liệu sai ở giao diện, hợp lệ thì POST /drugs rồi tải lại kho', async () => {
    api.post.mockImplementation((url, body) => ok({ id: 77, ...body }));
    const { onShowToast } = renderModal();
    fireEvent.click(screen.getByRole('tab', { name: /Kho dược/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Thêm thuốc mới/ }));
    const form = await screen.findByRole('form', { name: 'Thêm thuốc mới' });

    fireEvent.click(within(form).getByRole('button', { name: 'Thêm thuốc' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent(/mã thuốc/);
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.change(within(form).getByLabelText(/Mã thuốc/), { target: { value: 'DRUG-NEW-1' } });
    fireEvent.change(within(form).getByLabelText(/Tên thuốc/), { target: { value: 'Cetirizine 10mg' } });
    fireEvent.change(within(form).getByLabelText(/Đơn giá/), { target: { value: '-5' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Thêm thuốc' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent(/Đơn giá/);

    fireEvent.change(within(form).getByLabelText(/Đơn giá/), { target: { value: '2500' } });
    fireEvent.change(within(form).getByLabelText(/Tồn kho ban đầu/), { target: { value: '120' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Thêm thuốc' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/drugs', {
      code: 'DRUG-NEW-1', name: 'Cetirizine 10mg', unit: null, price: 2500, stockQuantity: 120, expiryDate: null
    }));
    await waitFor(() => expect(onShowToast).toHaveBeenCalledWith(expect.stringMatching(/Đã thêm thuốc Cetirizine/), 'success'));
  });

  it('thêm thuốc trùng mã: hiện đúng thông báo của máy chủ và giữ nguyên biểu mẫu', async () => {
    api.post.mockImplementation(() => backendError(409, 'Mã thuốc đã tồn tại: DRUG-PARA-500', 'DUPLICATE_RESOURCE'));
    renderModal();
    fireEvent.click(screen.getByRole('tab', { name: /Kho dược/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Thêm thuốc mới/ }));
    const form = await screen.findByRole('form', { name: 'Thêm thuốc mới' });
    fireEvent.change(within(form).getByLabelText(/Mã thuốc/), { target: { value: 'DRUG-PARA-500' } });
    fireEvent.change(within(form).getByLabelText(/Tên thuốc/), { target: { value: 'Paracetamol' } });
    fireEvent.change(within(form).getByLabelText(/Đơn giá/), { target: { value: '1500' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Thêm thuốc' }));

    expect(await within(form).findByRole('alert')).toHaveTextContent(/Mã thuốc đã tồn tại/);
    expect(screen.getByRole('form', { name: 'Thêm thuốc mới' })).toBeInTheDocument();
  });

  it('mở modal: hiển thị hai tab và gợi ý nhập mã ca khám, KHÔNG có đơn mẫu tự nạp', async () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: /Nhà thuốc & kho dược/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Cấp phát theo đơn/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Kho dược/ })).toBeInTheDocument();
    expect(screen.getByText(/Nhập mã ca khám để tra cứu đơn thuốc cần cấp phát/)).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn A')).not.toBeInTheDocument();
    expect(screen.queryByText(/Amlodipine 5mg/)).not.toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/drugs/all', { params: undefined }));
  });

  it('mã ca khám không phải số → báo lỗi tại chỗ và không gọi máy chủ', async () => {
    renderModal();
    await lookupVisit('abc');
    expect(await screen.findByText('Mã ca khám chỉ gồm chữ số (VD: 125).')).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith(expect.stringMatching(/\/visits\//));
  });

  it('tra cứu theo mã ca khám: hiển thị đơn thuốc thật và đối chiếu tồn kho', async () => {
    renderModal();
    await lookupVisit();

    expect(await screen.findByRole('heading', { name: 'Đơn thuốc #501' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/visits/125/prescriptions');
    expect(api.get).toHaveBeenCalledWith('/prescriptions/501/is-dispensed');
    expect(screen.getByText('Amlodipine 5mg')).toBeInTheDocument();
    expect(screen.getByText('Chờ cấp phát')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Đủ (còn 1600)')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Cấp phát & trừ kho/ })).toBeEnabled();
  });

  it('ca khám không tồn tại → hiển thị lỗi, không dựng đơn thuốc giả', async () => {
    routeGet({ '/visits/999/prescriptions': () => backendError(404, 'Visit not found', 'RESOURCE_NOT_FOUND') });
    renderModal();
    await lookupVisit('999');
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy ca khám #999.');
    expect(screen.queryByRole('heading', { name: /Đơn thuốc #/ })).not.toBeInTheDocument();
  });

  it('ca khám chưa có đơn thuốc → thông báo rõ ràng', async () => {
    routeGet({ '/visits/130/prescriptions': () => ok([]) });
    renderModal();
    await lookupVisit('130');
    expect(await screen.findByText(/Ca khám #130 chưa có đơn thuốc nào/)).toBeInTheDocument();
  });

  it('cấp phát thành công: xác nhận → gọi máy chủ kèm ghi chú → báo thành công và tải lại kho', async () => {
    api.post.mockReturnValue(ok({ id: 1, prescriptionId: 501, dispensedAt: '2026-10-12T10:00:00', dispensedByName: 'DS. Lan' }));
    const { onShowToast } = renderModal();
    await lookupVisit();
    await screen.findByRole('heading', { name: 'Đơn thuốc #501' });
    await waitFor(() => expect(screen.getByText('Đủ (còn 1600)')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Ghi chú cấp phát/), { target: { value: 'Uống sau ăn' } });
    const driveCallsBefore = api.get.mock.calls.filter(([u]) => u === '/drugs/all').length;
    fireEvent.click(screen.getByRole('button', { name: /Cấp phát & trừ kho/ }));

    const confirmDialog = await screen.findByRole('dialog', { name: /Cấp phát đơn thuốc #501\?/ });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Cấp phát & trừ kho' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/prescriptions/501/dispense', { note: 'Uống sau ăn' }));
    await waitFor(() => expect(onShowToast).toHaveBeenCalledWith('Đã cấp phát đơn thuốc #501.', 'success'));
    expect(await screen.findByText(/Đã cấp phát lúc .* bởi DS\. Lan/)).toBeInTheDocument();
    expect(screen.getByText('Đã cấp phát', { selector: '.badge' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Đã cấp phát$/ })).toBeDisabled();
    // kho được tải lại để phản ánh số lượng máy chủ vừa trừ
    await waitFor(() => expect(api.get.mock.calls.filter(([u]) => u === '/drugs/all').length).toBeGreaterThan(driveCallsBefore));
  });

  it('hủy ở hộp xác nhận → không gọi máy chủ, không trừ kho', async () => {
    renderModal();
    await lookupVisit();
    await screen.findByRole('heading', { name: 'Đơn thuốc #501' });
    fireEvent.click(screen.getByRole('button', { name: /Cấp phát & trừ kho/ }));

    const confirmDialog = await screen.findByRole('dialog', { name: /Cấp phát đơn thuốc #501\?/ });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Quay lại' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Cấp phát đơn thuốc #501\?/ })).not.toBeInTheDocument());
    expect(api.post).not.toHaveBeenCalled();
  });

  it('mất mạng khi cấp phát: báo lỗi, đơn vẫn "Chờ cấp phát", KHÔNG báo thành công', async () => {
    api.post.mockImplementation(networkError);
    const { onShowToast } = renderModal();
    await lookupVisit();
    await screen.findByRole('heading', { name: 'Đơn thuốc #501' });
    fireEvent.click(screen.getByRole('button', { name: /Cấp phát & trừ kho/ }));
    const confirmDialog = await screen.findByRole('dialog', { name: /Cấp phát đơn thuốc #501\?/ });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Cấp phát & trừ kho' }));

    await waitFor(() => expect(onShowToast).toHaveBeenCalledWith(expect.stringMatching(/Không kết nối được máy chủ/), 'error'));
    expect(onShowToast).not.toHaveBeenCalledWith(expect.stringMatching(/Đã cấp phát/), 'success');
    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((a) => /CHƯA được lưu/.test(a.textContent))).toBe(true);
    expect(screen.getByText('Chờ cấp phát')).toBeInTheDocument();
    expect(screen.queryByText(/Đã cấp phát lúc/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cấp phát & trừ kho/ })).toBeEnabled();
  });

  it('lỗi nghiệp vụ từ máy chủ khi cấp phát (ca khám chưa hoàn tất) được hiển thị nguyên văn', async () => {
    api.post.mockImplementation(() => backendError(400, 'Ca khám chưa hoàn tất, chưa thể cấp phát thuốc'));
    const { onShowToast } = renderModal();
    await lookupVisit();
    await screen.findByRole('heading', { name: 'Đơn thuốc #501' });
    fireEvent.click(screen.getByRole('button', { name: /Cấp phát & trừ kho/ }));
    const confirmDialog = await screen.findByRole('dialog', { name: /Cấp phát đơn thuốc #501\?/ });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Cấp phát & trừ kho' }));

    await waitFor(() => expect(onShowToast).toHaveBeenCalledWith('Ca khám chưa hoàn tất, chưa thể cấp phát thuốc', 'error'));
    expect(screen.getByText('Chờ cấp phát')).toBeInTheDocument();
  });

  it('thuốc trong đơn không đủ tồn kho → khóa nút cấp phát và giải thích', async () => {
    const shortage = { ...prescription, items: [{ ...prescription.items[0], drugId: 4, drugCode: 'DRUG-WAR-5', drugName: 'Warfarin 5mg', quantity: 30 }] };
    routeGet({ '/visits/125/prescriptions': () => ok([shortage]) });
    renderModal();
    await lookupVisit();
    await screen.findByRole('heading', { name: 'Đơn thuốc #501' });

    expect(await screen.findByText(/Không đủ – còn 15 Viên/)).toBeInTheDocument();
    expect(screen.getByText(/Không thể cấp phát: 1 thuốc hết hạn hoặc không đủ tồn kho/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cấp phát & trừ kho/ })).toBeDisabled();
  });

  it('đơn đã cấp phát trước đó → hiển thị trạng thái và khóa nút cấp phát', async () => {
    routeGet({ '/prescriptions/501/is-dispensed': () => ok(true) });
    renderModal();
    await lookupVisit();
    await screen.findByRole('heading', { name: 'Đơn thuốc #501' });
    expect(screen.getByRole('button', { name: /^Đã cấp phát$/ })).toBeDisabled();
    expect(screen.queryByLabelText(/Ghi chú cấp phát/)).not.toBeInTheDocument();
  });

  it('không kiểm tra được trạng thái cấp phát → hiển thị "Chưa rõ trạng thái" thay vì đoán', async () => {
    routeGet({ '/prescriptions/501/is-dispensed': networkError });
    renderModal();
    await lookupVisit();
    await screen.findByRole('heading', { name: 'Đơn thuốc #501' });
    expect(screen.getByText('Chưa rõ trạng thái cấp phát')).toBeInTheDocument();
  });

  describe('tab Kho dược', () => {
    const openInventory = async () => {
      renderModal();
      fireEvent.click(screen.getByRole('tab', { name: /Kho dược/ }));
      await screen.findByText('Paracetamol 500mg', { exact: false });
    };

    it('hiển thị danh mục từ máy chủ và cảnh báo thuốc tồn thấp / sắp hết hạn', async () => {
      await openInventory();
      expect(screen.getByRole('button', { name: 'Tất cả (4)' })).toBeInTheDocument();
      expect(screen.getByText('DRUG-WAR-5')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Nhập/xuất kho' })).toHaveLength(4);
      expect(screen.getByText('Còn 20 ngày')).toBeInTheDocument();
    });

    it('bộ lọc "Sắp hết hàng" chỉ giữ thuốc tồn ≤ 20; "Hết hạn / sắp hết hạn" chỉ giữ thuốc gần hạn', async () => {
      await openInventory();
      fireEvent.click(screen.getByRole('button', { name: /Sắp hết hàng/ }));
      expect(screen.getByText('DRUG-WAR-5')).toBeInTheDocument();
      expect(screen.queryByText('DRUG-PARA-500')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Hết hạn \/ sắp hết hạn/ }));
      expect(screen.getByText('DRUG-DIAZ-5')).toBeInTheDocument();
      expect(screen.queryByText('DRUG-WAR-5')).not.toBeInTheDocument();
    });

    it('không tải được kho → báo lỗi + nút Thử lại, không hiển thị danh mục giả', async () => {
      routeGet({ '/drugs/all': networkError });
      renderModal();
      fireEvent.click(screen.getByRole('tab', { name: /Kho dược/ }));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/Không kết nối được máy chủ/);
      expect(screen.queryByText('DRUG-PARA-500')).not.toBeInTheDocument();

      routeGet();
      fireEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }));
      expect(await screen.findByText('DRUG-PARA-500')).toBeInTheDocument();
    });

    it('nhập kho: gửi đúng dữ liệu lên máy chủ, báo thành công và tải lại kho', async () => {
      api.put.mockReturnValue(ok({ ...drugs[0], stockQuantity: 3000 }));
      const onShowToast = vi.fn();
      renderModal(onShowToast);
      fireEvent.click(screen.getByRole('tab', { name: /Kho dược/ }));
      await screen.findByText('DRUG-PARA-500');

      const row = screen.getByText('DRUG-PARA-500').closest('tr');
      fireEvent.click(within(row).getByRole('button', { name: 'Nhập/xuất kho' }));
      const dialog = await screen.findByRole('dialog', { name: /Điều chỉnh tồn kho/ });
      fireEvent.change(within(dialog).getByLabelText(/Số lượng/), { target: { value: '500' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));

      await waitFor(() => expect(api.put).toHaveBeenCalledWith('/drugs/1/stock', {
        quantity: 500, adjustmentType: 'IMPORT', note: 'Điều chỉnh tại quầy nhà thuốc'
      }));
      await waitFor(() => expect(onShowToast).toHaveBeenCalledWith('Đã cập nhật tồn kho Paracetamol 500mg.', 'success'));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: /Điều chỉnh tồn kho/ })).not.toBeInTheDocument());
    });

    it('xuất kho quá tồn hiện có bị chặn ngay trên giao diện, không gọi máy chủ', async () => {
      await openInventory();
      const row = screen.getByText('DRUG-WAR-5').closest('tr');
      fireEvent.click(within(row).getByRole('button', { name: 'Nhập/xuất kho' }));
      const dialog = await screen.findByRole('dialog', { name: /Điều chỉnh tồn kho/ });
      fireEvent.change(within(dialog).getByLabelText('Loại điều chỉnh'), { target: { value: 'EXPORT' } });
      fireEvent.change(within(dialog).getByLabelText(/Số lượng/), { target: { value: '100' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));

      expect(await within(dialog).findByText('Không thể xuất quá tồn kho hiện có (15).')).toBeInTheDocument();
      expect(api.put).not.toHaveBeenCalled();
    });

    it('mất mạng khi lưu tồn kho: hộp thoại giữ nguyên và hiển thị lỗi, không báo thành công', async () => {
      api.put.mockImplementation(networkError);
      const onShowToast = vi.fn();
      renderModal(onShowToast);
      fireEvent.click(screen.getByRole('tab', { name: /Kho dược/ }));
      await screen.findByText('DRUG-PARA-500');

      const row = screen.getByText('DRUG-PARA-500').closest('tr');
      fireEvent.click(within(row).getByRole('button', { name: 'Nhập/xuất kho' }));
      const dialog = await screen.findByRole('dialog', { name: /Điều chỉnh tồn kho/ });
      fireEvent.change(within(dialog).getByLabelText(/Số lượng/), { target: { value: '10' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Không kết nối được máy chủ/);
      expect(screen.getByRole('dialog', { name: /Điều chỉnh tồn kho/ })).toBeInTheDocument();
      expect(onShowToast).not.toHaveBeenCalledWith(expect.stringMatching(/Đã cập nhật tồn kho/), 'success');
    });
  });
});
