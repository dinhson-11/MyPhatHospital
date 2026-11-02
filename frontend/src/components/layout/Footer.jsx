import React from 'react';

const linkClass = 'text-slate-200 hover:text-white hover:underline cursor-pointer text-left';

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
    <footer className="w-full bg-brand-900 text-slate-200">
      {/* pb-24: chừa chỗ cho nút chat nổi để không che dòng cuối */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <p className="font-semibold text-white mb-2">Mỹ Phát Hospital</p>
            <p className="text-sm leading-relaxed">
              Khám bệnh, cấp cứu và điều trị tại Lục Ngạn, Bắc Giang. Tiếp nhận khám bảo hiểm y tế (BHYT) và dịch vụ.
            </p>
          </div>

          <nav aria-labelledby="footer-quick-links">
            <h3 id="footer-quick-links" className="font-semibold text-white mb-2">Liên kết nhanh</h3>
            <ul className="space-y-1.5 text-sm">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <button type="button" onClick={link.onClick} className={linkClass}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 id="footer-key-depts" className="font-semibold text-white mb-2">Chuyên khoa trọng điểm</h3>
            <ul aria-labelledby="footer-key-depts" className="space-y-1.5 text-sm">
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

          <div>
            <h3 className="font-semibold text-white mb-2">Liên hệ & Cấp cứu</h3>
            <address className="not-italic text-sm space-y-2">
              <p>
                Hotline 24/7:{' '}
                <a className="font-semibold text-white underline underline-offset-2" href="tel:0386959342">
                  0386 959 342
                </a>
              </p>
              <p>
                Cấp cứu khẩn cấp toàn quốc:{' '}
                <a href="tel:115" className="font-semibold text-white underline underline-offset-2">115</a>
              </p>
              <p>
                <a
                  href="https://maps.app.goo.gl/2vAWcXFcfgSGPS7H6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white hover:underline"
                  title="Mở Google Maps chỉ đường"
                >
                  1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang
                  <span className="sr-only"> (mở trong tab mới)</span>
                </a>
              </p>
              <p>
                <a className="hover:text-white hover:underline" href="mailto:myphathospital@gmail.com">
                  myphathospital@gmail.com
                </a>
              </p>
            </address>
          </div>
        </div>

        <div className="pt-5 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-slate-300">
          <p>© 2026 Mỹ Phát Hospital. Bảo lưu mọi quyền.</p>
          <a
            aria-label="Trang Facebook chính thức của Mỹ Phát Hospital (mở trong tab mới)"
            href="https://www.facebook.com/MyPhatHospital"
            target="_blank"
            rel="noopener noreferrer"
            className="touch-target inline-flex items-center hover:text-white hover:underline"
            title="Fanpage Facebook Mỹ Phát Hospital"
          >
            Facebook
          </a>
        </div>
      </div>
    </footer>
  );
};
