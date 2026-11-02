import React from 'react';
import frontageImg from '../../assets/mat-tien-my-phat.jpg';
import { HOURS_TEXT, hoursCompact } from '../../services/hospitalHours';

export const HeroSection = ({ onOpenBooking, onScrollToAI, onOpenMyAppointments }) => {
  return (
    <section className="bg-primary-fixed border-b border-primary-fixed-dim">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7">
          <div aria-hidden="true" className="h-1 w-12 bg-primary mb-4" />
          <h1 className="text-4xl sm:text-5xl font-semibold text-slate-900 leading-tight mb-4">
            Mỹ Phát Hospital
          </h1>
          <p className="text-lg sm:text-xl text-slate-700 max-w-xl mb-8">
            Phòng khám đa khoa tại Chũ, Lục Ngạn. Chọn trước khoa, bác sĩ và giờ khám ngay trên website.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mb-9">
            <button type="button" onClick={() => onOpenBooking()} className="btn btn-primary btn-lg">
              Đặt lịch khám
            </button>
            <a href="tel:0386959342" className="btn btn-outline btn-lg" title="Gọi tổng đài Mỹ Phát Hospital">
              Gọi 0386 959 342
            </a>
            {onOpenMyAppointments && (
              <button type="button" onClick={onOpenMyAppointments} className="link-btn">
                Tra cứu lịch hẹn của tôi
              </button>
            )}
            <button type="button" onClick={onScrollToAI} className="link-btn">
              Hỏi trợ lý về triệu chứng
            </button>
          </div>

          <dl className="border-t border-primary-fixed-dim text-base">
            <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr] gap-x-6 gap-y-1 py-3 border-b border-primary-fixed-dim">
              <dt className="text-slate-600">Địa chỉ</dt>
              <dd className="text-slate-900">1170 Quang Trung, Thị trấn Chũ, huyện Lục Ngạn, tỉnh Bắc Giang</dd>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr] gap-x-6 gap-y-1 py-3 border-b border-primary-fixed-dim">
              <dt className="text-slate-600">Giờ khám</dt>
              <dd className="text-slate-900">
                {HOURS_TEXT.days}: {hoursCompact()}
                <span className="block text-slate-600 text-sm mt-0.5">{HOURS_TEXT.bhyt}. {HOURS_TEXT.emergency}.</span>
              </dd>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr] gap-x-6 gap-y-1 py-3 border-b border-primary-fixed-dim">
              <dt className="text-slate-600">Cấp cứu</dt>
              <dd className="text-slate-900">
                Gọi hotline <a href="tel:0386959342" className="font-semibold underline underline-offset-2">0386 959 342</a>
                {' '}hoặc <a href="tel:115" className="font-semibold underline underline-offset-2">115</a> khi nguy kịch.
              </dd>
            </div>
          </dl>
        </div>

        {/* Ảnh dọc rộng 389px: giới hạn ~ kích thước thật để không bị phóng to mờ */}
        <figure className="lg:col-span-5 w-full max-w-xs sm:max-w-sm justify-self-center lg:justify-self-end">
          <img
            alt="Mặt tiền Phòng khám đa khoa Mỹ Phát tại 1170 Quang Trung, thị trấn Chũ"
            className="w-full h-auto border border-slate-300 bg-white"
            src={frontageImg}
            width="389"
            height="573"
          />
          <figcaption className="text-sm text-slate-600 mt-2">
            Mặt tiền Mỹ Phát Hospital, 1170 Quang Trung, thị trấn Chũ.
          </figcaption>
        </figure>
      </div>
    </section>
  );
};

export default HeroSection;
