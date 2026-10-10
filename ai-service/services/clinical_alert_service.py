"""
Clinical Alert Engine:
Phân tích tương tác thuốc (Drug-Drug Interactions) và cảnh báo dị ứng thuốc (Allergies & Cross-Reactivity).
Tuân thủ NFR-8: Disclaimer y tế bắt buộc và hỗ trợ quyết định lâm sàng cho bác sĩ.

So khớp tên thuốc / dị nguyên:
- Không phân biệt hoa thường, dấu tiếng Việt và cách viết Việt hóa
  ("Amoxicilin" = "Amoxicillin", "Ceftriaxon" = "Ceftriaxone", "Cefalexin" = "Cephalexin").
- Chỉ khớp NGUYÊN TỪ (word-boundary) hoặc theo gốc từ nhóm thuốc (…cillin, cef…, …penem),
  không dùng so khớp chuỗi con ("Sulfa" KHÔNG khớp "Magnesium sulfate").
- Tương tác được kiểm tra đối xứng (A-B và B-A).
"""

import re
from functools import lru_cache
from typing import List, Dict, Any, Optional, Tuple
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
from services.text_normalizer import normalize_text, strip_accents

# Thứ hạng mức độ cảnh báo (dùng để sắp xếp và chọn cảnh báo nặng nhất)
SEVERITY_RANK: Dict[str, int] = {"CRITICAL": 3, "WARNING": 2, "INFO": 1}

# Độ dài tối thiểu của một dị nguyên / thành phần dị nguyên để so khớp trực tiếp
MIN_ALLERGEN_TOKEN_LEN = 3


def _canon(text: Optional[str]) -> str:
    """
    Chuẩn hóa tên thuốc về dạng chính tắc để so khớp:
    bỏ dấu, chữ thường, bỏ gạch nối, ph->f, th->t, chl->cl, y->i, gộp chữ cái đôi,
    bỏ 'e' cuối từ (dạng Việt hóa: ceftriaxone -> ceftriaxon, furosemide -> furosemid).
    """
    t = strip_accents(normalize_text(text))
    t = t.replace("-", "")
    t = t.replace("ph", "f").replace("chl", "cl").replace("th", "t").replace("y", "i")
    t = re.sub(r"([a-z])\1+", r"\1", t)
    t = re.sub(r"\b([a-z]{4,})e\b", r"\1", t)
    return t


def _kw(pattern: str) -> str:
    """Từ khóa thường -> dạng chính tắc (escape); mẫu regex gốc từ (chứa \\w, *, …) giữ nguyên."""
    if re.fullmatch(r"[a-zA-Z0-9 \-]+", pattern):
        return re.escape(_canon(pattern)).replace(r"\ ", r"\s+")
    return pattern


@lru_cache(maxsize=2048)
def _compile(pattern: str) -> "re.Pattern[str]":
    return re.compile(r"(?<![a-z0-9])" + _kw(pattern) + r"(?![a-z0-9])")


def _match_keywords(text: str, keywords: List[str]) -> bool:
    """Kiểm tra text (tên thuốc / dị nguyên) có chứa nguyên vẹn từ khóa / gốc từ nào không."""
    if not text:
        return False
    canon_text = _canon(text)
    return any(_compile(kw).search(canon_text) for kw in keywords)


# ============================================================================
# NHÓM DƯỢC LÝ DÙNG CHUNG (định nghĩa một lần, tái sử dụng cho tương tác & dị ứng)
# ============================================================================
ASPIRIN = ["aspirin", "acetylsalicylic", "aspegic"]
# NSAID không bao gồm Aspirin (Aspirin có luật riêng ở những chỗ có ý nghĩa lâm sàng)
NSAIDS = ["nsaid", "ibuprofen", "diclofenac", "meloxicam", "naproxen", "ketorolac",
          "piroxicam", "celecoxib", "etoricoxib", "indomethacin", "ketoprofen"]
NSAIDS_NON_SELECTIVE = ["nsaid", "ibuprofen", "diclofenac", "meloxicam", "naproxen", "ketorolac",
                        "piroxicam", "indomethacin", "ketoprofen"]
COX2_SELECTIVE = ["celecoxib", "etoricoxib"]
VITAMIN_K_ANTAGONISTS = ["warfarin", "coumadin", "acenocoumarol", "sintrom"]
ACE_INHIBITORS = [r"\w+pril"]                     # enalapril, lisinopril, perindopril, captopril…
ARBS = [r"\w+sartan"]                             # losartan, valsartan, irbesartan, telmisartan…
DIURETICS = ["furosemide", "torsemide", "indapamide", "spironolactone", "chlorthalidone",
             r"\w*tiazid"]                         # hydrochlorothiazide (VN: hydroclorothiazid)
ANTIHYPERTENSIVES_RENAL = ACE_INHIBITORS + ARBS + DIURETICS
CLARITHROMYCIN = ["clarithromycin", "klacid"]
DIGOXIN = ["digoxin"]
STATINS_CONTRAINDICATED_WITH_CYP3A4 = ["simvastatin", "lovastatin"]
ATORVASTATIN = ["atorvastatin"]

PENICILLINS = [r"\w*cilin", "augmentin", "unasin", "tazocin"]   # amoxicillin/amoxicilin, ampicillin…
CEPHALOSPORINS = [r"cef\w*"]                       # cephalexin -> cefalexin, ceftriaxone, cefuroxime…
CARBAPENEMS = [r"\w*penem"]                        # imipenem, meropenem, ertapenem
SULFONAMIDE_ANTIBIOTICS = ["sulfamethoxazole", "cotrimoxazole", "bactrim", "biseptol",
                           "sulfadiazine", "sulfasalazine", "sulfonamide", "sulfamide"]
FLUOROQUINOLONES = [r"\w*floxacin", "quinolone"]
MACROLIDES = ["clarithromycin", "erythromycin", "azithromycin", "roxithromycin", "macrolide"]

# ============================================================================
# CƠ SỞ TRI THỨC TƯƠNG TÁC THUỐC LÂM SÀNG (DDI KNOWLEDGE BASE)
# ============================================================================
KNOWN_INTERACTIONS: List[Dict[str, Any]] = [
    {
        "keywords_a": ASPIRIN,
        "keywords_b": VITAMIN_K_ANTAGONISTS,
        "severity": "CRITICAL",
        "mechanism": "Tác dụng hiệp đồng: Warfarin ức chế đông máu phụ thuộc Vitamin K trong khi Aspirin ức chế ngưng tập tiểu cầu và gây tổn thương niêm mạc dạ dày.",
        "description": "Tăng vọt nguy cơ xuất huyết tiêu hóa và chảy máu nghiêm trọng đe dọa tính mạng.",
        "recommendation": "Tránh phối hợp. Nếu bắt buộc theo chỉ định chuyên khoa tim mạch, cần giám sát chặt chẽ chỉ số INR, bổ sung thuốc bảo vệ dạ dày (PPI) và cảnh báo bệnh nhân dấu hiệu xuất huyết.",
    },
    {
        "keywords_a": NSAIDS,
        "keywords_b": VITAMIN_K_ANTAGONISTS,
        "severity": "CRITICAL",
        "mechanism": "NSAID ức chế COX-1 làm giảm ngưng tập tiểu cầu và gây tổn thương niêm mạc dạ dày, cộng hưởng với tác dụng chống đông của thuốc kháng Vitamin K.",
        "description": "Tăng nguy cơ xuất huyết tiêu hóa và chảy máu nặng (kể cả với NSAID ức chế chọn lọc COX-2).",
        "recommendation": "Tránh phối hợp. Ưu tiên Paracetamol liều thấp, ngắn ngày để giảm đau. Nếu bắt buộc dùng NSAID: dùng ngắn nhất có thể, kèm PPI và theo dõi sát INR, dấu hiệu xuất huyết.",
    },
    {
        "keywords_a": NSAIDS,
        "keywords_b": ASPIRIN,
        "severity": "WARNING",
        "mechanism": "Ibuprofen/Naproxen cạnh tranh vị trí gắn kết trên enzym COX-1, ngăn cản Aspirin acetyl hóa không thuận nghịch tiểu cầu; các NSAID cộng dồn độc tính trên đường tiêu hóa.",
        "description": "Làm giảm tác dụng bảo vệ tim mạch chống huyết khối của Aspirin liều thấp và tăng nguy cơ viêm loét - xuất huyết dạ dày tá tràng.",
        "recommendation": "Khuyến cáo thay thế giảm đau hạ sốt bằng Paracetamol. Nếu bắt buộc dùng Ibuprofen, phải uống Aspirin trước Ibuprofen ít nhất 2 giờ.",
    },
    {
        "keywords_a": NSAIDS,
        "keywords_b": NSAIDS,
        "severity": "WARNING",
        "mechanism": "Trùng lặp nhóm điều trị: hai thuốc cùng ức chế cyclooxygenase (COX).",
        "description": "Không tăng hiệu quả giảm đau – kháng viêm nhưng cộng dồn độc tính trên tiêu hóa (loét, xuất huyết), thận và tim mạch.",
        "recommendation": "Chỉ dùng MỘT thuốc NSAID tại một thời điểm. Ngừng một trong hai thuốc hoặc thay bằng Paracetamol.",
    },
    {
        "keywords_a": NSAIDS,
        "keywords_b": ANTIHYPERTENSIVES_RENAL,
        "severity": "WARNING",
        "mechanism": "NSAID ức chế tổng hợp prostaglandin ở thận, gây giữ muối – nước và co tiểu động mạch đến.",
        "description": "Giảm hiệu quả hạ huyết áp của thuốc ức chế men chuyển / chẹn thụ thể Angiotensin / lợi tiểu; tăng nguy cơ suy thận cấp (đặc biệt khi phối hợp 3 nhóm NSAID + ACEi/ARB + lợi tiểu) và tăng kali máu.",
        "recommendation": "Tránh dùng NSAID kéo dài. Nếu cần, dùng liều thấp nhất trong thời gian ngắn nhất, bù đủ nước, theo dõi huyết áp, creatinin và kali máu.",
    },
    {
        "keywords_a": CLARITHROMYCIN,
        "keywords_b": STATINS_CONTRAINDICATED_WITH_CYP3A4,
        "severity": "CRITICAL",
        "mechanism": "Clarithromycin là chất ức chế mạnh CYP3A4 ở gan, làm giảm chuyển hóa bước một và giảm thanh thải Simvastatin/Lovastatin.",
        "description": "Làm tăng mạnh nồng độ Statin huyết tương (gấp hàng chục lần), nguy cơ cao tiêu cơ vân cấp (rhabdomyolysis), myoglobin niệu và suy thận cấp.",
        "recommendation": "CHỐNG CHỈ ĐỊNH phối hợp. Tạm ngừng Simvastatin/Lovastatin trong suốt đợt điều trị bằng Clarithromycin, hoặc đổi sang kháng sinh không ức chế CYP3A4 (ví dụ Azithromycin).",
    },
    {
        "keywords_a": CLARITHROMYCIN,
        "keywords_b": ATORVASTATIN,
        "severity": "WARNING",
        "mechanism": "Clarithromycin ức chế CYP3A4 làm giảm chuyển hóa Atorvastatin.",
        "description": "Tăng nồng độ Atorvastatin huyết tương (khoảng 4 lần), tăng nguy cơ đau cơ, viêm cơ và tiêu cơ vân.",
        "recommendation": "Giới hạn liều Atorvastatin ≤ 20 mg/ngày trong thời gian dùng Clarithromycin (hoặc tạm ngừng Atorvastatin trong đợt kháng sinh ngắn). Theo dõi triệu chứng đau cơ, yếu cơ, nước tiểu sẫm màu và CK nếu nghi ngờ.",
    },
    {
        "keywords_a": CLARITHROMYCIN,
        "keywords_b": DIGOXIN,
        "severity": "CRITICAL",
        "mechanism": "Clarithromycin ức chế P-glycoprotein (P-gp) ở ruột và ống thận, làm giảm đào thải Digoxin.",
        "description": "Tăng nhanh nồng độ Digoxin huyết thanh gây ngộ độc Digoxin: buồn nôn, rối loạn thị giác, nhịp chậm, loạn nhịp tim nguy hiểm.",
        "recommendation": "Tránh phối hợp; ưu tiên kháng sinh khác phù hợp. Nếu bắt buộc: giảm liều Digoxin, định lượng nồng độ Digoxin máu, theo dõi điện tâm đồ (ECG) và kali máu.",
    },
    {
        "keywords_a": CLARITHROMYCIN,
        "keywords_b": VITAMIN_K_ANTAGONISTS,
        "severity": "WARNING",
        "mechanism": "Clarithromycin ức chế CYP3A4 (và giảm hệ vi khuẩn ruột tổng hợp Vitamin K) làm giảm chuyển hóa Warfarin.",
        "description": "Tăng chỉ số INR và nguy cơ chảy máu.",
        "recommendation": "Theo dõi INR trong 3-5 ngày đầu và sau khi ngừng Clarithromycin, cân nhắc giảm liều thuốc chống đông.",
    },
    {
        "keywords_a": ["ciprofloxacin"],
        "keywords_b": VITAMIN_K_ANTAGONISTS,
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
        "keywords_b": DIGOXIN,
        "severity": "WARNING",
        "mechanism": "Thuốc ức chế bơm proton làm tăng pH dạ dày, dẫn đến giảm phân hủy Digoxin do acid và tăng mức độ sinh khả dụng.",
        "description": "Tăng nồng độ Digoxin trong huyết thanh, có thể dẫn đến ngộ độc Digoxin với biểu hiện loạn nhịp tim và rối loạn thị giác.",
        "recommendation": "Theo dõi nồng độ Digoxin máu và theo dõi điện tâm đồ (ECG) định kỳ, chú ý các dấu hiệu ngộ độc Digoxin.",
    },
    {
        "keywords_a": ["paracetamol", "acetaminophen"],
        "keywords_b": VITAMIN_K_ANTAGONISTS,
        "severity": "INFO",
        "mechanism": "Chất chuyển hóa NAPQI có thể ức chế nhẹ enzym vitamin K epoxide reductase khi dùng Paracetamol liều cao kéo dài.",
        "description": "Dùng Paracetamol liều cao (> 2g/ngày) liên tục trên 3 ngày có thể làm tăng nhẹ chỉ số INR ở bệnh nhân đang dùng Warfarin.",
        "recommendation": "An toàn khi dùng liều thấp và ngắn ngày. Nếu dùng Paracetamol kéo dài, cần theo dõi kiểm tra INR.",
    },
    {
        "keywords_a": ["amlodipine"],
        "keywords_b": CLARITHROMYCIN,
        "severity": "WARNING",
        "mechanism": "Clarithromycin ức chế CYP3A4 làm chậm chuyển hóa Amlodipine.",
        "description": "Tăng nồng độ Amlodipine, dẫn đến hạ huyết áp quá mức, giãn mạch ngoại biên và phù mắt cá chân.",
        "recommendation": "Theo dõi huyết áp thường xuyên. Cân nhắc giảm liều Amlodipine nếu cần.",
    },
    {
        "keywords_a": ["diazepam"],
        "keywords_b": CLARITHROMYCIN + ["ciprofloxacin"],
        "severity": "WARNING",
        "mechanism": "Kháng sinh ức chế enzym gan làm giảm chuyển hóa Diazepam.",
        "description": "Tăng tích lũy Diazepam gây ức chế thần kinh trung ương kéo dài, buồn ngủ quá mức, suy hô hấp ở người cao tuổi.",
        "recommendation": "Theo dõi trạng thái tri giác của bệnh nhân, cân nhắc giảm liều Diazepam.",
    },
]

# ============================================================================
# CƠ SỞ TRI THỨC DỊ ỨNG & DỊ ỨNG CHÉO (ALLERGY & CROSS-REACTIVITY)
# ============================================================================
_BETA_LACTAM_CROSS_REC = (
    "Cân nhắc thận trọng. Nếu tiền sử dị ứng là sốc phản vệ / phản ứng nặng thì chống chỉ định. "
    "Khuyến cáo test lẩy da (Prick test) hoặc chọn kháng sinh không thuộc nhóm Beta-lactam."
)

ALLERGY_FAMILIES: List[Dict[str, Any]] = [
    {
        "family": "Penicillins & Beta-lactams",
        "allergen_keywords": PENICILLINS + ["beta-lactam", "clavulanate", "clavulanic"],
        "drugs": [
            {
                "keywords": PENICILLINS,
                "reaction_type": "DIRECT_MATCH",
                "severity": "CRITICAL",
                "description": "Bệnh nhân có tiền sử dị ứng nhóm Penicillin/Amoxicillin. Sử dụng thuốc cùng nhóm có nguy cơ rất cao gây sốc phản vệ (Anaphylaxis), mày đay cấp tính hoặc phù mạch Quinke nguy hiểm tính mạng.",
                "recommendation": "CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI. Chuyển sang kháng sinh nhóm khác như Macrolide (Clarithromycin, Azithromycin) hoặc Quinolone nếu phù hợp kháng sinh đồ.",
            },
            {
                "keywords": CEPHALOSPORINS,
                "reaction_type": "CROSS_REACTIVITY",
                "severity": "WARNING",
                "description": "Kháng sinh Cephalosporin chia sẻ cấu trúc vòng Beta-lactam với Penicillin, có tỷ lệ dị ứng chéo khoảng 1-10% (cao hơn với Cephalosporin thế hệ 1 có chuỗi bên tương tự).",
                "recommendation": _BETA_LACTAM_CROSS_REC,
            },
            {
                "keywords": CARBAPENEMS,
                "reaction_type": "CROSS_REACTIVITY",
                "severity": "WARNING",
                "description": "Carbapenem có vòng Beta-lactam, tỷ lệ dị ứng chéo với Penicillin thấp (< 1%) nhưng vẫn có thể xảy ra.",
                "recommendation": _BETA_LACTAM_CROSS_REC,
            },
        ],
    },
    {
        "family": "Cephalosporins",
        "allergen_keywords": CEPHALOSPORINS + ["beta-lactam"],
        "drugs": [
            {
                "keywords": CEPHALOSPORINS,
                "reaction_type": "DIRECT_MATCH",
                "severity": "CRITICAL",
                "description": "Tiền sử dị ứng Cephalosporin: dùng thuốc cùng nhóm có nguy cơ cao gây phản vệ, mày đay, phù mạch.",
                "recommendation": "CHỐNG CHỈ ĐỊNH nhóm Cephalosporin. Chọn kháng sinh nhóm khác (Macrolide, Quinolone…) theo vị trí nhiễm khuẩn.",
            },
            {
                "keywords": PENICILLINS + CARBAPENEMS,
                "reaction_type": "CROSS_REACTIVITY",
                "severity": "WARNING",
                "description": "Penicillin / Carbapenem cùng cấu trúc vòng Beta-lactam với Cephalosporin, có nguy cơ dị ứng chéo.",
                "recommendation": _BETA_LACTAM_CROSS_REC,
            },
        ],
    },
    {
        "family": "Carbapenems",
        "allergen_keywords": CARBAPENEMS + ["beta-lactam"],
        "drugs": [
            {
                "keywords": CARBAPENEMS,
                "reaction_type": "DIRECT_MATCH",
                "severity": "CRITICAL",
                "description": "Tiền sử dị ứng Carbapenem: dùng thuốc cùng nhóm có nguy cơ phản ứng quá mẫn nghiêm trọng.",
                "recommendation": "CHỐNG CHỈ ĐỊNH nhóm Carbapenem. Hội chẩn để lựa chọn kháng sinh thay thế phù hợp.",
            },
            {
                "keywords": PENICILLINS + CEPHALOSPORINS,
                "reaction_type": "CROSS_REACTIVITY",
                "severity": "WARNING",
                "description": "Penicillin / Cephalosporin cùng cấu trúc vòng Beta-lactam với Carbapenem, có nguy cơ dị ứng chéo.",
                "recommendation": _BETA_LACTAM_CROSS_REC,
            },
        ],
    },
    {
        "family": "Sulfonamides (Sulfa)",
        # "sulfa" chỉ khớp NGUYÊN TỪ -> không khớp "Magnesium sulfate" / "Ferrous sulfate"
        "allergen_keywords": SULFONAMIDE_ANTIBIOTICS + ["sulfa", "trimethoprim sulfamethoxazole"],
        "drugs": [
            {
                "keywords": SULFONAMIDE_ANTIBIOTICS,
                "reaction_type": "DIRECT_MATCH",
                "severity": "CRITICAL",
                "description": "Tiền sử dị ứng Sulfonamide: nguy cơ phát ban nặng, hội chứng Stevens-Johnson / hoại tử thượng bì nhiễm độc (TEN), sốc phản vệ.",
                "recommendation": "CHỐNG CHỈ ĐỊNH kháng sinh nhóm Sulfonamide (Sulfamethoxazol, Cotrimoxazol/Bactrim). Chọn kháng sinh nhóm khác.",
            },
        ],
    },
    {
        "family": "NSAIDs & Aspirin",
        "allergen_keywords": ASPIRIN + NSAIDS + ["khang viem khong steroid"],
        "drugs": [
            {
                "keywords": ASPIRIN,
                "reaction_type": "DIRECT_MATCH",
                "severity": "CRITICAL",
                "description": "Tiền sử dị ứng Aspirin/NSAID: Nguy cơ cao gây phản ứng quá mẫn tức thì, hội chứng Widal (hen suyễn, polyp mũi, dị ứng Aspirin) và co thắt phế quản cấp tính.",
                "recommendation": "CHỐNG CHỈ ĐỊNH dùng Aspirin. Sử dụng thuốc giảm đau thay thế an toàn như Paracetamol liều tiêu chuẩn.",
            },
            {
                "keywords": NSAIDS_NON_SELECTIVE,
                "reaction_type": "CROSS_REACTIVITY",
                "severity": "CRITICAL",
                "description": "Phản ứng dị ứng chéo giữa các thuốc nhóm NSAID do cơ chế ức chế cyclooxygenase-1 (COX-1) làm tăng sản sinh leukotriene gây co thắt phế quản và phù mạch.",
                "recommendation": "Tránh dùng tất cả các thuốc kháng viêm không steroid (NSAIDs). Khuyến cáo dùng Paracetamol thay thế.",
            },
            {
                "keywords": COX2_SELECTIVE,
                "reaction_type": "CROSS_REACTIVITY",
                "severity": "WARNING",
                "description": "NSAID ức chế chọn lọc COX-2 ít gây phản ứng chéo hơn ở bệnh nhân quá mẫn với NSAID, nhưng vẫn có thể xảy ra.",
                "recommendation": "Chỉ dùng khi thật cần thiết, liều đầu dưới giám sát y tế (test dung nạp). Ưu tiên Paracetamol.",
            },
        ],
    },
    {
        "family": "Fluoroquinolones",
        "allergen_keywords": FLUOROQUINOLONES,
        "drugs": [
            {
                "keywords": FLUOROQUINOLONES,
                "reaction_type": "DIRECT_MATCH",
                "severity": "CRITICAL",
                "description": "Tiền sử dị ứng Quinolone: Nguy cơ viêm gân, phản ứng quá mẫn da nặng (Stevens-Johnson), phát ban toàn thân hoặc sốc phản vệ.",
                "recommendation": "CHỐNG CHỈ ĐỊNH nhóm Fluoroquinolones. Lựa chọn kháng sinh nhóm khác theo vị trí nhiễm khuẩn.",
            },
        ],
    },
    {
        "family": "Macrolides",
        "allergen_keywords": MACROLIDES,
        "drugs": [
            {
                "keywords": MACROLIDES,
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


def _drug_text(drug: DrugItem) -> str:
    return f"{drug.name} {drug.code or ''} {drug.active_ingredient or ''}"


def _allergen_components(allergen: str) -> List[str]:
    """Tách dị nguyên ghép ("Amoxicillin/Clavulanate", "A + B", "A, B") thành từng thành phần đủ dài."""
    parts = re.split(r"[/+,;()]|\s+và\s+|\s+va\s+|\s+and\s+", allergen)
    return [p.strip() for p in parts if len(_canon(p).replace(" ", "")) >= MIN_ALLERGEN_TOKEN_LEN]


def _is_direct_allergen_match(allergen: str, drug_text: str) -> bool:
    """Dị nguyên (hoặc một thành phần) xuất hiện NGUYÊN TỪ trong tên/hoạt chất thuốc."""
    canon_drug = _canon(drug_text)
    for comp in _allergen_components(allergen):
        pattern = r"(?<![a-z0-9])" + re.escape(_canon(comp)).replace(r"\ ", r"\s+") + r"(?![a-z0-9])"
        if re.search(pattern, canon_drug):
            return True
    return False


def _alert_priority(alert: AllergyAlertDetail) -> Tuple[int, int]:
    return SEVERITY_RANK.get(alert.severity, 0), 1 if alert.reaction_type == "DIRECT_MATCH" else 0


class ClinicalAlertService:
    """Dịch vụ AI kiểm tra an toàn kê đơn lâm sàng."""

    @staticmethod
    def check_drug_interactions(drugs: List[DrugItem]) -> InteractionCheckResponse:
        """Phát hiện tương tác giữa các thuốc trong danh sách (đối xứng A-B / B-A)."""
        interactions_found: List[DrugInteractionDetail] = []
        n = len(drugs)

        for i in range(n):
            for j in range(i + 1, n):
                drug_a = drugs[i]
                drug_b = drugs[j]

                name_a = _drug_text(drug_a)
                name_b = _drug_text(drug_b)

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

        # Sắp xếp theo mức độ: CRITICAL > WARNING > INFO
        interactions_found.sort(key=lambda it: SEVERITY_RANK.get(it.severity, 0), reverse=True)

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
            drug_text = _drug_text(drug)

            for allergy in allergies:
                allergen_raw = (allergy.allergen or "").strip()
                # Bỏ qua dị nguyên rỗng / quá ngắn (tránh khớp nhầm mọi thuốc)
                if len(_canon(allergen_raw).replace(" ", "")) < MIN_ALLERGEN_TOKEN_LEN:
                    continue
                is_severe = (allergy.severity or "").strip().upper() == "SEVERE"
                candidates: List[AllergyAlertDetail] = []

                # 1. So khớp trực tiếp (Direct match) theo tên allergen – nguyên từ
                if _is_direct_allergen_match(allergen_raw, drug_text):
                    candidates.append(
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

                # 2. So khớp chéo theo họ dược lý (Cross-reactivity classes)
                for family in ALLERGY_FAMILIES:
                    # Kiểm tra xem allergen của bệnh nhân có thuộc họ này không
                    if not _match_keywords(allergen_raw, family["allergen_keywords"]):
                        continue
                    # Kiểm tra xem thuốc trong đơn có thuộc họ này không
                    for item in family["drugs"]:
                        if not _match_keywords(drug_text, item["keywords"]):
                            continue
                        severity = item["severity"]
                        description = f"Phát hiện nguy cơ theo họ dược lý '{family['family']}': {item['description']}"
                        recommendation = item["recommendation"]
                        # Tiền sử dị ứng mức độ NẶNG -> nâng dị ứng chéo lên CRITICAL
                        if is_severe and severity != "CRITICAL":
                            severity = "CRITICAL"
                            description += " Bệnh nhân có tiền sử dị ứng mức độ NẶNG (SEVERE) nên nguy cơ được nâng lên mức nghiêm trọng."
                            recommendation = (
                                f"CHỐNG CHỈ ĐỊNH do tiền sử dị ứng nặng với nhóm '{family['family']}'. "
                                + recommendation
                            )
                        candidates.append(
                            AllergyAlertDetail(
                                drug_id=drug.id,
                                drug_name=drug.name,
                                allergen=allergy.allergen,
                                reaction_type=item["reaction_type"],
                                severity=severity,
                                description=description,
                                recommendation=recommendation,
                            )
                        )
                        break

                # Mỗi cặp (thuốc, dị nguyên) chỉ giữ một cảnh báo nặng nhất (ưu tiên DIRECT_MATCH)
                if candidates:
                    alerts.append(max(candidates, key=_alert_priority))

        alerts.sort(key=lambda a: SEVERITY_RANK.get(a.severity, 0), reverse=True)
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

        # Tương tác mức INFO chỉ mang tính thông tin: không làm đơn "không an toàn"
        has_actionable_interaction = any(
            it.severity in ("CRITICAL", "WARNING") for it in interaction_res.interactions
        )
        has_warning = has_actionable_interaction or allergy_res.has_allergy_conflict
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
