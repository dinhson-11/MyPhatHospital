import React from 'react';

export const FeaturesSection = () => {
  const features = [
    {
      icon: 'calendar_clock',
      title: 'Đặt lịch khám nhanh chóng',
      desc: 'Đặt lịch khám đích danh bác sĩ theo khung giờ chính xác, tự động nhắc hẹn và hoàn toàn không cần xếp hàng lấy số truyền thống.',
      bg: 'bg-surface-container',
      color: 'text-primary'
    },
    {
      icon: 'smart_toy',
      title: 'Chatbot AI sàng lọc chuyên khoa',
      desc: 'Sàng lọc triệu chứng thông minh 24/7, hướng dẫn bệnh nhân tới chính xác khoa phòng điều trị và bác sĩ có chuyên môn sâu nhất.',
      bg: 'bg-secondary-fixed',
      color: 'text-secondary'
    },
    {
      icon: 'clinical_notes',
      title: 'Hồ sơ bệnh án điện tử',
      desc: 'Tra cứu kết quả xét nghiệm, đơn thuốc và lịch sử chẩn đoán trọn đời ngay trên ứng dụng di động bảo mật chuẩn mã hóa y tế quốc tế.',
      bg: 'bg-surface-container',
      color: 'text-primary'
    },
    {
      icon: 'qr_code_scanner',
      title: 'Thanh toán VietQR tiện lợi',
      desc: 'Thanh toán viện phí không tiền mặt chuẩn xác, tích hợp mã QR động tương thích với mọi ứng dụng ngân hàng và ví điện tử nội địa.',
      bg: 'bg-surface-container',
      color: 'text-primary'
    }
  ];

  return (
    <section className="w-full py-16 bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12">
          <span className="font-label text-xs font-bold text-primary tracking-wider uppercase mb-2">
            CÔNG NGHỆ & TẬN TÂM
          </span>
          <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface mb-3 tracking-tight">
            Vì sao chọn Mỹ Phát Hospital?
          </h2>
          <p className="font-body text-sm text-on-surface-variant leading-relaxed">
            Sự kết hợp hoàn hảo giữa năng lực chuyên môn của y bác sĩ giàu kinh nghiệm và hệ thống hỗ trợ số hóa hiện đại hàng đầu.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {features.map((f, idx) => (
            <div
              key={idx}
              className="group flex flex-col p-6 rounded-2xl bg-white shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 border border-surface-container-high/40"
            >
              <div
                className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center ${f.color} mb-5 group-hover:scale-105 transition-transform`}
              >
                <span className="material-symbols-outlined text-[26px]">{f.icon}</span>
              </div>
              <h3 className="font-headline text-base font-bold text-on-surface mb-2">{f.title}</h3>
              <p className="font-body text-xs text-on-surface-variant leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

