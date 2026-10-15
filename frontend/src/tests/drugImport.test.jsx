import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: ''
}));

import api from '../services/api';
import pharmacyService from '../services/pharmacyService';
import ImportDrugsDialog from '../components/pharmacy/ImportDrugsDialog';

const ok = (data) => Promise.resolve({ success: true, data, message: 'OK' });
const backendError = (status, message, errorCode = 'BUSINESS_ERROR') =>
  Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { errorCode, message } }
  }));

const xlsx = () => new File(['fake'], 'thuoc.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
});

const previewRows = [
  { rowNumber: 2, code: 'AMOX-250', name: 'Amoxicillin 250mg', unit: 'Viên', price: 3000, quantity: 100, expiryDate: '2027-12-31', status: 'NEW', errors: [] },
  {
    rowNumber: 3, code: 'DRUG-PARA-500', name: null, unit: null, price: 1800, quantity: 50, expiryDate: null, status: 'EXISTS', errors: [],
    existing: { id: 1, code: 'DRUG-PARA-500', name: 'Paracetamol 500mg', unit: 'Viên', price: 1500, stockQuantity: 2500 }
  },
  { rowNumber: 4, code: 'B1', name: null, unit: null, price: null, quantity: 5, expiryDate: null, status: 'INVALID', errors: ['Thiếu tên thuốc', 'Thiếu giá'] }
];

describe('pharmacyService – nhập thuốc từ Excel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('xem trước: gửi file dạng multipart với thời gian chờ dài, trả về danh sách dòng', async () => {
    api.post.mockReturnValueOnce(ok(previewRows));
    const file = xlsx();

    const rows = await pharmacyService.previewDrugImport(file);

    expect(rows).toEqual(previewRows);
    const [url, body, config] = api.post.mock.calls[0];
    expect(url).toBe('/drugs/import/preview');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBe(file);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(config.timeout).toBeGreaterThanOrEqual(30000);
  });

  it('xem trước: lỗi máy chủ (file sai định dạng) được báo nguyên văn', async () => {
    api.post.mockImplementationOnce(() => backendError(400, 'File không đúng định dạng Excel (.xlsx)'));
    await expect(pharmacyService.previewDrugImport(xlsx())).rejects.toThrow('File không đúng định dạng Excel (.xlsx)');
  });

  it('nhập: gửi danh sách dòng đã chọn, trả về kết quả', async () => {
    api.post.mockReturnValueOnce(ok({ created: 1, restocked: 1 }));
    const items = [{ rowNumber: 2, code: 'A1', action: 'CREATE' }];

    const result = await pharmacyService.importDrugs(items);

    expect(result).toEqual({ created: 1, restocked: 1 });
    expect(api.post).toHaveBeenCalledWith('/drugs/import', { items }, expect.objectContaining({ timeout: 30000 }));
  });

  it('tải file mẫu dạng blob', async () => {
    const blob = new Blob(['x']);
    api.get.mockResolvedValueOnce(blob);

    await expect(pharmacyService.downloadDrugImportTemplate()).resolves.toBe(blob);
    expect(api.get).toHaveBeenCalledWith('/drugs/import/template', expect.objectContaining({ responseType: 'blob' }));
  });
});

describe('ImportDrugsDialog – hộp thoại nhập thuốc từ Excel', () => {
  beforeEach(() => vi.clearAllMocks());

  const renderDialog = () => {
    const onImported = vi.fn();
    const onClose = vi.fn();
    render(<ImportDrugsDialog isOpen onClose={onClose} onImported={onImported} />);
    return { onImported, onClose };
  };

  const choosePreviewFile = async () => {
    api.post.mockReturnValueOnce(ok(previewRows));
    fireEvent.change(screen.getByLabelText('Chọn file Excel'), { target: { files: [xlsx()] } });
    return screen.findByRole('table', { name: 'Xem trước dữ liệu nhập' });
  };

  it('chọn file → xem trước từng dòng với trạng thái, lý do lỗi và tồn kho hiện có', async () => {
    renderDialog();
    const table = await choosePreviewFile();

    expect(screen.getByText(/3 dòng · 1 mới · 1 đã tồn tại · 1 lỗi/)).toBeInTheDocument();
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('AMOX-250');
    expect(rows[0]).toHaveTextContent('Mới');
    expect(rows[1]).toHaveTextContent('Đã tồn tại');
    expect(rows[1]).toHaveTextContent('Paracetamol 500mg');
    expect(rows[1]).toHaveTextContent(/Tồn hiện tại:\s*2\.500/);
    expect(rows[2]).toHaveTextContent('Thiếu tên thuốc; Thiếu giá');

    expect(screen.getByLabelText('Nhập tiếp dòng 3')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Nhập 1 thuốc' })).toBeEnabled();
  });

  it('chọn "Nhập tiếp" từng dòng hoặc tất cả → số thuốc cần nhập thay đổi theo', async () => {
    renderDialog();
    await choosePreviewFile();

    fireEvent.click(screen.getByLabelText('Nhập tiếp dòng 3'));
    expect(screen.getByRole('button', { name: 'Nhập 2 thuốc' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua tất cả' }));
    expect(screen.getByLabelText('Nhập tiếp dòng 3')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Nhập 1 thuốc' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nhập tiếp tất cả' }));
    expect(screen.getByLabelText('Nhập tiếp dòng 3')).toBeChecked();
  });

  it('xác nhận → gửi CREATE cho dòng mới, RESTOCK cho dòng đã tích, bỏ dòng lỗi; báo kết quả', async () => {
    const { onImported } = renderDialog();
    await choosePreviewFile();
    fireEvent.click(screen.getByLabelText('Nhập tiếp dòng 3'));

    api.post.mockReturnValueOnce(ok({ created: 1, restocked: 1 }));
    fireEvent.click(screen.getByRole('button', { name: 'Nhập 2 thuốc' }));

    await waitFor(() => expect(onImported).toHaveBeenCalledWith({ created: 1, restocked: 1, skipped: 1 }));
    expect(api.post).toHaveBeenLastCalledWith('/drugs/import', {
      items: [
        { rowNumber: 2, code: 'AMOX-250', name: 'Amoxicillin 250mg', unit: 'Viên', price: 3000, quantity: 100, expiryDate: '2027-12-31', action: 'CREATE' },
        { rowNumber: 3, code: 'DRUG-PARA-500', name: null, unit: null, price: 1800, quantity: 50, expiryDate: null, action: 'RESTOCK' }
      ]
    }, expect.anything());
  });

  it('máy chủ từ chối khi nhập → hiện lỗi, giữ nguyên bảng xem trước', async () => {
    const { onImported } = renderDialog();
    await choosePreviewFile();

    api.post.mockImplementationOnce(() => backendError(400, 'Dòng 2: mã thuốc AMOX-250 đã tồn tại. Vui lòng xem trước lại file.'));
    fireEvent.click(screen.getByRole('button', { name: 'Nhập 1 thuốc' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Dòng 2: mã thuốc AMOX-250 đã tồn tại');
    expect(screen.getByRole('table', { name: 'Xem trước dữ liệu nhập' })).toBeInTheDocument();
    expect(onImported).not.toHaveBeenCalled();
  });

  it('không còn dòng nào để nhập → nút nhập bị khóa', async () => {
    renderDialog();
    api.post.mockReturnValueOnce(ok([previewRows[1], previewRows[2]]));
    fireEvent.change(screen.getByLabelText('Chọn file Excel'), { target: { files: [xlsx()] } });

    expect(await screen.findByRole('button', { name: 'Nhập 0 thuốc' })).toBeDisabled();
  });

  it('file sai định dạng → hiện lỗi của máy chủ, vẫn ở bước chọn file', async () => {
    renderDialog();
    api.post.mockImplementationOnce(() => backendError(400, 'File thiếu cột bắt buộc: Giá, Số lượng'));
    fireEvent.change(screen.getByLabelText('Chọn file Excel'), { target: { files: [xlsx()] } });

    expect(await screen.findByRole('alert')).toHaveTextContent('File thiếu cột bắt buộc: Giá, Số lượng');
    expect(screen.getByLabelText('Chọn file Excel')).toBeInTheDocument();
  });

  it('tải file mẫu → lưu file mau-nhap-thuoc.xlsx', async () => {
    const createObjectURL = vi.fn(() => 'blob:mau');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    api.get.mockResolvedValueOnce(new Blob(['x']));
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /Tải file mẫu/ }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(click.mock.contexts[0].download).toBe('mau-nhap-thuoc.xlsx');
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:mau'));
    click.mockRestore();
  });
});
