import React, { useState } from 'react';
import Modal from '../common/Modal';
import { HOURS_TEXT } from '../../services/hospitalHours';

const HOTLINE_TEL = 'tel:0789065493';
const HOTLINE_TEXT = '0789 065 493';
const ADDRESS = '1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang';
const MAPS_URL = 'https://maps.app.goo.gl/2vAWcXFcfgSGPS7H6';
const EMAIL = 'myphathospital@gmail.com';
const FACEBOOK_URL = 'https://www.facebook.com/MyPhatHospital';

const EMPTY_FORM = { name: '', phone: '', message: '' };

/** Tạo liên kết mailto để mở ứng dụng email của người dùng với nội dung đã soạn sẵn. */
function buildContactMailto(form) {
  const subject = `Liên hệ từ website – ${form.name.trim()}`;
  const body = [
    `Họ tên: ${form.name.trim()}`,
    `Số điện thoại: ${form.phone.trim()}`,
    '',
    form.message.trim()
  ].join('\n');
  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function ExternalHint() {
  return (
    <>
      <span className="material-symbols-outlined text-sm" aria-hidden="true">open_in_new</span>
      <span className="sr-only">(mở trong thẻ mới)</span>
    </>
  );
}

function ContactItem({ icon, label, children }) {
  return (
    <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
      <span className="material-symbols-outlined text-primary text-xl shrink-0" aria-hidden="true">{icon}</span>
      <div className="min-w-0 text-sm text-slate-700">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        {children}
      </div>
    </li>
  );
}

export default function ContactModal({ isOpen, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setOpened(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      setError('Vui lòng điền họ tên, số điện thoại và nội dung cần hỗ trợ.');
      return;
    }
    setError('');
    // Không có máy chủ nhận tin nhắn: mở ứng dụng email của người dùng với nội dung đã soạn sẵn
    window.location.href = buildContactMailto(form);
    setOpened(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon="contact_support"
      title="Liên Hệ & Hỗ Trợ"
      subtitle="Mỹ Phát Hospital luôn sẵn sàng lắng nghe và đồng hành"
      closeOnBackdrop
      bodyClassName="px-5 py-5 sm:px-6 overflow-y-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Thông tin liên hệ */}
        <section aria-labelledby="contact-info-title" className="space-y-3">
          <h3 id="contact-info-title" className="font-bold text-slate-900 text-sm">Thông tin liên hệ</h3>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <span className="material-symbols-outlined text-red-700 text-2xl shrink-0" aria-hidden="true">emergency</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-900">Hotline cấp cứu & tư vấn 24/7</p>
              <a href={HOTLINE_TEL} className="text-xl font-extrabold text-red-700 hover:underline">
                {HOTLINE_TEXT}
              </a>
              <p className="text-xs text-red-800 mt-0.5">
                Tiếp nhận cấp cứu 24/24; hỗ trợ đặt lịch, BHYT, bảng giá và lịch trực bác sĩ.
              </p>
            </div>
          </div>

          <ul className="space-y-3">
            <ContactItem icon="location_on" label="Địa chỉ">
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                {ADDRESS}
                <ExternalHint />
              </a>
            </ContactItem>

            <ContactItem icon="schedule" label={`Giờ khám bệnh (${HOURS_TEXT.days})`}>
              <span className="block text-xs">{HOURS_TEXT.summer}</span>
              <span className="block text-xs">{HOURS_TEXT.winter}</span>
              <span className="block text-xs">{HOURS_TEXT.bhyt}</span>
              <span className="block text-xs font-semibold text-red-700">{HOURS_TEXT.emergency}</span>
            </ContactItem>

            <ContactItem icon="mail" label="Email">
              <a href={`mailto:${EMAIL}`} className="font-medium text-primary hover:underline break-all">
                {EMAIL}
              </a>
            </ContactItem>

            <ContactItem icon="thumb_up" label="Fanpage Facebook chính thức">
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                facebook.com/MyPhatHospital
                <ExternalHint />
              </a>
            </ContactItem>
          </ul>
        </section>

        {/* Soạn email gửi bệnh viện */}
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-labelledby="contact-form-title"
          className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200 self-start"
        >
          <div>
            <h3 id="contact-form-title" className="font-bold text-slate-900 text-sm">Gửi câu hỏi / góp ý qua email</h3>
            <p className="text-xs text-slate-500 mt-1">
              Nội dung sẽ được mở trong ứng dụng email của bạn để gửi tới <strong>{EMAIL}</strong>.
              Cần hỗ trợ gấp, vui lòng gọi hotline <a href={HOTLINE_TEL} className="font-semibold text-primary hover:underline">{HOTLINE_TEXT}</a>.
            </p>
          </div>

          {error && (
            <div role="alert" className="alert alert-error">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="contact-name" className="form-label">
              Họ tên<span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="contact-name"
              type="text"
              required
              autoComplete="name"
              value={form.name}
              onChange={update('name')}
              placeholder="Nguyễn Văn A"
              className="input"
            />
          </div>

          <div className="form-field">
            <label htmlFor="contact-phone" className="form-label">
              Số điện thoại<span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="contact-phone"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              value={form.phone}
              onChange={update('phone')}
              placeholder="0912 345 678"
              className="input"
            />
          </div>

          <div className="form-field">
            <label htmlFor="contact-message" className="form-label">
              Nội dung cần hỗ trợ / góp ý<span className="required" aria-hidden="true">*</span>
            </label>
            <textarea
              id="contact-message"
              rows={4}
              required
              value={form.message}
              onChange={update('message')}
              placeholder="Nhập nội dung cần hỗ trợ..."
              className="textarea"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            <span className="material-symbols-outlined" aria-hidden="true">forward_to_inbox</span>
            Mở ứng dụng email để gửi
          </button>

          {opened && (
            <div role="status" className="alert alert-info">
              <span className="material-symbols-outlined" aria-hidden="true">info</span>
              <span>
                Đã mở ứng dụng email với nội dung soạn sẵn. Hãy bấm <strong>Gửi</strong> trong ứng dụng email để hoàn tất.
                Nếu không thấy ứng dụng email mở ra, vui lòng gửi trực tiếp tới {EMAIL} hoặc gọi {HOTLINE_TEXT}.
              </span>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
}
