# Staff Workspace Accessibility Implementation Plan (phần C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Không gian làm việc của nhân viên (admin, lễ tân - kế toán, bác sĩ, điều dưỡng, dược sĩ) dùng được ở chữ 100–130%, bằng bàn phím và trên máy tính bảng, đạt WCAG 2.2 AA.

**Architecture:** Phần A đã sửa token (màu, cỡ chữ, vùng chạm 44px) nên axe báo 0 lỗi tương phản ở khu vực nhân viên. Phần C chỉ sửa những gì đo được là hỏng ở lớp khung (`StaffWorkspace`, `.nav-item`) và ở mẫu bảng cuộn dùng chung (`.table-wrap`), không đụng logic nghiệp vụ của từng phân hệ.

**Tech Stack:** React 19, Tailwind 3.4, Vitest + Testing Library, Chrome headless + axe-core 4.10.2 (kịch bản ngoài dự án, xem cuối plan).

**Spec:** [2026-10-31-patient-portal-accessibility.md](2026-10-31-patient-portal-accessibility.md) (cùng chuẩn WCAG 2.2 AA, cùng cách tiếp cận sửa từ token). Người dùng chọn "Cả hai nhóm" và "A + B trước", nay làm C.

## Số đo ban đầu (31/10/2026, đăng nhập thật từng vai trò, 1280×800 và 390×844, chữ 100% / 130%)

| Vấn đề | Đo được |
|---|---|
| Topbar tràn ngang, nút "Cổng thông tin" và menu tài khoản bị cắt khỏi màn hình | Mọi vai trò, 1280px: tràn 17–44px ở chữ 100%, tràn 277–325px ở chữ 130% |
| Nhãn menu bên bị cắt bằng "…" ở chữ 130% ("Trạm điều dưỡng …", "Nhà thuốc & dược…") | Thấy trên ảnh chụp admin 130% |
| Vùng cuộn không focus được bằng bàn phím (axe `scrollable-region-focusable`) | bảng `.table-wrap` (9 chỗ) + bảng chi tiết hóa đơn cùng kiểu + tabpanel của bác sĩ, trên 390px (admin, lễ tân, bác sĩ) và 1280px (bác sĩ) |
| Chưa có nút cỡ chữ trong không gian nhân viên | Điều khiển cỡ chữ chỉ có ở header cổng thông tin |
| Nút 32–36px, mục menu 36–40px chưa đạt 44px trên màn cảm ứng | `w-8 h-8`, `w-9 h-9`, `.nav-item`, `.dropdown-item` |
| Tương phản, tên nút, nhãn ô nhập (axe) | 0 vi phạm ở 5 vai trò × 4 tổ hợp, trang mặc định của mỗi phân hệ |

## Global Constraints

- Văn bản hiển thị bằng tiếng Việt có dấu, giữ giọng văn hiện có.
- Cỡ tính bằng rem (không thêm `text-[Npx]` hay chiều cao px mới).
- Vùng chạm cảm ứng ≥ 2.75rem qua `@media (pointer: coarse)`, vùng chạm chuột ≥ 24px (WCAG 2.5.8).
- Không thêm thư viện. Không đổi API hay logic phân quyền.

## Review Focus

- Vai trò chỉ có vài mục menu (điều dưỡng, dược sĩ): topbar vẫn không tràn khi bỏ bớt mục.
- Sidebar thu gọn (`is-collapsed`) vẫn căn giữa icon và vẫn có tooltip sau khi nhãn được phép xuống dòng.
- Tên người dùng rất dài trong menu tài khoản không đẩy menu ra ngoài màn hình.
- Bàn phím: Tab tới được bảng cuộn, mũi tên cuộn được, và có viền focus nhìn thấy.
- Menu tài khoản đóng bằng Esc vẫn trả focus về nút mở sau khi thêm nút cỡ chữ vào trong menu.

## File Structure

- Modify `frontend/src/components/workspace/StaffWorkspace.jsx`: breakpoint của topbar, nút cỡ chữ trong menu tài khoản, `touch-target`.
- Modify `frontend/src/index.css`: `.nav-item` cho phép xuống dòng, `.table-wrap:focus-visible`, thêm `.nav-item`/`.dropdown-item` vào khối `pointer: coarse`.
- Create `frontend/src/components/common/TableWrap.jsx`: bảng cuộn ngang focus được, có tên.
- Modify 7 file có bảng cuộn: `WorkspaceDashboard`, `UserManagementPanel`, `AdminPanelModal`, `PharmacyDispenseModal`, `ReceptionDashboardModal`, `StatisticsDashboardModal` (9 chỗ `.table-wrap`), `InvoiceDetail` (1 chỗ `overflow-x-auto`); và `VisitDashboard` (tabpanel).
- Create `frontend/src/tests/staffWorkspace.test.jsx`, `frontend/src/tests/tableWrap.test.jsx`; modify `touchTarget.test.jsx`.

---

### Task 1: Topbar và menu bên không tràn, không cắt chữ

**Files:**
- Modify: `frontend/src/components/workspace/StaffWorkspace.jsx` (topbar), `frontend/src/index.css` (`.nav-item`)
- Test: `frontend/src/tests/staffWorkspace.test.jsx`

**Interfaces:**
- Produces: `renderWorkspace(roles: string[])` trong file test (render `StaffWorkspace` trong `ToastProvider` + `AuthProvider` với `hms_token`/`hms_user` đặt sẵn vào `localStorage`, api bị mock offline như `navbarMobile.test.jsx`).

- [x] **Step 1: Viết test fail** trong `staffWorkspace.test.jsx`:
  - `chip ngày giờ khám chỉ hiện từ màn 2xl`: phần tử có text "Giờ khám" có class khớp `/\bhidden\b.*\b2xl:flex\b/`.
  - `nút Cổng thông tin trên topbar chỉ hiện từ màn 2xl`: nút có tên "Cổng thông tin" trong `banner` có class khớp `/\bhidden\b.*\b2xl:inline-flex\b/` (lối vào khác vẫn còn: nút "Xem cổng thông tin" ở sidebar và mục trong menu tài khoản).
  - `nhãn tìm bệnh nhân chỉ hiện từ màn xl`: span "Tìm bệnh nhân (tên, SĐT, CCCD)…" có class `xl:inline`, không có `lg:inline`.
  - `index.css`: khối `.nav-item {…}` không chứa `white-space: nowrap` và không chứa `height: 40px`, có `min-height:`.
- [x] **Step 2: Chạy** `npx vitest run src/tests/staffWorkspace.test.jsx`, mong đợi 4 test FAIL.
- [x] **Step 3: Sửa** `StaffWorkspace.jsx` (chip ngày: `hidden xl:flex` → `hidden 2xl:flex`; nút Cổng thông tin: `hidden md:inline-flex` → `hidden 2xl:inline-flex` (ở 1280px/chữ 130% breadcrumb vẫn bị cắt nếu nút này còn hiện); nhãn tìm kiếm: `hidden lg:inline` → `hidden xl:inline`) và `.nav-item` (`min-height: 2.5rem; padding: 0.5rem 0.75rem; white-space: normal; line-height: 1.3; height` bỏ đi). Khi sidebar thu gọn giữ `justify-content: center; padding: 0`.
- [x] **Step 4: Chạy lại**, mong đợi PASS.
- [x] **Step 5: Đo bằng Chrome** (`ONLY=admin,dieuduong node staff-audit.mjs` sau khi build lại container): không còn dòng `TRÀN` ở desktop 100% và 130%.

### Task 2: Nút cỡ chữ trong menu tài khoản của nhân viên

**Files:**
- Modify: `frontend/src/components/workspace/StaffWorkspace.jsx`
- Test: `frontend/src/tests/staffWorkspace.test.jsx`

**Interfaces:**
- Consumes: `TextSizeControl` (`components/common/TextSizeControl.jsx`, prop `className`), `localStorage` khóa `hms_text_size`.

- [x] **Step 1: Viết test fail**:
  - `menu tài khoản có nhóm Cỡ chữ`: bấm nút "Tài khoản: …", `getByRole('group', { name: 'Cỡ chữ' })` tồn tại.
  - `chọn Chữ lớn đổi cỡ chữ gốc thành 115%`: bấm "Chữ lớn" thì `document.documentElement.style.fontSize === '115%'` và `localStorage.hms_text_size === 'large'`.
  - `Esc đóng menu và trả focus về nút tài khoản`.
- [x] **Step 2: Chạy**, mong đợi 2 test đầu FAIL (test Esc đã đúng, ghi lại để khóa hành vi).
- [x] **Step 3: Thêm vào menu tài khoản**, ngay trên `dropdown-divider`, một hàng `px-3 py-2 flex items-center justify-between` gồm nhãn "Cỡ chữ" và `<TextSizeControl />`.
- [x] **Step 4: Chạy lại**, mong đợi PASS.

### Task 3: Bảng cuộn focus được bằng bàn phím

**Files:**
- Create: `frontend/src/components/common/TableWrap.jsx`
- Modify: `frontend/src/index.css`, `InvoiceDetail.jsx`, 6 file dùng `table-wrap`, `VisitDashboard.jsx`
- Test: `frontend/src/tests/tableWrap.test.jsx`

**Interfaces:**
- Produces: `TableWrap({ label: string, className?: string, children })` render `div.table-wrap` với `role="region"`, `aria-label={label}`, `tabIndex={0}`. Mặc định export.

- [x] **Step 1: Viết test fail**:
  - `TableWrap` có role region, tên đúng `label`, `tabIndex` 0, giữ class `table-wrap` và class truyền vào.
  - Quét mã nguồn: không file nào trong `components/` (trừ `TableWrap.jsx`) còn chuỗi `className="table-wrap` hay `` className={`table-wrap ``.
  - `index.css` có quy tắc `.table-wrap:focus-visible` với `outline`.
  - `VisitDashboard.jsx`: phần tử `role="tabpanel"` của ca khám có `tabIndex={0}` (quét nguồn quanh `visit-panel-`).
- [x] **Step 2: Chạy**, mong đợi FAIL.
- [x] **Step 3: Tạo `TableWrap.jsx`; thay 9 chỗ `.table-wrap`; `InvoiceDetail` (kiểu dáng riêng) chỉ thêm `role="region"`, `aria-label`, `tabIndex={0}` và viền focus.** Nhãn theo nội dung từng bảng (đọc ngữ cảnh quanh mỗi chỗ, ví dụ "Danh sách lịch khám đã đăng ký", "Danh sách tài khoản"). Thêm `.table-wrap:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }`. Thêm `tabIndex={0}` cho tabpanel của `VisitDashboard`.
- [x] **Step 4: Chạy lại** toàn bộ test frontend, mong đợi PASS (các test cũ tìm bảng bằng role `table` không bị ảnh hưởng).
- [x] **Step 5: Đo bằng Chrome** cả 5 vai trò: không còn `scrollable-region-focusable`.

### Task 4: Vùng chạm 44px cho khung nhân viên

**Files:**
- Modify: `frontend/src/components/workspace/StaffWorkspace.jsx`, `frontend/src/index.css`
- Test: `frontend/src/tests/touchTarget.test.jsx`

- [x] **Step 1: Mở rộng test fail**: thêm `components/workspace/StaffWorkspace.jsx` vào `it.each` với regex `/\b(h|w)-(8|9)\b/`; thêm kiểm tra khối `pointer: coarse` có `.nav-item` và `.dropdown-item` với `min-height: 2.75rem`.
- [x] **Step 2: Chạy**, mong đợi FAIL (các nút thu gọn sidebar, đóng menu, đăng xuất, mở menu, tìm bệnh nhân).
- [x] **Step 3: Thêm `touch-target`** vào các dòng đó; thêm hai selector vào khối coarse. Nút đóng nhỏ `w-6 h-6` trong chip bệnh nhân giữ nguyên (24px đạt AA, nở ra 44px sẽ phá chip); ghi chú vào kết quả.
- [x] **Step 4: Chạy lại**, mong đợi PASS.

### Task 5: Kiểm chứng và ghi kết quả

- [x] **Step 1:** `npx vitest run`, `npx oxlint`, `npm run build`: không test hỏng, không cảnh báo lint mới (nền 25), build thành công.
- [x] **Step 2:** `docker compose build frontend` rồi `docker compose up -d frontend`.
- [x] **Step 3:** `staff-audit.mjs` cho 5 vai trò × 4 tổ hợp: axe 0 vi phạm, không dòng `TRÀN` ở topbar.
- [x] **Step 4:** Xem ảnh chụp từng phân hệ ở 390px/130% bằng mắt (axe không bắt được tràn bố cục), rồi thêm mục "Kết quả thực hiện" vào cuối file này.

## Ngoài phạm vi (ghi rõ để không hiểu nhầm)

- Chỉ đo trang mặc định của mỗi phân hệ. Các tab/hộp thoại con (ví dụ tab "Tài khoản" của quản trị, hộp thoại thanh toán, form kê đơn) chưa đo bằng Chrome.
- Không thử với trình đọc màn hình thật.
- 22 cảnh báo `set-state-in-effect` và 3 `only-export-components` vẫn chờ quyết định của bạn.

## Kịch bản đo (nằm ngoài dự án)

`C:\Users\t1jus\AppData\Local\Temp\claude\d--01-Work-Projects\57ee0e01-b46d-47dd-bd0f-77a79af8d864\scratchpad\audit\staff-audit.mjs`: đăng nhập từng tài khoản mẫu trong README bằng context trình duyệt riêng, vào không gian làm việc, mở từng phân hệ, chạy axe và kiểm tra tràn ngang. Biến `ONLY=admin,letan` lọc vai trò, `TAG` đổi thư mục ảnh.

## Kết quả thực hiện (31/10/2026)

Đo bằng Chrome headless + axe-core 4.10.2 trên container frontend vừa build, đăng nhập thật từng vai trò, trang mặc định của mỗi phân hệ.

| Hạng mục | Trước | Sau |
|---|---|---|
| Test frontend | 457 | 478 (thêm 21, 32 file) |
| Lint | 25 cảnh báo | 25 cảnh báo (không thêm mới) |
| Build | OK | OK |
| Axe, 5 vai trò × (1280, 390) × (chữ 100%, 130%), 52 lượt đo | nhiều lỗi `scrollable-region-focusable` | 0 vi phạm |
| Topbar tràn ngang ở 1280px (mọi vai trò) | tràn 17–44px (100%), 277–325px (130%) | không tràn |

**Hai lỗi bố cục chỉ thấy khi xem ảnh Chrome sau khi sửa topbar** (axe không bắt được, jsdom không đo được bố cục):
1. **Phòng khám bác sĩ:** khung chi tiết ca khám thiếu `min-w-0` trong hàng flex nên rộng hơn hộp thoại (41px ở chữ 100%, 437px ở chữ 130%): cột "Huyết áp tâm trương", ngày giờ ca khám, các tab bị cắt và không cuộn tới được. Lỗi này có từ trước, bị dòng báo tràn của topbar che mất khi đo baseline. Sửa: thêm `min-w-0`.
2. **Form sinh hiệu (bác sĩ và điều dưỡng):** sau khi khung co đúng chiều ngang, 4 cột cố định ở chữ 130% chỉ còn ~15px cho giá trị ("80" hiện thành "8"). Sửa: lưới `grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]` tự giảm số cột khi chữ lớn lên.

**Cố ý giữ nguyên:**
- Nút đóng `w-6 h-6` trong chip bệnh nhân (24px, đạt WCAG 2.5.8 AA; nở ra 44px sẽ phá chip).
- Breadcrumb trên topbar vẫn bị cắt bằng "…" ở 1280px/chữ 130% ("Bảng điều k…"); thông tin đầy đủ có ở menu bên và tiêu đề hộp thoại.

**Chưa kiểm chứng:** tab/hộp thoại con (tab "Tài khoản" của quản trị, thanh toán, kê đơn thuốc, xét nghiệm), phóng 200% của trình duyệt, trình đọc màn hình thật, máy tính bảng thật.

## Bổ sung: dọn lint và đo sâu hộp thoại con (31/10/2026)

- **Lint: 25 → 0 cảnh báo, không tắt rule nào, `.oxlintrc.json` giữ nguyên.**
  - 3 cảnh báo `only-export-components`: tách `useAuth`, `useToast`, `useConfirm` (cùng context object) ra `context/useAuth.js`, `context/useToast.js`, `components/common/useConfirm.js`; cập nhật import ở 25 file và `vi.mock` ở 4 test.
  - 22 cảnh báo `set-state-in-effect` (17 file): "đặt lại state khi mở" chuyển sang điều chỉnh state trong lúc render; "tải dữ liệu" chuyển sang trạng thái suy ra từ khóa request (cùng mẫu `useAsyncData`), có cờ `cancelled` nên kết quả cũ không ghi đè kết quả mới.
  - Khác biệt hành vi đã biết (nhỏ): hộp thoại hóa đơn của tôi không còn hiện danh sách cũ kèm "Đang tải" khi mở lại; `MyAppointmentsModal` xóa "Đang hủy…" ngay sau khi gọi API hủy, danh sách tải lại ngay sau đó; `BookingModal` dùng hằng module `NO_INITIAL_DATA` thay cho `{}` mặc định (tránh vòng lặp render).
- **Đo sâu bằng Chrome** (`staff-deep-audit.mjs`): mọi tab của phân hệ, tab "Tài khoản" + hộp thoại "Thêm tài khoản", "Tạo hồ sơ bệnh nhân", "Thêm thuốc mới", chọn ca khám của bác sĩ và 5 tab của ca khám, 4 tổ hợp (1280/390 × chữ 100%/130%): 100 lượt đo, 0 vi phạm axe, không tràn, không bị cắt.
- **Lỗi thêm tìm thấy:** dòng "Không có lịch hẹn nào…" trong bảng 6 cột bị căn giữa theo cả bảng nên nằm ngoài màn hình 390px. Đã ghim `sticky left-0` (hàng đợi lễ tân, kho dược).
- **Số cuối:** 480 test pass (32 file), lint 0, build OK.
- **Vẫn chưa kiểm chứng:** hộp thoại "Thu tiền" (cần một hóa đơn chờ thanh toán; không tạo dữ liệu mới trong DB để thử), form kê đơn khi đã chọn thuốc, phóng 200%, trình đọc màn hình, máy tính bảng thật.
