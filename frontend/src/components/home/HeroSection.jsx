import React, { useState } from 'react';
import presidentAwardImg from '../../assets/myphat_president_award.jpg';
import bannerImg from '../../assets/myphat_banner.jpg';
import heroImg from '../../assets/hero_doctor_ai.jpg';

export const HeroSection = ({ onOpenBooking, onScrollToAI, onOpenMyAppointments }) => {
  const [activeVisual, setActiveVisual] = useState('president'); // 'president' | 'banner' | 'ai'

  return (
    <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 overflow-hidden">
      {/* Ambient background glows with gentle mint & teal atmosphere */}
      <div className="absolute -top-28 left-1/4 w-[450px] h-[450px] rounded-full bg-mint-100/50 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-4 w-[500px] h-[500px] rounded-full bg-sky-100/40 blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-20 left-10 w-[350px] h-[350px] rounded-full bg-teal-50/60 blur-3xl pointer-events-none -z-10" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Column: Content */}
        <div className="xl:col-span-7 flex flex-col items-start pr-0 xl:pr-4">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-teal-50/90 border border-teal-200/70 text-teal-800 mb-6 shadow-xs backdrop-blur-xs">
            <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="font-label text-xs font-semibold tracking-wide">
              Mỹ Phát Hospital • 1170 Quang Trung, Chũ, Lục Ngạn, Bắc Giang
            </span>
          </div>

          {/* Main Heading with modern sans-serif */}
          <h1 className="font-headline text-3xl sm:text-5xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.18] mb-4">
            Sáng Y Đức, Vững Chuyên Môn <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-teal-700 via-teal-600 to-sky-600 bg-clip-text text-transparent relative inline-block">
              Vuông Tròn Hạnh Phúc
              <svg
                className="absolute left-0 -bottom-2 w-full h-3 text-teal-200/70 -z-10"
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
          <p className="font-body text-base sm:text-lg text-slate-600 max-w-2xl mb-8 leading-relaxed font-normal">
            Mỹ Phát Hospital tiên phong kết hợp y đức tận tâm cùng công nghệ y tế số HMS-AI hiện đại, phục vụ sức khỏe toàn diện cho nhân dân huyện Lục Ngạn và khu vực lân cận.
          </p>

          {/* CTAs: Nút Đặt lịch khám, Tra cứu lịch hẹn, Hotline và Hỏi AI - Sắp xếp gọn gàng, không chồng chéo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 w-full max-w-xl">
            {/* Nút 1: Đặt lịch khám */}
            <button
              onClick={() => onOpenBooking()}
              className="w-full h-12 sm:h-13 px-5 rounded-2xl bg-gradient-to-r from-blue-700 via-teal-600 to-teal-700 hover:from-blue-800 hover:to-teal-800 text-white font-label text-sm font-bold shadow-[0_6px_20px_rgba(11,83,148,0.28)] hover:shadow-[0_10px_25px_rgba(11,83,148,0.38)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 group whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
              <span>Đặt Lịch Khám Ngay</span>
              <span className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:translate-x-1">arrow_forward</span>
            </button>

            {/* Nút 2: Hotline Cấp cứu */}
            <a
              href="tel:0789065493"
              className="w-full h-12 sm:h-13 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-label text-sm font-bold shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer border border-rose-200/90 flex items-center justify-center gap-2 group whitespace-nowrap"
              title="Gọi ngay tổng đài Mỹ Phát Hospital: 0789 065 493"
            >
              <span className="material-symbols-outlined text-rose-600 text-[19px] group-hover:scale-110 transition-transform animate-pulse">call</span>
              <span>Hotline: 0789 065 493</span>
            </a>

            {/* Nút 3: Tra cứu lịch hẹn */}
            {onOpenMyAppointments ? (
              <button
                onClick={onOpenMyAppointments}
                className="w-full h-11 sm:h-12 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-label text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer border border-slate-200 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-teal-700 text-[19px]">receipt_long</span>
                <span>Tra cứu lịch hẹn</span>
              </button>
            ) : (
              <div />
            )}

            {/* Nút 4: Hỏi Trợ lý AI */}
            <button
              onClick={onScrollToAI}
              className="w-full h-11 sm:h-12 px-4 rounded-2xl bg-teal-50/90 hover:bg-teal-100 text-teal-900 font-label text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer border border-teal-200/80 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-teal-700 text-[19px]">smart_toy</span>
              <span>Hỏi Trợ Lý AI 24/7</span>
            </button>
          </div>

          {/* Ba khối chỉ số (15+ năm, 100.000+, 24/7): Cards tinh tế, viền mờ */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Card 1 */}
            <div className="p-4 sm:p-4.5 rounded-2xl bg-white/80 backdrop-blur-md border border-teal-100/80 shadow-[0_4px_20px_rgba(15,118,110,0.06)] hover:shadow-[0_8px_25px_rgba(15,118,110,0.12)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="font-headline text-2xl font-extrabold text-teal-900 tracking-tight">15+ Năm</span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
                  <span className="material-symbols-outlined text-[19px]">verified_user</span>
                </div>
              </div>
              <div>
                <p className="font-label text-xs font-bold text-slate-800">Y Đức & Chuyên Môn</p>
                <p className="font-label text-[11px] text-slate-500 mt-0.5">Phục vụ nhân dân tận tâm</p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-4 sm:p-4.5 rounded-2xl bg-white/80 backdrop-blur-md border border-teal-100/80 shadow-[0_4px_20px_rgba(15,118,110,0.06)] hover:shadow-[0_8px_25px_rgba(15,118,110,0.12)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="font-headline text-2xl font-extrabold text-teal-900 tracking-tight">100.000+</span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
                  <span className="material-symbols-outlined text-[19px]">groups</span>
                </div>
              </div>
              <div>
                <p className="font-label text-xs font-bold text-slate-800">Bệnh Nhân Tin Chọn</p>
                <p className="font-label text-[11px] text-slate-500 mt-0.5">Hài lòng với dịch vụ y tế</p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-4 sm:p-4.5 rounded-2xl bg-white/80 backdrop-blur-md border border-teal-100/80 shadow-[0_4px_20px_rgba(15,118,110,0.06)] hover:shadow-[0_8px_25px_rgba(15,118,110,0.12)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="font-headline text-2xl font-extrabold text-teal-900 tracking-tight">24/7</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <span className="material-symbols-outlined text-[19px]">auto_awesome</span>
                </div>
              </div>
              <div>
                <p className="font-label text-xs font-bold text-slate-800">Hotline & AI Y Tế</p>
                <p className="font-label text-[11px] text-slate-500 mt-0.5">Tư vấn & tiếp nhận liên tục</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Showcase với chuyển đổi giữa Banner Mỹ Phát và Hình ảnh AI */}
        <div className="lg:col-span-5 relative mt-6 lg:mt-0 flex flex-col items-center">
          {/* Visual Selector Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 mb-3 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveVisual('president')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeVisual === 'president'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">military_tech</span>
              <span>Ảnh cùng Chủ tịch nước</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveVisual('banner')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeVisual === 'banner'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-teal-600">apartment</span>
              <span>Cơ sở Bệnh viện</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveVisual('ai')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeVisual === 'ai'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-sky-600">medical_services</span>
              <span>Bác Sĩ & AI</span>
            </button>
          </div>

          <div className="relative w-full max-w-md rounded-3xl overflow-hidden bg-white p-2 sm:p-2.5 shadow-[0_15px_45px_-12px_rgba(15,118,110,0.18)] border border-teal-100/80">
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
              {activeVisual === 'president' ? (
                <div className="relative w-full h-full flex items-center justify-center bg-slate-950 p-1">
                  <img
                    alt="Ban Lãnh Đạo Mỹ Phát Hospital chụp ảnh cùng Nguyên Chủ tịch nước Trương Tấn Sang"
                    className="w-full h-full object-contain rounded-xl"
                    src={presidentAwardImg}
                    onError={(e) => {
                      e.currentTarget.src = "/myphat_president_award.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none rounded-xl" />
                  <div className="absolute bottom-2 left-2.5 right-2.5 text-white pointer-events-none text-center">
                    <p className="font-label text-[11px] sm:text-xs font-bold text-amber-200 drop-shadow-md">
                      Vinh dự & Tự hào: Ban lãnh đạo Mỹ Phát Hospital chụp ảnh cùng Nguyên Chủ tịch nước
                    </p>
                  </div>
                </div>
              ) : activeVisual === 'banner' ? (
                <div className="relative w-full h-full flex items-center justify-center bg-slate-950 p-1">
                  <img
                    alt="Mỹ Phát Hospital"
                    className="w-full h-full object-contain rounded-xl"
                    src={bannerImg}
                    onError={(e) => {
                      e.currentTarget.src = "/myphat_banner.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none rounded-xl" />
                  <div className="absolute bottom-2 left-2.5 right-2.5 text-white pointer-events-none text-center">
                    <p className="font-label text-[11px] sm:text-xs font-bold text-teal-200 drop-shadow-md">
                      Mỹ Phát Hospital • 1170 Quang Trung, TT. Chũ, Lục Ngạn
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                  <img
                    alt="Bác sĩ Mỹ Phát Hospital sử dụng máy tính bảng giải thích kết quả X-quang tích hợp AI cho bệnh nhân"
                    className="w-full h-full object-cover object-center"
                    src={heroImg}
                    onError={(e) => {
                      e.currentTarget.src = "/hero_doctor_ai.jpg";
                    }}
                  />
                </div>
              )}

              {/* Top-left glass badge */}
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-semibold flex items-center gap-1.5 border border-white/20 shadow-sm pointer-events-none">
                <span className={`material-symbols-outlined text-[13px] ${activeVisual === 'president' ? 'text-amber-400' : 'text-teal-300'}`}>
                  {activeVisual === 'president' ? 'military_tech' : activeVisual === 'banner' ? 'verified' : 'medical_services'}
                </span>
                <span>
                  {activeVisual === 'president'
                    ? 'Diện kiến Nguyên Chủ tịch nước'
                    : activeVisual === 'banner'
                    ? 'Cơ sở 1170 Quang Trung, Chũ'
                    : 'Hội chẩn số AI & Bác sĩ'}
                </span>
              </div>
            </div>

            {/* Floating Glassmorphic Status Chip 1: Top Right */}
            <div className="absolute -top-3 -right-2 sm:-right-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-teal-100/90 flex items-center gap-3 animate-fade-in">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-600" />
              </span>
              <div className="flex flex-col">
                <span className="font-label text-[10px] text-slate-500 font-medium">Hotline Khám & Cấp Cứu</span>
                <span className="font-label text-xs font-bold text-rose-700">0789 065 493 (24/7)</span>
              </div>
            </div>

            {/* Floating Glassmorphic Status Chip 2: Bottom Left */}
            <div className="absolute -bottom-3 -left-2 sm:-left-4 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-teal-100/90 flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
                <span className="material-symbols-outlined text-[18px]">favorite</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label text-[10px] text-slate-500 font-medium">Khẩu hiệu y khoa</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-headline text-xs font-bold text-teal-800">Sáng Y Đức – Vuông Tròn Hạnh Phúc</span>
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

