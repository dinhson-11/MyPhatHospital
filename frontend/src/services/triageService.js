import { TRIAGE_RULES } from './dataService';

export const triageService = {
  analyzeSymptom(query) {
    if (!query || typeof query !== 'string') {
      return null;
    }

    const cleanQuery = query.trim().toLowerCase();
    let matched = null;

    for (const rule of TRIAGE_RULES) {
      if (rule.keywords.some(kw => cleanQuery.includes(kw))) {
        matched = rule;
        break;
      }
    }

    if (!matched) {
      matched = {
        deptId: 1,
        deptName: 'Khoa Nội tổng quát',
        doctorId: 2,
        doctorName: 'PGS. TS. Trần Thị Mai',
        urgency: 'MEDIUM',
        urgencyLabel: 'Khám Nội tổng quát & Sàng lọc ban đầu',
        confidence: '95%',
        advice: 'Với các triệu chứng mô tả, hệ thống khuyến nghị bạn nên ưu tiên khám tại Khoa Nội tổng quát để bác sĩ kiểm tra lâm sàng toàn diện và chỉ định các xét nghiệm chẩn đoán thích hợp.'
      };
    }

    return matched;
  },

  triageSymptoms(query) {
    return this.analyzeSymptom(query);
  }
};
