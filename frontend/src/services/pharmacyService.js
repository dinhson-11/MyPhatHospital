import api from './api';

const LOCAL_STORAGE_KEY_DISPENSES = 'hms_mock_dispenses';
const LOCAL_STORAGE_KEY_DRUGS = 'hms_mock_drugs';

// Mock danh mục 15 thuốc thiết yếu ban đầu nếu offline
const INITIAL_MOCK_DRUGS = [
  { id: 1, code: 'DRUG-PARA-500', name: 'Paracetamol 500mg', unit: 'Viên', price: 1500, stockQuantity: 2500, expiryDate: '2027-12-31' },
  { id: 2, code: 'DRUG-IBU-400', name: 'Ibuprofen 400mg', unit: 'Viên', price: 2500, stockQuantity: 1800, expiryDate: '2027-08-31' },
  { id: 3, code: 'DRUG-ASP-81', name: 'Aspirin 81mg', unit: 'Viên', price: 2000, stockQuantity: 1200, expiryDate: '2027-10-15' },
  { id: 4, code: 'DRUG-WAR-5', name: 'Warfarin 5mg', unit: 'Viên', price: 4500, stockQuantity: 15, expiryDate: '2027-06-30' }, // Tồn kho thấp <= 20
  { id: 5, code: 'DRUG-AMOX-500', name: 'Amoxicillin 500mg', unit: 'Viên', price: 3000, stockQuantity: 2000, expiryDate: '2027-11-20' },
  { id: 6, code: 'DRUG-CLARI-500', name: 'Clarithromycin 500mg', unit: 'Viên', price: 12000, stockQuantity: 800, expiryDate: '2027-09-15' },
  { id: 7, code: 'DRUG-OMEP-20', name: 'Omeprazole 20mg', unit: 'Viên', price: 3500, stockQuantity: 1500, expiryDate: '2027-12-01' },
  { id: 8, code: 'DRUG-MET-500', name: 'Metformin 500mg', unit: 'Viên', price: 2200, stockQuantity: 2200, expiryDate: '2027-10-30' },
  { id: 9, code: 'DRUG-AMLO-5', name: 'Amlodipine 5mg', unit: 'Viên', price: 2800, stockQuantity: 1600, expiryDate: '2027-07-25' },
  { id: 10, code: 'DRUG-CIPRO-500', name: 'Ciprofloxacin 500mg', unit: 'Viên', price: 5500, stockQuantity: 950, expiryDate: '2027-08-20' },
  { id: 11, code: 'DRUG-ATOR-20', name: 'Atorvastatin 20mg', unit: 'Viên', price: 6500, stockQuantity: 1400, expiryDate: '2027-11-10' },
  { id: 12, code: 'DRUG-CEFT-1G', name: 'Ceftriaxone 1g (Lọ tiêm)', unit: 'Lọ', price: 35000, stockQuantity: 450, expiryDate: '2027-05-15' },
  { id: 13, code: 'DRUG-LORA-10', name: 'Loratadine 10mg', unit: 'Viên', price: 1800, stockQuantity: 1100, expiryDate: '2027-12-15' },
  { id: 14, code: 'DRUG-DIAZ-5', name: 'Diazepam 5mg', unit: 'Viên', price: 1200, stockQuantity: 500, expiryDate: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0] }, // Sắp hết hạn trong 20 ngày
  { id: 15, code: 'DRUG-DIGO-025', name: 'Digoxin 0.25mg', unit: 'Viên', price: 3200, stockQuantity: 8, expiryDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0] } // Vừa tồn thấp vừa sắp hết hạn
];

const getStoredDrugs = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DRUGS);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY_DRUGS, JSON.stringify(INITIAL_MOCK_DRUGS));
      return INITIAL_MOCK_DRUGS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_MOCK_DRUGS;
  }
};

const saveStoredDrugs = (drugs) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_DRUGS, JSON.stringify(drugs));
  } catch (e) {
    console.error(e);
  }
};

const getStoredDispenses = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DISPENSES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveStoredDispenses = (list) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_DISPENSES, JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
};

export const pharmacyService = {
  /**
   * Lấy danh sách thuốc
   */
  async getDrugs(keyword = '') {
    try {
      const res = await api.get('/drugs/all', { params: { keyword } });
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (e) {
      // Fallback local
    }
    const drugs = getStoredDrugs();
    if (!keyword) return drugs;
    const lower = keyword.toLowerCase();
    return drugs.filter(d => d.name.toLowerCase().includes(lower) || d.code.toLowerCase().includes(lower));
  },

  /**
   * Cấp phát thuốc theo đơn
   */
  async dispensePrescription(prescriptionId, dispenseData = {}) {
    try {
      const res = await api.post(`/prescriptions/${prescriptionId}/dispense`, dispenseData);
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (e) {
      if (e.response?.data?.message) {
        throw new Error(e.response.data.message);
      }
    }

    // Fallback Offline
    const dispenses = getStoredDispenses();
    if (dispenses.some(d => d.prescriptionId === prescriptionId)) {
      throw new Error(`Đơn thuốc ID ${prescriptionId} đã được cấp phát trước đó.`);
    }

    const newDispense = {
      id: Date.now(),
      prescriptionId,
      visitId: dispenseData.visitId || 101,
      patientName: dispenseData.patientName || 'Bệnh nhân mẫu',
      patientCode: dispenseData.patientCode || 'BN-2026-0001',
      doctorName: dispenseData.doctorName || 'BS. Nguyễn Văn Hùng',
      dispensedByName: 'DS. Đỗ Thị Mai (Kho Dược)',
      dispensedAt: new Date().toISOString(),
      items: dispenseData.items || [],
      note: dispenseData.note || 'Cấp phát tại quầy thuốc bệnh viện'
    };

    // Trừ kho offline nếu có
    if (dispenseData.items && Array.isArray(dispenseData.items)) {
      const drugs = getStoredDrugs();
      for (const item of dispenseData.items) {
        const drug = drugs.find(
          d => d.id === item.drugId || d.id === item.id || d.code === item.drugCode || d.code === item.code
        );
        if (drug) {
          const qty = item.quantity || 1;
          if (drug.stockQuantity < qty) {
            throw new Error(`Thuốc '${drug.name}' không đủ tồn kho để cấp phát.`);
          }
          drug.stockQuantity -= qty;
        }
      }
      saveStoredDrugs(drugs);
    }

    dispenses.unshift(newDispense);
    saveStoredDispenses(dispenses);
    return newDispense;
  },

  /**
   * Kiểm tra xem đơn đã cấp phát chưa
   */
  async isDispensed(prescriptionId) {
    try {
      const res = await api.get(`/prescriptions/${prescriptionId}/is-dispensed`);
      if (res?.success) {
        return res.data;
      }
    } catch (e) {
      // Fallback
    }
    const dispenses = getStoredDispenses();
    return dispenses.some(d => d.prescriptionId === prescriptionId);
  },

  /**
   * Lấy chi tiết lượt cấp phát
   */
  async getDispenseByPrescriptionId(prescriptionId) {
    try {
      const res = await api.get(`/prescriptions/${prescriptionId}/dispense`);
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (e) {
      // Fallback
    }
    const dispenses = getStoredDispenses();
    return dispenses.find(d => d.prescriptionId === prescriptionId) || null;
  },

  /**
   * Lấy danh sách thuốc sắp hết hạn (30/60/90 ngày)
   */
  async getExpiringSoonDrugs(days = 30) {
    try {
      const res = await api.get('/drugs/expiring-soon', { params: { days } });
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (e) {
      // Fallback
    }
    const drugs = getStoredDrugs();
    const now = new Date();
    const target = new Date();
    target.setDate(now.getDate() + days);

    return drugs.filter(d => {
      if (!d.expiryDate) return false;
      const exp = new Date(d.expiryDate);
      return exp >= now && exp <= target;
    });
  },

  /**
   * Lấy danh sách thuốc tồn kho thấp (<= 20)
   */
  async getLowStockDrugs(threshold = 20) {
    try {
      const res = await api.get('/drugs/low-stock', { params: { threshold } });
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (e) {
      // Fallback
    }
    const drugs = getStoredDrugs();
    return drugs.filter(d => (d.stockQuantity || 0) <= threshold);
  },

  /**
   * Cập nhật tồn kho (Nhập/Xuất/Điều chỉnh)
   */
  async updateStock(drugId, updateData) {
    try {
      const res = await api.put(`/drugs/${drugId}/stock`, updateData);
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (e) {
      if (e.response?.data?.message) {
        throw new Error(e.response.data.message);
      }
    }

    // Fallback
    const drugs = getStoredDrugs();
    const drug = drugs.find(d => d.id === drugId);
    if (!drug) throw new Error('Không tìm thấy thuốc');

    const qty = parseInt(updateData.quantity, 10) || 0;
    if (updateData.adjustmentType === 'IMPORT') {
      drug.stockQuantity = (drug.stockQuantity || 0) + qty;
    } else if (updateData.adjustmentType === 'EXPORT') {
      if ((drug.stockQuantity || 0) < qty) {
        throw new Error('Số lượng xuất vượt quá tồn kho hiện có');
      }
      drug.stockQuantity -= qty;
    } else if (updateData.adjustmentType === 'ADJUSTMENT') {
      drug.stockQuantity = qty;
    }

    saveStoredDrugs(drugs);
    return drug;
  },

  /**
   * Thêm thuốc mới vào danh mục
   */
  async createDrug(drugData) {
    try {
      const res = await api.post('/drugs', drugData);
      if (res?.success && res?.data) {
        return res.data;
      }
    } catch (e) {
      if (e.response?.data?.message) {
        throw new Error(e.response.data.message);
      }
    }

    // Fallback
    const drugs = getStoredDrugs();
    if (drugs.some(d => d.code.toLowerCase() === drugData.code.toLowerCase())) {
      throw new Error(`Mã thuốc '${drugData.code}' đã tồn tại.`);
    }

    const newDrug = {
      id: Date.now(),
      ...drugData,
      stockQuantity: parseInt(drugData.stockQuantity, 10) || 0,
      price: parseFloat(drugData.price) || 0
    };
    drugs.push(newDrug);
    saveStoredDrugs(drugs);
    return newDrug;
  }
};

export default pharmacyService;
