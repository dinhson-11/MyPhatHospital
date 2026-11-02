import React from 'react';

export const FeaturesSection = ({ onOpenAITriage, onOpenBooking, onOpenMyAppointments }) => {
  const features = [
    {
      title: 'Đặt lịch khám',
      desc: 'Chọn chuyên khoa, bác sĩ và khung giờ phù hợp, nhận phiếu hẹn điện tử.',
      action: onOpenBooking,
      actionLabel: 'Đặt lịch ngay'
    },
    {
      title: 'Hỏi trợ lý về triệu chứng',
      desc: 'Mô tả triệu chứng để được gợi ý chuyên khoa và mức độ ưu tiên. Kết quả chỉ để tham khảo, không thay thế chẩn đoán của bác sĩ.',
      action: onOpenAITriage,
      actionLabel: 'Thử sàng lọc triệu chứng'
    },
    {
      title: 'Lịch khám và hồ sơ của bạn',
      desc: 'Xem lại lịch hẹn, kết quả khám và đơn thuốc sau khi đăng nhập.',
      action: onOpenMyAppointments,
      actionLabel: 'Tra cứu lịch khám của tôi'
    },
    {
      title: 'Thanh toán bằng VietQR',
      desc: 'Tại quầy thu viện phí, bạn có thể quét mã QR bằng ứng dụng ngân hàng để thanh toán.'
    }
  ];

  return (
    <section className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div aria-hidden="true" className="h-1 w-10 bg-primary mb-3" />
        <h2 className="text-3xl font-semibold text-slate-900 mb-8">Việc có thể làm trên website</h2>

        <ul className="border-t border-slate-300">
          {features.map((f, index) => (
            <li
              key={f.title}
              className="grid grid-cols-1 md:grid-cols-[17rem_1fr_13rem] gap-x-8 gap-y-1 py-5 border-b border-slate-300"
            >
              <h3 className="font-semibold text-slate-900 text-lg flex items-baseline gap-3">
                <span aria-hidden="true" className="text-primary text-2xl font-semibold tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {f.title}
              </h3>
              <p className="text-slate-700">{f.desc}</p>
              <div className="md:text-right">
                {f.action && (
                  <button type="button" onClick={() => f.action()} className="link-btn">
                    {f.actionLabel}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default FeaturesSection;
