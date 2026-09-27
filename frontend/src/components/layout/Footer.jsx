import React from 'react';
import { useToast } from '../../context/ToastContext';

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
    <footer className="w-full bg-inverse-surface text-surface-container-highest pt-16 pb-10">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand & Certification */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <img
                alt="MedCare AI Logo"
                className="h-8 w-auto object-contain brightness-0 invert"
                src="https://lh3.googleusercontent.com/aida/AEtjO1UiRWu2wLJay3lT_fWD9uSnZwpyzXsqXTN23B5n65vVxCCKFWO0uY_aHFTZ3q8Zb0t9OMuCKJk1BULORIm00sbTn12gVTVFaupVh2ejX4LidWdE9kHz7uchf5izU4WJtjC1U6HzFjdnrrg9O60URWslQRlB3JFYILY9lig9lF5a1ZJM_s4W0YBcvag2CaJpZWJJ9CPjYjecLH3sNLqPlYolUiuvdwpNPXZKfYagNZdMk-ZNzRVf99q0aWak"
              />
              <div className="flex flex-col">
                <span className="font-headline text-lg font-bold text-white tracking-tight">
                  MedCare AI
                </span>
                <span className="font-label text-xs text-surface-variant font-medium">
                  Bệnh viện Thanh Sơn
                </span>
              </div>
            </div>
            <p className="font-body text-sm text-surface-variant leading-relaxed">
              Bệnh viện Thanh Sơn tiên phong tích hợp trí tuệ nhân tạo (AI) trong chẩn đoán, điều trị và quản lý y tế thông minh tại Việt Nam.
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
                  onClick={() => onFilterDept('Khoa Nội tổng quát')}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer text-left"
                >
                  Nội tổng quát & Nội tiết
                </button>
              </li>
              <li>
                <button
                  onClick={() => onFilterDept('Khoa Tim mạch')}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer text-left"
                >
                  Khoa Tim mạch học
                </button>
              </li>
              <li>
                <button
                  onClick={() => onFilterDept('Khoa Nhi')}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer text-left"
                >
                  Nhi khoa chất lượng cao
                </button>
              </li>
              <li>
                <button
                  onClick={() => onFilterDept('Khoa Tiêu hóa')}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer text-left"
                >
                  Tiêu hóa & Nội soi NBI
                </button>
              </li>
              <li>
                <button
                  onClick={() => onFilterDept('Khoa Da liễu')}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer text-left"
                >
                  Da liễu thẩm mỹ y khoa
                </button>
              </li>
              <li>
                <button
                  onClick={() => onFilterDept('Khoa Tai mũi họng')}
                  className="font-body text-surface-variant hover:text-white transition-colors cursor-pointer text-left"
                >
                  Khoa Tai Mũi Họng HD
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Emergency & Contact */}
          <div className="flex flex-col space-y-3">
            <h3 className="font-headline text-base text-white font-semibold mb-1">Liên hệ & Cấp cứu</h3>
            <div className="flex flex-col space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10">
                <span className="material-symbols-outlined text-error-container text-xl">emergency</span>
                <div>
                  <div className="font-label text-xs text-surface-variant">Cấp cứu 24/7</div>
                  <a
                    className="font-headline text-lg font-bold text-white hover:text-error-container transition-colors"
                    href="tel:19006868"
                  >
                    1900 6868
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-surface-variant">
                <span className="material-symbols-outlined text-primary-fixed text-base">call</span>
                <span>Hotline đặt khám: <strong className="text-white">024 3888 9999</strong></span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-surface-variant">
                <span className="material-symbols-outlined text-primary-fixed text-base mt-0.5">location_on</span>
                <span>128 Đường Thanh Sơn, Quận Hoàn Kiếm, Hà Nội</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-surface-variant">
                <span className="material-symbols-outlined text-primary-fixed text-base">mail</span>
                <a
                  className="hover:text-white transition-colors"
                  href="mailto:lienhe@medcareai-thanhson.vn"
                >
                  lienhe@medcareai-thanhson.vn
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright & Socials */}
        <div className="pt-6 border-t border-surface-variant/20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-surface-variant">
          <p>© 2025 Bệnh viện Thanh Sơn - MedCare AI. Giấy phép hoạt động khám chữa bệnh số 188/BYT-GPHĐ. Bảo lưu mọi quyền.</p>
          <div className="flex items-center gap-3">
            <button
              aria-label="Facebook"
              onClick={() => showToast('Mở Facebook Bệnh viện Thanh Sơn', 'info')}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">public</span>
            </button>
            <button
              aria-label="Zalo"
              onClick={() => showToast('Mở Zalo OA: 024 3888 9999', 'info')}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
            </button>
            <button
              aria-label="YouTube"
              onClick={() => showToast('Mở kênh YouTube Bệnh viện Thanh Sơn', 'info')}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">play_circle</span>
            </button>
            <button
              aria-label="LinkedIn"
              onClick={() => showToast('Mở LinkedIn MedCare AI', 'info')}
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
