import React from 'react';
import Modal from '../common/Modal';
import bannerImg from '../../assets/myphat_banner.jpg';
import awardImg from '../../assets/myphat_president_award.jpg';
import { HOURS_TEXT } from '../../services/hospitalHours';

const HOTLINE_TEL = 'tel:0789065493';
const HOTLINE_TEXT = '0789 065 493';
const ADDRESS = '1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang';
const EMAIL = 'myphathospital@gmail.com';
const FACEBOOK_URL = 'https://www.facebook.com/MyPhatHospital';

function InfoRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-primary text-xl shrink-0" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <div className="text-sm text-slate-800">{children}</div>
      </div>
    </div>
  );
}

export default function AboutModal({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon="local_hospital"
      title="Về Mỹ Phát Hospital"
      subtitle={`${ADDRESS} • Hotline: ${HOTLINE_TEXT}`}
      closeOnBackdrop
      bodyClassName="px-5 py-5 sm:px-6 overflow-y-auto space-y-6 text-slate-600 text-sm leading-relaxed"
    >
      {/* Ảnh bìa */}
      <figure className="rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-950">
        <img
          src={bannerImg}
          alt="Ảnh bìa Mỹ Phát Hospital"
          className="w-full h-44 sm:h-52 object-contain"
          onError={(e) => {
            e.currentTarget.src = '/myphat_banner.jpg';
          }}
        />
        <figcaption className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex flex-col justify-end p-4 text-white">
          <span className="font-headline text-lg sm:text-xl font-extrabold tracking-wide">MỸ PHÁT HOSPITAL</span>
          <span className="text-xs sm:text-sm text-teal-200 font-semibold tracking-wide">
            SÁNG Y ĐỨC – VỮNG CHUYÊN MÔN – VUÔNG TRÒN HẠNH PHÚC
          </span>
        </figcaption>
      </figure>

      {/* Ghi nhận – bằng khen */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden shrink-0 border-2 border-amber-300 bg-slate-950 flex items-center justify-center p-0.5">
          <img
            src={awardImg}
            alt="Ban lãnh đạo Mỹ Phát Hospital nhận bằng khen từ Nguyên Chủ tịch nước Trương Tấn Sang"
            className="w-full h-full object-contain rounded-lg"
            onError={(e) => {
              e.currentTarget.src = '/myphat_president_award.jpg';
            }}
          />
        </div>
        <div className="space-y-1.5 text-center sm:text-left">
          <span className="badge bg-amber-100 text-amber-900">
            <span className="material-symbols-outlined text-base text-amber-700" aria-hidden="true">military_tech</span>
            Nguyên Chủ tịch nước trao bằng khen
          </span>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">Bằng Khen Vì Sức Khỏe Nhân Dân</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Ban lãnh đạo Mỹ Phát Hospital vinh dự được Nguyên Chủ tịch nước Trương Tấn Sang trao bằng khen – dấu mốc
            khẳng định tinh thần phụng sự và chất lượng khám chữa bệnh uy tín qua nhiều năm hoạt động.
          </p>
        </div>
      </div>

      <section aria-labelledby="about-mission">
        <h3 id="about-mission" className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">history_edu</span>
          Sứ Mệnh & Giá Trị Cốt Lõi
        </h3>
        <p>
          Mỹ Phát Hospital tọa lạc tại <strong>{ADDRESS}</strong>. Chúng tôi tự hào là điểm tựa y tế tin cậy cho bà con
          nhân dân huyện Lục Ngạn và các khu vực lân cận.
        </p>
        <p className="mt-2">
          Lấy kim chỉ nam <strong>&ldquo;Sáng Y Đức – Vững Chuyên Môn – Vuông Tròn Hạnh Phúc&rdquo;</strong>, Mỹ Phát Hospital
          không ngừng đầu tư trang thiết bị, liên kết chuyên môn cùng các chuyên gia đầu ngành và đẩy mạnh chuyển đổi
          số trong khám chữa bệnh.
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100">
          <span className="material-symbols-outlined text-teal-700 text-2xl mb-1" aria-hidden="true">verified_user</span>
          <h3 className="font-bold text-slate-900 text-sm mb-1">Tận Tâm & An Toàn Người Bệnh</h3>
          <p className="text-xs text-slate-600">
            Tuân thủ quy trình kiểm soát nhiễm khuẩn nghiêm ngặt, quy chế chuyên môn của Bộ Y tế, bảo đảm quyền lợi tối đa
            cho bệnh nhân BHYT và dịch vụ.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-primary-fixed border border-primary-fixed-dim">
          <span className="material-symbols-outlined text-primary text-2xl mb-1" aria-hidden="true">biotech</span>
          <h3 className="font-bold text-slate-900 text-sm mb-1">Cận Lâm Sàng Hiện Đại</h3>
          <p className="text-xs text-slate-600">
            Hệ thống X-quang kỹ thuật số, siêu âm màu Doppler 4D, nội soi tiêu hóa phóng đại NBI, máy xét nghiệm tự động
            hóa trả kết quả nhanh chóng, chính xác.
          </p>
        </div>
      </div>

      <section aria-labelledby="about-contact">
        <h3 id="about-contact" className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">corporate_fare</span>
          Thông Tin Liên Hệ & Tiếp Nhận
        </h3>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon="location_on" label="Địa chỉ">{ADDRESS}</InfoRow>
          <InfoRow icon="call" label="Hotline cấp cứu & tư vấn (24/7)">
            <a href={HOTLINE_TEL} className="font-bold text-red-700 hover:underline">{HOTLINE_TEXT}</a>
          </InfoRow>
          <InfoRow icon="mail" label="Email">
            <a href={`mailto:${EMAIL}`} className="font-medium text-primary hover:underline break-all">{EMAIL}</a>
          </InfoRow>
          <InfoRow icon="thumb_up" label="Fanpage Facebook">
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              facebook.com/MyPhatHospital
              <span className="material-symbols-outlined text-sm" aria-hidden="true">open_in_new</span>
              <span className="sr-only">(mở trong thẻ mới)</span>
            </a>
          </InfoRow>
          <div className="sm:col-span-2">
            <InfoRow icon="schedule" label={`Thời gian làm việc (${HOURS_TEXT.days})`}>
              <ul className="list-disc pl-5 space-y-0.5 text-xs text-slate-700 mt-1">
                <li>{HOURS_TEXT.summer}</li>
                <li>{HOURS_TEXT.winter}</li>
                <li>{HOURS_TEXT.bhyt}</li>
                <li className="font-semibold text-red-700">{HOURS_TEXT.emergency}</li>
              </ul>
            </InfoRow>
          </div>
        </div>
      </section>
    </Modal>
  );
}
