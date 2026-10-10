import api from './api';
import { toAppError } from './apiError';

/**
 * Dịch vụ viện phí – làm việc trực tiếp với backend (/api/v1/invoices).
 *
 * Nguyên tắc tài chính: KHÔNG có dữ liệu giả hay "thanh toán offline".
 * Mọi lỗi (mất mạng, hết thời gian chờ, lỗi nghiệp vụ) đều được ném ra để giao diện báo cho thu ngân,
 * tránh trường hợp màn hình báo "đã thu" trong khi máy chủ chưa ghi nhận.
 * Số tiền, BHYT, tiền thừa, mã QR đều do máy chủ tính – giao diện chỉ hiển thị.
 */

async function call(promise, fallbackMessage) {
  let res;
  try {
    res = await promise;
  } catch (err) {
    throw toAppError(err, fallbackMessage);
  }
  if (res?.success === false) {
    throw new Error(res.message || fallbackMessage);
  }
  return res?.data;
}

export const invoiceService = {
  /** Lập hóa đơn từ ca khám đã hoàn tất (trả về hóa đơn hiện có nếu đã lập). */
  generateInvoice(visitId) {
    return call(api.post(`/invoices/generate/${visitId}`), 'Không lập được hóa đơn cho ca khám này');
  },

  getInvoiceById(id) {
    return call(api.get(`/invoices/${id}`), 'Không tải được hóa đơn');
  },

  getInvoiceByVisitId(visitId) {
    return call(api.get(`/invoices/visit/${visitId}`), 'Không tải được hóa đơn của ca khám');
  },

  /**
   * Danh sách hóa đơn (lọc trạng thái + từ khóa cùng lúc).
   * @returns {{ items: object[], totalElements: number }}
   */
  async getInvoices({ keyword, status, page = 0, size = 50 } = {}) {
    const params = { page, size, sort: 'createdAt,desc' };
    if (keyword?.trim()) params.keyword = keyword.trim();
    if (status && status !== 'ALL') params.status = status;
    const data = await call(api.get('/invoices', { params }), 'Không tải được danh sách hóa đơn');
    return {
      items: data?.content ?? [],
      totalElements: data?.totalElements ?? data?.content?.length ?? 0
    };
  },

  /** Bệnh nhân xem hóa đơn của chính mình. */
  async getMyInvoices() {
    return (await call(api.get('/invoices/me'), 'Không tải được hóa đơn của bạn')) ?? [];
  },

  /** Hàng chờ lập hóa đơn: ca khám đã hoàn tất nhưng chưa có hóa đơn. */
  async getUninvoicedVisits(limit = 50) {
    return (await call(api.get('/invoices/uninvoiced-visits', { params: { limit } }),
      'Không tải được hàng chờ lập hóa đơn')) ?? [];
  },

  /** Tổng hợp thu ngân theo ngày (yyyy-MM-dd, mặc định hôm nay). */
  getShiftSummary(date) {
    return call(api.get('/invoices/summary', { params: date ? { date } : {} }), 'Không tải được tổng hợp thu ngân');
  },

  /** Thông tin chuyển khoản VietQR do máy chủ sinh (số tiền + nội dung đối soát). */
  getPaymentQr(id) {
    return call(api.get(`/invoices/${id}/payment-qr`), 'Không tạo được mã VietQR');
  },

  /**
   * Xác nhận thu tiền.
   * @param {{ paymentMethod: 'CASH'|'VIETQR'|'BANK_TRANSFER'|'CARD', amountReceived?: number,
   *           transactionCode?: string, note?: string }} payment
   */
  payInvoice(id, payment) {
    const body = { paymentMethod: payment.paymentMethod };
    if (payment.amountReceived !== undefined && payment.amountReceived !== null) body.amountReceived = payment.amountReceived;
    if (payment.transactionCode?.trim()) body.transactionCode = payment.transactionCode.trim();
    if (payment.note?.trim()) body.note = payment.note.trim();
    return call(api.put(`/invoices/${id}/pay`, body), 'Thu tiền không thành công – hóa đơn CHƯA được ghi nhận đã thu');
  },

  cancelInvoice(id, reason) {
    return call(api.patch(`/invoices/${id}/cancel`, { reason }), 'Không hủy được hóa đơn');
  },

  refundInvoice(id, reason) {
    return call(api.patch(`/invoices/${id}/refund`, { reason }), 'Không hoàn tiền được hóa đơn');
  },

  recalculateInvoice(id) {
    return call(api.post(`/invoices/${id}/recalculate`), 'Không tính lại được hóa đơn');
  }
};

export default invoiceService;
