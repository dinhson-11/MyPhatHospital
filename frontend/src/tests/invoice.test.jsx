import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: ''
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, isReceptionist: true })
}));

import api from '../services/api';
import invoiceService from '../services/invoiceService';
import InvoiceModal from '../components/billing/InvoiceModal';
import { suggestCashAmounts } from '../components/billing/PaymentDialog';
import { amountInWords, formatVND } from '../utils/format';

const ok = (data) => Promise.resolve({ success: true, data, message: 'OK' });
const networkError = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
const backendError = (status, message, errorCode = 'BUSINESS_ERROR') =>
  Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { errorCode, message } }
  }));

const pendingInvoice = {
  id: 10,
  invoiceCode: 'HD261012000010',
  patientId: 1,
  patientName: 'Trần Văn B',
  patientCode: 'BN-261012-001',
  visitId: 50,
  visitTime: '2026-10-12T09:00:00',
  doctorName: 'BS. Hoàng C',
  diagnosisCode: 'I10',
  diagnosisNote: 'Tăng huyết áp vô căn',
  totalAmount: 680000,
  insuranceNumber: 'GD4010123456789',
  insuranceRate: 80,
  insuranceAmount: 544000,
  insuranceNote: 'BHYT chi trả 80% theo mức hưởng của thẻ',
  patientAmount: 136000,
  status: 'PENDING',
  createdAt: '2026-10-12T10:00:00',
  items: [
    { id: 1, itemType: 'SERVICE', description: 'Phí khám bệnh: Tim mạch', quantity: 1, unitPrice: 150000, amount: 150000 },
    { id: 2, itemType: 'DRUG', description: 'Amlodipine 5mg (10 Viên)', quantity: 10, unitPrice: 3000, amount: 30000 },
    { id: 3, itemType: 'LAB', description: 'Cận lâm sàng: Chụp CT sọ não', quantity: 1, unitPrice: 500000, amount: 500000 }
  ]
};

const summary = {
  date: '2026-10-12', paidCount: 2, grossAmount: 900000, insuranceAmount: 400000, collectedAmount: 500000,
  byMethod: [{ method: 'CASH', count: 1, amount: 300000 }, { method: 'VIETQR', count: 1, amount: 200000 }],
  pendingCount: 1, pendingAmount: 136000, cancelledCount: 0, refundedCount: 0, refundedAmount: 0
};

function routeGet(overrides = {}) {
  api.get.mockImplementation((url) => {
    if (overrides[url]) return overrides[url]();
    if (url === '/invoices') return ok({ content: [pendingInvoice], totalElements: 1 });
    if (url === '/invoices/uninvoiced-visits') return ok([]);
    if (url === '/invoices/summary') return ok(summary);
    if (url === '/invoices/10/payment-qr') {
      return ok({
        invoiceId: 10, invoiceCode: 'HD261012000010', bankBin: '970422', bankName: 'MB Bank (DEMO)',
        accountNo: '0000000000', accountName: 'MY PHAT HOSPITAL DEMO', amount: 136000,
        transferContent: 'MPH HD261012000010', qrImageUrl: 'https://img.vietqr.io/image/x.png', demo: true,
        qrPayload: '00020101021238540010A00000072701240006970436011001234567890208QRIBFTTA530370454061360005802VN62220818MPH HD26101200001063042669'
      });
    }
    return networkError();
  });
}

describe('Viện phí – invoiceService (không còn dữ liệu giả)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('lập hóa đơn qua API và trả về dữ liệu máy chủ', async () => {
    api.post.mockReturnValue(ok(pendingInvoice));
    const inv = await invoiceService.generateInvoice(50);
    expect(api.post).toHaveBeenCalledWith('/invoices/generate/50');
    expect(inv.invoiceCode).toBe('HD261012000010');
  });

  it('mất mạng khi thu tiền → báo lỗi, KHÔNG tự đánh dấu đã thu', async () => {
    api.put.mockImplementation(networkError);
    await expect(invoiceService.payInvoice(10, { paymentMethod: 'CASH', amountReceived: 200000 }))
      .rejects.toThrow(/Không kết nối được máy chủ/);
    expect(localStorage.length).toBe(0);
  });

  it('lỗi nghiệp vụ từ máy chủ được chuyển nguyên văn cho thu ngân', async () => {
    api.put.mockImplementation(() => backendError(400, 'Tiền khách đưa (100.000 đ) chưa đủ số tiền phải thu (136.000 đ)'));
    await expect(invoiceService.payInvoice(10, { paymentMethod: 'CASH', amountReceived: 100000 }))
      .rejects.toThrow(/chưa đủ số tiền phải thu/);
  });

  it('gửi đúng dữ liệu thanh toán: tiền mặt kèm tiền khách đưa, chuyển khoản kèm mã giao dịch', async () => {
    api.put.mockReturnValue(ok({ ...pendingInvoice, status: 'PAID' }));
    await invoiceService.payInvoice(10, { paymentMethod: 'CASH', amountReceived: 200000 });
    expect(api.put).toHaveBeenLastCalledWith('/invoices/10/pay', { paymentMethod: 'CASH', amountReceived: 200000 });

    await invoiceService.payInvoice(10, { paymentMethod: 'BANK_TRANSFER', transactionCode: ' FT123456 ' });
    expect(api.put).toHaveBeenLastCalledWith('/invoices/10/pay', { paymentMethod: 'BANK_TRANSFER', transactionCode: 'FT123456' });
  });

  it('danh sách lọc trạng thái + từ khóa cùng lúc, bỏ tham số khi chọn Tất cả', async () => {
    api.get.mockReturnValue(ok({ content: [pendingInvoice], totalElements: 1 }));
    const res = await invoiceService.getInvoices({ keyword: ' Trần ', status: 'PENDING' });
    expect(api.get).toHaveBeenCalledWith('/invoices', { params: { page: 0, size: 50, sort: 'createdAt,desc', keyword: 'Trần', status: 'PENDING' } });
    expect(res.items).toHaveLength(1);

    await invoiceService.getInvoices({ status: 'ALL' });
    expect(api.get).toHaveBeenLastCalledWith('/invoices', { params: { page: 0, size: 50, sort: 'createdAt,desc' } });
  });

  it('hủy và hoàn tiền gửi kèm lý do', async () => {
    api.patch.mockReturnValue(ok({ ...pendingInvoice, status: 'CANCELLED' }));
    await invoiceService.cancelInvoice(10, 'Bệnh nhân chuyển viện');
    expect(api.patch).toHaveBeenCalledWith('/invoices/10/cancel', { reason: 'Bệnh nhân chuyển viện' });
    await invoiceService.refundInvoice(10, 'Thu trùng');
    expect(api.patch).toHaveBeenLastCalledWith('/invoices/10/refund', { reason: 'Thu trùng' });
  });
});

describe('Tiện ích tiền tệ', () => {
  it('gợi ý mệnh giá làm tròn lên', () => {
    expect(suggestCashAmounts(136000)).toEqual([140000, 150000, 200000, 500000]);
    expect(suggestCashAmounts(0)).toEqual([]);
  });

  it('đọc số tiền bằng chữ tiếng Việt', () => {
    expect(amountInWords(136000)).toBe('Một trăm ba mươi sáu nghìn đồng');
    expect(amountInWords(15000)).toBe('Mười lăm nghìn đồng');
    expect(amountInWords(21000)).toBe('Hai mươi mốt nghìn đồng');
    expect(amountInWords(105000)).toBe('Một trăm linh năm nghìn đồng');
    expect(amountInWords(1000005)).toBe('Một triệu không trăm linh năm đồng');
    expect(amountInWords(1500000)).toBe('Một triệu năm trăm nghìn đồng');
    expect(amountInWords(0)).toBe('Không đồng');
  });

  it('định dạng VNĐ thống nhất', () => {
    expect(formatVND(1234000)).toBe('1.234.000 đ');
    expect(formatVND(null)).toBe('—');
  });
});

describe('Viện phí – giao diện thu ngân', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeGet();
  });

  const openAndSelect = async () => {
    const onShowToast = vi.fn();
    render(<InvoiceModal isOpen onClose={() => {}} onShowToast={onShowToast} />);
    const row = await screen.findByRole('button', { name: /Trần Văn B/ });
    fireEvent.click(row);
    return { onShowToast };
  };

  it('hiển thị tổng hợp ca, BHYT chi trả và số người bệnh phải trả', async () => {
    await openAndSelect();
    expect(screen.getByRole('dialog', { name: /Viện phí & thu ngân/ })).toBeInTheDocument();
    const shift = await screen.findByRole('region', { name: /Tổng hợp thu ngân hôm nay/ });
    await waitFor(() => expect(within(shift).getByText('500.000 đ')).toBeInTheDocument()); // đã thu hôm nay
    expect(screen.getByText('Người bệnh phải trả')).toBeInTheDocument();
    expect(screen.getByText('− 544.000 đ')).toBeInTheDocument();
    expect(screen.getByText(/BHYT chi trả 80% theo mức hưởng/)).toBeInTheDocument();
  });

  it('tiền mặt: chặn khi khách đưa thiếu, tính tiền thừa và gửi số tiền khách đưa lên máy chủ', async () => {
    api.put.mockReturnValue(ok({ ...pendingInvoice, status: 'PAID', paymentMethod: 'CASH', amountReceived: 200000, changeAmount: 64000, transactionCode: 'TM1', paidAt: '2026-10-12T10:05:00' }));
    const { onShowToast } = await openAndSelect();
    fireEvent.click(screen.getByRole('button', { name: /^Thu tiền$/ }));

    const dialog = await screen.findByRole('dialog', { name: /Thu tiền hóa đơn HD261012000010/ });
    const input = within(dialog).getByLabelText(/Tiền khách đưa/);
    const submit = within(dialog).getByRole('button', { name: /Xác nhận đã thu 136.000 đ/ });

    fireEvent.change(input, { target: { value: '100000' } });
    expect(submit).toBeDisabled();
    expect(within(dialog).getByText('Còn thiếu')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '200000' } });
    expect(input.value).toBe('200.000');
    expect(within(dialog).getByText('64.000 đ')).toBeInTheDocument();
    expect(submit).not.toBeDisabled();

    fireEvent.click(submit);
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/invoices/10/pay', { paymentMethod: 'CASH', amountReceived: 200000 }));
    await waitFor(() => expect(onShowToast).toHaveBeenCalledWith(expect.stringMatching(/Đã thu 136.000 đ/), 'success'));
  });

  it('VietQR: hiển thị thông tin chuyển khoản từ máy chủ, cảnh báo DEMO, bắt buộc mã giao dịch', async () => {
    await openAndSelect();
    fireEvent.click(screen.getByRole('button', { name: /^Thu tiền$/ }));
    const dialog = await screen.findByRole('dialog', { name: /Thu tiền hóa đơn/ });

    fireEvent.click(within(dialog).getByLabelText(/VietQR/));
    expect(await within(dialog).findByText(/Tài khoản DEMO/)).toBeInTheDocument();
    expect(within(dialog).getByText('MPH HD261012000010')).toBeInTheDocument();
    // Mã QR được vẽ tại trình duyệt từ chuỗi VietQR của máy chủ (không dùng ảnh từ Internet khi đã có qrPayload)
    const code = within(dialog).getByTestId('vietqr-code');
    expect(code.querySelector('svg')).toBeInTheDocument();
    expect(within(dialog).queryByRole('img', { name: /Mã VietQR/ }).tagName).toBe('DIV');

    const submit = within(dialog).getByRole('button', { name: /Xác nhận đã thu/ });
    expect(submit).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/Mã giao dịch ngân hàng/), { target: { value: 'ft26283123456' } });
    expect(submit).not.toBeDisabled();
  });

  it('lỗi mạng khi thu tiền: giữ hộp thoại mở và báo rõ chưa ghi nhận', async () => {
    api.put.mockImplementation(networkError);
    await openAndSelect();
    fireEvent.click(screen.getByRole('button', { name: /^Thu tiền$/ }));
    const dialog = await screen.findByRole('dialog', { name: /Thu tiền hóa đơn/ });
    fireEvent.change(within(dialog).getByLabelText(/Tiền khách đưa/), { target: { value: '136000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Xác nhận đã thu/ }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/CHƯA được lưu|Không kết nối/);
    expect(screen.getByRole('dialog', { name: /Thu tiền hóa đơn/ })).toBeInTheDocument();
  });

  it('không tải được danh sách → hiển thị lỗi và nút thử lại thay vì dữ liệu giả', async () => {
    routeGet({ '/invoices': networkError });
    render(<InvoiceModal isOpen onClose={() => {}} onShowToast={() => {}} />);
    expect(await screen.findByText(/Không kết nối được máy chủ/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn A')).not.toBeInTheDocument();
  });

  it('hàng chờ lập hóa đơn: lập hóa đơn từ ca khám đã hoàn tất', async () => {
    routeGet({
      '/invoices/uninvoiced-visits': () => ok([{ visitId: 77, visitTime: '2026-10-12T08:00:00', patientName: 'Lê Thị C', patientCode: 'BN-1', doctorName: 'BS. D', insuranceEligible: true }])
    });
    api.post.mockReturnValue(ok({ ...pendingInvoice, id: 11, visitId: 77, invoiceCode: 'HD261012000011', patientName: 'Lê Thị C' }));
    render(<InvoiceModal isOpen onClose={() => {}} onShowToast={() => {}} />);

    fireEvent.click(await screen.findByRole('tab', { name: /Chờ lập hóa đơn \(1\)/ }));
    expect(screen.getByText('Có BHYT')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lập hóa đơn' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/invoices/generate/77'));
    expect(await screen.findByRole('heading', { name: 'HD261012000011' })).toBeInTheDocument();
  });
});
