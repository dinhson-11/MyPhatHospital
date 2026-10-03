"""
AI Diagnosis Suggestion Engine (FR-11.3 – Sprint 6):
Gợi ý chẩn đoán phân biệt ICD-10 dựa trên triệu chứng bệnh nhân.
Rule-based weighted keyword scoring với cơ sở tri thức lâm sàng tiếng Việt.
Tuân thủ NFR-8: Disclaimer y tế bắt buộc và hỗ trợ quyết định lâm sàng.
"""

import re
from typing import List, Dict, Any

from models.clinical import (
    DiagnosisSuggestionItem,
    DiagnosisSuggestionResponse,
    MEDICAL_AI_DISCLAIMER,
)


# ============================================================================
# CƠ SỞ TRI THỨC CHẨN ĐOÁN LÂM SÀNG ICD-10 (10 NHÓM BỆNH LÝ)
# ============================================================================
DIAGNOSIS_KNOWLEDGE_BASE: List[Dict[str, Any]] = [
    # 1. TIM MẠCH (Cardiovascular)
    {
        "group": "Tim mạch",
        "keywords": ["đau ngực", "tức ngực", "khó thở", "huyết áp", "hoa mắt",
                     "chóng mặt", "hồi hộp", "đánh trống ngực", "phù chân",
                     "mệt khi gắng sức", "đau thắt ngực", "tim đập nhanh"],
        "suggestions": [
            {
                "code": "I10",
                "name": "Tăng huyết áp vô căn (nguyên phát)",
                "base_confidence": 94,
                "reason": "Triệu chứng đau tức ngực, chóng mặt, hoa mắt phù hợp với biến thiên huyết áp cao. Cần đo HA liên tục và đánh giá tổn thương cơ quan đích.",
            },
            {
                "code": "I20.9",
                "name": "Cơn đau thắt ngực, không đặc hiệu",
                "base_confidence": 85,
                "reason": "Cảm giác đau thắt, tức nặng vùng ngực trái cần theo dõi điện tim (ECG 12 chuyển đạo) và xét nghiệm men tim Troponin-I/T.",
            },
            {
                "code": "I25.1",
                "name": "Bệnh tim thiếu máu cục bộ xơ vữa động mạch",
                "base_confidence": 78,
                "reason": "Nguy cơ bệnh mạch vành mạn tính cần đánh giá yếu tố nguy cơ tim mạch (tuổi, hút thuốc, đái tháo đường, rối loạn lipid máu).",
            },
        ],
    },
    # 2. HÔ HẤP (Respiratory)
    {
        "group": "Hô hấp",
        "keywords": ["ho", "sốt", "đờm", "rát họng", "viêm họng", "khàn tiếng",
                     "sổ mũi", "nghẹt mũi", "hắt hơi", "khó thở", "thở khò khè",
                     "đau ngực khi ho", "ho khan", "ho có đờm"],
        "suggestions": [
            {
                "code": "J00",
                "name": "Viêm mũi họng cấp (Cảm lạnh thông thường)",
                "base_confidence": 96,
                "reason": "Hội chứng viêm long đường hô hấp trên cấp tính: sổ mũi, hắt hơi, đau rát họng, sốt nhẹ. Thường do virus gây ra, tự khỏi trong 5-7 ngày.",
            },
            {
                "code": "J02.9",
                "name": "Viêm họng cấp, không đặc hiệu",
                "base_confidence": 88,
                "reason": "Đau rát họng tăng khi nuốt kèm sung huyết niêm mạc họng. Cần phân biệt viêm họng do vi khuẩn (liên cầu nhóm A) để chỉ định kháng sinh đúng.",
            },
            {
                "code": "J20.9",
                "name": "Viêm phế quản cấp, không đặc hiệu",
                "base_confidence": 82,
                "reason": "Ho khan chuyển sang ho đờm đục kèm sốt, ran phế quản khi nghe phổi. X-quang phổi loại trừ viêm phổi.",
            },
        ],
    },
    # 3. TIÊU HÓA (Gastrointestinal)
    {
        "group": "Tiêu hóa",
        "keywords": ["đau bụng", "dạ dày", "ợ chua", "buồn nôn", "thượng vị",
                     "tiêu chảy", "táo bón", "ợ nóng", "chướng bụng", "đầy hơi",
                     "nôn", "trào ngược", "đau vùng bụng", "khó tiêu"],
        "suggestions": [
            {
                "code": "K29.7",
                "name": "Viêm dạ dày, không đặc hiệu",
                "base_confidence": 95,
                "reason": "Đau quặn vùng thượng vị, ợ hơi ợ chua sau bữa ăn. Cần nội soi dạ dày tá tràng và test H.pylori nếu tái phát nhiều lần.",
            },
            {
                "code": "K21.9",
                "name": "Bệnh trào ngược dạ dày - thực quản (GERD)",
                "base_confidence": 89,
                "reason": "Ợ nóng rát sau xương ức, đắng miệng, khàn giọng buổi sáng. Đáp ứng tốt với thuốc ức chế bơm proton (PPI).",
            },
            {
                "code": "K58.9",
                "name": "Hội chứng ruột kích thích (IBS)",
                "base_confidence": 76,
                "reason": "Rối loạn tiêu hóa mạn tính: đau bụng quặn giảm sau đi ngoài, phân lỏng xen kẽ táo bón, liên quan stress tâm lý.",
            },
        ],
    },
    # 4. NỘI TIẾT – CHUYỂN HÓA (Endocrine / Metabolic)
    {
        "group": "Nội tiết – Chuyển hóa",
        "keywords": ["đái tháo đường", "tiểu đường", "khát nước", "sụt cân",
                     "tiểu nhiều", "mệt mỏi", "tăng cân", "đường huyết",
                     "tuyến giáp", "run tay", "ra mồ hôi nhiều", "béo phì"],
        "suggestions": [
            {
                "code": "E11.9",
                "name": "Đái tháo đường typ 2 không có biến chứng",
                "base_confidence": 93,
                "reason": "Bộ ba triệu chứng kinh điển: ăn nhiều, uống nhiều, tiểu nhiều (3 Poly) kèm sụt cân không rõ nguyên nhân. Cần xét nghiệm HbA1c và đường huyết lúc đói.",
            },
            {
                "code": "E05.9",
                "name": "Cường giáp (Thyrotoxicosis), không đặc hiệu",
                "base_confidence": 80,
                "reason": "Sụt cân nhanh mặc dù ăn nhiều, run tay, tim đập nhanh, ra mồ hôi nhiều. Cần đo TSH, FT3, FT4.",
            },
            {
                "code": "E14.9",
                "name": "Đái tháo đường không đặc hiệu",
                "base_confidence": 84,
                "reason": "Triệu chứng mệt mỏi dai dẳng, vết thương chậm lành, thị lực giảm. Cần sàng lọc glucose máu.",
            },
        ],
    },
    # 5. CƠ XƯƠNG KHỚP (Musculoskeletal)
    {
        "group": "Cơ xương khớp",
        "keywords": ["vai gáy", "cột sống", "đau lưng", "thoái hóa", "tê bì",
                     "đau khớp", "sưng khớp", "cứng khớp", "đau cơ", "đau vai",
                     "đau cổ", "thoát vị đĩa đệm", "đau gối"],
        "suggestions": [
            {
                "code": "M54.2",
                "name": "Đau cổ gáy (Cervicalgia)",
                "base_confidence": 92,
                "reason": "Co cứng cơ cạnh cột sống cổ, đau mỏi vai gáy lan lên đầu. Thường liên quan tư thế làm việc sai và thoái hóa đốt sống cổ.",
            },
            {
                "code": "M47.8",
                "name": "Thoái hóa cột sống khác",
                "base_confidence": 86,
                "reason": "Đau âm ỉ cột sống tăng khi vận động, giai đoạn đầu đáp ứng nghỉ ngơi. X-quang có thể thấy gai xương, hẹp khe khớp.",
            },
            {
                "code": "M54.5",
                "name": "Đau thắt lưng (Low back pain)",
                "base_confidence": 80,
                "reason": "Hạn chế tầm vận động thắt lưng, đau tăng khi cúi/nâng vật nặng. Cần phân biệt với thoát vị đĩa đệm bằng MRI nếu có dấu hiệu chèn ép rễ thần kinh.",
            },
        ],
    },
    # 6. THẦN KINH (Neurology)
    {
        "group": "Thần kinh",
        "keywords": ["đau đầu", "chóng mặt", "mất ngủ", "hoa mắt", "co giật",
                     "tê tay", "tê chân", "yếu liệt", "run", "mất thăng bằng",
                     "nhức đầu", "đau nửa đầu", "giảm trí nhớ"],
        "suggestions": [
            {
                "code": "G43.9",
                "name": "Đau nửa đầu (Migraine), không đặc hiệu",
                "base_confidence": 91,
                "reason": "Đau nửa đầu từng cơn theo nhịp mạch đập, buồn nôn, sợ ánh sáng/tiếng ồn (photophobia/phonophobia). Tiền triệu aura có thể xuất hiện.",
            },
            {
                "code": "G47.0",
                "name": "Rối loạn khởi phát và duy trì giấc ngủ (Mất ngủ)",
                "base_confidence": 85,
                "reason": "Khó vào giấc, ngủ không sâu, thức giấc sớm, mệt mỏi ban ngày. Cần đánh giá yếu tố tâm lý và vệ sinh giấc ngủ.",
            },
            {
                "code": "R51",
                "name": "Đau đầu, không đặc hiệu",
                "base_confidence": 79,
                "reason": "Đau đầu cần phân biệt nguyên phát (căng cơ, migraine) và thứ phát (tăng huyết áp, u não, viêm màng não). Cần CT/MRI sọ nếu có dấu hiệu cờ đỏ.",
            },
        ],
    },
    # 7. TIẾT NIỆU (Urology)
    {
        "group": "Tiết niệu",
        "keywords": ["tiểu buốt", "tiểu rắt", "đau hông lưng", "nước tiểu đục",
                     "tiểu máu", "tiểu khó", "tiểu đêm", "sỏi thận",
                     "đau vùng bàng quang", "tiểu gấp"],
        "suggestions": [
            {
                "code": "N39.0",
                "name": "Nhiễm khuẩn đường tiết niệu, vị trí không xác định",
                "base_confidence": 93,
                "reason": "Tiểu buốt, tiểu rắt, nước tiểu đục mùi hôi. Cần tổng phân tích nước tiểu (UA) và cấy nước tiểu nếu tái phát.",
            },
            {
                "code": "N20.0",
                "name": "Sỏi thận",
                "base_confidence": 87,
                "reason": "Cơn đau quặn thắt lưng/mạn sườn lan xuống bẹn, buồn nôn, tiểu máu vi thể. Siêu âm hoặc CT scan hệ tiết niệu xác định.",
            },
            {
                "code": "N30.0",
                "name": "Viêm bàng quang cấp",
                "base_confidence": 82,
                "reason": "Tiểu gấp, tiểu nhiều lần, đau vùng hạ vị, nước tiểu đục. Thường gặp ở nữ giới.",
            },
        ],
    },
    # 8. DA LIỄU (Dermatology)
    {
        "group": "Da liễu",
        "keywords": ["phát ban", "ngứa", "nổi mẩn", "mề đay", "chàm",
                     "nấm da", "mụn", "vảy nến", "rụng tóc", "da khô",
                     "sẩn ngứa", "nổi mề đay", "dị ứng da"],
        "suggestions": [
            {
                "code": "L50.9",
                "name": "Mề đay (Urticaria), không đặc hiệu",
                "base_confidence": 94,
                "reason": "Phát ban sẩn phù ngứa dữ dội, nổi từng mảng rồi biến mất sau vài giờ. Cần tìm tác nhân gây dị ứng và dùng kháng histamine.",
            },
            {
                "code": "L30.9",
                "name": "Viêm da (Dermatitis), không đặc hiệu",
                "base_confidence": 86,
                "reason": "Vùng da đỏ, ngứa, bong vảy mạn tính. Phân biệt viêm da cơ địa, viêm da tiếp xúc và viêm da dị ứng.",
            },
            {
                "code": "B35.9",
                "name": "Bệnh nấm da (Dermatophytosis), không đặc hiệu",
                "base_confidence": 78,
                "reason": "Vùng da đỏ hình tròn viền rõ, bong vảy, ngứa vừa. Cần soi nấm KOH trực tiếp xác định.",
            },
        ],
    },
    # 9. MẮT – TAI MŨI HỌNG (Ophthalmology / ENT)
    {
        "group": "Mắt – Tai Mũi Họng",
        "keywords": ["đau mắt", "mờ mắt", "ù tai", "đau tai", "chảy mủ tai",
                     "viêm tai", "nghẹt tai", "giảm thị lực", "chảy nước mắt",
                     "viêm xoang", "đau xoang", "chảy mũi"],
        "suggestions": [
            {
                "code": "J01.9",
                "name": "Viêm xoang cấp, không đặc hiệu",
                "base_confidence": 92,
                "reason": "Đau nhức vùng xoang (trán, gò má), nghẹt mũi, chảy dịch mũi đục, sốt nhẹ. X-quang hoặc CT xoang xác nhận.",
            },
            {
                "code": "H66.9",
                "name": "Viêm tai giữa, không đặc hiệu",
                "base_confidence": 85,
                "reason": "Đau tai nhức nhối, ù tai, giảm thính lực, có thể chảy mủ tai. Nội soi tai xác nhận màng nhĩ sưng đỏ.",
            },
            {
                "code": "H10.9",
                "name": "Viêm kết mạc (Đau mắt đỏ), không đặc hiệu",
                "base_confidence": 80,
                "reason": "Đỏ mắt, chảy nước mắt, tiết dịch, cộm rát. Cần phân biệt nguyên nhân vi khuẩn, virus, dị ứng.",
            },
        ],
    },
    # 10. TRUYỀN NHIỄM (Infectious Disease)
    {
        "group": "Truyền nhiễm",
        "keywords": ["sốt cao", "ớn lạnh", "sốt rét", "tiêu chảy cấp",
                     "nôn ói", "mệt mỏi", "đau nhức toàn thân", "phát ban sốt",
                     "sốt xuất huyết", "dengue", "sốt kéo dài"],
        "suggestions": [
            {
                "code": "A09",
                "name": "Viêm dạ dày ruột và viêm đại tràng do nhiễm khuẩn",
                "base_confidence": 93,
                "reason": "Sốt, tiêu chảy cấp nhiều lần, nôn ói, đau bụng quanh rốn. Cần bù dịch điện giải và cấy phân nếu kéo dài.",
            },
            {
                "code": "A90",
                "name": "Sốt Dengue (Sốt xuất huyết)",
                "base_confidence": 88,
                "reason": "Sốt cao đột ngột, đau nhức hốc mắt/cơ khớp toàn thân, phát ban dạng chấm xuất huyết dưới da. Cần xét nghiệm NS1 Ag và công thức máu theo dõi tiểu cầu.",
            },
            {
                "code": "B34.9",
                "name": "Nhiễm virus, không đặc hiệu",
                "base_confidence": 80,
                "reason": "Sốt nhẹ đến vừa, mệt mỏi toàn thân, đau cơ khớp lan tỏa. Thường tự giới hạn trong 5-7 ngày, điều trị triệu chứng.",
            },
        ],
    },
]

# Gợi ý mặc định khi không khớp nhóm nào
DEFAULT_SUGGESTIONS: List[Dict[str, Any]] = [
    {
        "code": "R69",
        "name": "Nguyên nhân gây bệnh chưa xác định",
        "base_confidence": 70,
        "reason": "Triệu chứng chưa đủ đặc hiệu để gợi ý chẩn đoán cụ thể. Cần khai thác thêm bệnh sử chi tiết và chỉ định cận lâm sàng để chẩn đoán phân biệt.",
    },
    {
        "code": "Z00.0",
        "name": "Khám sức khỏe tổng quát định kỳ",
        "base_confidence": 65,
        "reason": "Tầm soát đánh giá chức năng các cơ quan: công thức máu, sinh hóa máu, tổng phân tích nước tiểu, X-quang phổi, điện tim.",
    },
]


class DiagnosisSuggestionService:
    """
    Dịch vụ AI gợi ý chẩn đoán ICD-10 dựa trên triệu chứng (FR-11.3).
    Sử dụng rule-based weighted keyword scoring.
    """

    @staticmethod
    def suggest_diagnosis(
        symptoms: str,
        patient_age: int | None = None,
        patient_gender: str | None = None,
        medical_history: list[str] | None = None,
    ) -> DiagnosisSuggestionResponse:
        """
        Phân tích triệu chứng văn bản và trả về Top 3 gợi ý ICD-10 sắp xếp theo confidence giảm dần.
        """
        if not symptoms or len(symptoms.strip()) < 2:
            return DiagnosisSuggestionResponse(
                suggestions=[],
                total_suggestions=0,
                confidence_score=0.0,
                disclaimer=MEDICAL_AI_DISCLAIMER,
            )

        symptoms_lower = symptoms.lower().strip()

        # Tính điểm cho từng nhóm bệnh lý
        scored_groups: list[tuple[float, dict]] = []

        for group in DIAGNOSIS_KNOWLEDGE_BASE:
            match_count = 0
            total_keywords = len(group["keywords"])

            for keyword in group["keywords"]:
                if keyword.lower() in symptoms_lower:
                    match_count += 1

            if match_count > 0:
                # Tỷ lệ khớp từ khóa => ảnh hưởng confidence
                match_ratio = match_count / total_keywords
                score = match_ratio * match_count  # Weighted score: càng nhiều keyword match → score càng cao
                scored_groups.append((score, group))

        if not scored_groups:
            # Không khớp nhóm nào → trả về gợi ý mặc định
            default_items = [
                DiagnosisSuggestionItem(
                    code=s["code"],
                    name=s["name"],
                    confidence=s["base_confidence"],
                    reason=s["reason"],
                )
                for s in DEFAULT_SUGGESTIONS
            ]
            return DiagnosisSuggestionResponse(
                suggestions=default_items,
                total_suggestions=len(default_items),
                confidence_score=0.70,
                disclaimer=MEDICAL_AI_DISCLAIMER,
            )

        # Sắp xếp theo score giảm dần, lấy nhóm cao nhất
        scored_groups.sort(key=lambda x: x[0], reverse=True)
        best_score, best_group = scored_groups[0]

        # Tính adjustment cho confidence dựa trên mức khớp
        match_count = sum(
            1 for kw in best_group["keywords"] if kw.lower() in symptoms_lower
        )
        total_kw = len(best_group["keywords"])
        match_ratio = match_count / total_kw

        suggestions: list[DiagnosisSuggestionItem] = []
        for idx, sug in enumerate(best_group["suggestions"][:3]):
            # Điều chỉnh confidence: giữ base nếu match nhiều, giảm nhẹ nếu match ít
            adjusted_confidence = sug["base_confidence"]
            if match_ratio < 0.3:
                adjusted_confidence = max(60, adjusted_confidence - 10)
            elif match_ratio >= 0.5:
                adjusted_confidence = min(99, adjusted_confidence + 2)

            suggestions.append(
                DiagnosisSuggestionItem(
                    code=sug["code"],
                    name=sug["name"],
                    confidence=round(adjusted_confidence, 1),
                    reason=sug["reason"],
                )
            )

        # Nếu có nhóm thứ 2 match tốt, thêm gợi ý phụ (để bác sĩ phân biệt)
        if len(scored_groups) >= 2 and len(suggestions) < 3:
            _, second_group = scored_groups[1]
            extra = second_group["suggestions"][0]
            suggestions.append(
                DiagnosisSuggestionItem(
                    code=extra["code"],
                    name=extra["name"],
                    confidence=max(60, extra["base_confidence"] - 15),
                    reason=f"[Phân biệt - nhóm {second_group['group']}] {extra['reason']}",
                )
            )

        # Sắp xếp lại theo confidence giảm dần
        suggestions.sort(key=lambda s: s.confidence, reverse=True)
        top3 = suggestions[:3]

        avg_confidence = sum(s.confidence for s in top3) / len(top3) / 100

        return DiagnosisSuggestionResponse(
            suggestions=top3,
            total_suggestions=len(top3),
            confidence_score=round(avg_confidence, 2),
            disclaimer=MEDICAL_AI_DISCLAIMER,
        )
