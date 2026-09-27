import React from 'react';

export const HeroSection = ({ onOpenBooking, onScrollToAI }) => {
  return (
    <section className="relative w-full max-w-[1280px] mx-auto px-6 py-12 md:py-16 overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 rounded-full bg-primary-fixed/25 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-10 w-[500px] h-[500px] rounded-full bg-secondary-fixed/20 blur-3xl pointer-events-none -z-10" />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center">
        {/* Left Column: Content */}
        <div className="xl:col-span-7 flex flex-col items-start pr-0 xl:pr-6">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high text-primary mb-6 shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-label text-xs font-semibold tracking-wide">
              ✨ Hệ thống Y tế Tích hợp Trí tuệ Nhân tạo Tiên tiến
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="font-headline text-3xl sm:text-5xl font-extrabold text-on-surface tracking-tight leading-tight mb-6">
            Chăm sóc sức khỏe <br className="hidden sm:inline" />
            <span className="text-primary relative inline-block">
              thông minh, tận tâm
              <svg
                className="absolute left-0 -bottom-2 w-full h-3 text-primary-fixed-dim/60 -z-10"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 250 12"
              >
                <path
                  d="M2 9C55 2.5 195 2 248 8"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="4"
                />
              </svg>
            </span>
          </h1>

          {/* Subheading */}
          <p className="font-body text-base text-on-surface-variant max-w-2xl mb-8 leading-relaxed">
            Bệnh viện Thanh Sơn ứng dụng công nghệ MedCare AI hỗ trợ sàng lọc triệu chứng sớm, tối ưu hóa quy trình khám và đồng hành chăm sóc sức khỏe toàn diện cùng đội ngũ chuyên gia đầu ngành.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 mb-10 w-full sm:w-auto">
            <button
              onClick={() => onOpenBooking()}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary-container text-white font-label text-sm font-semibold shadow-md hover:bg-primary transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
              <span>Đặt lịch khám ngay</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <button
              onClick={onScrollToAI}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white text-primary font-label text-sm font-semibold shadow-xs hover:bg-surface-container-low transition-all duration-200 cursor-pointer border border-primary/10"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">forum</span>
              <span>Hỏi AI triệu chứng</span>
            </button>
          </div>

          {/* Trust Row */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-surface-container-low shadow-xs border border-surface-container-high/40">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-primary mb-1">
                <span className="material-symbols-outlined text-[20px]">verified</span>
                <span className="font-headline text-xl font-bold text-on-surface">50+</span>
              </div>
              <span className="font-label text-xs font-semibold text-on-surface">Bác sĩ chuyên khoa</span>
              <span className="font-label text-xs text-on-surface-variant">Tuyến TW & quốc tế</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-primary mb-1">
                <span className="material-symbols-outlined text-[20px]">group</span>
                <span className="font-headline text-xl font-bold text-on-surface">10,000+</span>
              </div>
              <span className="font-label text-xs font-semibold text-on-surface">Bệnh nhân tin tưởng</span>
              <span className="font-label text-xs text-on-surface-variant">Trải nghiệm khám nhanh</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-secondary mb-1">
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                <span className="font-headline text-xl font-bold text-on-surface">24/7</span>
              </div>
              <span className="font-label text-xs font-semibold text-on-surface">Hỗ trợ MedCare AI</span>
              <span className="font-label text-xs text-on-surface-variant">Phân luồng tức thì</span>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Showcase */}
        <div className="xl:col-span-5 relative mt-8 xl:mt-0 flex justify-center">
          <div className="relative w-full max-w-lg aspect-[4/3] sm:aspect-square flex items-center justify-center rounded-2xl overflow-visible bg-surface-container-high shadow-xl p-3">
            <img
              alt="Minh họa công nghệ MedCare AI Bệnh viện Thanh Sơn"
              className="w-full h-full object-cover rounded-xl shadow-inner"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYGK6iKZIyhegbmEaDIolibYVpAXgwKgD8o0qVMFDKhS7dnFYukTkIJVZs4AFwsSm3jiM4QXbnyhbC-xWXNlHqoczkkL1mMvuL--91HaMGYt9kGZeqsXWNp8pOiMzK1qKcAlRGFugHS9m934g0tI76j6RGgWLysMJW-mc_RFXpllFPecJfzqWt7rvYkiCXi7p6Hq2bw-p_qKJfxC-wGhBMlZXw63Y8NHQXQ2ekh0je7K-X9Da83XjQzw"
            />
            {/* Floating Status Chip 1: Top Right */}
            <div className="absolute -top-4 -right-3 sm:-right-5 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg border border-surface-container-high/60 flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
              </span>
              <div className="flex flex-col">
                <span className="font-label text-[11px] text-on-surface-variant font-medium">Độ chính xác phân luồng</span>
                <span className="font-label text-xs font-bold text-primary">98.6% Chuẩn đoán sơ bộ</span>
              </div>
            </div>
            {/* Floating Status Chip 2: Bottom Left */}
            <div className="absolute -bottom-4 -left-3 sm:-left-5 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg border border-surface-container-high/60 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">timer</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label text-[11px] text-on-surface-variant font-medium">Thời gian chờ khám</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-headline text-sm font-bold text-on-surface">Giảm 65%</span>
                  <span className="font-label text-[10px] text-primary font-semibold">Tự động hoá</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
