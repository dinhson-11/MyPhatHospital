import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  const [tab, setTab] = useState(initialTab);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginForm.username.trim() || !loginForm.password) {
      showToast('Vui lòng nhập tên đăng nhập và mật khẩu', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await login(loginForm.username, loginForm.password);
      showToast(`Xin chào ${res.user.fullName}! Đăng nhập thành công`, 'success');
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Đăng nhập không thành công';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!registerForm.fullName.trim() || !registerForm.username.trim() || !registerForm.email.trim() || !registerForm.password) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc', 'warning');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        fullName: registerForm.fullName,
        username: registerForm.username,
        email: registerForm.email,
        phoneNumber: registerForm.phoneNumber,
        password: registerForm.password
      });
      showToast(`Đăng ký thành công tài khoản cho ${res.user.fullName}!`, 'success');
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Đăng ký không thành công';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (username, password) => {
    setLoginForm({ username, password });
    setTab('login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">account_circle</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {tab === 'login' ? 'Đăng Nhập Hệ Thống' : 'Đăng Ký Tài Khoản'}
              </h3>
              <p className="text-xs text-slate-500">Cổng thông tin Bệnh viện Đa khoa Thanh Sơn</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100">
          <button
            type="button"
            id="tab-btn-login"
            onClick={() => setTab('login')}
            className={`flex-1 py-3 text-center text-sm font-bold transition-colors border-b-2 ${
              tab === 'login'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            id="tab-btn-register"
            onClick={() => setTab('register')}
            className={`flex-1 py-3 text-center text-sm font-bold transition-colors border-b-2 ${
              tab === 'register'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Đăng Ký Mới
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6">
          {tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên đăng nhập hoặc Email
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-3 text-slate-400 text-lg">
                    person
                  </span>
                  <input
                    type="text"
                    id="login-username"
                    required
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    placeholder="Nhập tên đăng nhập (vd: benhnhan)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-3 text-slate-400 text-lg">
                    lock
                  </span>
                  <input
                    type="password"
                    id="login-password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="Nhập mật khẩu"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-submit-login"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
              </button>

              {/* Demo accounts quick-pick */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                  Tài khoản dùng thử (Sprint 1):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="btn-demo-patient"
                    onClick={() => fillDemoAccount('benhnhan', 'Password@123')}
                    className="p-2 text-xs text-left bg-emerald-50 hover:bg-emerald-100 text-primary-dark rounded-lg border border-emerald-200 transition-colors"
                  >
                    <span className="font-bold block">👤 Bệnh nhân</span>
                    <span className="text-[10px] text-slate-500">benhnhan / Password@123</span>
                  </button>

                  <button
                    type="button"
                    id="btn-demo-admin"
                    onClick={() => fillDemoAccount('admin', 'Admin@123')}
                    className="p-2 text-xs text-left bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg border border-blue-200 transition-colors"
                  >
                    <span className="font-bold block">🛡️ Quản trị viên</span>
                    <span className="text-[10px] text-slate-500">admin / Admin@123</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên bệnh nhân *
                </label>
                <input
                  type="text"
                  required
                  id="reg-fullname"
                  value={registerForm.fullName}
                  onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên đăng nhập *
                  </label>
                  <input
                    type="text"
                    required
                    id="reg-username"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                    placeholder="nguyenvanan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    id="reg-phone"
                    value={registerForm.phoneNumber}
                    onChange={(e) => setRegisterForm({ ...registerForm, phoneNumber: e.target.value })}
                    placeholder="0912345678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ Email *
                </label>
                <input
                  type="email"
                  required
                  id="reg-email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  placeholder="an.nguyen@gmail.com"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu *
                  </label>
                  <input
                    type="password"
                    required
                    id="reg-password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Xác nhận MK *
                  </label>
                  <input
                    type="password"
                    required
                    id="reg-confirm-password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-submit-register"
                disabled={loading}
                className="w-full mt-3 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản Mới'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
