# Báo cáo lỗi test – myPhatHospital

Ngày chạy: 31/10/2026 · Máy local Windows 11 · Java 21, Node 24, Python 3.14 (CI dùng Java 17, Node 22, Python 3.11)

## Tổng quan

| Phần | Lệnh | Kết quả |
|------|------|---------|
| Backend | `mvnw.cmd -B -ntp test` | 402 test chạy, **0 fail**, **9 skipped** (xem BUG-02) |
| Frontend – test | `npx vitest run` | 448/448 pass (26 file) |
| Frontend – lint | `npx oxlint` | exit 0, **31 warning** (xem BUG-03) |
| ai-service | `python -m pytest -q` | 166 pass, **1 fail** (xem BUG-01) |

Chỉ có **1 test đỏ thật sự** (BUG-01). BUG-02 và BUG-03 là test bị bỏ qua / cảnh báo, không làm CI đỏ nhưng nên xử lý.

---

## BUG-01 – `test_confident_prediction_accepted` fail (ai-service)

- **Mức độ:** Trung bình (chỉ ảnh hưởng chạy test ngoài Docker/CI; image Docker không bị)
- **Test:** `ai-service/test_chatbot_service.py::TestMlTriageThreshold::test_confident_prediction_accepted` (dòng 322)
- **Lỗi:**
  ```
  result = predict_department("dị ứng, nổi mẩn da")
  >       assert result is not None
  E       assert None is not None
  ```
- **Nguyên nhân gốc (đã xác nhận bằng chạy thực tế):** file mô hình `ai-service/models/trained_triage_model.joblib` **không tồn tại**.
  - `.gitignore` loại `*.joblib` nên file không có trong repo.
  - `load_trained_model()` ([ml_triage_service.py](ai-service/services/ml_triage_service.py)) khi không thấy file chỉ log warning rồi trả `None`, nên `predict_department()` trả `None`.
  - Kiểm tra: `load_trained_model() is not None` → `False`; log: "Không tìm thấy file mô hình tại ...\models\trained_triage_model.joblib".
  - CI (`.github/workflows/ci.yml`) và `ai-service/Dockerfile` đều chạy `python train_model.py` trước khi test/chạy, **máy local thì chưa chạy bước này**.
- **Vì sao test khác không đỏ:** `test_low_confidence_prediction_rejected` kỳ vọng `None` nên vô tình pass khi thiếu mô hình. Test này không phân biệt được "mô hình từ chối" với "không có mô hình".

## BUG-02 – 9 test migration bị skip (backend)

- **Mức độ:** Thấp–Trung bình (mất độ phủ kiểm thử migration trên máy local)
- **Test:** `MySqlMigrationConstraintsTest` – 9/9 skipped
- **Log:** `DockerClientProviderStrategy: Could not find a valid Docker environment`
- **Nguyên nhân gốc:** Docker daemon (Docker Desktop) **chưa chạy** khi test. Lớp test dùng `@Testcontainers(disabledWithoutDocker = true)` nên tự skip thay vì fail. CI có Docker nên vẫn chạy bình thường.
- **Hệ quả:** migration Flyway V1→V23 và các ràng buộc toàn vẹn trên MySQL 8 thật **chưa được kiểm chứng ở lần chạy này**.

## BUG-03 – 31 cảnh báo lint (frontend)

- **Mức độ:** Thấp (không làm CI đỏ, nhưng là nợ kỹ thuật React)
- **Phân loại:**
  - 23× `react(set-state-in-effect)`: gọi setState đồng bộ trong `useEffect`, gây render lặp.
  - 7× `react(only-export-components)`: file component export thêm hằng/hàm, làm hỏng Fast Refresh.
  - 1× `react(purity)`: `Date.now()` gọi trong lúc render ([ReceptionDashboardModal.jsx:122](frontend/src/components/reception/ReceptionDashboardModal.jsx#L122)).
- **File ảnh hưởng nhiều nhất:** `VisitDashboard.jsx` (3), `PaymentDialog.jsx` (3), `UserManagementPanel.jsx` (2), `PrescriptionForm.jsx` (2), `MyInvoicesModal.jsx` (2), `ReceptionDashboardModal.jsx` (2); các file còn lại 1 cảnh báo mỗi file.

## Ghi chú môi trường (không phải bug)

- Máy không có `mvn` trong PATH; dùng `mvnw.cmd` (chạy từ PowerShell, `cmd //c` trong Git Bash không tìm thấy file).
- Local chạy Java 21 / Python 3.14, còn CI dùng Java 17 / Python 3.11. Lần này chưa thấy khác biệt gây lỗi nhưng nên giữ trong đầu nếu sau này có lỗi chỉ xuất hiện ở một phía.

---

# Plan fix lỗi

Thứ tự ưu tiên: BUG-01 → BUG-02 → BUG-03. Mỗi bước sửa **một thứ**, chạy lại test để xác nhận trước khi sang bước sau.

## Bước 1 – BUG-01: có mô hình khi chạy test local

1. **Xác nhận giả thuyết (không sửa code):**
   ```
   cd ai-service
   python train_model.py
   python -m pytest -q
   ```
   Kỳ vọng: 167 pass, 0 fail. Nếu vẫn fail → giả thuyết sai, quay lại điều tra (xem `ML_MIN_CONFIDENCE=0.6`, `ML_MIN_MARGIN=0.2`, dữ liệu huấn luyện trong `train_model.py`).
2. **Sửa lâu dài (làm sau khi bước 1 xác nhận):** thêm `ai-service/conftest.py` với fixture `scope="session"` tự huấn luyện mô hình nếu file chưa tồn tại, để `pytest` chạy được trên mọi máy mà không cần nhớ bước thủ công. Cách này khớp với CI và Dockerfile hiện tại (cùng gọi `train_model.py`).
3. **Làm test chặt hơn:** thêm test khẳng định `load_trained_model() is not None` để lỗi thiếu mô hình báo thẳng nguyên nhân, không bị che bởi test "low confidence" (xem lưu ý ở BUG-01).
4. **Ghi vào README** (mục chạy test ai-service) lệnh `python train_model.py`.
5. **Kiểm chứng:** xoá file `.joblib` rồi chạy `python -m pytest -q`, phải pass nhờ fixture.

## Bước 2 – BUG-02: chạy được test migration

1. Bật Docker Desktop, đợi `docker info` hiện đủ thông tin Server.
2. Chạy lại riêng lớp test: `.\mvnw.cmd -B -ntp test -Dtest=MySqlMigrationConstraintsTest` (PowerShell, thư mục `backend`).
3. Kỳ vọng: 9 test chạy, không còn skipped.
4. Nếu có test fail thật → mở bug mới (đó là lỗi migration/ràng buộc DB, cần điều tra riêng). Chưa biết kết quả vì mới chỉ bị skip.
5. Không sửa code ở bước này; chỉ là thay đổi môi trường.

## Bước 3 – BUG-03: dọn cảnh báo lint

Làm theo từng nhóm, mỗi nhóm một lần commit nhỏ, chạy `npx vitest run` (448 test) sau mỗi nhóm:

1. **`purity` (1 chỗ, dễ nhất):** đưa `Date.now()` ra khỏi render ở `ReceptionDashboardModal.jsx:122` (tính trong effect/state hoặc truyền vào).
2. **`only-export-components` (7 chỗ):** tách hằng/hàm export thêm sang file riêng (`UserManagementPanel`, `PaymentDialog`, `ReceiptPrint`, `ConfirmDialog`, `NewDrugDialog`, `AuthContext`, `ToastContext`). Chú ý các file import chéo và test import trực tiếp.
3. **`set-state-in-effect` (23 chỗ, rủi ro cao nhất):** xem từng chỗ, chọn cách phù hợp: tính giá trị trong lúc render, khởi tạo state trực tiếp, hoặc đưa vào event handler. Không sửa hàng loạt; đây là code hành vi (modal mở/đóng, tải dữ liệu) nên dễ làm hỏng logic. Bắt đầu từ `VisitDashboard`, `PaymentDialog`, `PrescriptionForm`.
4. **Không bắt buộc ngay:** nếu muốn tạm hoãn, ghi rõ lý do trong `.oxlintrc.json` thay vì tắt âm thầm.

## Tiêu chí hoàn thành

- `pytest` ai-service: 0 fail trên máy sạch (không có file `.joblib`).
- Backend: 0 skipped ở `MySqlMigrationConstraintsTest` khi có Docker.
- `npx oxlint`: 0 warning, `npx vitest run` vẫn 448/448.
- Chạy lại toàn bộ 3 phần như CI trước khi kết luận xong.

## Lưu ý khi sửa

- Dự án chạy bằng Docker: sau khi sửa code backend/frontend phải rebuild container tương ứng mới thấy thay đổi khi chạy thật. Sửa ai-service không cần quan tâm bước train vì Dockerfile đã tự train.
- Dự án định hướng để bạn tự code tay: bước 1 (conftest) và bước 3 là chỗ luyện tập tốt. Nên tự viết, tôi chỉ review.
