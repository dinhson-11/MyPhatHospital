import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import logoHospital from '../../assets/logo.png';
import { HOURS_TEXT } from '../../services/hospitalHours';

const HOSPITAL_ADDRESS = '1170 Quang Trung, Thị Trấn Chũ, Huyện Lục Ngạn, Tỉnh Bắc Giang';
const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/2vAWcXFcfgSGPS7H6';
const IFRAME_EMBED_URL =
  'https://maps.google.com/maps?q=1170%20Quang%20Trung,%20Th%E1%BB%8B%20Tr%E1%BA%A5n%20Ch%C5%A9,%20L%E1%BB%A5c%20Ng%E1%BA%A1n,%20B%E1%BA%AFc%20Giang&t=&z=16&ie=UTF8&iwloc=&output=embed';

const NewTabHint = () => <span className="sr-only"> (mở trong tab mới)</span>;

export const HospitalMapSection = () => {
  const { showToast } = useToast() || {};
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard không khả dụng');
      await navigator.clipboard.writeText(HOSPITAL_ADDRESS);
      setCopied(true);
      showToast?.('Đã sao chép địa chỉ bệnh viện', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast?.('Không sao chép được, vui lòng sao chép thủ công', 'warning');
    }
  };

  return (
    <section id="hospital-map" className="relative w-full py-10 sm:py-12 bg-gradient-to-b from-slate-50 to-primary-fixed/40 overflow-hidden border-t border-outline-variant">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-primary text-xs font-bold uppercase tracking-wider mb-2 border border-primary-fixed-dim">
              <span aria-hidden="true" className="material-symbols-outlined text-[15px]">pin_drop</span>
              <span>Vị Trí & Chỉ Đường</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Vị Trí Mỹ Phát Hospital
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-1">
              1170 Quang Trung, Thị Trấn Chũ, Huyện Lục Ngạn, Tỉnh Bắc Giang (thuận tiện kết nối giao thông liên huyện)
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-label text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">location_on</span>
              <span>Mở Google Maps</span>
              <span aria-hidden="true" className="material-symbols-outlined text-primary-fixed-dim text-[15px]">open_in_new</span>
              <NewTabHint />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Cột trái: thông tin nhanh */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-outline-variant flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="w-11 h-11 rounded-xl bg-primary-fixed border border-primary-fixed-dim flex items-center justify-center p-1 shadow-xs shrink-0">
                  <img
                    src={logoHospital}
                    alt=""
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
                  <p className="font-label text-xs text-primary font-semibold">
                    1170 Quang Trung, Chũ, Lục Ngạn
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* Địa chỉ */}
                <div className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">location_on</span>
                  <div>
                    <span className="text-slate-500 font-medium">Địa chỉ:</span>
                    <p className="text-slate-800 font-bold leading-snug">
                      1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang
                    </p>
                  </div>
                </div>

                {/* Hotline */}
                <div className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="material-symbols-outlined text-red-600 text-[18px] shrink-0 mt-0.5">call</span>
                  <div>
                    <span className="text-slate-500 font-medium">Hotline tư vấn & cấp cứu:</span>
                    <p>
                      <a href="tel:0789065493" className="text-red-700 font-extrabold hover:underline">
                        0789 065 493
                      </a>{' '}
                      <span className="text-slate-500 font-normal">(Trực 24/7)</span>
                    </p>
                  </div>
                </div>

                {/* Giờ khám */}
                <div className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">schedule</span>
                  <div>
                    <span className="text-slate-500 font-medium">Giờ khám bệnh:</span>
                    <p className="text-slate-800 font-semibold">{HOURS_TEXT.days}</p>
                    <p className="text-xs text-slate-600">{HOURS_TEXT.summer}</p>
                    <p className="text-xs text-slate-600">{HOURS_TEXT.winter}</p>
                    <p className="text-xs text-slate-600">{HOURS_TEXT.bhyt}</p>
                    <p className="text-xs text-teal-700 font-medium">{HOURS_TEXT.emergency}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Thao tác nhanh */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAddress}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Sao chép địa chỉ bệnh viện"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span aria-live="polite">{copied ? 'Đã sao chép' : 'Chép địa chỉ'}</span>
              </button>

              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 rounded-xl bg-primary-fixed hover:bg-primary-fixed-dim text-primary border border-primary-fixed-dim text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[15px]">directions</span>
                <span>Chỉ đường</span>
                <NewTabHint />
              </a>
            </div>
          </div>

          {/* Cột phải: bản đồ nhúng */}
          <div className="lg:col-span-8 relative rounded-2xl overflow-hidden shadow-sm border border-outline-variant bg-slate-100 h-64 sm:h-72">
            <iframe
              title="Bản đồ vị trí Mỹ Phát Hospital - 1170 Quang Trung, Chũ, Lục Ngạn"
              src={IFRAME_EMBED_URL}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            />

            {/* Lớp phủ: mở Google Maps */}
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Mở vị trí Mỹ Phát Hospital trên Google Maps (mở trong tab mới)"
              className="absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto sm:max-w-xs z-10 p-2.5 rounded-xl bg-slate-950/85 hover:bg-slate-950/95 backdrop-blur-md text-white border border-white/20 shadow-lg cursor-pointer transition-all flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span aria-hidden="true" className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
                </span>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                    <span>Mỹ Phát Hospital</span>
                    <span aria-hidden="true" className="material-symbols-outlined text-[13px] text-teal-300">verified</span>
                  </p>
                  <p className="text-xs text-slate-300 truncate">1170 Quang Trung, Chũ</p>
                </div>
              </div>
              <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-teal-300 shrink-0">open_in_new</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HospitalMapSection;
