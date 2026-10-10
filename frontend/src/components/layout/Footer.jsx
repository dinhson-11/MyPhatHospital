import React from 'react';
import logoHospital from '../../assets/logo.png';

const linkClass = 'font-body text-surface-variant hover:text-white transition-colors cursor-pointer text-left';

const KEY_DEPARTMENTS = [
  { id: 1, name: 'Khám bệnh / Cấp cứu ban đầu' },
  { id: 2, name: 'Ngoại khoa & Tiểu phẫu' },
  { id: 3, name: 'Sản - Phụ khoa' },
  { id: 13, name: 'Y học cổ truyền – Phục hồi chức năng' },
  { id: 14, name: 'Thẩm mỹ / Tạo hình' },
  { id: 10, name: 'Tai Mũi Họng' }
];

export const Footer = ({
  onOpenAbout,
  onOpenContact,
  onOpenAllDepts,
  onOpenBooking,
  onOpenMyAppointments,
  onFilterDept
}) => {
  const quickLinks = [
    { label: 'Trang chủ', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { label: 'Giới thiệu bệnh viện', onClick: onOpenAbout },
    { label: 'Danh mục khoa phòng & dịch vụ', onClick: onOpenAllDepts },
    { label: 'Đặt lịch khám trực tuyến', onClick: () => onOpenBooking() },
    { label: 'Lịch khám của tôi', onClick: onOpenMyAppointments },
    { label: 'Liên hệ & Chỉ đường', onClick: onOpenContact }
  ];

  return (
    <footer className="w-full bg-slate-900 text-slate-300 pt-16 pb-10 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
          {/* Cột 1: Thương hiệu */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white p-1 rounded-xl shadow-md flex items-center justify-center border border-primary-fixed-dim">
                <img
                  alt=""
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
                <span className="font-label text-xs text-teal-300 font-medium">
                  Sáng Y Đức – Vững Chuyên Môn
                </span>
              </div>
            </div>
            <p className="font-body text-sm text-surface-variant leading-relaxed">
              Mỹ Phát Hospital ứng dụng trí tuệ nhân tạo (AI) hỗ trợ sàng lọc triệu chứng, cùng đội ngũ y bác sĩ tận tâm mang đến dịch vụ khám chữa bệnh chuẩn mực tại Lục Ngạn, Bắc Giang.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span aria-hidden="true" className="material-symbols-outlined text-primary-fixed text-lg">health_and_safety</span>
              <span className="font-label text-xs text-surface-variant">Tiếp nhận khám bảo hiểm y tế (BHYT) & dịch vụ</span>
            </div>
          </div>

          {/* Cột 2: Liên kết nhanh */}
          <nav aria-labelledby="footer-quick-links" className="flex flex-col space-y-3">
            <h3 id="footer-quick-links" className="font-headline text-base text-white font-semibold mb-1">Liên kết nhanh</h3>
            <ul className="space-y-2 text-sm">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <button type="button" onClick={link.onClick} className={linkClass}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Cột 3: Chuyên khoa trọng điểm */}
          <div className="flex flex-col space-y-3">
            <h3 id="footer-key-depts" className="font-headline text-base text-white font-semibold mb-1">Chuyên khoa trọng điểm</h3>
            <ul aria-labelledby="footer-key-depts" className="space-y-2 text-sm">
              {KEY_DEPARTMENTS.map((dept) => (
                <li key={dept.id}>
                  <button
                    type="button"
                    onClick={() => onFilterDept(dept.id)}
                    title={`Đặt lịch khám ${dept.name}`}
                    className={linkClass}
                  >
                    {dept.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 4: Liên hệ & Cấp cứu */}
          <div className="flex flex-col space-y-3">
            <h3 className="font-headline text-base text-white font-semibold mb-1">Liên hệ & Cấp cứu</h3>
            <address className="not-italic flex flex-col space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-red-950/40 border border-red-800/40">
                <span aria-hidden="true" className="material-symbols-outlined text-red-400 text-xl animate-pulse">emergency</span>
                <div>
                  <div className="font-label text-xs text-red-300 font-semibold">Cấp cứu & Hotline 24/7</div>
                  <a
                    className="font-headline text-lg font-bold text-white hover:text-red-300 transition-colors"
                    href="tel:0789065493"
                  >
                    0789 065 493
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-surface-variant">
                <span aria-hidden="true" className="material-symbols-outlined text-red-400 text-base">e911_emergency</span>
                <span>
                  Cấp cứu khẩn cấp toàn quốc:{' '}
                  <a href="tel:115" className="text-white font-bold hover:underline">115</a>
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-surface-variant">
                <span aria-hidden="true" className="material-symbols-outlined text-primary-fixed text-base mt-0.5">location_on</span>
                <a
                  href="https://maps.app.goo.gl/2vAWcXFcfgSGPS7H6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors underline decoration-teal-500/40"
                  title="Mở Google Maps chỉ đường"
                >
                  1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang (Xem Google Maps <span aria-hidden="true">↗</span>)
                  <span className="sr-only"> (mở trong tab mới)</span>
                </a>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-surface-variant">
                <span aria-hidden="true" className="material-symbols-outlined text-primary-fixed text-base">mail</span>
                <a className="hover:text-white transition-colors" href="mailto:myphathospital@gmail.com">
                  myphathospital@gmail.com
                </a>
              </div>
            </address>
          </div>
        </div>

        {/* Bản quyền & mạng xã hội */}
        <div className="pt-6 border-t border-surface-variant/20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-surface-variant">
          <p>© 2026 Mỹ Phát Hospital. Giấy phép hoạt động khám bệnh, chữa bệnh. Bảo lưu mọi quyền.</p>
          <div className="flex items-center gap-3">
            <a
              aria-label="Trang Facebook chính thức của Mỹ Phát Hospital (mở trong tab mới)"
              href="https://www.facebook.com/MyPhatHospital"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Fanpage Facebook Mỹ Phát Hospital"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">public</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
