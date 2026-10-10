import api from './api';

const LOCAL_STORAGE_KEY_INVOICES = 'hms_mock_invoices';

const INITIAL_MOCK_INVOICES = [
  {
    id: 1001,
    patientId: 1,
    patientName: 'Nguyễn Văn A',
    patientCode: 'BN-2026-0001',
    visitId: 1,
    visitTime: '2026-10-02T08:30:00',
    doctorName: 'TS.BS Vi Mai Anh',
    diagnosisCode: 'I10',
    totalAmount: 320000,
    status: 'PAID',
    paymentMethod: 'VIETQR',
    transactionCode: 'VQR-2026-1001',
    paidAt: '2026-10-02T10:15:00',
    createdAt: '2026-10-02T09:45:00',
    items: [
      { id: 1, itemType: 'SERVICE', refId: 1, description: 'Phí khám bệnh tại Khoa Khám bệnh', amount: 150000 },
      { id: 2, itemType: 'DRUG', refId: 1, description: 'Amlodipine 5mg (1 viên/ngày, SL: 30 Viên)', amount: 90000 },
      { id: 3, itemType: 'LAB', refId: 1, description: 'Cận lâm sàng: Điện tim đồ (ECG)', amount: 80000 }
    ]
  },
  {
    id: 1002,
    patientId: 2,
    patientName: 'Trần Thị B',
    patientCode: 'BN-2026-0002',
    visitId: 2,
    visitTime: '2026-10-03T09:00:00',
    doctorName: 'BS. Lê Thị Mai',
    diagnosisCode: 'J02',
    totalAmount: 260000,
    status: 'PENDING',
    paymentMethod: null,
    transactionCode: null,
    paidAt: null,
    createdAt: '2026-10-03T09:30:00',
    items: [
      { id: 4, itemType: 'SERVICE', refId: 2, description: 'Phí khám bệnh chuyên khoa Tai Mũi Họng', amount: 150000 },
      { id: 5, itemType: 'DRUG', refId: 5, description: 'Amoxicillin 500mg (2 viên/ngày, SL: 20 Viên)', amount: 60000 },
      { id: 6, itemType: 'LAB', refId: 2, description: 'Cận lâm sàng: Nội soi tai mũi họng', amount: 50000 }
    ]
  }
];

const getStoredInvoices = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_INVOICES);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY_INVOICES, JSON.stringify(INITIAL_MOCK_INVOICES));
      return INITIAL_MOCK_INVOICES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_MOCK_INVOICES;
  }
};

const saveStoredInvoices = (list) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_INVOICES, JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
};

export const invoiceService = {
  /**
   * Tự động sinh hóa đơn từ lượt khám bệnh (FR-7.1)
   */
  async generateInvoice(visitId, options = {}) {
    try {
      const res = await api.post(`/invoices/generate/${visitId}`);
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (e) {
      // Fallback local
    }

    const invoices = getStoredInvoices();
    const existing = invoices.find(i => i.visitId === Number(visitId) && i.status !== 'CANCELLED');
    if (existing) {
      return existing;
    }

    const serviceFee = options.serviceFee || 150000;
    const drugItems = (options.prescriptions || []).map((p, idx) => ({
      id: Date.now() + 10 + idx,
      itemType: 'DRUG',
      refId: p.drugId || p.id || 1,
      description: `${p.name || 'Thuốc'} (SL: ${p.quantity || 1})`,
      amount: (p.price || p.unitPrice || 2500) * (p.quantity || 1)
    }));
    const drugTotal = drugItems.reduce((sum, d) => sum + d.amount, 0);

    const labItems = (options.labOrders || []).map((l, idx) => ({
      id: Date.now() + 30 + idx,
      itemType: 'LAB',
      refId: l.id || 1,
      description: `Cận lâm sàng: ${l.name || l.testName || 'Xét nghiệm'}`,
      amount: l.price || 80000
    }));
    const labTotal = labItems.reduce((sum, l) => sum + l.amount, 0);

    const hasCustomItems = options.prescriptions?.length > 0 || options.labOrders?.length > 0;
    const totalAmount = hasCustomItems ? serviceFee + drugTotal + labTotal : (options.totalAmount || 280000);

    const items = hasCustomItems
      ? [
          { id: Date.now() + 1, itemType: 'SERVICE', refId: visitId, description: 'Phí khám bệnh chuyên khoa', amount: serviceFee },
          ...drugItems,
          ...labItems
        ]
      : [
          { id: Date.now() + 1, itemType: 'SERVICE', refId: visitId, description: 'Phí khám bệnh chuyên khoa Tiêu hóa', amount: 150000 },
          { id: Date.now() + 2, itemType: 'DRUG', refId: 7, description: 'Omeprazole 20mg (1 viên/ngày, SL: 14 Viên)', amount: 50000 },
          { id: Date.now() + 3, itemType: 'LAB', refId: 1, description: 'Cận lâm sàng: Xét nghiệm vi khuẩn HP qua hơi thở', amount: 80000 }
        ];

    // Tạo hóa đơn mẫu từ visitId
    const newInvoice = {
      id: Date.now(),
      patientId: options.patientId || 1,
      patientName: options.patientName || ('Bệnh nhân khám lượt #' + visitId),
      patientCode: options.patientCode || ('BN-2026-000' + (visitId % 10)),
      visitId: Number(visitId),
      visitTime: new Date().toISOString(),
      doctorName: options.doctorName || 'TS.BS Vi Mai Anh',
      diagnosisCode: options.diagnosisCode || 'K29 (Viêm dạ dày)',
      totalAmount,
      status: 'PENDING',
      paymentMethod: null,
      transactionCode: null,
      paidAt: null,
      createdAt: new Date().toISOString(),
      items
    };

    invoices.unshift(newInvoice);
    saveStoredInvoices(invoices);
    return newInvoice;
  },

  /**
   * Lấy chi tiết hóa đơn theo ID
   */
  async getInvoiceById(id) {
    try {
      const res = await api.get(`/invoices/${id}`);
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (e) {
      // Fallback
    }
    const invoices = getStoredInvoices();
    return invoices.find(i => i.id === Number(id)) || null;
  },

  /**
   * Lấy hóa đơn theo lượt khám visitId
   */
  async getInvoiceByVisitId(visitId) {
    try {
      const res = await api.get(`/invoices/visit/${visitId}`);
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (e) {
      // Fallback
    }
    const invoices = getStoredInvoices();
    return invoices.find(i => i.visitId === Number(visitId)) || null;
  },

  /**
   * Danh sách hóa đơn có tìm kiếm và phân trang
   */
  async getInvoices(params = {}) {
    try {
      const res = await api.get('/invoices', { params });
      if (res?.success && res?.data?.content) {
        return res.data.content;
      }
    } catch (e) {
      // Fallback
    }

    let invoices = getStoredInvoices();
    if (params.status) {
      invoices = invoices.filter(i => i.status === params.status);
    }
    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      invoices = invoices.filter(i =>
        i.patientName.toLowerCase().includes(kw) ||
        i.patientCode.toLowerCase().includes(kw) ||
        String(i.id).includes(kw)
      );
    }
    return invoices;
  },

  /**
   * Xác nhận thanh toán viện phí (Tiền mặt / VietQR) - FR-7.2
   */
  async payInvoice(id, paymentData) {
    try {
      const res = await api.put(`/invoices/${id}/pay`, paymentData);
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (e) {
      if (e.response?.data?.message) {
        throw new Error(e.response.data.message);
      }
    }

    // Fallback LocalStorage
    const invoices = getStoredInvoices();
    const inv = invoices.find(i => i.id === Number(id));
    if (!inv) throw new Error('Không tìm thấy hóa đơn ID ' + id);

    if (inv.status === 'PAID') {
      throw new Error(`Hóa đơn #${id} đã được thanh toán trước đó.`);
    }

    inv.status = 'PAID';
    inv.paymentMethod = paymentData.paymentMethod || paymentData.method || 'CASH';
    inv.transactionCode = paymentData.transactionCode || ('TXN-' + Date.now());
    inv.paidAt = new Date().toISOString();

    saveStoredInvoices(invoices);
    return inv;
  },

  /**
   * Tạo đường dẫn ảnh mã QR động VietQR theo chuẩn Napas 247
   * Bank ID 970422 (MB Bank), số tài khoản giả lập của bệnh viện
   */
  generateVietQRUrl({ accountNo = '0900000000', bankCode = '970422', amount, description, accountName = 'MY PHAT HOSPITAL' }) {
    const cleanAmount = Math.round(Number(amount) || 0);
    const cleanDesc = encodeURIComponent((description || 'Thanh toan vien phi').slice(0, 50));
    const cleanName = encodeURIComponent(accountName);
    return `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${cleanAmount}&addInfo=${cleanDesc}&accountName=${cleanName}`;
  }
};

export default invoiceService;
