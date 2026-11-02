# Portal bệnh nhân dễ dùng cho mọi người (WCAG 2.2 AA) – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn tất phần B (portal bệnh nhân) của nâng cấp giao diện: chữ đủ tương phản và đủ lớn, vùng chạm ≥ 44px trên cảm ứng, bố cục không vỡ khi người dùng phóng chữ 130%, có kiểm chứng bằng trình duyệt thật.

**Architecture:** Sửa ở token (Tailwind config, `index.css`) để lan toàn app, thêm một lớp tiện ích `.touch-target`, đổi các hằng số px gắn với header sang rem, và khóa kết quả bằng test tĩnh (đọc mã nguồn) để lỗi không quay lại. Kết thúc bằng kiểm tra axe-core + ảnh chụp trên Chrome thật.

**Tech Stack:** React 19, Tailwind 3.4, Vite, Vitest + Testing Library; Chrome headless + axe-core (chỉ dùng ngoài dự án, trong thư mục tạm).

**Spec:** Không có file spec. Thiết kế đã thống nhất trong hội thoại: chia 3 dự án con A (nền tảng, đã xong) → B (file này) → C (nhân viên, để sau); chuẩn WCAG 2.2 AA; hướng "sửa từ design token". Phần A đã làm: token màu trong `index.css`, `TextSizeControl`, rem hóa `text-[Npx]`, vùng chạm 44px cho `.btn`/`.input`.

## Global Constraints

- Chuẩn đạt: WCAG 2.2 mức AA. Chữ thường ≥ 4.5:1, thành phần giao diện ≥ 3:1.
- Vùng chạm trên màn hình cảm ứng (`pointer: coarse`) ≥ 2.75rem (44px).
- Không đổi nhận diện thương hiệu (xanh navy `#0B5394`); không đổi bố cục ở cỡ chữ mặc định 100%.
- Không đổi hành vi nghiệp vụ; 441 test frontend hiện có phải tiếp tục pass.
- Hằng số kích thước gắn với chữ dùng rem, không dùng px.
- Chữ trên nền tối (vd. `AITriageSection`) giữ nguyên `text-slate-400` vì đang đạt.
- Chạy lệnh từ `frontend/`: `npx vitest run`, `npx oxlint`, `npm run build`.

## Review Focus

- Chữ `text-slate-500` trên nền xám nhạt (`slate-50`, `slate-100`) từng trượt 4.5:1; mong đợi mọi cặp nền dùng thật đều đạt.
- Phóng chữ 130% ở màn 320–390px: không có thanh cuộn ngang, nút trên header không bị cắt.
- Menu di động và dropdown tài khoản bị cắt khi chữ lớn vì `max-h` tính bằng px; mong đợi cuộn được và không tràn khỏi màn hình.
- Nút nhỏ (h-9/w-9) ở Footer, Navbar, ChatWidget, Modal khó bấm trên điện thoại; mong đợi ≥ 44px trên cảm ứng.
- `<img>` mới thêm sau này thiếu `alt`, hoặc nút chỉ có icon không có tên; mong đợi test tĩnh báo đỏ.

---

### Task 1: Token Tailwind – màu chữ phụ và cỡ chữ nhỏ nhất

**Files:**
- Modify: `frontend/tailwind.config.js` (thêm `extend.colors.slate` và `extend.fontSize.xs`)
- Test: `frontend/src/tests/contrast.test.js` (thêm describe mới)

**Interfaces:**
- Consumes: `luminance`/`contrast` helper đã có trong `contrast.test.js`.
- Produces: `text-slate-500` mới là `#566579`; `text-xs` là `0.8125rem` (13px). Mọi task sau và phần C dựa vào hai giá trị này.

- [ ] **Step 1: Viết test lỗi** – `describe('tailwind token')` trong `contrast.test.js`: import config bằng `import config from '../../tailwind.config.js'`; `it('slate-500 đạt 4.5:1 trên trắng, slate-50, slate-100, slate-200')` dùng `#ffffff`, `#f8fafc`, `#f1f5f9`, `#e2e8f0`; `it('text-xs tối thiểu 0.8125rem')` đọc `config.theme.extend.fontSize.xs[0]`.
- [ ] **Step 2: Chạy** `npx vitest run src/tests/contrast.test.js`. Kỳ vọng: FAIL (slate-500 mặc định `#64748b` trượt trên slate-100; `extend.fontSize.xs` chưa tồn tại).
- [ ] **Step 3: Sửa** `tailwind.config.js`: `extend.colors.slate = { 500: '#566579' }` (extend gộp với bảng slate mặc định); `extend.fontSize = { xs: ['0.8125rem', { lineHeight: '1.25rem' }] }`.
- [ ] **Step 4: Chạy** toàn bộ `npx vitest run` và `npm run build`. Kỳ vọng: pass, build xanh.
- [ ] **Step 5: Commit** `fix(a11y): đậm màu chữ slate-500 và nâng text-xs lên 13px`

### Task 2: Vùng chạm ≥ 44px cho nút nhỏ ở portal

**Files:**
- Modify: `frontend/src/index.css` (thêm `.touch-target` vào khối `@media (pointer: coarse)` đã có)
- Modify: `frontend/src/components/layout/Footer.jsx:155`, `layout/Navbar.jsx:144,246,337`, `chat/ChatWidget.jsx:185`, `common/Modal.jsx:142` (thêm class `touch-target`)
- Test: `frontend/src/tests/touchTarget.test.jsx`

**Interfaces:**
- Produces: lớp CSS `.touch-target { min-height: 2.75rem; min-width: 2.75rem; }` chỉ có hiệu lực khi `pointer: coarse`.

- [ ] **Step 1: Viết test lỗi** – (a) `it('.touch-target nằm trong @media (pointer: coarse) với 2.75rem')` đọc `index.css` bằng regex; (b) `it('nút đóng của Modal có class touch-target')` render `<Modal isOpen title="x" onClose={fn}>` và kiểm `getByRole('button', { name: /đóng/i })`; (c) `it('mọi <button>/<a> có h-9 hoặc w-9 trong layout/, chat/, common/Modal.jsx đều có touch-target')` quét mã nguồn bằng regex trên thẻ mở nhiều dòng.
- [ ] **Step 2: Chạy** `npx vitest run src/tests/touchTarget.test.jsx`. Kỳ vọng: FAIL cả 3.
- [ ] **Step 3: Thêm** `.touch-target` vào khối coarse trong `index.css`, rồi thêm class vào 6 phần tử liệt kê ở trên. Không đụng `w-8 h-8` của `HeroSection` (hộp icon trang trí, không tương tác).
- [ ] **Step 4: Chạy** `npx vitest run`. Kỳ vọng: pass.
- [ ] **Step 5: Commit** `feat(a11y): vùng chạm 44px cho nút nhỏ ở header, footer, chat, modal`

### Task 3: Hằng số px gắn với header và khung chat → rem

**Files:**
- Modify: `frontend/src/components/layout/Navbar.jsx:261,352` (`max-h-[calc(100vh-88px)]` → `max-h-[calc(100vh-5.5rem)]`, `max-h-[calc(100vh-64px)]` → `max-h-[calc(100vh-4rem)]`)
- Modify: `frontend/src/components/chat/ChatWidget.jsx:196` (`sm:w-[410px]` → `sm:w-[25.625rem]`, `h-[560px]` → `h-[35rem]`)
- Test: `frontend/src/tests/remLayout.test.js`

**Interfaces:**
- Consumes: không. Produces: quy ước "không có `calc(100vh-Npx)` trong `components/`" do test thực thi.

- [ ] **Step 1: Viết test lỗi** – quét `src/components/**/*.jsx`; `it('không dùng calc(100vh - Npx) cho khung gắn với header')` bắt regex `/calc\(100d?vh-?\s*\d+px\)/` (chấp nhận biến thể `dvh`, `_-_`); `it('ChatWidget không đặt kích thước khung bằng px')` kiểm `h-[560px]` và `w-[410px]` không còn.
- [ ] **Step 2: Chạy** test. Kỳ vọng: FAIL, liệt kê file và dòng vi phạm.
- [ ] **Step 3: Sửa** 4 giá trị nêu trên; nếu test còn báo chỗ khác thì đổi tương tự (px/16).
- [ ] **Step 4: Chạy** `npx vitest run`, `npm run build`. Kỳ vọng: pass.
- [ ] **Step 5: Commit** `fix(a11y): khung header và chat co giãn theo cỡ chữ`

### Task 4: Test tĩnh chặn lỗi truy cập quay lại

**Files:**
- Create: `frontend/src/tests/a11yStatic.test.js`

**Interfaces:**
- Produces: hai quy tắc kiểm mã nguồn cho phần C tái dùng: mọi `<img>` có `alt`; mọi `<button>` chỉ chứa icon có `aria-label`, `aria-labelledby` hoặc `title`.

- [ ] **Step 1: Viết test** – quét toàn bộ `src/components/**/*.jsx` và `src/App.jsx`: `it('mọi <img> có thuộc tính alt')`; `it('nút chỉ có icon phải có tên truy cập')` (bỏ icon `material-symbols-outlined` và `<Icon .../>` khi xét "có chữ").
- [ ] **Step 2: Chạy** `npx vitest run src/tests/a11yStatic.test.js`. Kỳ vọng: PASS ngay (khảo sát cho thấy hiện không có vi phạm); nếu FAIL thì sửa đúng chỗ bị liệt kê (decorative: `alt=""`; nút: thêm `aria-label`).
- [ ] **Step 3: Kiểm chứng test thật sự bắt lỗi:** tạm thêm `<img src="x"/>` vào một component, chạy lại thấy FAIL, rồi gỡ ra.
- [ ] **Step 4: Commit** `test(a11y): chặn img thiếu alt và nút icon thiếu tên`

### Task 5: Kiểm chứng bằng Chrome thật (axe-core + ảnh chụp) và sửa lỗi tìm thấy

**Files:**
- Create (ngoài dự án, trong thư mục scratchpad): script `portal-audit.mjs`, cài `puppeteer-core` và `axe-core` tại đó
- Modify: các file thật sự bị axe/ảnh chụp báo lỗi (chưa biết trước)
- Modify: `docs/superpowers/plans/2026-10-31-patient-portal-accessibility.md` (ghi kết quả)

**Interfaces:**
- Consumes: ứng dụng chạy ở `http://localhost:3000` sau `docker compose up -d --build frontend`; Chrome hoặc Edge cài sẵn trên máy.
- Produces: bảng kết quả theo (viewport 1280 và 390) × (cỡ chữ 100% và 130%): số vi phạm axe (rule `color-contrast`, `target-size`, `image-alt`, `label`, `button-name`) và có/không cuộn ngang (`document.documentElement.scrollWidth > innerWidth`).

- [ ] **Step 1: Rebuild** container frontend: `docker compose up -d --build frontend`, chờ HTTP 200.
- [ ] **Step 2: Viết và chạy** `portal-audit.mjs` cho 4 tổ hợp trên; chụp ảnh từng tổ hợp.
- [ ] **Step 3: Phân loại** vi phạm: lỗi thật của dự án thì sửa; lỗi do thư viện bên thứ ba hoặc dương tính giả thì ghi rõ lý do, không sửa.
- [ ] **Step 4: Sửa** từng lỗi thật, mỗi lỗi một thay đổi nhỏ, chạy lại audit để xác nhận số vi phạm giảm.
- [ ] **Step 5: Chạy** `npx vitest run`, `npx oxlint`, `npm run build`, rebuild container; ghi bảng kết quả trước/sau vào cuối file plan này.
- [ ] **Step 6: Commit** `fix(a11y): sửa lỗi axe trên portal bệnh nhân` kèm bảng kết quả trong mô tả.

---

## Kết quả thực hiện (31/10/2026)

Cả 5 task đã làm; không commit (chưa được yêu cầu). Đo bằng Chrome headless + axe-core 4.10.2 trên container frontend vừa build.

| Hạng mục | Trước | Sau |
|---|---|---|
| Test frontend | 441 | **457** pass (thêm 16: Tailwind token, touch-target, rem layout, a11y tĩnh, navbar di động) |
| Lint | 25 cảnh báo | 25 (không thêm) |
| Axe (trang chủ, 6 độ rộng × chữ 100%/130%) | 0 vi phạm | 0 vi phạm |
| Axe (Đặt lịch, Đăng nhập, Chatbot ở 390px × 100%/130%) | chưa đo | 0 vi phạm |
| Header tràn ngoài màn hình | **Có**: nút menu ở x=549 trong khung 390px, nút Đăng nhập x=517 | Không ở cả 12 tổ hợp |
| Khung chat 390px, chữ 130% | Tiêu đề xếp một chữ một dòng và bị header che | Tiêu đề đọc được, khung nằm gọn dưới header |

**Lỗi tìm thấy nhờ trình duyệt thật (axe không báo, jsdom không thấy):**
1. Header điện thoại: nút menu và Đăng nhập nằm ngoài màn hình ngay từ trước khi sửa (đo: tắt hết thay đổi vẫn x=549). `body` có `overflow-x: hidden` nên che mất dấu hiệu cuộn ngang.
2. Dải 640px, chữ 130%: nhóm nút "A A A" làm header tràn 14px, dời sang `md`.
3. Khung chat chữ 130%: ô avatar và 3 nút icon bóp tiêu đề; `max-h` quên trừ header cố định.

**Chưa kiểm chứng:** header khi đã đăng nhập (chip tài khoản), cỡ 200% của trình duyệt, trình đọc màn hình thật, các modal ngoài Đặt lịch/Đăng nhập/Chat.

Script kiểm tra nằm ngoài dự án: `scratchpad/audit/portal-audit.mjs`, `modal-audit.mjs`, `menu-check.mjs`.

## Self-review

- **Phủ thiết kế:** màu (A, Task 1), cỡ chữ (Task 1, 3), vùng chạm (Task 2), kiểm chứng thật (Task 5). Phần "viền focus", "reduced motion", "nút cỡ chữ" đã xong ở A.
- **Không có task nào dựa vào tên chưa định nghĩa:** `touch-target` (Task 2), `slate-500`, `text-xs` (Task 1).
- **Tỉ lệ:** 5 task nhỏ, mỗi task có test hoặc kiểm chứng riêng. Task 5 cố ý mở vì chỉ trình duyệt thật mới cho biết còn lỗi gì.
- **Ngoài phạm vi:** không đụng portal nhân viên (C), không đổi nhận diện, không thêm thư viện vào dự án.
