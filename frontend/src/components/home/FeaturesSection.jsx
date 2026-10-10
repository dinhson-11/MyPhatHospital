import React from 'react';

export const FeaturesSection = ({
  onOpenAITriage,
  onOpenBooking,
  onOpenAllDepartments,
  onOpenMyAppointments
}) => {
  const features = [
    {
      icon: 'calendar_clock',
      title: 'Đặt lịch khám nhanh chóng',
      desc: 'Chủ động chọn chuyên khoa, bác sĩ và khung giờ phù hợp, hạn chế thời gian xếp hàng chờ đợi tại bệnh viện.',
      bg: 'bg-primary-fixed',
      color: 'text-primary',
      action: onOpenBooking,
      actionLabel: 'Đặt lịch ngay'
    },
    {
      icon: 'smart_toy',
      title: 'Trợ lý AI gợi ý chuyên khoa',
      desc: 'Mô tả triệu chứng để được gợi ý mức độ ưu tiên, chuyên khoa và bác sĩ phù hợp. Kết quả chỉ mang tính tham khảo.',
      bg: 'bg-secondary-fixed',
      color: 'text-teal-700',
      action: onOpenAITriage,
      actionLabel: 'Thử sàng lọc triệu chứng'
    },
    {
      icon: 'clinical_notes',
      title: 'Hồ sơ bệnh án điện tử',
      desc: 'Kết quả khám, đơn thuốc và lịch sử điều trị được lưu trên hệ thống điện tử, giúp bác sĩ theo dõi liên tục và bảo mật thông tin người bệnh.',
      bg: 'bg-primary-fixed',
      color: 'text-primary',
      action: onOpenMyAppointments,
      actionLabel: 'Tra cứu lịch khám của tôi'
    },
    {
      icon: 'qr_code_scanner',
      title: 'Thanh toán VietQR tiện lợi',
      desc: 'Thanh toán viện phí không dùng tiền mặt bằng mã QR, quét được bằng ứng dụng của các ngân hàng trong nước.',
      bg: 'bg-primary-fixed',
      color: 'text-primary',
      action: onOpenAllDepartments,
      actionLabel: 'Xem danh mục dịch vụ'
    }
  ];

  return (
    <section className="w-full py-16 bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12">
          <span className="font-label text-xs font-bold text-primary tracking-wider uppercase mb-2">
            Công nghệ & Tận tâm
          </span>
          <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface mb-3 tracking-tight">
            Vì sao chọn Mỹ Phát Hospital?
          </h2>
          <p className="font-body text-sm text-on-surface-variant leading-relaxed">
            Kết hợp chuyên môn của đội ngũ y bác sĩ giàu kinh nghiệm với các tiện ích số giúp việc khám chữa bệnh thuận tiện hơn.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group flex flex-col p-6 rounded-2xl bg-white shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 border border-outline-variant"
            >
              <div
                className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center ${f.color} mb-5 group-hover:scale-105 transition-transform`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[26px]">{f.icon}</span>
              </div>
              <h3 className="font-headline text-base font-bold text-on-surface mb-2">{f.title}</h3>
              <p className="font-body text-xs text-on-surface-variant leading-relaxed flex-1">{f.desc}</p>
              {f.action && (
                <button
                  type="button"
                  onClick={() => f.action()}
                  className="mt-4 self-start inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                >
                  <span>{f.actionLabel}</span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
