import React, { useState } from 'react';
import { useToast } from '../../context/useToast';
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
    <section id="hospital-map" className="bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div aria-hidden="true" className="h-1 w-10 bg-primary mb-3" />
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-6">
          <h2 className="text-3xl font-semibold text-slate-900">Giờ khám và liên hệ</h2>
          <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="link-btn">
            Mở Google Maps
            <NewTabHint />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <dl className="lg:col-span-5 border-t border-slate-300">
            <div className="py-3 border-b border-slate-300">
              <dt className="text-sm text-slate-600">Địa chỉ</dt>
              <dd className="text-slate-900">1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang</dd>
              <dd className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <button type="button" onClick={handleCopyAddress} className="link-btn" title="Sao chép địa chỉ bệnh viện">
                  <span aria-live="polite">{copied ? 'Đã sao chép' : 'Chép địa chỉ'}</span>
                </button>
                <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="link-btn">
                  Chỉ đường
                  <NewTabHint />
                </a>
              </dd>
            </div>

            <div className="py-3 border-b border-slate-300">
              <dt className="text-sm text-slate-600">Hotline tư vấn và cấp cứu (trực 24/7)</dt>
              <dd>
                <a href="tel:0386959342" className="font-semibold text-slate-900 underline underline-offset-2">
                  0386 959 342
                </a>
              </dd>
            </div>

            <div className="py-3 border-b border-slate-300">
              <dt className="text-sm text-slate-600">Giờ khám bệnh</dt>
              <dd className="text-slate-900">{HOURS_TEXT.days}</dd>
              <dd className="text-sm text-slate-700 mt-1">{HOURS_TEXT.summer}</dd>
              <dd className="text-sm text-slate-700">{HOURS_TEXT.winter}</dd>
              <dd className="text-sm text-slate-700">{HOURS_TEXT.bhyt}</dd>
              <dd className="text-sm text-slate-700">{HOURS_TEXT.emergency}</dd>
            </div>
          </dl>

          <div className="lg:col-span-7">
            <div className="border border-slate-300 bg-slate-100 h-72 sm:h-80">
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
            </div>
            <p className="mt-2 text-sm">
              <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="link-btn">
                Xem bản đồ lớn hơn trên Google Maps
                <NewTabHint />
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HospitalMapSection;
