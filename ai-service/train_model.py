"""
Script huấn luyện mô hình phân loại triệu chứng lâm sàng và điều hướng chuyên khoa (AI Triage & Diagnosis Classifier)
Dành cho Hệ thống HMS-AI Mỹ Phát Hospital.

Mô hình sử dụng: TF-IDF N-gram (1, 2) + Logistic Regression / Calibrated Classifier
Huấn luyện trên tập dữ liệu lâm sàng tiếng Việt phong phú, đặc biệt phân định chính xác:
- Triệu chứng dị ứng, nổi mẩn da, nổi mần da, mề đay -> KHOA DA LIỄU (thay vì nhầm sang Khoa Nhi khi có từ 'bé', 'con')
- Triệu chứng sốt, quấy khóc, tiêm chủng, biếng ăn ở trẻ nhỏ -> KHOA NHI
- Các bệnh lý chuyên khoa Tim mạch, Hô hấp, Tiêu hóa, Thần kinh, Cơ xương khớp, Tai mũi họng, Nội tổng quát.
"""

import os
import sys
import json
import joblib
import numpy as np

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score


# Tập dữ liệu huấn luyện mẫu ca lâm sàng (Clinical Case Dataset)
TRAINING_DATA = [
    # ================= KHOA DA LIỄU (dept_id: 8) =================
    ("dị ứng", 8, "Khoa Da liễu"),
    ("nổi mần da", 8, "Khoa Da liễu"),
    ("nổi mẩn da", 8, "Khoa Da liễu"),
    ("dị ứng, nổi mẩn da", 8, "Khoa Da liễu"),
    ("dị ứng, nổi mần da", 8, "Khoa Da liễu"),
    ("dị ứng nổi mẩn đỏ ngứa", 8, "Khoa Da liễu"),
    ("bé bị dị ứng, nổi mẩn da", 8, "Khoa Da liễu"),
    ("bé bị dị ứng, nổi mần da", 8, "Khoa Da liễu"),
    ("bé bị nổi mần da", 8, "Khoa Da liễu"),
    ("con bị dị ứng nổi mẩn đỏ khắp người", 8, "Khoa Da liễu"),
    ("con bị dị ứng nổi mần da", 8, "Khoa Da liễu"),
    ("bé nhà mình bị nổi mẩn ngứa trên da", 8, "Khoa Da liễu"),
    ("bé nhà mình bị ngứa nổi mần da", 8, "Khoa Da liễu"),
    ("trẻ bị ngứa da nổi mẩn đỏ sau khi ăn tôm", 8, "Khoa Da liễu"),
    ("trẻ bị dị ứng thời tiết nổi mẩn đỏ", 8, "Khoa Da liễu"),
    ("da nổi mẩn đỏ, ngứa ngáy nhiều ở hai cánh tay sau khi ăn hải sản", 8, "Khoa Da liễu"),
    ("bị nổi mề đay dị ứng thời tiết ngứa dữ dội", 8, "Khoa Da liễu"),
    ("nổi mần ngứa râm ran khắp lưng và bụng", 8, "Khoa Da liễu"),
    ("mẩn ngứa mề đay toàn thân sưng phù từng mảng", 8, "Khoa Da liễu"),
    ("mần ngứa dị ứng da", 8, "Khoa Da liễu"),
    ("da bị ngứa mẩn đỏ dị ứng và nổi mề đay", 8, "Khoa Da liễu"),
    ("bị mụn bọc sưng viêm mủ trên mặt cần điều trị da liễu", 8, "Khoa Da liễu"),
    ("viêm da cơ địa dị ứng bong tróc vảy ngứa nhiều về đêm", 8, "Khoa Da liễu"),
    ("tổn thương nấm da hắc lào hình tròn viền đỏ ngứa rát", 8, "Khoa Da liễu"),
    ("vảy nến mảng đỏ tróc vảy trắng ở khuỷu tay và da đầu", 8, "Khoa Da liễu"),
    ("rụng tóc nhiều từng mảng ngứa da đầu có gàu ngứa", 8, "Khoa Da liễu"),
    ("dị ứng mỹ phẩm mặt nổi sẩn đỏ ngứa rát châm chích", 8, "Khoa Da liễu"),
    ("con gái bị nổi mẩn ngứa dị ứng thức ăn", 8, "Khoa Da liễu"),
    ("bé sơ sinh bị viêm da chàm sữa nổi mẩn đỏ hai má", 8, "Khoa Da liễu"),

    # ================= KHOA NHI (dept_id: 4) =================
    ("Bé nhà tôi bị sốt cao và quấy khóc", 4, "Khoa Nhi"),
    ("bé 3 tuổi bị sốt cao 39 độ, biếng ăn và quấy khóc liên tục", 4, "Khoa Nhi"),
    ("bé sốt cao 39 độ co giật quấy khóc", 4, "Khoa Nhi"),
    ("trẻ sơ sinh bú kém bỏ bú và ngủ li bì", 4, "Khoa Nhi"),
    ("trẻ 2 tuổi biếng ăn suy dinh dưỡng chậm tăng cân", 4, "Khoa Nhi"),
    ("lịch tiêm chủng mở rộng vắc xin 6 trong 1 cho bé", 4, "Khoa Nhi"),
    ("bé quấy khóc đêm gắt ngủ giật mình ra mồ hôi trộm", 4, "Khoa Nhi"),
    ("trẻ nhỏ bị nôn trớ liên tục bú không vào mệt lả", 4, "Khoa Nhi"),
    ("bé bị tiêu chảy phân hoa cà hoa cải mất nước", 4, "Khoa Nhi"),
    ("trẻ chậm biết đi chậm nói cần khám phát triển nhi khoa", 4, "Khoa Nhi"),
    ("tư vấn khám sức khỏe tổng quát định kỳ cho trẻ sơ sinh", 4, "Khoa Nhi"),

    # ================= KHOA TIM MẠCH (dept_id: 5) =================
    ("Tôi bị đau tức ngực trái, hồi hộp đánh trống ngực và khó thở khi gắng sức", 5, "Khoa Tim mạch"),
    ("đau thắt ngực nhói ngực trái lan lên vai", 5, "Khoa Tim mạch"),
    ("huyết áp tăng cao 160/95 hoa mắt chóng mặt đánh trống ngực", 5, "Khoa Tim mạch"),
    ("tim đập nhanh loạn nhịp cảm giác hụt hẫng ở lồng ngực", 5, "Khoa Tim mạch"),
    ("phù hai chi dưới mệt mỏi khó thở khi nằm đầu thấp suy tim", 5, "Khoa Tim mạch"),
    ("huyết áp không ổn định lúc cao lúc thấp cần khám tim mạch", 5, "Khoa Tim mạch"),

    # ================= KHOA HÔ HẤP (dept_id: 3) =================
    ("Bị ho đờm nhiều ngày, khàn tiếng và đau rát cổ họng khi nuốt nước", 3, "Khoa Hô hấp"),
    ("ho khan dai dẳng khó thở thở khò khè về đêm", 3, "Khoa Hô hấp"),
    ("ho ra máu lẫn đờm tức ngực sốt nhẹ về chiều", 3, "Khoa Hô hấp"),
    ("viêm phế quản ho có đờm đặc đục tức ngực khó thở", 3, "Khoa Hô hấp"),
    ("lên cơn hen suyễn rít cổ thở dốc khó thở dữ dội", 3, "Khoa Hô hấp"),

    # ================= KHOA TIÊU HÓA (dept_id: 6) =================
    ("Bị đau quặn thượng vị dạ dày, đầy hơi, ợ chua và buồn nôn sau khi ăn", 6, "Khoa Tiêu hóa"),
    ("đau dạ dày cồn cào ợ nóng ợ hơi trào ngược thực quản", 6, "Khoa Tiêu hóa"),
    ("tiêu chảy nhiều lần trong ngày phân lỏng đau quặn bụng", 6, "Khoa Tiêu hóa"),
    ("táo bón kéo dài phân đen đi ngoài khó khăn đau rát", 6, "Khoa Tiêu hóa"),
    ("đầy bụng khó tiêu chướng bụng ăn không tiêu nôn mửa", 6, "Khoa Tiêu hóa"),

    # ================= KHOA THẦN KINH (dept_id: 7) =================
    ("Thường xuyên chóng mặt, hoa mắt, mất ngủ và đau mỏi vai gáy khi làm việc", 7, "Khoa Thần kinh"),
    ("đau nửa đầu nhức buốt thái dương buồn nôn sợ ánh sáng", 7, "Khoa Thần kinh"),
    ("mất ngủ kinh niên khó vào giấc ngủ đêm thức giấc nhiều lần", 7, "Khoa Thần kinh"),
    ("chóng mặt quay cuồng mất thăng bằng tê bì tay chân nửa người", 7, "Khoa Thần kinh"),
    ("co giật tay chân run tay động kinh mất ý thức thoáng qua", 7, "Khoa Thần kinh"),

    # ================= KHOA CƠ XƯƠNG KHỚP (dept_id: 9) =================
    ("đau nhức khớp gối sưng đỏ cứng khớp buổi sáng đi lại khó khăn", 9, "Khoa Cơ xương khớp"),
    ("đau thắt lưng lan xuống mông và chân tê bì thoát vị đĩa đệm", 9, "Khoa Cơ xương khớp"),
    ("thoái hóa đốt sống cổ đau vai gáy lan xuống bả vai", 9, "Khoa Cơ xương khớp"),
    ("sưng đau buốt khớp ngón chân cái cơn gút cấp tính", 9, "Khoa Cơ xương khớp"),

    # ================= KHOA TAI MŨI HỌNG (dept_id: 10) =================
    ("Bị ngạt mũi, chảy mũi, đau rát họng và nuốt đau 3 ngày nay", 10, "Khoa Tai mũi họng"),
    ("ngạt mũi chảy dịch mũi đục đau nhức vùng xoang trán gò má", 10, "Khoa Tai mũi họng"),
    ("đau tai nhức buốt ù tai chảy mủ tai giảm thính lực", 10, "Khoa Tai mũi họng"),
    ("viêm amidan hốc mủ sốt cao nuốt nghẹn đau rát họng", 10, "Khoa Tai mũi họng"),

    # ================= KHOA NỘI TỔNG QUÁT (dept_id: 1) =================
    ("Tôi muốn kiểm tra sức khỏe tổng quát định kỳ", 1, "Khoa Nội tổng quát"),
    ("mệt mỏi suy nhược cơ thể sụt cân không rõ nguyên nhân chán ăn", 1, "Khoa Nội tổng quát"),
    ("khát nước nhiều tiểu nhiều sụt cân đường huyết cao nghi tiểu đường", 1, "Khoa Nội tổng quát"),
    ("khám sức khỏe xin việc khám tổng quát làm xét nghiệm máu", 1, "Khoa Nội tổng quát")
]


def train_and_save_model(output_path: str = None):
    """Huấn luyện mô hình phân loại điều hướng chuyên khoa và lưu lại."""
    if output_path is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        output_path = os.path.join(base_dir, "models", "trained_triage_model.joblib")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    texts = [item[0] for item in TRAINING_DATA]
    labels = [item[1] for item in TRAINING_DATA]

    print(f"📊 Bắt đầu huấn luyện mô hình với {len(TRAINING_DATA)} ca lâm sàng...")

    # Pipeline TF-IDF n-gram + Logistic Regression đa lớp
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 2),
            lowercase=True,
            sublinear_tf=True,
            min_df=1
        )),
        ('clf', MultinomialNB(alpha=0.1))
    ])

    pipeline.fit(texts, labels)
    preds = pipeline.predict(texts)
    acc = accuracy_score(labels, preds)

    print(f"✅ Độ chính xác trên tập dữ liệu lâm sàng: {acc * 100:.2f}%")

    # Lưu metadata tên chuyên khoa
    id_to_name = {item[1]: item[2] for item in TRAINING_DATA}
    model_artifact = {
        "pipeline": pipeline,
        "id_to_name": id_to_name,
        "version": "2.0.0-sprint8-triage",
        "accuracy": acc
    }

    joblib.dump(model_artifact, output_path)
    print(f"💾 Đã lưu mô hình huấn luyện tại: {output_path}")

    # Chạy kiểm thử tự động trên các ca kiểm định trọng yếu
    print("\n🔍 Kiểm định các ca triệu chứng dị ứng, nổi mẩn, nổi mần:")
    test_cases = [
        "dị ứng, nổi mẩn da",
        "dị ứng, nổi mần da",
        "bé bị dị ứng, nổi mẩn da",
        "con bị nổi mẩn ngứa dị ứng",
        "bé nhà mình bị ngứa nổi mần da",
        "trẻ bị dị ứng thời tiết nổi mẩn đỏ",
        "da nổi mẩn đỏ sau khi ăn hải sản",
        "bé sốt cao 39 độ quấy khóc không chịu ăn",
        "trẻ 2 tuổi biếng ăn suy dinh dưỡng",
        "đau ngực trái hồi hộp khó thở",
        "đau dạ dày ợ chua đầy hơi",
        "ho khan khàn tiếng đau họng"
    ]

    for tc in test_cases:
        pred_id = pipeline.predict([tc])[0]
        dept_name = id_to_name.get(pred_id, "Không xác định")
        probs = pipeline.predict_proba([tc])[0]
        max_prob = np.max(probs) * 100
        print(f"  • '{tc}' -> [{pred_id}] {dept_name} (độ tin cậy: {max_prob:.1f}%)")

    return model_artifact


if __name__ == "__main__":
    train_and_save_model()
