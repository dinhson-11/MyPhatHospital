import apiClient from './api';

const VISITS_STORAGE_KEY = 'hms_clinical_visits';
const DRUGS_STORAGE_KEY = 'hms_clinical_drugs';

// Danh mục mã bệnh ICD-10 phổ biến tại phòng khám
export const COMMON_ICD10_CODES = [
  { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)', departmentId: 5 },
  { code: 'I20.9', name: 'Cơn đau thắt ngực không đặc hiệu', departmentId: 5 },
  { code: 'E11.9', name: 'Đái tháo đường typ 2 không có biến chứng', departmentId: 1 },
  { code: 'J06.9', name: 'Nhiễm khuẩn đường hô hấp trên cấp', departmentId: 1 },
  { code: 'J20.9', name: 'Viêm phế quản cấp không đặc hiệu', departmentId: 1 },
  { code: 'K29.7', name: 'Viêm dạ dày không đặc hiệu', departmentId: 6 },
  { code: 'K21.9', name: 'Trào ngược dạ dày thực quản (GERD)', departmentId: 6 },
  { code: 'A09', name: 'Viêm dạ dày ruột và tiêu chảy nhiễm khuẩn', departmentId: 6 },
  { code: 'J45.9', name: 'Hen phế quản (Suyễn) không đặc hiệu', departmentId: 4 },
  { code: 'L20.9', name: 'Viêm da cơ địa dị ứng', departmentId: 8 },
  { code: 'H10.9', name: 'Viêm kết mạc không đặc hiệu (Đau mắt đỏ)', departmentId: 9 },
  { code: 'J01.9', name: 'Viêm xoang cấp không đặc hiệu', departmentId: 10 },
  { code: 'M54.5', name: 'Đau thắt lưng cấp tính', departmentId: 2 },
  { code: 'R50.9', name: 'Sốt không rõ căn nguyên', departmentId: 1 }
];

// Danh mục xét nghiệm cận lâm sàng chuẩn
export const STANDARD_LAB_TESTS = [
  { code: 'LAB-CBC', name: 'Tổng phân tích tế bào máu ngoại vi (CBC 18 chỉ số)', category: 'Huyết học' },
  { code: 'LAB-GLU', name: 'Định lượng Glucose máu lúc đói', category: 'Sinh hóa' },
  { code: 'LAB-LIPID', name: 'Bộ mỡ máu toàn phần (Cholesterol, Triglycerid, HDL, LDL)', category: 'Sinh hóa' },
  { code: 'LAB-LIVER', name: 'Men gan (AST, ALT, GGT)', category: 'Sinh hóa' },
  { code: 'LAB-KIDNEY', name: 'Chức năng thận (Ure, Creatinin huyết thanh)', category: 'Sinh hóa' },
  { code: 'LAB-UA', name: 'Tổng phân tích nước tiểu 10 thông số', category: 'Nước tiểu' },
  { code: 'IMG-XRAY-CHEST', name: 'X-quang ngực thẳng kỹ thuật số (CR/DR)', category: 'Chẩn đoán hình ảnh' },
  { code: 'IMG-US-ABDOMEN', name: 'Siêu âm ổ bụng tổng quát màu 4D', category: 'Chẩn đoán hình ảnh' },
  { code: 'IMG-ECG', name: 'Điện tâm đồ 12 chuyển đạo (ECG)', category: 'Thăm dò chức năng' }
];

// Danh mục thuốc thiết yếu chuẩn
export const SEED_DRUGS = [
  { id: 1, code: 'DRUG-PARA-500', name: 'Paracetamol 500mg', unit: 'Viên', price: 1500, stockQuantity: 2500, expiryDate: '2027-12-31' },
  { id: 2, code: 'DRUG-IBU-400', name: 'Ibuprofen 400mg', unit: 'Viên', price: 2500, stockQuantity: 1800, expiryDate: '2027-08-31' },
  { id: 3, code: 'DRUG-ASP-81', name: 'Aspirin 81mg (Enteric-coated)', unit: 'Viên', price: 2000, stockQuantity: 1200, expiryDate: '2027-10-15' },
  { id: 4, code: 'DRUG-WAR-5', name: 'Warfarin 5mg', unit: 'Viên', price: 4500, stockQuantity: 600, expiryDate: '2027-06-30' },
  { id: 5, code: 'DRUG-AMOX-500', name: 'Amoxicillin 500mg', unit: 'Viên', price: 3000, stockQuantity: 2000, expiryDate: '2027-11-20' },
  { id: 6, code: 'DRUG-CLARI-500', name: 'Clarithromycin 500mg', unit: 'Viên', price: 12000, stockQuantity: 800, expiryDate: '2027-09-15' },
  { id: 7, code: 'DRUG-OMEP-20', name: 'Omeprazole 20mg', unit: 'Viên', price: 3500, stockQuantity: 1500, expiryDate: '2027-12-01' },
  { id: 8, code: 'DRUG-MET-500', name: 'Metformin 500mg', unit: 'Viên', price: 2200, stockQuantity: 2200, expiryDate: '2027-10-30' },
  { id: 9, code: 'DRUG-AMLO-5', name: 'Amlodipine 5mg', unit: 'Viên', price: 2800, stockQuantity: 1600, expiryDate: '2027-07-25' },
  { id: 10, code: 'DRUG-CIPRO-500', name: 'Ciprofloxacin 500mg', unit: 'Viên', price: 5500, stockQuantity: 950, expiryDate: '2027-08-20' },
  { id: 11, code: 'DRUG-ATOR-20', name: 'Atorvastatin 20mg', unit: 'Viên', price: 6500, stockQuantity: 1400, expiryDate: '2027-11-10' },
  { id: 12, code: 'DRUG-CEFT-1G', name: 'Ceftriaxone 1g (Lọ tiêm)', unit: 'Lọ', price: 35000, stockQuantity: 450, expiryDate: '2027-05-15' },
  { id: 13, code: 'DRUG-LORA-10', name: 'Loratadine 10mg', unit: 'Viên', price: 1800, stockQuantity: 1100, expiryDate: '2027-12-15' },
  { id: 14, code: 'DRUG-DIAZ-5', name: 'Diazepam 5mg', unit: 'Viên', price: 1200, stockQuantity: 500, expiryDate: '2027-04-30' },
  { id: 15, code: 'DRUG-DIGO-025', name: 'Digoxin 0.25mg', unit: 'Viên', price: 3200, stockQuantity: 700, expiryDate: '2027-06-15' }
];

// Danh mục cặp tương tác thuốc
export const SEED_DRUG_INTERACTIONS = [
  { drugAId: 3, drugAName: 'Aspirin 81mg', drugBId: 4, drugBName: 'Warfarin 5mg', severity: 'SEVERE', description: 'Tăng nguy cơ xuất huyết tiêu hóa và chảy máu nghiêm trọng khi phối hợp.' },
  { drugAId: 2, drugAName: 'Ibuprofen 400mg', drugBId: 3, drugBName: 'Aspirin 81mg', severity: 'MODERATE', description: 'Ibuprofen làm giảm tác dụng bảo vệ tim mạch của Aspirin và tăng nguy cơ loét dạ dày.' },
  { drugAId: 6, drugAName: 'Clarithromycin 500mg', drugBId: 11, drugBName: 'Atorvastatin 20mg', severity: 'SEVERE', description: 'Clarithromycin làm tăng nồng độ Atorvastatin gây nguy cơ tiêu cơ vân cấp và suy thận.' },
  { drugAId: 4, drugAName: 'Warfarin 5mg', drugBId: 10, drugBName: 'Ciprofloxacin 500mg', severity: 'MODERATE', description: 'Tăng thời gian đông máu INR và nguy cơ xuất huyết.' },
  { drugAId: 7, drugAName: 'Omeprazole 20mg', drugBId: 15, drugBName: 'Digoxin 0.25mg', severity: 'MILD', description: 'Tăng hấp thu Digoxin do thay đổi độ acid dịch vị.' },
  { drugAId: 8, drugAName: 'Metformin 500mg', drugBId: 10, drugBName: 'Ciprofloxacin 500mg', severity: 'MODERATE', description: 'Nguy cơ rối loạn điều hòa đường huyết nghiêm trọng.' }
];

// Dữ liệu ca khám mẫu
const DEFAULT_SEED_VISITS = [
  {
    id: 1,
    appointmentId: 1,
    patientId: 1,
    patientCode: 'BN-260928-001',
    patientName: 'Trần Đức Minh',
    patientPhone: '0912345678',
    patientGender: 'MALE',
    patientDob: '1988-06-15',
    doctorId: 1,
    doctorName: 'TS.BS Vi Mai Anh',
    doctorSpecialty: 'Khám bệnh & Nội tổng quát',
    departmentName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    visitTime: '2026-10-01T08:30:00',
    chiefComplaint: 'Đau thắt ngực khi gắng sức, thỉnh thoảng hồi hộp đánh trống ngực',
    vitalSigns: {
      pulse: 82,
      bloodPressureSystolic: 135,
      bloodPressureDiastolic: 85,
      temperature: 36.8,
      respiratoryRate: 18,
      spO2: 98,
      weight: 68,
      height: 172
    },
    diagnosisCode: 'I20.9',
    diagnosisNote: 'Theo dõi cơn đau thắt ngực không ổn định / Tăng huyết áp độ 1',
    status: 'IN_PROGRESS',
    prescriptions: [
      {
        id: 101,
        visitId: 1,
        estimatedTotalAmount: 18000,
        createdAt: '2026-10-01T08:45:00',
        items: [
          { id: 1, drugId: 3, drugCode: 'DRUG-ASP-81', drugName: 'Aspirin 81mg (Enteric-coated)', unit: 'Viên', unitPrice: 2000, dosage: '81mg', quantity: 30, instruction: 'Uống 1 viên vào buổi sáng sau ăn' }
        ]
      }
    ],
    labOrders: [
      {
        id: 201,
        visitId: 1,
        testType: 'Điện tâm đồ 12 chuyển đạo (ECG)',
        status: 'RESULTED',
        orderedAt: '2026-10-01T08:35:00',
        results: [
          {
            id: 301,
            labOrderId: 201,
            resultText: 'Nhịp xoang đều 82 ck/phút. Trục trung gian. ST chênh xuống nhẹ 0.5mm ở V5-V6 khi gắng sức.',
            resultedAt: '2026-10-01T08:50:00'
          }
        ]
      }
    ]
  },
  {
    id: 2,
    appointmentId: null,
    patientId: 2,
    patientCode: 'BN-260928-002',
    patientName: 'Lê Thị Thu Hằng',
    patientPhone: '0987654321',
    patientGender: 'FEMALE',
    patientDob: '1992-09-20',
    doctorId: 1,
    doctorName: 'TS.BS Vi Mai Anh',
    doctorSpecialty: 'Khám bệnh & Nội tổng quát',
    departmentName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    visitTime: '2026-10-01T09:15:00',
    chiefComplaint: 'Khám kiểm tra huyết áp định kỳ, đau đầu nhẹ vùng đỉnh',
    vitalSigns: {
      pulse: 76,
      bloodPressureSystolic: 140,
      bloodPressureDiastolic: 90,
      temperature: 36.6,
      respiratoryRate: 16,
      spO2: 99,
      weight: 55,
      height: 160
    },
    diagnosisCode: 'I10',
    diagnosisNote: 'Tăng huyết áp nguyên phát giai đoạn 1',
    status: 'IN_PROGRESS',
    prescriptions: [],
    labOrders: []
  }
];

const getStoredVisits = () => {
  try {
    const raw = localStorage.getItem(VISITS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(DEFAULT_SEED_VISITS));
      return [...DEFAULT_SEED_VISITS];
    }
    return JSON.parse(raw);
  } catch {
    return [...DEFAULT_SEED_VISITS];
  }
};

const saveStoredVisits = (visits) => {
  try {
    localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(visits));
  } catch (e) {
    console.error('Lỗi lưu visits vào LocalStorage:', e);
  }
};

export const visitService = {
  // Lấy danh sách ca khám
  async getVisits({ doctorId = null, patientId = null, status = null } = {}) {
    try {
      const params = {};
      if (doctorId) params.doctorId = doctorId;
      if (patientId) params.patientId = patientId;
      if (status) params.status = status;

      const res = await apiClient.get('/visits', { params });
      if (res && res.data && res.data.content) {
        return res.data.content;
      }
    } catch {
      // Fallback
    }

    const visits = getStoredVisits();
    return visits.filter(v => {
      if (doctorId && v.doctorId !== Number(doctorId)) return false;
      if (patientId && v.patientId !== Number(patientId)) return false;
      if (status && v.status !== status) return false;
      return true;
    });
  },

  // Chi tiết ca khám
  async getVisitById(id) {
    try {
      const res = await apiClient.get(`/visits/${id}`);
      if (res && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const visits = getStoredVisits();
    const found = visits.find(v => v.id === Number(id));
    if (!found) throw new Error(`Không tìm thấy ca khám ID ${id}`);
    return found;
  },

  // Tạo ca khám mới
  async createVisit(visitData) {
    try {
      const res = await apiClient.post('/visits', visitData);
      if (res && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const visits = getStoredVisits();
    const newId = visits.length > 0 ? Math.max(...visits.map(v => v.id)) + 1 : 1;

    const newVisit = {
      id: newId,
      appointmentId: visitData.appointmentId || null,
      patientId: visitData.patientId,
      patientCode: visitData.patientCode || `BN-${Date.now().toString().slice(-6)}`,
      patientName: visitData.patientName || 'Bệnh nhân mới',
      patientPhone: visitData.patientPhone || '',
      patientGender: visitData.patientGender || 'OTHER',
      patientDob: visitData.patientDob || '1990-01-01',
      doctorId: visitData.doctorId,
      doctorName: visitData.doctorName || 'TS.BS Vi Mai Anh',
      doctorSpecialty: visitData.doctorSpecialty || 'Đa khoa',
      departmentName: visitData.departmentName || 'Khoa Khám bệnh / Cấp cứu ban đầu',
      visitTime: new Date().toISOString(),
      chiefComplaint: visitData.chiefComplaint || '',
      vitalSigns: visitData.vitalSigns || null,
      diagnosisCode: visitData.diagnosisCode || '',
      diagnosisNote: visitData.diagnosisNote || '',
      status: 'IN_PROGRESS',
      prescriptions: [],
      labOrders: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    visits.unshift(newVisit);
    saveStoredVisits(visits);
    return newVisit;
  },

  // Cập nhật thông tin ca khám (sinh hiệu, chẩn đoán ICD-10)
  async updateVisit(id, updateData) {
    try {
      const res = await apiClient.put(`/visits/${id}`, updateData);
      if (res && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const visits = getStoredVisits();
    const idx = visits.findIndex(v => v.id === Number(id));
    if (idx === -1) throw new Error(`Không tìm thấy ca khám ID ${id}`);

    if (visits[idx].status === 'COMPLETED') {
      throw new Error('Ca khám đã hoàn tất, không thể chỉnh sửa!');
    }

    visits[idx] = {
      ...visits[idx],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    saveStoredVisits(visits);
    return visits[idx];
  },

  // Hoàn tất ca khám
  async completeVisit(id) {
    try {
      const res = await apiClient.patch(`/visits/${id}/complete`);
      if (res && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const visits = getStoredVisits();
    const idx = visits.findIndex(v => v.id === Number(id));
    if (idx === -1) throw new Error(`Không tìm thấy ca khám ID ${id}`);

    visits[idx].status = 'COMPLETED';
    visits[idx].updatedAt = new Date().toISOString();
    saveStoredVisits(visits);
    return visits[idx];
  },

  // Kê đơn thuốc
  async createPrescription(visitId, { items }) {
    try {
      const res = await apiClient.post(`/visits/${visitId}/prescriptions`, { items });
      if (res && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const visits = getStoredVisits();
    const visit = visits.find(v => v.id === Number(visitId));
    if (!visit) throw new Error(`Không tìm thấy ca khám ID ${visitId}`);

    const drugs = this.getDrugs();
    let total = 0;
    const populatedItems = items.map((item, index) => {
      const drug = drugs.find(d => d.id === Number(item.drugId)) || {};
      const unitPrice = drug.price || 0;
      total += unitPrice * (item.quantity || 1);
      return {
        id: index + 1,
        drugId: item.drugId,
        drugCode: drug.code || 'DRUG',
        drugName: drug.name || 'Thuốc',
        unit: drug.unit || 'Viên',
        unitPrice,
        dosage: item.dosage,
        quantity: item.quantity,
        instruction: item.instruction || ''
      };
    });

    const newPrescription = {
      id: Date.now(),
      visitId: Number(visitId),
      items: populatedItems,
      estimatedTotalAmount: total,
      createdAt: new Date().toISOString()
    };

    if (!visit.prescriptions) visit.prescriptions = [];
    visit.prescriptions.push(newPrescription);
    saveStoredVisits(visits);
    return newPrescription;
  },

  // Chỉ định cận lâm sàng
  async createLabOrder(visitId, { testType }) {
    try {
      const res = await apiClient.post(`/visits/${visitId}/lab-orders`, { testType });
      if (res && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const visits = getStoredVisits();
    const visit = visits.find(v => v.id === Number(visitId));
    if (!visit) throw new Error(`Không tìm thấy ca khám ID ${visitId}`);

    const newOrder = {
      id: Date.now(),
      visitId: Number(visitId),
      testType,
      status: 'ORDERED',
      orderedAt: new Date().toISOString(),
      results: []
    };

    if (!visit.labOrders) visit.labOrders = [];
    visit.labOrders.push(newOrder);
    saveStoredVisits(visits);
    return newOrder;
  },

  // Cập nhật kết quả cận lâm sàng
  async updateLabResult(orderId, { resultText, resultFileUrl }) {
    try {
      const res = await apiClient.put(`/lab-orders/${orderId}/result`, { resultText, resultFileUrl });
      if (res && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const visits = getStoredVisits();
    for (const v of visits) {
      if (v.labOrders) {
        const order = v.labOrders.find(o => o.id === Number(orderId));
        if (order) {
          order.status = 'RESULTED';
          const newResult = {
            id: Date.now(),
            labOrderId: Number(orderId),
            resultText,
            resultFileUrl: resultFileUrl || '',
            resultedAt: new Date().toISOString()
          };
          if (!order.results) order.results = [];
          order.results.push(newResult);
          saveStoredVisits(visits);
          return newResult;
        }
      }
    }

    throw new Error(`Không tìm thấy chỉ định CLS ID ${orderId}`);
  },

  // Lấy danh mục thuốc
  getDrugs(keyword = '') {
    const key = keyword.toLowerCase().trim();
    if (!key) return SEED_DRUGS;
    return SEED_DRUGS.filter(d =>
      d.name.toLowerCase().includes(key) || d.code.toLowerCase().includes(key)
    );
  },

  // Kiểm tra tương tác thuốc trong đơn
  checkDrugInteractions(drugIds = []) {
    if (drugIds.length < 2) return [];
    const idSet = new Set(drugIds.map(Number));
    return SEED_DRUG_INTERACTIONS.filter(inter =>
      idSet.has(inter.drugAId) && idSet.has(inter.drugBId)
    );
  }
};

export default visitService;
