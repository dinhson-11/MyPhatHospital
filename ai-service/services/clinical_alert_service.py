"""
Clinical Alert Engine:
Phân tích tương tác thuốc (Drug-Drug Interactions) và cảnh báo dị ứng thuốc (Allergies & Cross-Reactivity).
Tuân thủ NFR-8: Disclaimer y tế bắt buộc và hỗ trợ quyết định lâm sàng cho bác sĩ.
"""

import re
from typing import List, Tuple, Dict, Any, Optional
from models.clinical import (
    DrugItem,
    PatientAllergyItem,
    DrugInteractionDetail,
    AllergyAlertDetail,
    InteractionCheckResponse,
    AllergyCheckResponse,
    PrescriptionSafetyResponse,
    MEDICAL_AI_DISCLAIMER,
)

# ============================================================================
# CƠ SỞ TRI THỨC TƯƠNG TÁC THUỐC LÂM SÀNG (DDI KNOWLEDGE BASE)
# ============================================================================
KNOWN_INTERACTIONS: List[Dict[str, Any]] = [
    {
        "keywords_a": ["aspirin", "acetylsalicylic"],
        "keywords_b": ["warfarin", "coumadin"],
        "severity": "CRITICAL",
        "mechanism": "Tác dụng hiệp đồng: Warfarin ức chế đông máu phụ thuộc Vitamin K trong khi Aspirin ức chế ngưng tập tiểu cầu và gây tổn thương niêm mạc dạ dày.",
        "description": "Tăng vọt nguy cơ xuất huyết tiêu hóa và chảy máu nghiêm trọng đe dọa tính mạng.",
        "recommendation": "Tránh phối hợp. Nếu bắt buộc theo chỉ định chuyên khoa tim mạch, cần giám sát chặt chẽ chỉ số INR, bổ sung thuốc bảo vệ dạ dày (PPI) và cảnh báo bệnh nhân dấu hiệu xuất huyết.",
    },
    {
        "keywords_a": ["ibuprofen", "nsaid"],
        "keywords_b": ["aspirin", "acetylsalicylic"],
        "severity": "WARNING",
        "mechanism": "Ibuprofen cạnh tranh vị trí gắn kết trên enzym COX-1, ngăn cản Aspirin acetyl hóa không thuận nghịch tiểu cầu, đồng thời cộng dồn độc tính trên đường tiêu hóa.",
        "description": "Làm mất tác dụng bảo vệ tim mạch chống huyết khối của Aspirin liều thấp và tăng nguy cơ viêm loét - xuất huyết dạ dày tá tràng.",
        "recommendation": "Khuyến cáo thay thế giảm đau hạ sốt bằng Paracetamol. Nếu bắt buộc dùng Ibuprofen, phải uống Aspirin trước Ibuprofen ít nhất 2 giờ.",
    },
    {
        "keywords_a": ["clarithromycin"],
        "keywords_b": ["atorvastatin", "simvastatin"],
        "severity": "CRITICAL",
        "mechanism": "Clarithromycin là chất ức chế mạnh CYP3A4 ở gan, làm giảm chuyển hóa bước một và giảm thanh thải Statin.",
        "description": "Làm tăng vọt nồng độ Atorvastatin huyết tương (gấp 4-10 lần), gây nguy cơ cao tiêu cơ vân cấp (rhabdomyolysis), myoglobin niệu và suy thận cấp.",
        "recommendation": "Chống chỉ định phối hợp. Tạm ngừng Atorvastatin trong suốt đợt điều trị bằng Clarithromycin, hoặc đổi sang kháng sinh không ức chế CYP3A4 (ví dụ Amoxicillin, Azithromycin).",
    },
    {
        "keywords_a": ["ciprofloxacin"],
        "keywords_b": ["warfarin", "coumadin"],
        "severity": "WARNING",
        "mechanism": "Ciprofloxacin ức chế isoenzyme CYP1A2 và giảm hệ vi khuẩn đường ruột tổng hợp Vitamin K, dẫn đến giảm đào thải Warfarin.",
        "description": "Làm tăng chỉ số INR và tăng đáng kể nguy cơ xuất huyết quá mức.",
        "recommendation": "Theo dõi sát chỉ số đông máu INR trong và sau đợt dùng Ciprofloxacin, cân nhắc giảm liều Warfarin khoảng 20-30%.",
    },
    {
        "keywords_a": ["ciprofloxacin"],
        "keywords_b": ["metformin"],
        "severity": "WARNING",
        "mechanism": "Fluoroquinolone can thiệp vào quá trình giải phóng insulin ở tế bào beta đảo tụy và vận chuyển qua ống thận OCT2.",
        "description": "Rối loạn điều hòa đường huyết nghiêm trọng (hạ đường huyết nặng hoặc tăng đường huyết khó kiểm soát).",
        "recommendation": "Theo dõi đường huyết thường xuyên. Hướng dẫn bệnh nhân nhận biết sớm các triệu chứng hạ đường huyết (run, vã mồ hôi, chóng mặt).",
    },
    {
        "keywords_a": ["omeprazole", "esomeprazole"],
        "keywords_b": ["digoxin"],
        "severity": "WARNING",
        "mechanism": "Thuốc ức chế bơm proton làm tăng pH dạ dày, dẫn đến giảm phân hủy Digoxin do acid và tăng mức độ sinh khả dụng.",
        "description": "Tăng nồng độ Digoxin trong huyết thanh, có thể dẫn đến ngộ độc Digoxin với biểu hiện loạn nhịp tim và rối loạn thị giác.",
        "recommendation": "Theo dõi nồng độ Digoxin máu và theo dõi điện tâm đồ (ECG) định kỳ, chú ý các dấu hiệu ngộ độc Digoxin.",
    },
    {
        "keywords_a": ["paracetamol", "acetaminophen"],
        "keywords_b": ["warfarin"],
        "severity": "INFO",
        "mechanism": "Chất chuyển hóa NAPQI có thể ức chế nhẹ enzym vitamin K epoxide reductase khi dùng Paracetamol liều cao kéo dài.",
        "description": "Dùng Paracetamol liều cao (> 2g/ngày) liên tục trên 3 ngày có thể làm tăng nhẹ chỉ số INR ở bệnh nhân đang dùng Warfarin.",
        "recommendation": "An toàn khi dùng liều thấp và ngắn ngày. Nếu dùng Paracetamol kéo dài, cần theo dõi kiểm tra INR.",
    },
    {
        "keywords_a": ["amlodipine"],
        "keywords_b": ["clarithromycin"],
        "severity": "WARNING",
        "mechanism": "Clarithromycin ức chế CYP3A4 làm chậm chuyển hóa Amlodipine.",
        "description": "Tăng nồng độ Amlodipine, dẫn đến hạ huyết áp quá mức, giãn mạch ngoại biên và phù mắt cá chân.",
        "recommendation": "Theo dõi huyết áp thường xuyên. Cân nhắc giảm liều Amlodipine nếu cần.",
    },
    {
        "keywords_a": ["diazepam"],
        "keywords_b": ["clarithromycin", "ciprofloxacin"],
        "severity": "WARNING",
        "mechanism": "Kháng sinh ức chế enzym gan làm giảm chuyển hóa Diazepam.",
        "description": "Tăng tích lũy Diazepam gây ức chế thần kinh trung ương kéo dài, buồn ngủ quá mức, suy hô hấp ở người cao tuổi.",
        "recommendation": "Theo dõi trạng thái tri giác của bệnh nhân, cân nhắc giảm liều Diazepam.",
    },
]

# ============================================================================
# CƠ SỞ TRI THỨC DỊ ỨNG & DỊ ỨNG CHÉO (ALLERGY & CROSS-REACTIVITY)
# ============================================================================
ALLERGY_FAMILIES: List[Dict[str, Any]] = [
    {
        "family": "Penicillins & Beta-lactams",
        "allergen_keywords": ["penicillin", "amoxicillin", "ampicillin", "augmentin", "beta-lactam", "oxacillin", "clavulanate"],
        "drugs": [
            {
                "keywords": ["amoxicillin", "ampicillin", "augmentin"],
                "reaction_type": "DIRECT_MATCH",
                "severity": "CRITICAL",
                "description": "Bệnh nhân có tiền sử dị ứng nhóm Penicillin/Amoxicillin. Sử dụng thuốc cùng nhóm có nguy cơ rất cao gây sốc phản vệ (Anaphylaxis), mày đay cấp tính hoặc phù mạch Quinke nguy hiểm tính mạng.",
                "recommendation": "CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI. Chuyển sang kháng sinh nhóm khác như Macrolide (Clarithromycin, Azithromycin) hoặc Quinolone nếu phù hợp kháng sinh đồ.",
            },
            {
                "keywords": ["ceftriaxone", "cephalosporin", "cefuroxime", "cefixime"],
                "reaction_type": "CROSS_REACTIVITY",
                "severity": "WARNING",
                "description": "Kháng sinh Cephalosporin chia sẻ cấu trúc vòng Beta-lactam với Penicillin, có tỷ lệ dị ứng chéo từ 3% đến 10%.",
                "recommendation": "Cân nhắc thận trọng. Nếu tiền sử dị ứng Penicillin là sốc phản vệ nặng thì chống chỉ định Cephalosporin. Khuyến cáo làm test lẩy da (Prick test) hoặc chọn kháng sinh không thuộc nhóm Beta-lactam.",
            },
        ],
    },
    {
        "family": "NSAIDs & Aspirin",
        "allergen_keywords": ["aspirin", "acetylsalicylic", "ibuprofen", "nsaid", "diclofenac", "meloxicam", "naproxen"],
        "drugs": [
            {
                "keywords": ["aspirin", "acetylsalicylic"],
                "reaction_type": "DIRECT_MATCH",
                "severity": "CRITICAL",
                "description": "Tiền sử dị ứng Aspirin/NSAID: Nguy cơ cao gây phản ứng quá mẫn tức thì, hội chứng Widal (hen suyễn, polyp mũi, dị ứng Aspirin) và co thắt phế quản cấp tính.",
                "recommendation": "CHỐNG CHỈ ĐỊNH dùng Aspirin. Sử dụng thuốc giảm đau thay thế an toàn như Paracetamol liều tiêu chuẩn.",
            },
            {
                "keywords": ["ibuprofen", "diclofenac", "meloxicam"],
                "reaction_type": "CROSS_REACTIVITY",
                "severity": "CRITICAL",
                "description": "Phản ứng dị ứng chéo giữa các thuốc nhóm NSAID do cơ chế ức chế cyclooxygenase-1 (COX-1) làm tăng sản sinh leukotriene gây co thắt phế quản và phù mạch.",
                "recommendation": "Tránh dùng tất cả các thuốc kháng viêm không steroid (NSAIDs). Khuyến cáo dùng Paracetamol thay thế.",
            },
        ],
    },
    {
        "family": "Fluoroquinolones",
        "allergen_keywords": ["ciprofloxacin", "levofloxacin", "ofloxacin", "quinolone", "moxifloxacin"],
        "drugs": [
            {
                "keywords": ["ciprofloxacin", "levofloxacin"],
                "reaction_type": "DIRECT_MATCH",
                "severity": "CRITICAL",
                "description": "Tiền sử dị ứng Quinolone: Nguy cơ viêm gân, phản ứng quá mẫn da nặng (Stevens-Johnson), phát ban toàn thân hoặc sốc phản vệ.",
                "recommendation": "CHỐNG CHỈ ĐỊNH nhóm Fluoroquinolones. Lựa chọn kháng sinh nhóm khác theo vị trí nhiễm khuẩn.",
            },
        ],
    },
    {
        "family": "Macrolides",
        "allergen_keywords": ["clarithromycin", "erythromycin", "azithromycin", "macrolide"],
        "drugs": [
            {
                "keywords": ["clarithromycin", "azithromycin", "erythromycin"],
                "reaction_type": "DIRECT_MATCH",
                "severity": "CRITICAL",
                "description": "Tiền sử dị ứng Macrolide: Nguy cơ phát ban dạng sởi, mề đay, sốt do thuốc, ứ mật hoặc phản ứng quá mẫn nghiêm trọng.",
                "recommendation": "CHỐNG CHỈ ĐỊNH nhóm Macrolides. Đổi sang kháng sinh nhóm Beta-lactam hoặc Lincosamide tùy lâm sàng.",
            },
        ],
    },
    {
        "family": "Paracetamol",
        "allergen_keywords": ["paracetamol", "acetaminophen"],
        "drugs": [
            {
                "keywords": ["paracetamol", "acetaminophen"],
                "reaction_type": "DIRECT_MATCH",
                "severity": "CRITICAL",
                "description": "Tiền sử dị ứng Paracetamol: Nguy cơ phát ban da cố định nhiễm sắc, hội chứng ngoại ban mụn mủ toàn thân cấp tính (AGEP) hoặc phản vệ.",
                "recommendation": "CHỐNG CHỈ ĐỊNH Paracetamol. Cân nhắc thuốc giảm đau hạ sốt nhóm khác phù hợp với thể trạng bệnh nhân.",
            },
        ],
    },
]


def _match_keywords(text: str, keywords: List[str]) -> bool:
    """Kiểm tra chuỗi text có chứa từ khóa nào trong keywords không."""
    if not text:
        return False
    lower_text = text.lower()
    for kw in keywords:
        pattern = r"\b" + re.escape(kw.lower())
        if re.search(pattern, lower_text) or kw.lower() in lower_text:
            return True
    return False


class ClinicalAlertService:
    """Dịch vụ AI kiểm tra an toàn kê đơn lâm sàng."""

    @staticmethod
    def check_drug_interactions(drugs: List[DrugItem]) -> InteractionCheckResponse:
        """Phát hiện tương tác giữa các thuốc trong danh sách."""
        interactions_found: List[DrugInteractionDetail] = []
        n = len(drugs)

        for i in range(n):
            for j in range(i + 1, n):
                drug_a = drugs[i]
                drug_b = drugs[j]

                name_a = f"{drug_a.name} {drug_a.code or ''} {drug_a.active_ingredient or ''}"
                name_b = f"{drug_b.name} {drug_b.code or ''} {drug_b.active_ingredient or ''}"

                for rule in KNOWN_INTERACTIONS:
                    match_forward = _match_keywords(name_a, rule["keywords_a"]) and _match_keywords(name_b, rule["keywords_b"])
                    match_reverse = _match_keywords(name_b, rule["keywords_a"]) and _match_keywords(name_a, rule["keywords_b"])

                    if match_forward or match_reverse:
                        interactions_found.append(
                            DrugInteractionDetail(
                                drug_a_id=drug_a.id,
                                drug_a_name=drug_a.name,
                                drug_b_id=drug_b.id,
                                drug_b_name=drug_b.name,
                                severity=rule["severity"],
                                mechanism=rule["mechanism"],
                                description=rule["description"],
                                recommendation=rule["recommendation"],
                            )
                        )

        has_interaction = len(interactions_found) > 0
        has_critical = any(it.severity == "CRITICAL" for it in interactions_found)

        return InteractionCheckResponse(
            has_interaction=has_interaction,
            has_critical=has_critical,
            total_interactions=len(interactions_found),
            interactions=interactions_found,
            confidence_score=0.98 if has_interaction else 0.95,
            disclaimer=MEDICAL_AI_DISCLAIMER,
        )

    @staticmethod
    def check_patient_allergies(allergies: List[PatientAllergyItem], drugs: List[DrugItem]) -> AllergyCheckResponse:
        """Phát hiện xung đột dị ứng trực tiếp và dị ứng chéo."""
        alerts: List[AllergyAlertDetail] = []

        if not allergies or not drugs:
            return AllergyCheckResponse(
                has_allergy_conflict=False,
                has_critical=False,
                total_alerts=0,
                alerts=[],
                confidence_score=0.95,
                disclaimer=MEDICAL_AI_DISCLAIMER,
            )

        for drug in drugs:
            drug_text = f"{drug.name} {drug.code or ''} {drug.active_ingredient or ''}".lower()

            for allergy in allergies:
                allergen_text = allergy.allergen.strip().lower()

                # 1. So khớp trực tiếp (Direct match) theo tên allergen
                if allergen_text in drug_text or _match_keywords(drug_text, [allergen_text]):
                    alerts.append(
                        AllergyAlertDetail(
                            drug_id=drug.id,
                            drug_name=drug.name,
                            allergen=allergy.allergen,
                            reaction_type="DIRECT_MATCH",
                            severity="CRITICAL",
                            description=(
                                f"Bệnh nhân có tiền sử dị ứng với '{allergy.allergen}' "
                                f"(Ghi chú: {allergy.note or 'Không có'}). "
                                f"Thuốc '{drug.name}' có thành phần trực tiếp trùng khớp với tác nhân gây dị ứng."
                            ),
                            recommendation="CHỐNG CHỈ ĐỊNH. Đổi sang nhóm thuốc khác có cơ chế tác dụng tương đương nhưng không chứa hoạt chất này.",
                        )
                    )
                    continue

                # 2. So khớp chéo theo họ dược lý (Cross-reactivity classes)
                for family in ALLERGY_FAMILIES:
                    # Kiểm tra xem allergen của bệnh nhân có thuộc họ này không
                    if _match_keywords(allergen_text, family["allergen_keywords"]):
                        # Kiểm tra xem thuốc trong đơn có thuộc họ này không
                        for item in family["drugs"]:
                            if _match_keywords(drug_text, item["keywords"]):
                                alerts.append(
                                    AllergyAlertDetail(
                                        drug_id=drug.id,
                                        drug_name=drug.name,
                                        allergen=allergy.allergen,
                                        reaction_type=item["reaction_type"],
                                        severity=item["severity"],
                                        description=(
                                            f"Phát hiện nguy cơ theo họ dược lý '{family['family']}': {item['description']}"
                                        ),
                                        recommendation=item["recommendation"],
                                    )
                                )
                                break

        has_conflict = len(alerts) > 0
        has_critical = any(a.severity == "CRITICAL" for a in alerts)

        return AllergyCheckResponse(
            has_allergy_conflict=has_conflict,
            has_critical=has_critical,
            total_alerts=len(alerts),
            alerts=alerts,
            confidence_score=0.96 if has_conflict else 0.95,
            disclaimer=MEDICAL_AI_DISCLAIMER,
        )

    @classmethod
    def check_prescription_safety(
        cls, drugs: List[DrugItem], allergies: List[PatientAllergyItem]
    ) -> PrescriptionSafetyResponse:
        """Kiểm tra an toàn tổng hợp cả tương tác thuốc và dị ứng."""
        interaction_res = cls.check_drug_interactions(drugs)
        allergy_res = cls.check_patient_allergies(allergies, drugs)

        has_warning = interaction_res.has_interaction or allergy_res.has_allergy_conflict
        has_critical = interaction_res.has_critical or allergy_res.has_critical
        is_safe = not has_warning

        return PrescriptionSafetyResponse(
            is_safe=is_safe,
            has_warning=has_warning,
            has_critical=has_critical,
            interaction_count=interaction_res.total_interactions,
            allergy_count=allergy_res.total_alerts,
            interactions=interaction_res.interactions,
            allergy_alerts=allergy_res.alerts,
            confidence_score=0.97,
            disclaimer=MEDICAL_AI_DISCLAIMER,
        )
