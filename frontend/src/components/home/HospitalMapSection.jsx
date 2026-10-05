import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import logoHospital from '../../assets/logo.png';

export const HospitalMapSection = () => {
  const { showToast } = useToast() || {};
  const [copied, setCopied] = useState(false);

  const hospitalAddress = '1170 Quang Trung, Thị Trấn Chũ, Huyện Lục Ngạn, Tỉnh Bắc Giang';
  const googleMapsUrl = 'https://maps.app.goo.gl/2vAWcXFcfgSGPS7H6';
  const iframeEmbedUrl = 'https://maps.google.com/maps?q=1170%20Quang%20Trung,%20Th%E1%BB%8B%20Tr%E1%BA%A5n%20Ch%C5%A9,%20L%E1%BB%A5c%20Ng%E1%BA%A1n,%20B%E1%BA%AFc%20Giang&t=&z=16&ie=UTF8&iwloc=&output=embed';

  const handleCopyAddress = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(hospitalAddress);
    setCopied(true);
    if (showToast) {
      showToast('Đã sao chép địa chỉ bệnh viện vào bộ nhớ tạm!', 'success');
    }
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenMap = () => {
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <section id="hospital-map" className="relative w-full py-10 sm:py-12 bg-gradient-to-b from-slate-50 to-teal-50/20 overflow-hidden border-t border-teal-100/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Compact Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100/80 text-teal-900 text-xs font-bold uppercase tracking-wider mb-2 border border-teal-200">
              <span className="material-symbols-outlined text-[15px] text-teal-700">pin_drop</span>
              <span>Vị Trí & Chỉ Đường</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Vị Trí Mỹ Phát Hospital
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-1">
              📍 1170 Quang Trung, Thị Trấn Chũ, Huyện Lục Ngạn, Tỉnh Bắc Giang (Thuận tiện kết nối giao thông liên huyện)
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleOpenMap}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-label text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-rose-300 text-[18px]">location_on</span>
              <span>Mở Google Maps</span>
              <span className="material-symbols-outlined text-teal-200 text-[15px]">open_in_new</span>
            </button>
          </div>
        </div>

        {/* Compact 2-Column Card + Map Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column: Quick Info (Compact) */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-teal-100/90 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center p-1 shadow-2xs shrink-0">
                  <img
                    src={logoHospital}
                    alt="Logo Mỹ Phát Hospital"
                    className="w-full h-full object-contain rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = '/logo.png';
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-headline text-base font-bold text-slate-900 leading-tight">
                    Mỹ Phát Hospital
                  </h3>
                  <p className="font-label text-xs text-teal-700 font-semibold">
                    1170 Quang Trung, Chũ, Lục Ngạn
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* Address */}
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-teal-600 text-[18px] shrink-0 mt-0.5">location_on</span>
                  <div>
                    <span className="text-slate-500 font-medium">Địa chỉ:</span>
                    <p className="text-slate-800 font-bold leading-snug">
                      1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang
                    </p>
                  </div>
                </div>

                {/* Hotline */}
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-rose-600 text-[18px] shrink-0 mt-0.5 animate-pulse">call</span>
                  <div>
                    <span className="text-slate-500 font-medium">Hotline tư vấn & cấp cứu:</span>
                    <p>
                      <a href="tel:0789065493" className="text-rose-700 font-extrabold hover:underline">
                        0789 065 493
                      </a>{' '}
                      <span className="text-slate-500 font-normal">(Trực 24/7)</span>
                    </p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-sky-600 text-[18px] shrink-0 mt-0.5">schedule</span>
                  <div>
                    <span className="text-slate-500 font-medium">Giờ khám bệnh:</span>
                    <p className="text-slate-800 font-semibold">
                      07:00 – 17:30 (Thứ 2 – Chủ Nhật)
                    </p>
                    <p className="text-[11px] text-teal-700 font-medium">
                      Cấp cứu tiếp nhận 24/24h
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAddress}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Sao chép địa chỉ vào clipboard"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? 'Đã sao chép' : 'Chép địa chỉ'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenMap}
                className="flex-1 py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px] text-teal-700">directions</span>
                <span>Chỉ đường</span>
              </button>
            </div>
          </div>

          {/* Right Column: Compact Embedded Pinned Map */}
          <div className="lg:col-span-8 relative rounded-2xl overflow-hidden shadow-sm border border-teal-200/80 bg-slate-100 h-64 sm:h-72">
            <iframe
              title="Bản đồ vị trí Mỹ Phát Hospital - 1170 Quang Trung, Chũ, Lục Ngạn"
              src={iframeEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            />

            {/* Floating Quick Action Overlay */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto sm:max-w-xs z-10 p-2.5 rounded-xl bg-slate-950/85 hover:bg-slate-950/95 backdrop-blur-md text-white border border-white/20 shadow-lg cursor-pointer transition-all flex items-center justify-between gap-3"
              onClick={handleOpenMap}
              title="Bấm vào để mở Google Maps"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
                </span>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                    <span>Mỹ Phát Hospital</span>
                    <span className="material-symbols-outlined text-[13px] text-teal-300">verified</span>
                  </p>
                  <p className="text-[10px] text-slate-300 truncate">
                    1170 Quang Trung, Chũ
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[16px] text-teal-300 shrink-0">open_in_new</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HospitalMapSection;
