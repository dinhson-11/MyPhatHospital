import React from 'react';

const TESTIMONIALS = [
  {
    name: 'Bác Nguyễn Văn Thành (62 tuổi)',
    location: 'Chũ, Bắc Ninh',
    department: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    rating: 5,
    comment:
      'Tôi bị nhói ngực và huyết áp cao nhiều năm. Được TS.BS Vi Mai Anh điều trị tận tình bằng phác đồ mới, đặt lịch qua mạng đến nơi là vào phòng khám ngay không phải chen chúc bốc số xếp hàng.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'
  },
  {
    name: 'Chị Hoàng Thùy Linh (34 tuổi)',
    location: 'Lục Ngạn, Bắc Ninh',
    department: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    rating: 5,
    comment:
      'Bé nhà mình bị sốt virus nửa đêm, được các bác sĩ Khám bệnh và Cấp cứu tiếp đón ân cần, phòng ốc khang trang sạch sẽ như khách sạn. Có kết quả xét nghiệm gửi ngay lên điện thoại rất tiện lợi.',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80'
  },
  {
    name: 'Anh Đỗ Quang Huy (45 tuổi)',
    location: 'Lục Nam, Bắc Ninh',
    department: 'Khoa Khám bệnh / Cấp cứu ban đầu',
    rating: 5,
    comment:
      'Nội soi dạ dày không đau ở đây thực sự rất nhẹ nhàng, ngủ một giấc 15 phút dậy là xong xuôi, bác sĩ giải thích cặn kẽ từng vết trợt loét và tư vấn chế độ ăn uống khoa học.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
  }
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-slate-50 relative border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-primary-dark text-xs font-bold uppercase tracking-wider mb-4 border border-emerald-200">
            <span className="material-symbols-outlined text-sm">reviews</span>
            Đánh Giá & Phản Hồi
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Tin Tưởng Từ Hàng Trăm Nghìn Bệnh Nhân
          </h2>
          <p className="text-slate-600 text-base sm:text-lg">
            Sự hài lòng và sức khỏe hồi phục của người bệnh chính là thước đo giá trị cao quý nhất của Mỹ Phát Hospital.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-lg fill-current">star</span>
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-6 italic">
                  &ldquo;{t.comment}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-100"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                  <p className="text-xs text-slate-400">{t.location}</p>
                  <span className="inline-block mt-1 text-[11px] font-semibold text-primary">
                    Khám: {t.department}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Row */}
        <div className="mt-16 bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">99.4%</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600">Bệnh nhân hài lòng</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-secondary mb-1">150K+</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600">Lượt khám mỗi năm</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">&lt;15 phút</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600">Chờ khám trực tuyến</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-amber-500 mb-1">24/7</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600">Cấp cứu sẵn sàng</div>
          </div>
        </div>
      </div>
    </section>
  );
}
