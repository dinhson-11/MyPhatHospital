import apiClient from './api';

const NURSE_VITALS_QUEUE_KEY = 'hms_nurse_vitals_queue';
const NURSE_LAB_QUEUE_KEY = 'hms_nurse_lab_queue';

const DEFAULT_VITALS_QUEUE = [
  {
    visitId: 101,
    patientId: 1,
    patientCode: 'BN-260928-001',
    fullName: 'Trần Đức Minh',
    gender: 'MALE',
    age: 36,
    reason: 'Đau đầu, tức ngực',
    status: 'WAITING_VITALS',
    vitals: null
  },
  {
    visitId: 102,
    patientId: 2,
    patientCode: 'BN-260928-002',
    fullName: 'Lê Thị Thu Thủy',
    gender: 'FEMALE',
    age: 32,
    reason: 'Sốt cao, đau họng',
    status: 'WAITING_VITALS',
    vitals: null
  }
];

const DEFAULT_LAB_ORDERS = [
  {
    id: 201,
    visitId: 101,
    patientCode: 'BN-260928-001',
    patientName: 'Trần Đức Minh',
    testType: 'Công thức máu toàn bộ (CBC)',
    status: 'ORDERED',
    orderedAt: '2026-10-04 08:45',
    result: null
  },
  {
    id: 202,
    visitId: 101,
    patientCode: 'BN-260928-001',
    patientName: 'Trần Đức Minh',
    testType: 'Đường huyết đói (Glucose)',
    status: 'ORDERED',
    orderedAt: '2026-10-04 08:46',
    result: null
  }
];

export const nurseService = {
  getVitalsQueue() {
    const raw = localStorage.getItem(NURSE_VITALS_QUEUE_KEY);
    if (!raw) {
      localStorage.setItem(NURSE_VITALS_QUEUE_KEY, JSON.stringify(DEFAULT_VITALS_QUEUE));
      return [...DEFAULT_VITALS_QUEUE];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [...DEFAULT_VITALS_QUEUE];
    }
  },

  async saveVitals(visitId, vitals) {
    try {
      const payload = {
        vitalSigns: JSON.stringify(vitals)
      };
      await apiClient.put(`/visits/${visitId}`, payload);
    } catch {
      // offline fallback
    }
    const queue = this.getVitalsQueue();
    const bmiCalc = vitals.weightKg && vitals.heightCm ? this.calculateBmi(vitals.weightKg, vitals.heightCm) : null;
    const fullVitals = {
      ...vitals,
      visitId,
      bmi: bmiCalc ? bmiCalc.bmi : vitals.bmi,
      bmiCategory: bmiCalc ? bmiCalc.category : vitals.bmiCategory
    };
    const updated = queue.map((v) =>
      v.visitId === visitId ? { ...v, status: 'VITALS_COMPLETED', vitals: fullVitals } : v
    );
    localStorage.setItem(NURSE_VITALS_QUEUE_KEY, JSON.stringify(updated));
    return { success: true, ...fullVitals };
  },

  async getVitalsByVisit(visitId) {
    const queue = this.getVitalsQueue();
    const found = queue.find((v) => v.visitId === visitId);
    return found?.vitals || null;
  },

  getLabOrders() {
    const raw = localStorage.getItem(NURSE_LAB_QUEUE_KEY);
    if (!raw) {
      localStorage.setItem(NURSE_LAB_QUEUE_KEY, JSON.stringify(DEFAULT_LAB_ORDERS));
      return [...DEFAULT_LAB_ORDERS];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [...DEFAULT_LAB_ORDERS];
    }
  },

  async getPendingLabOrders() {
    const orders = this.getLabOrders();
    return orders.map((o) => ({
      ...o,
      testName: o.testType
    }));
  },

  async submitLabResult(orderId, resultData) {
    try {
      await apiClient.put(`/lab-orders/${orderId}/result`, resultData);
    } catch {
      // offline fallback
    }
    const orders = this.getLabOrders();
    const updated = orders.map((o) =>
      o.id === orderId ? { ...o, status: 'COMPLETED', result: resultData, ...resultData } : o
    );
    localStorage.setItem(NURSE_LAB_QUEUE_KEY, JSON.stringify(updated));
    return { success: true, status: 'COMPLETED', orderId, ...resultData };
  },

  calculateBmi(weightKg, heightCm) {
    if (!weightKg || !heightCm || heightCm <= 0) return null;
    const heightM = heightCm / 100;
    const bmiVal = (weightKg / (heightM * heightM)).toFixed(1);
    const bmi = parseFloat(bmiVal);
    let category = 'Bình thường';
    let color = 'emerald';
    if (bmi < 18.5) {
      category = 'Gầy (Thiếu cân)';
      color = 'amber';
    } else if (bmi >= 23 && bmi < 25) {
      category = 'Tiền béo phì (Thừa cân)';
      color = 'amber';
    } else if (bmi >= 25 && bmi < 30) {
      category = 'Béo phì';
      color = 'rose';
    } else if (bmi >= 30) {
      category = 'Béo phì độ I';
      color = 'rose';
    }
    return { bmi, category, color };
  }
};
