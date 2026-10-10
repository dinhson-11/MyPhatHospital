import { TRIAGE_RULES } from './dataService';

export const triageService = {
  analyzeSymptom(query) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return null;
    }

    const cleanQuery = query.trim().toLowerCase();
    let bestRule = null;
    let highestScore = 0;

    for (const rule of TRIAGE_RULES) {
      let score = 0;
      for (const kw of rule.keywords) {
        if (cleanQuery.includes(kw)) {
          // Các đại từ nhân xưng chung chung ('trẻ', 'bé', 'con') có trọng số thấp hơn triệu chứng thực thể
          const isGenericDemographic = ['trẻ', 'bé', 'con'].includes(kw);
          const weight = isGenericDemographic ? 1 : (kw.length >= 6 ? 10 : 4);
          score += weight;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestRule = rule;
      }
    }

    let matched = bestRule;

    if (!matched) {
      matched = {
        deptId: 1,
        deptName: 'Khoa Khám bệnh / Cấp cứu ban đầu',
        doctorId: 1,
        doctorName: 'TS.BS Vi Mai Anh',
        urgency: 'MEDIUM',
        urgencyLabel: 'Khám bệnh & sàng lọc ban đầu',
        confidence: 'Thấp',
        advice: 'Với các triệu chứng mô tả, hệ thống khuyến nghị bạn nên ưu tiên khám tại Khoa Khám bệnh / Cấp cứu ban đầu để bác sĩ kiểm tra lâm sàng toàn diện và chỉ định các xét nghiệm chẩn đoán thích hợp.'
      };
    }

    return matched;
  },

  triageSymptoms(query) {
    return this.analyzeSymptom(query);
  }
};
