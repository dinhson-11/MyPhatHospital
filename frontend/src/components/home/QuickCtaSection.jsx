import React from 'react';

export default function QuickCtaSection({ onOpenBooking, onOpenContact }) {
  return (
    <section className="py-16 bg-gradient-to-r from-primary to-primary-dark text-white relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-100 text-xs font-bold uppercase tracking-wider mb-4 border border-white/20">
              <span className="material-symbols-outlined text-sm">alarm</span>
              Tiếp Nhận Khám & Cấp Cứu 24/7
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Cần Tư Vấn Sức Khỏe Hoặc Khám Khẩn Cấp?
            </h2>
            <p className="text-emerald-100 text-base sm:text-lg leading-relaxed">
              Tổng đài chăm sóc khách hàng và đội ngũ y bác sĩ trực cấp cứu của Bệnh viện Đa khoa Thanh Sơn luôn sẵn sàng phục vụ bạn và gia đình bất kể ngày đêm.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <a
              href="tel:19006868"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white text-primary hover:bg-emerald-50 font-extrabold text-sm shadow-xl transition-all flex items-center justify-center gap-3 text-center"
            >
              <span className="material-symbols-outlined text-xl text-rose-500">call</span>
              <span>Hotline 24/7: 1900 6868</span>
            </a>

            <button
              type="button"
              id="cta-open-booking-btn"
              onClick={() => onOpenBooking()}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white font-bold text-sm border border-emerald-400/40 shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">calendar_add_on</span>
              <span>Đặt Lịch Hẹn Khám</span>
            </button>

            <button
              type="button"
              id="cta-open-contact-btn"
              onClick={onOpenContact}
              className="w-full sm:w-auto px-5 py-4 rounded-xl bg-transparent hover:bg-white/10 text-white font-semibold text-sm border border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">pin_drop</span>
              <span>Chỉ Đường</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
