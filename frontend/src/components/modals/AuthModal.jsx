import React, { useRef, useState } from 'react';
import Modal from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/apiError';

/**
 * Tài khoản mẫu để đăng nhập nhanh, hiển thị ngay trên form đăng nhập.
 * Chỉ hiện khi chạy `npm run dev` hoặc khi build với VITE_SHOW_DEMO_ACCOUNTS=true (docker-compose đọc biến này từ .env).
 * Bản build KHÔNG đặt biến này (mặc định false) sẽ loại bỏ hẳn khối này để không lộ thông tin đăng nhập.
 * Khi dùng CSDL thật: đặt VITE_SHOW_DEMO_ACCOUNTS=false và khóa các tài khoản mẫu (scripts/db/02_lock_demo_accounts.sql).
 */

const DEMO_ROLE_ACCOUNTS = [
  { id: 'btn-demo-admin', username: 'admin', password: 'Admin@123', name: 'Ban Giám Đốc', role: 'Quản trị', icon: 'shield_person' },
  { id: 'btn-demo-doctor', username: 'bs.maianh', password: 'Doctor@123', name: 'TS.BS Vi Mai Anh', role: 'Bác sĩ – Trưởng khoa', icon: 'stethoscope' },
  { id: 'btn-demo-pharmacist', username: 'ds.quang', password: 'Pharmacist@123', name: 'DS. Lê Hải Quang', role: 'Dược sĩ', icon: 'medication' },
  { id: 'btn-demo-receptionist', username: 'letan', password: 'Receptionist@123', name: 'CN. Thùy Linh', role: 'Lễ tân – Kế toán', icon: 'support_agent' },
  { id: 'btn-demo-nurse', username: 'dieuduong', password: 'Nurse@123', name: 'ĐD. Thu Hà', role: 'Điều dưỡng', icon: 'vital_signs' },
  { id: 'btn-demo-patient', username: 'benhnhan', password: 'Password@123', name: 'Trần Đức Minh', role: 'Bệnh nhân', icon: 'person' }
];

const DEMO_DOCTOR_ACCOUNTS = [
  { username: 'bs.maianh', name: 'TS.BS Vi Mai Anh', dept: 'Khám bệnh / Cấp cứu' },
  { username: 'bs.nga', name: 'BSCKII. Lê Thị Nga', dept: 'Ngoại & Tiểu phẫu' },
  { username: 'bs.vy', name: 'BSCKII. Phạm Lan Vy', dept: 'Sản – Phụ khoa' },
  { username: 'bs.dung', name: 'ThS.BS Hoàng Thị Dung', dept: 'Tai Mũi Họng' },
  { username: 'bs.sy', name: 'BS. Nguyễn Văn Sỹ', dept: 'YHCT – Phục hồi chức năng' },
  { username: 'bs.hiep', name: 'ThS.BS Lê Tuấn Hiệp', dept: 'Thẩm mỹ / Tạo hình' },
  { username: 'bs.an', name: 'TS.BS Trần Thị An', dept: 'Chẩn đoán hình ảnh' },
  { username: 'bs.toan', name: 'ThS.BS Hoàng Văn Toán', dept: 'Xét nghiệm' }
];
const DEMO_DOCTOR_PASSWORD = 'Doctor@123';

const TABS = [
  { key: 'login', label: 'Đăng Nhập' },
  { key: 'register', label: 'Đăng Ký Mới' }
];

const EMPTY_REGISTER = {
  fullName: '',
  username: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: ''
};

// Khớp ràng buộc của backend (RegisterRequest): ≥ 8 ký tự, có chữ hoa, chữ thường và chữ số
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PHONE_RULE = /^0\d{9,10}$/;

function validateRegister(form) {
  if (!form.fullName.trim() || !form.username.trim() || !form.email.trim() || !form.password) {
    return 'Vui lòng điền đầy đủ các thông tin bắt buộc (*).';
  }
  if (form.username.trim().length < 3) return 'Tên đăng nhập cần tối thiểu 3 ký tự.';
  if (form.phoneNumber.trim() && !PHONE_RULE.test(form.phoneNumber.trim())) {
    return 'Số điện thoại không hợp lệ (10–11 chữ số, bắt đầu bằng 0).';
  }
  if (!PASSWORD_RULE.test(form.password)) {
    return 'Mật khẩu cần tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số.';
  }
  if (form.password !== form.confirmPassword) return 'Mật khẩu xác nhận không khớp.';
  return '';
}

function FormAlert({ id, message }) {
  if (!message) return null;
  return (
    <div id={id} role="alert" className="alert alert-error">
      <span className="material-symbols-outlined" aria-hidden="true">error</span>
      <span>{message}</span>
    </div>
  );
}

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  const [tab, setTab] = useState(initialTab);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [prevOpenState, setPrevOpenState] = useState({ isOpen, initialTab });
  const tabRefs = useRef({});

  const { login, register } = useAuth();
  const { showToast } = useToast();

  // Mỗi lần mở (hoặc đổi tab yêu cầu): về đúng tab, xóa lỗi cũ và mật khẩu đã nhập trước đó.
  // Điều chỉnh state ngay khi render thay vì trong effect để tránh render lặp.
  if (prevOpenState.isOpen !== isOpen || prevOpenState.initialTab !== initialTab) {
    setPrevOpenState({ isOpen, initialTab });
    if (isOpen) {
      setTab(initialTab);
      setError('');
      setLoginForm((prev) => ({ ...prev, password: '' }));
      setRegisterForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
    }
  }

  const switchTab = (key, focus = false) => {
    setTab(key);
    setError('');
    if (focus) tabRefs.current[key]?.focus();
  };

  const handleTabKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = TABS.findIndex((t) => t.key === tab);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = TABS.length - 1;
    switchTab(TABS[next].key, true);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginForm.username.trim() || !loginForm.password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await login(loginForm.username.trim(), loginForm.password);
      showToast(`Xin chào ${res.user?.fullName || loginForm.username.trim()}! Đăng nhập thành công.`, 'success');
      setLoginForm({ username: '', password: '' });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng nhập không thành công. Vui lòng thử lại.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const validation = validateRegister(registerForm);
    if (validation) {
      setError(validation);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const phone = registerForm.phoneNumber.trim();
      const res = await register({
        fullName: registerForm.fullName.trim(),
        username: registerForm.username.trim(),
        email: registerForm.email.trim(),
        // authService.register đọc trường `phone`; giữ thêm phoneNumber cho tương thích
        phone,
        phoneNumber: phone,
        password: registerForm.password
      });
      showToast(`Đăng ký thành công tài khoản cho ${res.user?.fullName || registerForm.fullName.trim()}!`, 'success');
      setRegisterForm(EMPTY_REGISTER);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng ký không thành công. Vui lòng thử lại.'));
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (username, password) => {
    setLoginForm({ username, password });
    setError('');
    setTab('login');
  };

  const updateRegister = (field) => (e) => setRegisterForm((prev) => ({ ...prev, [field]: e.target.value }));
  const errorId = `auth-${tab}-error`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      icon={tab === 'login' ? 'login' : 'person_add'}
      title={tab === 'login' ? 'Đăng Nhập Hệ Thống' : 'Đăng Ký Tài Khoản'}
      subtitle="Mỹ Phát Hospital"
      bodyClassName="overflow-y-auto"
    >
      {/* Chuyển tab đăng nhập / đăng ký */}
      <div role="tablist" aria-label="Chọn hình thức" className="tabs px-5 sm:px-6" onKeyDown={handleTabKeyDown}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              ref={(el) => { tabRefs.current[t.key] = el; }}
              type="button"
              role="tab"
              id={`tab-btn-${t.key}`}
              aria-selected={active}
              aria-controls={`auth-panel-${t.key}`}
              tabIndex={active ? 0 : -1}
              onClick={() => switchTab(t.key)}
              className={`tab flex-1 justify-center ${active ? 'is-active' : ''}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`auth-panel-${tab}`}
        aria-labelledby={`tab-btn-${tab}`}
        className="px-5 py-5 sm:px-6"
      >
        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
            <FormAlert id={errorId} message={error} />

            <div className="form-field">
              <label htmlFor="login-username" className="form-label">
                Tên đăng nhập<span className="required" aria-hidden="true">*</span>
              </label>
              <div className="input-group">
                <span className="material-symbols-outlined input-icon" aria-hidden="true">person</span>
                <input
                  type="text"
                  id="login-username"
                  data-autofocus
                  required
                  autoComplete="username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="Nhập tên đăng nhập"
                  aria-invalid={Boolean(error) && !loginForm.username.trim()}
                  aria-describedby={error ? errorId : undefined}
                  className="input"
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="login-password" className="form-label">
                Mật khẩu<span className="required" aria-hidden="true">*</span>
              </label>
              <div className="input-group">
                <span className="material-symbols-outlined input-icon" aria-hidden="true">lock</span>
                <input
                  type="password"
                  id="login-password"
                  required
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="Nhập mật khẩu"
                  aria-invalid={Boolean(error) && !loginForm.password}
                  aria-describedby={error ? errorId : undefined}
                  className="input"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-login"
              disabled={loading}
              aria-busy={loading}
              className="btn btn-primary btn-lg btn-block"
            >
              {loading && <span className="spinner !w-4 !h-4 !border-white/40 !border-t-white" aria-hidden="true" />}
              {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
            </button>

            <p className="text-xs text-slate-500 text-center">
              Chưa có tài khoản?{' '}
              <button type="button" onClick={() => switchTab('register', true)} className="font-semibold text-primary hover:underline">
                Đăng ký tài khoản bệnh nhân
              </button>
            </p>

            {/* Biến import.meta.env.* được thay bằng hằng số lúc build: bản build tắt cờ này loại bỏ hẳn khối này */}
            {(import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true') && (
              <DemoAccounts selectedUsername={loginForm.username} onPick={fillDemoAccount} />
            )}
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} noValidate className="space-y-3.5">
            <FormAlert id={errorId} message={error} />

            <div className="form-field">
              <label htmlFor="reg-fullname" className="form-label">
                Họ và tên<span className="required" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                required
                id="reg-fullname"
                data-autofocus
                autoComplete="name"
                value={registerForm.fullName}
                onChange={updateRegister('fullName')}
                placeholder="Ví dụ: Nguyễn Văn An"
                className="input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-field">
                <label htmlFor="reg-username" className="form-label">
                  Tên đăng nhập<span className="required" aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  required
                  id="reg-username"
                  autoComplete="username"
                  value={registerForm.username}
                  onChange={updateRegister('username')}
                  placeholder="nguyenvanan"
                  className="input"
                />
              </div>
              <div className="form-field">
                <label htmlFor="reg-phone" className="form-label">Số điện thoại</label>
                <input
                  type="tel"
                  id="reg-phone"
                  autoComplete="tel"
                  inputMode="tel"
                  value={registerForm.phoneNumber}
                  onChange={updateRegister('phoneNumber')}
                  placeholder="0912345678"
                  className="input"
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="reg-email" className="form-label">
                Email<span className="required" aria-hidden="true">*</span>
              </label>
              <input
                type="email"
                required
                id="reg-email"
                autoComplete="email"
                value={registerForm.email}
                onChange={updateRegister('email')}
                placeholder="an.nguyen@gmail.com"
                className="input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-field">
                <label htmlFor="reg-password" className="form-label">
                  Mật khẩu<span className="required" aria-hidden="true">*</span>
                </label>
                <input
                  type="password"
                  required
                  id="reg-password"
                  autoComplete="new-password"
                  aria-describedby="reg-password-hint"
                  value={registerForm.password}
                  onChange={updateRegister('password')}
                  className="input"
                />
              </div>
              <div className="form-field">
                <label htmlFor="reg-confirm-password" className="form-label">
                  Nhập lại mật khẩu<span className="required" aria-hidden="true">*</span>
                </label>
                <input
                  type="password"
                  required
                  id="reg-confirm-password"
                  autoComplete="new-password"
                  value={registerForm.confirmPassword}
                  onChange={updateRegister('confirmPassword')}
                  className="input"
                />
              </div>
            </div>
            <p id="reg-password-hint" className="form-hint">
              Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số.
            </p>

            <button
              type="submit"
              id="btn-submit-register"
              disabled={loading}
              aria-busy={loading}
              className="btn btn-primary btn-lg btn-block !mt-5"
            >
              {loading && <span className="spinner !w-4 !h-4 !border-white/40 !border-t-white" aria-hidden="true" />}
              {loading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản Mới'}
            </button>

            <p className="text-xs text-slate-500 text-center">
              Đã có tài khoản?{' '}
              <button type="button" onClick={() => switchTab('login', true)} className="font-semibold text-primary hover:underline">
                Đăng nhập
              </button>
            </p>
          </form>
        )}
      </div>
    </Modal>
  );
}

/** Khối tài khoản mẫu: hiển thị tên đăng nhập + mật khẩu, bấm để điền sẵn vào form. Chỉ render khi chạy dev hoặc VITE_SHOW_DEMO_ACCOUNTS=true. */
function DemoAccounts({ selectedUsername, onPick }) {
  return (
    <section aria-labelledby="demo-accounts-title" className="pt-4 border-t border-slate-200 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="demo-accounts-title" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-amber-600" aria-hidden="true">science</span>
          Tài khoản thử nghiệm
        </h3>
        <span className="badge badge-warning">Chỉ dùng thử nghiệm</span>
      </div>
      <p className="text-xs text-slate-500">Bấm vào một tài khoản để điền sẵn tên đăng nhập và mật khẩu. Không dùng các tài khoản này với cơ sở dữ liệu thật.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {DEMO_ROLE_ACCOUNTS.map((acc) => {
          const active = selectedUsername === acc.username;
          return (
            <button
              key={acc.id}
              type="button"
              id={acc.id}
              aria-pressed={active}
              onClick={() => onPick(acc.username, acc.password)}
              className={`p-2 text-left rounded-lg border transition-colors ${
                active
                  ? 'bg-primary-fixed border-primary text-primary'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300'
              } ${acc.username === 'benhnhan' ? 'col-span-2 sm:col-span-3' : ''}`}
            >
              <span className="flex items-center gap-1.5 text-xs font-bold truncate">
                <span className="material-symbols-outlined text-base shrink-0" aria-hidden="true">{acc.icon}</span>
                <span className="truncate">{acc.name}</span>
              </span>
              <span className="block text-xs text-slate-500 truncate mt-0.5">{acc.role}</span>
              <span className="block text-xs text-slate-600 mt-0.5 break-all">
                <span className="font-semibold">{acc.username}</span> / {acc.password}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-xs font-bold text-slate-700 mb-2 flex flex-wrap items-center justify-between gap-1">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">stethoscope</span>
            Bác sĩ theo chuyên khoa
          </span>
          <span className="font-normal text-slate-500">Mật khẩu: {DEMO_DOCTOR_PASSWORD}</span>
        </p>
        <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
          {DEMO_DOCTOR_ACCOUNTS.map((doc) => {
            const active = selectedUsername === doc.username;
            return (
              <button
                key={doc.username}
                type="button"
                aria-pressed={active}
                onClick={() => onPick(doc.username, DEMO_DOCTOR_PASSWORD)}
                className={`p-1.5 text-left rounded-lg text-xs transition-colors flex flex-col border ${
                  active
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-primary-fixed'
                }`}
              >
                <span className="truncate font-semibold">{doc.name}</span>
                <span className="text-xs opacity-80 truncate">{doc.dept}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
