import apiClient from './api';

export const AI_DISCLAIMER_TEXT =
  'Kết quả do AI phân tích chỉ mang tính tham khảo, không thay thế phán đoán lâm sàng của bác sĩ.';

// Cơ sở tri thức tương tác thuốc cục bộ dự phòng (Fallback khi Backend / AI offline)
const FALLBACK_INTERACTIONS = [
  {
    keywordsA: ['aspirin', 'acetylsalicylic'],
    keywordsB: ['warfarin', 'coumadin'],
    severity: 'CRITICAL',
    mechanism: 'Cộng hưởng tác dụng chống ngưng tập tiểu cầu và chống đông máu.',
    description: 'Tăng vọt nguy cơ xuất huyết tiêu hóa và chảy máu nghiêm trọng đe dọa tính mạng.',
    recommendation: 'Tránh phối hợp. Nếu bắt buộc, cần theo dõi sát chỉ số đông máu INR và bổ sung thuốc bảo vệ dạ dày.'
  },
  {
    keywordsA: ['ibuprofen', 'nsaid'],
    keywordsB: ['aspirin', 'acetylsalicylic'],
    severity: 'WARNING',
    mechanism: 'Ibuprofen cạnh tranh enzym COX-1, ngăn cản Aspirin bảo vệ tim mạch.',
    description: 'Làm mất tác dụng chống huyết khối của Aspirin liều thấp và tăng nguy cơ loét dạ dày tá tràng.',
    recommendation: 'Khuyến cáo dùng Paracetamol thay thế. Nếu bắt buộc, uống Aspirin trước Ibuprofen ít nhất 2 giờ.'
  },
  {
    keywordsA: ['clarithromycin'],
    keywordsB: ['atorvastatin', 'simvastatin'],
    severity: 'CRITICAL',
    mechanism: 'Clarithromycin ức chế mạnh CYP3A4 làm tăng nồng độ Statin trong máu.',
    description: 'Nguy cơ cao gây tiêu cơ vân cấp (rhabdomyolysis), myoglobin niệu và suy thận cấp tính.',
    recommendation: 'Chống chỉ định phối hợp. Tạm ngừng Atorvastatin trong suốt đợt dùng Clarithromycin hoặc đổi kháng sinh.'
  },
  {
    keywordsA: ['ciprofloxacin'],
    keywordsB: ['warfarin', 'coumadin'],
    severity: 'WARNING',
    mechanism: 'Ciprofloxacin ức chế CYP1A2 và giảm vi khuẩn tổng hợp Vitamin K.',
    description: 'Làm tăng chỉ số INR và tăng nguy cơ xuất huyết.',
    recommendation: 'Theo dõi chỉ số INR và cân nhắc giảm liều Warfarin.'
  },
  {
    keywordsA: ['ciprofloxacin'],
    keywordsB: ['metformin'],
    severity: 'WARNING',
    mechanism: 'Tác động lên tế bào đảo tụy và kênh vận chuyển bài tiết tại thận.',
    description: 'Rối loạn điều hòa đường huyết nghiêm trọng (hạ hoặc tăng đường huyết).',
    recommendation: 'Theo dõi sát đường huyết mao mạch và hướng dẫn bệnh nhân xử trí hạ đường huyết.'
  },
  {
    keywordsA: ['omeprazole'],
    keywordsB: ['digoxin'],
    severity: 'WARNING',
    mechanism: 'Tăng pH dạ dày làm tăng hấp thu Digoxin.',
    description: 'Tăng nồng độ Digoxin trong huyết thanh, nguy cơ ngộ độc Digoxin gây loạn nhịp tim.',
    recommendation: 'Theo dõi nồng độ Digoxin máu và điện tâm đồ định kỳ.'
  }
];

// Cơ sở tri thức dị ứng dự phòng
const FALLBACK_ALLERGIES = [
  {
    family: 'Penicillins',
    keywords: ['penicillin', 'amoxicillin', 'ampicillin', 'augmentin'],
    drugs: [
      {
        keywords: ['amoxicillin', 'ampicillin', 'augmentin'],
        type: 'DIRECT_MATCH',
        severity: 'CRITICAL',
        desc: 'Nguy cơ sốc phản vệ, phù Quinke hoặc nổi mề đay toàn thân cấp tính.',
        recom: 'Chống chỉ định tuyệt đối. Đổi sang kháng sinh nhóm Macrolide.'
      },
      {
        keywords: ['ceftriaxone', 'cefuroxime', 'cephalosporin'],
        type: 'CROSS_REACTIVITY',
        severity: 'WARNING',
        desc: 'Kháng sinh Cephalosporin có tỷ lệ phản ứng chéo khoảng 5-10% với Penicillin.',
        recom: 'Thận trọng theo dõi hoặc làm test da trước khi tiêm.'
      }
    ]
  },
  {
    family: 'NSAIDs',
    keywords: ['aspirin', 'ibuprofen', 'nsaid', 'diclofenac'],
    drugs: [
      {
        keywords: ['aspirin', 'ibuprofen', 'diclofenac'],
        type: 'DIRECT_MATCH',
        severity: 'CRITICAL',
        desc: 'Tiền sử dị ứng Aspirin/NSAID: Nguy cơ co thắt phế quản cấp tính, khởi phát cơn hen suyễn kịch phát.',
        recom: 'Chống chỉ định tất cả các thuốc NSAIDs. Dùng Paracetamol thay thế.'
      }
    ]
  }
];

function matchText(text, keywords) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

export const aiAlertService = {
  /**
   * Kiểm tra an toàn đơn thuốc tổng thể (kêu gọi Backend Spring Boot hoặc fallback)
   */
  async checkPrescriptionSafety(visitId, drugs = [], patientAllergies = []) {
    // Chuẩn bị payload
    const formattedDrugs = drugs.map(d => ({
      id: d.id || d.drugId,
      code: d.code,
      name: d.name || d.drugName,
      dosage: d.dosage
    })).filter(d => d.name);

    if (formattedDrugs.length === 0) {
      return {
        is_safe: true,
        has_warning: false,
        has_critical: false,
        interaction_count: 0,
        allergy_count: 0,
        interactions: [],
        allergy_alerts: [],
        confidence_score: 0.95,
        disclaimer: AI_DISCLAIMER_TEXT
      };
    }

    try {
      // 1. Thử gọi endpoint kiểm tra an toàn theo ca khám (có tự động lưu audit log NFR-8)
      if (visitId) {
        const res = await apiClient.post(`/ai/clinical/visits/${visitId}/check-safety`, formattedDrugs);
        if (res && res.data) return res.data;
        if (res && res.success && res.data) return res.data;
      }

      // 2. Thử gọi endpoint kiểm tra an toàn độc lập
      const res = await apiClient.post('/ai/clinical/check-safety', {
        drugs: formattedDrugs,
        patient_allergies: patientAllergies
      });
      if (res && res.data) return res.data;
    } catch (err) {
      console.warn('API AI check safety không khả dụng, kích hoạt fallback kiểm tra cục bộ:', err.message);
    }

    // 3. Fallback cục bộ
    return this.fallbackSafetyCheck(formattedDrugs, patientAllergies);
  },

  /**
   * Kiểm tra tương tác thuốc độc lập
   */
  async checkInteractions(drugs = []) {
    const formattedDrugs = drugs.map(d => ({
      id: d.id || d.drugId,
      code: d.code,
      name: d.name || d.drugName
    })).filter(d => d.name);

    if (formattedDrugs.length < 2) {
      return {
        has_interaction: false,
        has_critical: false,
        total_interactions: 0,
        interactions: [],
        disclaimer: AI_DISCLAIMER_TEXT
      };
    }

    try {
      const res = await apiClient.post('/ai/clinical/check-interaction', { drugs: formattedDrugs });
      if (res && res.data) return res.data;
    } catch (err) {
      console.warn('API check-interaction lỗi, dùng fallback:', err.message);
    }

    const interactions = this.fallbackDetectInteractions(formattedDrugs);
    return {
      has_interaction: interactions.length > 0,
      has_critical: interactions.some(i => i.severity === 'CRITICAL'),
      total_interactions: interactions.length,
      interactions,
      disclaimer: AI_DISCLAIMER_TEXT
    };
  },

  /**
   * Kiểm tra dị ứng thuốc độc lập
   */
  async checkAllergies(patientAllergies = [], drugs = []) {
    const formattedDrugs = drugs.map(d => ({
      id: d.id || d.drugId,
      name: d.name || d.drugName
    })).filter(d => d.name);

    try {
      const res = await apiClient.post('/ai/clinical/check-allergy', {
        patient_allergies: patientAllergies,
        drugs: formattedDrugs
      });
      if (res && res.data) return res.data;
    } catch (err) {
      console.warn('API check-allergy lỗi, dùng fallback:', err.message);
    }

    const alerts = this.fallbackDetectAllergies(formattedDrugs, patientAllergies);
    return {
      has_allergy_conflict: alerts.length > 0,
      has_critical: alerts.some(a => a.severity === 'CRITICAL'),
      total_alerts: alerts.length,
      alerts,
      disclaimer: AI_DISCLAIMER_TEXT
    };
  },

  /**
   * Lấy lịch sử audit log AI của ca khám (NFR-8)
   */
  async getVisitAuditLogs(visitId) {
    if (!visitId) return [];
    try {
      const res = await apiClient.get(`/ai/clinical/visits/${visitId}/suggestions`);
      if (res && res.data) return res.data;
    } catch (err) {
      console.warn('Không thể tải audit log AI ca khám:', err.message);
    }
    return [];
  },

  // =========================================================================
  // LOCAL FALLBACK ENGINES
  // =========================================================================
  fallbackSafetyCheck(drugs, patientAllergies) {
    const interactions = this.fallbackDetectInteractions(drugs);
    const allergyAlerts = this.fallbackDetectAllergies(drugs, patientAllergies);

    const hasWarning = interactions.length > 0 || allergyAlerts.length > 0;
    const hasCritical =
      interactions.some(i => i.severity === 'CRITICAL') ||
      allergyAlerts.some(a => a.severity === 'CRITICAL');

    return {
      is_safe: !hasWarning,
      has_warning: hasWarning,
      has_critical: hasCritical,
      interaction_count: interactions.length,
      allergy_count: allergyAlerts.length,
      interactions,
      allergy_alerts: allergyAlerts,
      confidence_score: 0.95,
      disclaimer: AI_DISCLAIMER_TEXT
    };
  },

  fallbackDetectInteractions(drugs) {
    const results = [];
    const n = drugs.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const drugA = drugs[i];
        const drugB = drugs[j];
        const nameA = `${drugA.name} ${drugA.code || ''}`;
        const nameB = `${drugB.name} ${drugB.code || ''}`;

        for (const rule of FALLBACK_INTERACTIONS) {
          const matchFwd = matchText(nameA, rule.keywordsA) && matchText(nameB, rule.keywordsB);
          const matchRev = matchText(nameB, rule.keywordsA) && matchText(nameA, rule.keywordsB);

          if (matchFwd || matchRev) {
            results.push({
              drug_a_id: drugA.id,
              drug_a_name: drugA.name,
              drug_b_id: drugB.id,
              drug_b_name: drugB.name,
              severity: rule.severity,
              mechanism: rule.mechanism,
              description: rule.description,
              recommendation: rule.recommendation
            });
          }
        }
      }
    }
    return results;
  },

  fallbackDetectAllergies(drugs, patientAllergies = []) {
    const alerts = [];
    if (!patientAllergies || patientAllergies.length === 0) return alerts;

    for (const drug of drugs) {
      const drugName = (drug.name || '').toLowerCase();

      for (const allergy of patientAllergies) {
        const allergen = (allergy.allergen || '').toLowerCase().trim();
        if (!allergen) continue;

        // Trùng khớp trực tiếp
        if (drugName.includes(allergen)) {
          alerts.push({
            drug_id: drug.id,
            drug_name: drug.name,
            allergen: allergy.allergen,
            reaction_type: 'DIRECT_MATCH',
            severity: 'CRITICAL',
            description: `Bệnh nhân có tiền sử dị ứng với '${allergy.allergen}'. Thuốc '${drug.name}' có thành phần trực tiếp trùng khớp.`,
            recommendation: 'Chống chỉ định. Đổi sang nhóm hoạt chất thay thế an toàn.'
          });
          continue;
        }

        // Dị ứng chéo theo nhóm dược lý
        for (const fam of FALLBACK_ALLERGIES) {
          if (matchText(allergen, fam.keywords)) {
            for (const item of fam.drugs) {
              if (matchText(drugName, item.keywords)) {
                alerts.push({
                  drug_id: drug.id,
                  drug_name: drug.name,
                  allergen: allergy.allergen,
                  reaction_type: item.type,
                  severity: item.severity,
                  description: `Phát hiện nguy cơ thuộc họ '${fam.family}': ${item.desc}`,
                  recommendation: item.recom
                });
                break;
              }
            }
          }
        }
      }
    }
    return alerts;
  }
};
