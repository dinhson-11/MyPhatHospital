import React from 'react';
import { useToast } from '../../context/ToastContext';
import logoHospital from '../../assets/logo.png';

export const Footer = ({
  onOpenAbout,
  onOpenContact,
  onOpenAllDepts,
  onOpenBooking,
  onOpenMyAppointments,
  onFilterDept
}) => {
  const { showToast } = useToast();

  return (
    <footer className="w-full bg-slate-900 text-slate-300 pt-16 pb-10 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand & Certification */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white p-1 rounded-xl shadow-md flex items-center justify-center border border-amber-200">
                <img
                  alt="Logo Mỹ Phát Hospital"
                  className="h-10 w-auto object-contain rounded-full"
                  src={logoHospital}
                  onError={(e) => {
                    e.currentTarget.src = '/logo.png';
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-lg font-bold text-white tracking-tight">
                  Mỹ Phát Hospital
                </span>
                <span className="font-label text-xs text-teal-400 font-medium">
                  Sáng Y Đức – Vững Chuyên Môn
                </span>
              </div>
            </div>
            <p className="font-body text-sm text-surface-variant leading-relaxed">
              Mỹ Phát Hospital tiên phong ứng dụng trí tuệ nhân tạo (AI) trong sàng lọc chẩn đoán, điều trị chuyên sâu và dịch vụ y tế chuẩn mực tại Lục Ngạn, Bắc Giang.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="material-symbols-outlined text-primary-fixed text-lg">verified_user</span>
              <span className="font-label text-xs text-surface-variant">Chứng nhận đạt chuẩn y tế số quốc tế</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="flex flex-col space-y-3">
            <h3 className="font-headline text-base text-white font-semibold mb-1">Liên kết nhanh</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer"
                >
                  Trang chủ
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenAbout}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer"
                >
                  Giới thiệu bệnh viện
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenAllDepts}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer"
                >
                  Bảng giá & Chuyên khoa
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenBooking()}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer"
                >
                  Quy trình đặt khám
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenMyAppointments}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer"
                >
                  Lịch khám của tôi
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenAbout}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer"
                >
                  Chính sách bảo mật
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Key Departments */}
          <div className="flex flex-col space-y-3">
            <h3 className="font-headline text-base text-white font-semibold mb-1">Chuyên khoa trọng điểm</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onFilterDept(1)}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer text-left"
                >
                  Khám bệnh / Cấp cứu ban đầu
                </button>
              </li>
              <li>
                <button
                  onClick={() => onFilterDept(2)}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer text-left"
                >
                  Ngoại khoa & Tiểu phẫu
                </button>
              </li>
              <li>
                <button
                  onClick={() => onFilterDept(3)}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer text-left"
                >
                  Sản - Phụ khoa
                </button>
              </li>
              <li>
                <button
                  onClick={() => onFilterDept(13)}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer text-left"
                >
                  Y học cổ truyền – Phục hồi chức năng
                </button>
              </li>
              <li>
                <button
                  onClick={() => onFilterDept(14)}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer text-left"
                >
                  Thẩm mỹ / Tạo hình
                </button>
              </li>
              <li>
                <button
                  onClick={() => onFilterDept(10)}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer text-left"
                >
                  Tai Mũi Họng
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Emergency & Contact */}
          <div className="flex flex-col space-y-3">
            <h3 className="font-headline text-base text-white font-semibold mb-1">Liên hệ & Cấp cứu</h3>
            <div className="flex flex-col space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800/40">
                <span className="material-symbols-outlined text-rose-400 text-xl animate-pulse">emergency</span>
                <div>
                  <div className="font-label text-xs text-rose-300 font-semibold">Cấp cứu & Hotline 24/7</div>
                  <a
                    className="font-headline text-lg font-bold text-white hover:text-rose-300 transition-colors"
                    href="tel:0789065493"
                  >
                    0789 065 493
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-surface-variant">
                <span className="material-symbols-outlined text-primary-fixed text-base">call</span>
                <span>Hotline tư vấn: <a href="tel:0789065493" className="text-white font-bold hover:underline">0789 065 493</a></span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-surface-variant">
                <span className="material-symbols-outlined text-primary-fixed text-base mt-0.5">location_on</span>
                <a
                  href="https://maps.app.goo.gl/2vAWcXFcfgSGPS7H6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors underline decoration-teal-500/40"
                  title="Mở Google Maps chỉ đường"
                >
                  1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang (Xem Google Maps ↗)
                </a>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-surface-variant">
                <span className="material-symbols-outlined text-primary-fixed text-base">mail</span>
                <a
                  className="hover:text-white transition-colors"
                  href="mailto:myphathospital@gmail.com"
                >
                  myphathospital@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright & Socials */}
        <div className="pt-6 border-t border-surface-variant/20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-surface-variant">
          <p>© 2026 Mỹ Phát Hospital. Giấy phép hoạt động KCB. Bảo lưu mọi quyền.</p>
          <div className="flex items-center gap-3">
            <a
              aria-label="Facebook chính chủ Mỹ Phát Hospital"
              href="https://www.facebook.com/MyPhatHospital"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Fanpage Facebook chính chủ Mỹ Phát Hospital (https://www.facebook.com/MyPhatHospital)"
            >
              <span className="material-symbols-outlined text-[18px]">public</span>
            </a>
            <button
              aria-label="Zalo"
              onClick={() => showToast('Mở Zalo OA: 0789 065 493', 'info')}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
            </button>
            <button
              aria-label="YouTube"
              onClick={() => showToast('Mở kênh YouTube Mỹ Phát Hospital', 'info')}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">play_circle</span>
            </button>
            <button
              aria-label="LinkedIn"
              onClick={() => showToast('Mở trang thông tin Mỹ Phát Hospital', 'info')}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">groups</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
