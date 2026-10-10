import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { HOURS_TEXT } from '../../services/hospitalHours';

export default function ContactModal({ isOpen, onClose }) {
  useEscapeKey(isOpen, onClose);
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      showToast('Vui lòng điền đủ các thông tin liên hệ bắt buộc', 'warning');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Đã gửi thông tin liên hệ! Phòng CSKH sẽ phản hồi trong 15 phút.', 'success');
      setForm({ name: '', phone: '', email: '', message: '' });
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">contact_support</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Liên Hệ & Hỗ Trợ 24/7</h3>
              <p className="text-xs text-slate-500">Mỹ Phát Hospital luôn sẵn sàng lắng nghe & đồng hành</p>
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

        {/* Content */}
        <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Info side */}
          <div className="space-y-5">
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-3">Thông Tin Đường Dây Nóng</h4>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="material-symbols-outlined text-rose-600 text-2xl animate-pulse">emergency</span>
                  <div>
                    <strong className="text-rose-900 block text-xs">Cấp cứu khẩn cấp & Hotline 24/7:</strong>
                    <a href="tel:0789065493" className="text-base font-black text-rose-600 hover:underline">
                      0789 065 493
                    </a>
                    <span className="block text-[11px] text-rose-700 mt-0.5">Tiếp nhận cấp cứu 24/24 tất cả các ngày</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="material-symbols-outlined text-teal-700 text-2xl">call</span>
                  <div>
                    <strong className="text-teal-950 block text-xs">Tổng đài tư vấn & Đặt lịch khám:</strong>
                    <a href="tel:0789065493" className="text-base font-black text-teal-800 hover:underline">
                      0789 065 493
                    </a>
                    <span className="block text-[11px] text-teal-700 mt-0.5">Hỗ trợ BHYT, bảng giá & lịch trực bác sĩ</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="material-symbols-outlined text-slate-600 text-xl">location_on</span>
                  <div>
                    <strong className="text-slate-900 block text-xs">Địa chỉ cơ sở y tế:</strong>
                    <a
                      href="https://maps.app.goo.gl/2vAWcXFcfgSGPS7H6"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-teal-800 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <span>1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="material-symbols-outlined text-slate-600 text-xl">schedule</span>
                  <div>
                    <strong className="text-slate-900 block text-xs">Giờ tiếp nhận khám bệnh:</strong>
                    <span className="block">{HOURS_TEXT.days}</span>
                    <span className="block">{HOURS_TEXT.summer}</span>
                    <span className="block">{HOURS_TEXT.winter}</span>
                    <span className="block">{HOURS_TEXT.bhyt}</span>
                    <span className="block font-semibold text-teal-700">{HOURS_TEXT.emergency}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="material-symbols-outlined text-teal-600 text-xl">mail</span>
                  <div>
                    <strong className="text-slate-900 block text-xs">Email liên hệ:</strong>
                    <a href="mailto:myphathospital@gmail.com" className="font-medium text-teal-800 hover:underline">
                      myphathospital@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-200/80">
                  <span className="material-symbols-outlined text-blue-600 text-xl">public</span>
                  <div>
                    <strong className="text-blue-900 block text-xs">Fanpage Facebook chính thức:</strong>
                    <a
                      href="https://www.facebook.com/MyPhatHospital"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-700 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <span>facebook.com/MyPhatHospital</span>
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form side */}
          <form onSubmit={handleSubmit} className="space-y-3 bg-slate-50/60 p-5 rounded-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm mb-1">Gửi Tin Nhắn / Phản Hồi</h4>
            <p className="text-[11px] text-slate-500 mb-3">Chúng tôi sẽ liên lạc lại trong thời gian sớm nhất</p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Họ tên của bạn *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại *</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0912 345 678"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung thắc mắc / Đóng góp ý kiến *</label>
              <textarea
                rows="3"
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Nhập nội dung cần hỗ trợ..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">send</span>
              {loading ? 'Đang gửi...' : 'Gửi Yêu Cầu Hỗ Trợ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
