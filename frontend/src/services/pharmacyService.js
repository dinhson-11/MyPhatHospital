import api from './api';
import { toAppError } from './apiError';

/**
 * Dịch vụ nhà thuốc & kho dược.
 * Không còn dữ liệu kho/đơn thuốc giả lập: mọi thao tác đọc/ghi đều đi qua máy chủ,
 * lỗi được ném ra (toAppError) để giao diện báo đúng nguyên nhân (VD: ca khám chưa hoàn tất,
 * thuốc hết hạn, không đủ tồn kho).
 */

const listOf = (res) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

/** Upload / nhập tới 1000 dòng cần lâu hơn thời gian chờ mặc định 5 giây của api. */
const IMPORT_TIMEOUT = 30000;

export const STOCK_ADJUSTMENT_LABELS = {
  IMPORT: 'Nhập thêm vào kho',
  EXPORT: 'Xuất kho (hủy/chuyển)',
  ADJUSTMENT: 'Điều chỉnh theo kiểm kê'
};

export const pharmacyService = {
  /** Danh mục thuốc kèm tồn kho (GET /drugs/all). */
  async getDrugs(keyword = '') {
    try {
      const res = await api.get('/drugs/all', { params: keyword ? { keyword } : undefined });
      return listOf(res);
    } catch (err) {
      throw toAppError(err, 'Không tải được danh mục kho dược.');
    }
  },

  /**
   * Đơn thuốc của một ca khám (GET /visits/{visitId}/prescriptions).
   * Ca khám không tồn tại → lỗi 404 với thông điệp tiếng Việt.
   */
  async getPrescriptionsByVisit(visitId) {
    try {
      const res = await api.get(`/visits/${visitId}/prescriptions`);
      return listOf(res);
    } catch (err) {
      if (err?.response?.status === 404) {
        const notFound = toAppError(err, `Không tìm thấy ca khám #${visitId}.`);
        notFound.message = `Không tìm thấy ca khám #${visitId}.`;
        throw notFound;
      }
      throw toAppError(err, 'Không tải được đơn thuốc của ca khám.');
    }
  },

  /** Cấp phát thuốc theo đơn – chỉ thành công khi máy chủ đã trừ kho. */
  async dispensePrescription(prescriptionId, { note } = {}) {
    try {
      const res = await api.post(`/prescriptions/${prescriptionId}/dispense`, note ? { note } : {});
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Cấp phát thuốc không thành công.');
    }
  },

  async isDispensed(prescriptionId) {
    try {
      const res = await api.get(`/prescriptions/${prescriptionId}/is-dispensed`);
      return Boolean(res?.data);
    } catch (err) {
      throw toAppError(err, 'Không kiểm tra được trạng thái cấp phát.');
    }
  },

  /** Chi tiết lượt cấp phát; chưa cấp phát (404) → null. */
  async getDispenseByPrescriptionId(prescriptionId) {
    try {
      const res = await api.get(`/prescriptions/${prescriptionId}/dispense`);
      return res?.data ?? null;
    } catch (err) {
      if (err?.response?.status === 404) return null;
      throw toAppError(err, 'Không tải được thông tin cấp phát.');
    }
  },

  async getRecentDispenses() {
    try {
      const res = await api.get('/prescriptions/dispenses');
      return listOf(res);
    } catch (err) {
      throw toAppError(err, 'Không tải được lịch sử cấp phát.');
    }
  },

  async getExpiringSoonDrugs(days = 30) {
    try {
      const res = await api.get('/drugs/expiring-soon', { params: { days } });
      return listOf(res);
    } catch (err) {
      throw toAppError(err, 'Không tải được danh sách thuốc sắp hết hạn.');
    }
  },

  async getLowStockDrugs(threshold = 20) {
    try {
      const res = await api.get('/drugs/low-stock', { params: { threshold } });
      return listOf(res);
    } catch (err) {
      throw toAppError(err, 'Không tải được danh sách thuốc tồn kho thấp.');
    }
  },

  /** Nhập / xuất / điều chỉnh tồn kho: { quantity ≥ 1, adjustmentType, note }. */
  async updateStock(drugId, { quantity, adjustmentType, note } = {}) {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error('Số lượng phải là số nguyên lớn hơn 0.');
    }
    try {
      const res = await api.put(`/drugs/${drugId}/stock`, { quantity: qty, adjustmentType, note: note || undefined });
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Cập nhật tồn kho không thành công.');
    }
  },

  async createDrug(drugData) {
    try {
      const res = await api.post('/drugs', drugData);
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Không thêm được thuốc mới.');
    }
  },

  /** File Excel mẫu nhập thuốc (Blob .xlsx). */
  async downloadDrugImportTemplate() {
    try {
      return await api.get('/drugs/import/template', { responseType: 'blob', timeout: IMPORT_TIMEOUT });
    } catch (err) {
      throw toAppError(err, 'Không tải được file mẫu.');
    }
  },

  /** Xem trước file Excel: mỗi dòng có status NEW | EXISTS | INVALID, errors[] và existing (thuốc hiện có). */
  async previewDrugImport(file) {
    const form = new FormData();
    form.append('file', file);
    try {
      // Ghi đè Content-Type mặc định (JSON) để axios gửi multipart, trình duyệt tự thêm boundary
      const res = await api.post('/drugs/import/preview', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: IMPORT_TIMEOUT
      });
      return Array.isArray(res?.data) ? res.data : [];
    } catch (err) {
      throw toAppError(err, 'Không đọc được file Excel.');
    }
  },

  /** Nhập các dòng đã chọn: items[] gồm dữ liệu dòng + action CREATE | RESTOCK. Trả về { created, restocked }. */
  async importDrugs(items) {
    try {
      const res = await api.post('/drugs/import', { items }, { timeout: IMPORT_TIMEOUT });
      return res?.data;
    } catch (err) {
      throw toAppError(err, 'Nhập thuốc từ Excel không thành công.');
    }
  }
};

export default pharmacyService;
