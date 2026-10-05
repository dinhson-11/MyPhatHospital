import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import logoHospital from '../../assets/logo.png';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  useEscapeKey(isOpen, onClose);
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
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden relative max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 p-1 flex items-center justify-center shadow-xs shrink-0">
              <img
                src={logoHospital}
                alt="Logo Mỹ Phát Hospital"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png';
                }}
              />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {tab === 'login' ? 'Đăng Nhập Hệ Thống' : 'Đăng Ký Tài Khoản'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">Mỹ Phát Hospital</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-200 rounded">
              ESC
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
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
        <div className="p-6 overflow-y-auto">
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

              {/* Demo accounts quick-pick: Đồng bộ đầy đủ 7 Roles & Danh sách Bác sĩ Mỹ Phát Hospital */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-teal-700">key</span>
                    <span>Tài Khoản Đồng Bộ Hệ Thống:</span>
                  </p>
                  <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
                    Bấm để điền & đăng nhập
                  </span>
                </div>

                {/* 7 Vai trò cốt lõi */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    id="btn-demo-admin"
                    onClick={() => fillDemoAccount('admin', 'Admin@123')}
                    className="p-2 text-xs text-left bg-blue-50/70 hover:bg-blue-100 text-blue-900 rounded-xl border border-blue-200 transition-all cursor-pointer shadow-2xs group"
                  >
                    <span className="font-bold block truncate group-hover:text-blue-800">🛡️ Ban Giám Đốc</span>
                    <span className="text-[10px] text-slate-500 block truncate">admin • Quản trị</span>
                  </button>

                  <button
                    type="button"
                    id="btn-demo-doctor"
                    onClick={() => fillDemoAccount('bacsi', 'Doctor@123')}
                    className="p-2 text-xs text-left bg-teal-50/80 hover:bg-teal-100 text-teal-900 rounded-xl border border-teal-200 transition-all cursor-pointer shadow-2xs group"
                  >
                    <span className="font-bold block truncate group-hover:text-teal-800">👨‍⚕️ TS.BS Vi Mai Anh</span>
                    <span className="text-[10px] text-slate-500 block truncate">bacsi • Trưởng khoa</span>
                  </button>

                  <button
                    type="button"
                    id="btn-demo-pharmacist"
                    onClick={() => fillDemoAccount('duocsi', 'Pharmacist@123')}
                    className="p-2 text-xs text-left bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 rounded-xl border border-emerald-200 transition-all cursor-pointer shadow-2xs group"
                  >
                    <span className="font-bold block truncate group-hover:text-emerald-800">💊 DS. Lê Hải Quang</span>
                    <span className="text-[10px] text-slate-500 block truncate">duocsi • Dược GPP</span>
                  </button>

                  <button
                    type="button"
                    id="btn-demo-receptionist"
                    onClick={() => fillDemoAccount('letan', 'Receptionist@123')}
                    className="p-2 text-xs text-left bg-amber-50/70 hover:bg-amber-100 text-amber-900 rounded-xl border border-amber-200 transition-all cursor-pointer shadow-2xs group"
                  >
                    <span className="font-bold block truncate group-hover:text-amber-800">🛎️ CN. Thùy Linh</span>
                    <span className="text-[10px] text-slate-500 block truncate">letan • Tiếp đón BHYT</span>
                  </button>

                  <button
                    type="button"
                    id="btn-demo-nurse"
                    onClick={() => fillDemoAccount('dieuduong', 'Nurse@123')}
                    className="p-2 text-xs text-left bg-rose-50/70 hover:bg-rose-100 text-rose-900 rounded-xl border border-rose-200 transition-all cursor-pointer shadow-2xs group"
                  >
                    <span className="font-bold block truncate group-hover:text-rose-800">🩺 ĐD. Thu Hà</span>
                    <span className="text-[10px] text-slate-500 block truncate">dieuduong • Sinh hiệu</span>
                  </button>

                  <button
                    type="button"
                    id="btn-demo-accountant"
                    onClick={() => fillDemoAccount('ketoan', 'Accountant@123')}
                    className="p-2 text-xs text-left bg-amber-50/70 hover:bg-amber-100 text-amber-900 rounded-xl border border-amber-200 transition-all cursor-pointer shadow-2xs group"
                  >
                    <span className="font-bold block truncate group-hover:text-amber-800">💰 KT. Thị Hoa</span>
                    <span className="text-[10px] text-slate-500 block truncate">ketoan • Thu viện phí</span>
                  </button>

                  <button
                    type="button"
                    id="btn-demo-patient"
                    onClick={() => fillDemoAccount('benhnhan', 'Password@123')}
                    className="p-2 text-xs text-left bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs sm:col-span-3 group"
                  >
                    <span className="font-bold block truncate group-hover:text-slate-900">👤 Bệnh nhân: Trần Đức Minh</span>
                    <span className="text-[10px] text-slate-500 block truncate">benhnhan • Đặt lịch & tra cứu hồ sơ</span>
                  </button>
                </div>

                {/* Đồng bộ danh sách từng Bác sĩ chuyên khoa */}
                <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/90">
                  <p className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-teal-600">stethoscope</span>
                      <span>Đăng nhập theo từng Bác sĩ chuyên khoa:</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Pass: Doctor@123</span>
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => fillDemoAccount('bs.maianh', 'Doctor@123')}
                      className={`p-1.5 text-left rounded-lg text-[11px] transition-all cursor-pointer flex flex-col ${
                        loginForm.username === 'bs.maianh' || loginForm.username === 'bacsi'
                          ? 'bg-teal-700 text-white font-bold'
                          : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200/70'
                      }`}
                    >
                      <span className="truncate font-semibold">TS.BS Vi Mai Anh</span>
                      <span className="text-[9px] opacity-75 truncate">Khoa Khám bệnh / Cấp cứu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fillDemoAccount('bs.nga', 'Doctor@123')}
                      className={`p-1.5 text-left rounded-lg text-[11px] transition-all cursor-pointer flex flex-col ${
                        loginForm.username === 'bs.nga'
                          ? 'bg-teal-700 text-white font-bold'
                          : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200/70'
                      }`}
                    >
                      <span className="truncate font-semibold">BSCKII. Lê Thị Nga</span>
                      <span className="text-[9px] opacity-75 truncate">Ngoại & Tiểu phẫu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fillDemoAccount('bs.vy', 'Doctor@123')}
                      className={`p-1.5 text-left rounded-lg text-[11px] transition-all cursor-pointer flex flex-col ${
                        loginForm.username === 'bs.vy'
                          ? 'bg-teal-700 text-white font-bold'
                          : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200/70'
                      }`}
                    >
                      <span className="truncate font-semibold">BSCKII. Phạm Lan Vy</span>
                      <span className="text-[9px] opacity-75 truncate">Sản - Phụ khoa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fillDemoAccount('bs.dung', 'Doctor@123')}
                      className={`p-1.5 text-left rounded-lg text-[11px] transition-all cursor-pointer flex flex-col ${
                        loginForm.username === 'bs.dung'
                          ? 'bg-teal-700 text-white font-bold'
                          : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200/70'
                      }`}
                    >
                      <span className="truncate font-semibold">ThS.BS Hoàng Thị Dung</span>
                      <span className="text-[9px] opacity-75 truncate">Tai Mũi Họng</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fillDemoAccount('bs.sy', 'Doctor@123')}
                      className={`p-1.5 text-left rounded-lg text-[11px] transition-all cursor-pointer flex flex-col ${
                        loginForm.username === 'bs.sy'
                          ? 'bg-teal-700 text-white font-bold'
                          : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200/70'
                      }`}
                    >
                      <span className="truncate font-semibold">BS. Nguyễn Văn Sỹ</span>
                      <span className="text-[9px] opacity-75 truncate">YHCT – Phục hồi chức năng</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fillDemoAccount('bs.hiep', 'Doctor@123')}
                      className={`p-1.5 text-left rounded-lg text-[11px] transition-all cursor-pointer flex flex-col ${
                        loginForm.username === 'bs.hiep'
                          ? 'bg-teal-700 text-white font-bold'
                          : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200/70'
                      }`}
                    >
                      <span className="truncate font-semibold">ThS.BS Lê Tuấn Hiệp</span>
                      <span className="text-[9px] opacity-75 truncate">Thẩm mỹ / Tạo hình</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fillDemoAccount('bs.an', 'Doctor@123')}
                      className={`p-1.5 text-left rounded-lg text-[11px] transition-all cursor-pointer flex flex-col ${
                        loginForm.username === 'bs.an'
                          ? 'bg-teal-700 text-white font-bold'
                          : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200/70'
                      }`}
                    >
                      <span className="truncate font-semibold">TS.BS Trần Thị An</span>
                      <span className="text-[9px] opacity-75 truncate">Chẩn đoán hình ảnh</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fillDemoAccount('bs.toan', 'Doctor@123')}
                      className={`p-1.5 text-left rounded-lg text-[11px] transition-all cursor-pointer flex flex-col ${
                        loginForm.username === 'bs.toan'
                          ? 'bg-teal-700 text-white font-bold'
                          : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200/70'
                      }`}
                    >
                      <span className="truncate font-semibold">ThS.BS Hoàng Văn Toán</span>
                      <span className="text-[9px] opacity-75 truncate">Khoa Xét nghiệm</span>
                    </button>
                  </div>
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
