import React from 'react';

const TESTIMONIALS = [
  {
    name: 'Bác Nguyễn Văn Thành (62 tuổi)',
    initial: 'T',
    location: 'Chũ, Bắc Giang',
    department: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    rating: 5,
    comment:
      'Tôi bị nhói ngực và huyết áp cao nhiều năm. Được TS.BS Vi Mai Anh điều trị tận tình bằng phác đồ mới, đặt lịch qua mạng đến nơi là vào phòng khám ngay không phải chen chúc bốc số xếp hàng.'
  },
  {
    name: 'Chị Hoàng Thùy Linh (34 tuổi)',
    initial: 'L',
    location: 'Lục Ngạn, Bắc Giang',
    department: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    rating: 5,
    comment:
      'Bé nhà mình bị sốt virus nửa đêm, được các bác sĩ Khám bệnh và Cấp cứu tiếp đón ân cần, phòng ốc khang trang sạch sẽ như khách sạn. Có kết quả xét nghiệm gửi ngay lên điện thoại rất tiện lợi.'
  },
  {
    name: 'Anh Đỗ Quang Huy (45 tuổi)',
    initial: 'H',
    location: 'Lục Nam, Bắc Giang',
    department: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    rating: 5,
    comment:
      'Nội soi dạ dày không đau ở đây thực sự rất nhẹ nhàng, ngủ một giấc 15 phút dậy là xong xuôi, bác sĩ giải thích cặn kẽ từng vết trợt loét và tư vấn chế độ ăn uống khoa học.'
  }
];

// Cam kết dịch vụ (không dùng số liệu thống kê chưa kiểm chứng)
const COMMITMENTS = [
  { icon: 'volunteer_activism', title: 'Tận tâm', desc: 'Lấy người bệnh làm trung tâm' },
  { icon: 'event_available', title: 'Đặt lịch trực tuyến', desc: 'Chủ động thời gian, hạn chế chờ đợi' },
  { icon: 'health_and_safety', title: 'Khám BHYT', desc: 'Tiếp nhận khám bảo hiểm y tế' },
  { icon: 'emergency', title: 'Cấp cứu 24/7', desc: 'Sẵn sàng kể cả ngày lễ', tone: 'text-red-600' }
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-slate-50 relative border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-fixed text-primary text-xs font-bold uppercase tracking-wider mb-4 border border-primary-fixed-dim">
            <span aria-hidden="true" className="material-symbols-outlined text-sm">reviews</span>
            Đánh Giá & Phản Hồi
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Cảm Nhận Của Người Bệnh
          </h2>
          <p className="text-slate-600 text-base sm:text-lg">
            Sự hài lòng và sức khỏe hồi phục của người bệnh chính là thước đo giá trị cao quý nhất của Mỹ Phát Hospital.
          </p>
        </div>

        {/* Danh sách phản hồi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div
                  role="img"
                  aria-label={`Đánh giá ${t.rating}/5 sao`}
                  className="flex items-center gap-1 text-amber-400 mb-4"
                >
                  {Array.from({ length: t.rating }, (_, i) => (
                    <span key={i} aria-hidden="true" className="material-symbols-outlined icon-filled text-lg">star</span>
                  ))}
                </div>
                <blockquote className="text-slate-600 text-sm leading-relaxed mb-6 italic">
                  &ldquo;{t.comment}&rdquo;
                </blockquote>
              </div>

              <figcaption className="flex items-center gap-4 pt-4 border-t border-slate-100">
                <span
                  aria-hidden="true"
                  className="w-12 h-12 shrink-0 rounded-full bg-primary-fixed text-primary border-2 border-primary-fixed-dim flex items-center justify-center font-bold text-lg"
                >
                  {t.initial}
                </span>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.location}</p>
                  <span className="inline-block mt-1 text-xs font-semibold text-primary">
                    Khám: {t.department}
                  </span>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Cam kết dịch vụ */}
        <ul className="mt-16 bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {COMMITMENTS.map((c) => (
            <li key={c.title} className="flex flex-col items-center">
              <span aria-hidden="true" className={`material-symbols-outlined text-3xl mb-2 ${c.tone || 'text-primary'}`}>{c.icon}</span>
              <div className="text-base sm:text-lg font-extrabold text-slate-900 mb-1">{c.title}</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-600">{c.desc}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
