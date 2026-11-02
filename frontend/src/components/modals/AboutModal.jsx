import React from 'react';
import Modal from '../common/Modal';
import frontageImg from '../../assets/mat-tien-my-phat.jpg';
import awardImg from '../../assets/myphat_president_award.jpg';
import { HOURS_TEXT } from '../../services/hospitalHours';

const HOTLINE_TEL = 'tel:0386959342';
const HOTLINE_TEXT = '0386 959 342';
const ADDRESS = '1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang';
const EMAIL = 'myphathospital@gmail.com';
const FACEBOOK_URL = 'https://www.facebook.com/MyPhatHospital';

function InfoRow({ label, children }) {
  return (
    <div className="py-3 border-b border-slate-200 last:border-b-0">
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="text-sm text-slate-900 mt-0.5">{children}</dd>
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
      bodyClassName="px-5 py-5 sm:px-6 overflow-y-auto space-y-6 text-slate-700 text-sm leading-relaxed"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[14rem_1fr] gap-5 items-start">
        <figure className="max-w-[14rem]">
          <img
            src={frontageImg}
            alt="Mặt tiền Phòng khám đa khoa Mỹ Phát tại 1170 Quang Trung, thị trấn Chũ"
            className="w-full h-auto border border-slate-300"
            width="389"
            height="573"
          />
          <figcaption className="text-xs text-slate-600 mt-1.5">Mặt tiền Mỹ Phát Hospital, 1170 Quang Trung, thị trấn Chũ.</figcaption>
        </figure>

        <section aria-labelledby="about-intro">
          <h3 id="about-intro" className="text-base font-semibold text-slate-900 mb-2">Giới thiệu</h3>
          <p>
            Phòng khám đa khoa Mỹ Phát (Công ty TNHH Bệnh viện Mỹ Phát) tọa lạc tại <strong>{ADDRESS}</strong>, phục vụ người
            dân huyện Lục Ngạn và các khu vực lân cận.
          </p>
          <p className="mt-2">
            Khẩu hiệu của phòng khám: <strong>&ldquo;Sáng y đức – Vững chuyên môn – Vuông tròn hạnh phúc&rdquo;</strong>.
          </p>
        </section>
      </div>

      <figure className="flex flex-col sm:flex-row gap-4 items-start border-t border-slate-200 pt-6">
        <img
          src={awardImg}
          alt="Ban lãnh đạo Mỹ Phát Hospital nhận bằng khen từ Nguyên Chủ tịch nước Trương Tấn Sang"
          className="w-40 h-auto border border-slate-300 shrink-0"
        />
        <figcaption>
          <p className="font-semibold text-slate-900">Bằng khen Vì sức khỏe nhân dân</p>
          <p className="mt-1 text-slate-700">
            Ban lãnh đạo Mỹ Phát Hospital được Nguyên Chủ tịch nước Trương Tấn Sang trao bằng khen.
          </p>
        </figcaption>
      </figure>

      <section aria-labelledby="about-contact" className="border-t border-slate-200 pt-6">
        <h3 id="about-contact" className="text-base font-semibold text-slate-900 mb-1">Liên hệ và giờ làm việc</h3>
        <dl>
          <InfoRow label="Địa chỉ">{ADDRESS}</InfoRow>
          <InfoRow label="Hotline cấp cứu và tư vấn (24/7)">
            <a href={HOTLINE_TEL} className="font-semibold underline underline-offset-2">{HOTLINE_TEXT}</a>
          </InfoRow>
          <InfoRow label="Email">
            <a href={`mailto:${EMAIL}`} className="text-primary underline underline-offset-2 break-all">{EMAIL}</a>
          </InfoRow>
          <InfoRow label="Fanpage Facebook">
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              facebook.com/MyPhatHospital
              <span className="sr-only"> (mở trong thẻ mới)</span>
            </a>
          </InfoRow>
          <InfoRow label={`Thời gian làm việc (${HOURS_TEXT.days})`}>
            <ul className="space-y-0.5">
              <li>{HOURS_TEXT.summer}</li>
              <li>{HOURS_TEXT.winter}</li>
              <li>{HOURS_TEXT.bhyt}</li>
              <li>{HOURS_TEXT.emergency}</li>
            </ul>
          </InfoRow>
        </dl>
      </section>
    </Modal>
  );
}
