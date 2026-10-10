import React, { useRef, useState } from 'react';
import presidentAwardImg from '../../assets/myphat_president_award.jpg';
import bannerImg from '../../assets/myphat_banner.jpg';

const VISUAL_TABS = [
  { id: 'president', label: 'Nguyên Chủ tịch nước trao bằng khen', icon: 'military_tech' },
  { id: 'banner', label: 'Cơ sở Bệnh viện', icon: 'apartment' }
];

const HIGHLIGHTS = [
  {
    title: 'Y Đức',
    icon: 'verified_user',
    label: 'Tận Tâm & Chuyên Môn',
    desc: 'Lấy người bệnh làm trung tâm',
    iconBox: 'bg-primary-fixed text-primary border-primary-fixed-dim'
  },
  {
    title: 'BHYT',
    icon: 'health_and_safety',
    label: 'Khám Bảo Hiểm Y Tế',
    desc: 'Tiếp nhận khám BHYT & dịch vụ',
    iconBox: 'bg-teal-50 text-teal-700 border-teal-100'
  },
  {
    title: '24/7',
    icon: 'support_agent',
    label: 'Hotline & Cấp Cứu',
    desc: 'Tư vấn & tiếp nhận liên tục',
    iconBox: 'bg-primary-fixed text-primary border-primary-fixed-dim'
  }
];

export const HeroSection = ({ onOpenBooking, onScrollToAI, onOpenMyAppointments }) => {
  const [activeVisual, setActiveVisual] = useState('president'); // 'president' | 'banner'
  const tabRefs = useRef({});

  // Điều hướng bàn phím cho tablist (←/→/Home/End) theo mẫu WAI-ARIA Tabs
  const handleTabKeyDown = (e) => {
    const ids = VISUAL_TABS.map((t) => t.id);
    const current = ids.indexOf(activeVisual);
    let next = null;
    if (e.key === 'ArrowRight') next = ids[(current + 1) % ids.length];
    else if (e.key === 'ArrowLeft') next = ids[(current - 1 + ids.length) % ids.length];
    else if (e.key === 'Home') next = ids[0];
    else if (e.key === 'End') next = ids[ids.length - 1];
    if (next) {
      e.preventDefault();
      setActiveVisual(next);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 overflow-hidden">
      {/* Nền trang trí nhẹ */}
      <div aria-hidden="true" className="absolute -top-28 left-1/4 w-[450px] h-[450px] rounded-full bg-primary-fixed/70 blur-3xl pointer-events-none -z-10" />
      <div aria-hidden="true" className="absolute top-1/3 right-4 w-[500px] h-[500px] rounded-full bg-primary-fixed-dim/30 blur-3xl pointer-events-none -z-10" />
      <div aria-hidden="true" className="absolute -bottom-20 left-10 w-[350px] h-[350px] rounded-full bg-teal-50/60 blur-3xl pointer-events-none -z-10" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Cột trái: nội dung */}
        <div className="lg:col-span-7 flex flex-col items-start pr-0 xl:pr-4">
          {/* Nhãn địa chỉ */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary-fixed border border-primary-fixed-dim text-primary mb-6 shadow-xs backdrop-blur-sm">
            <span aria-hidden="true" className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="font-label text-xs font-semibold tracking-wide">
              Mỹ Phát Hospital • 1170 Quang Trung, Chũ, Lục Ngạn, Bắc Giang
            </span>
          </div>

          <h1 className="font-headline text-3xl sm:text-5xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.18] mb-4">
            Sáng Y Đức, Vững Chuyên Môn <br className="hidden sm:inline" />
            <span className="text-primary relative inline-block">
              Vuông Tròn Hạnh Phúc
              <svg
                aria-hidden="true"
                focusable="false"
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

          <p className="font-body text-base sm:text-lg text-slate-600 max-w-2xl mb-8 leading-relaxed font-normal">
            Mỹ Phát Hospital kết hợp y đức tận tâm cùng công nghệ y tế số hiện đại, chăm sóc sức khỏe toàn diện cho nhân dân huyện Lục Ngạn và khu vực lân cận.
          </p>

          {/* Nút hành động: Đặt lịch khám, Hotline, Tra cứu lịch hẹn, Hỏi AI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 w-full max-w-xl">
            <button
              type="button"
              onClick={() => onOpenBooking()}
              className="w-full h-12 px-5 rounded-2xl bg-primary hover:bg-primary-dark text-white font-label text-sm font-bold shadow-[0_6px_20px_rgba(11,83,148,0.28)] hover:shadow-[0_10px_25px_rgba(11,83,148,0.38)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 group whitespace-nowrap"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">calendar_month</span>
              <span>Đặt Lịch Khám Ngay</span>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:translate-x-1">arrow_forward</span>
            </button>

            <a
              href="tel:0789065493"
              className="w-full h-12 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-800 font-label text-sm font-bold shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer border border-red-200 flex items-center justify-center gap-2 group whitespace-nowrap"
              title="Gọi tổng đài Mỹ Phát Hospital: 0789 065 493"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-red-600 text-[19px] group-hover:scale-110 transition-transform animate-pulse">call</span>
              <span>Hotline: 0789 065 493</span>
            </a>

            {onOpenMyAppointments ? (
              <button
                type="button"
                onClick={onOpenMyAppointments}
                className="w-full h-11 sm:h-12 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-label text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer border border-slate-200 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-primary text-[19px]">receipt_long</span>
                <span>Tra cứu lịch hẹn</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={onScrollToAI}
              className="w-full h-11 sm:h-12 px-4 rounded-2xl bg-teal-50/90 hover:bg-teal-100 text-teal-900 font-label text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer border border-teal-200/80 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-teal-700 text-[19px]">smart_toy</span>
              <span>Hỏi Trợ Lý AI 24/7</span>
            </button>
          </div>

          {/* Ba điểm nổi bật (không dùng số liệu chưa kiểm chứng) */}
          <ul className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {HIGHLIGHTS.map((h) => (
              <li
                key={h.title}
                className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-primary-fixed-dim/70 shadow-[0_4px_20px_rgba(11,83,148,0.06)] hover:shadow-[0_8px_25px_rgba(11,83,148,0.12)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-headline text-2xl font-extrabold text-primary tracking-tight">{h.title}</span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${h.iconBox}`}>
                    <span aria-hidden="true" className="material-symbols-outlined text-[19px]">{h.icon}</span>
                  </div>
                </div>
                <div>
                  <p className="font-label text-xs font-bold text-slate-800">{h.label}</p>
                  <p className="font-label text-xs text-slate-500 mt-0.5">{h.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Cột phải: ảnh giới thiệu (Bằng khen Chủ tịch nước / Cơ sở bệnh viện) */}
        <div className="lg:col-span-5 relative mt-6 lg:mt-0 flex flex-col items-center">
          <div
            role="tablist"
            aria-label="Ảnh giới thiệu bệnh viện"
            className="flex flex-wrap items-center justify-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 mb-3 shadow-xs"
          >
            {VISUAL_TABS.map((tab) => {
              const selected = activeVisual === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabRefs.current[tab.id] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`hero-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls="hero-visual-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveVisual(tab.id)}
                  onKeyDown={handleTabKeyDown}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selected ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div
            id="hero-visual-panel"
            role="tabpanel"
            aria-labelledby={`hero-tab-${activeVisual}`}
            className="relative w-full max-w-md rounded-2xl overflow-hidden bg-white p-2 sm:p-2.5 shadow-[0_15px_45px_-12px_rgba(11,83,148,0.18)] border border-primary-fixed-dim/80"
          >
            <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
              {activeVisual === 'president' ? (
                <div className="relative w-full h-full flex items-center justify-center bg-slate-950 p-1">
                  <img
                    alt="Ban Lãnh Đạo Mỹ Phát Hospital vinh dự được Nguyên Chủ tịch nước Trương Tấn Sang trao bằng khen"
                    className="w-full h-full object-contain rounded-lg"
                    src={presidentAwardImg}
                    onError={(e) => {
                      e.currentTarget.src = '/myphat_president_award.jpg';
                    }}
                  />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none rounded-lg" />
                  <div className="absolute bottom-2 left-2.5 right-2.5 text-white pointer-events-none text-center">
                    <p className="font-label text-xs font-bold text-white drop-shadow-md">
                      Vinh dự & Tự hào: Ban lãnh đạo Mỹ Phát Hospital được Nguyên Chủ tịch nước trao bằng khen
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center bg-slate-950 p-1">
                  <img
                    alt="Mỹ Phát Hospital"
                    className="w-full h-full object-contain rounded-lg"
                    src={bannerImg}
                    onError={(e) => {
                      e.currentTarget.src = '/myphat_banner.jpg';
                    }}
                  />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none rounded-lg" />
                  <div className="absolute bottom-2 left-2.5 right-2.5 text-white pointer-events-none text-center">
                    <p className="font-label text-xs font-bold text-white drop-shadow-md">
                      Mỹ Phát Hospital • 1170 Quang Trung, TT. Chũ, Lục Ngạn
                    </p>
                  </div>
                </div>
              )}

              {/* Nhãn góc trên trái */}
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 border border-white/20 shadow-sm pointer-events-none">
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-[14px] ${activeVisual === 'president' ? 'text-amber-300' : 'text-teal-300'}`}
                >
                  {activeVisual === 'president' ? 'military_tech' : 'verified'}
                </span>
                <span>
                  {activeVisual === 'president'
                    ? 'Nguyên Chủ tịch nước trao bằng khen'
                    : 'Cơ sở 1170 Quang Trung, Chũ'}
                </span>
              </div>
            </div>

            {/* Chip nổi: Hotline */}
            <div className="absolute -top-3 -right-2 sm:-right-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-primary-fixed-dim flex items-center gap-3 animate-fade-in">
              <span aria-hidden="true" className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
              </span>
              <div className="flex flex-col">
                <span className="font-label text-xs text-slate-500 font-medium">Hotline Khám & Cấp Cứu</span>
                <span className="font-label text-xs font-bold text-red-700">0789 065 493 (24/7)</span>
              </div>
            </div>

            {/* Chip nổi: Khẩu hiệu */}
            <div className="absolute -bottom-3 -left-2 sm:-left-4 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-primary-fixed-dim flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">favorite</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label text-xs text-slate-500 font-medium">Khẩu hiệu y khoa</span>
                <span className="font-headline text-xs font-bold text-primary">Sáng Y Đức – Vuông Tròn Hạnh Phúc</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
