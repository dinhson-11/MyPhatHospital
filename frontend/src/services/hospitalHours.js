/**
 * Giờ làm việc của Mỹ Phát Hospital – nguồn dữ liệu duy nhất cho frontend
 * (backend: com.hospital.hmsai.common.WorkingHours, AI service: services/hospital_catalog.py).
 *
 * - Khám bệnh: Thứ 2 – Chủ nhật
 *   • Mùa hè (01/04 – 31/10): sáng 07:00 – 11:00, chiều 13:00 – 17:30
 *   • Mùa đông (01/11 – 31/03): lùi 30 phút: sáng 07:30 – 11:30, chiều 13:30 – 18:00
 * - Khám BHYT: Thứ 2 – Thứ 7
 * - Cấp cứu và điều trị: hoạt động liên tục 24/24, kể cả ngày lễ
 */

export const SLOT_MINUTES = 30;

const SUMMER = { morning: ['07:00', '11:00'], afternoon: ['13:00', '17:30'] };
const WINTER = { morning: ['07:30', '11:30'], afternoon: ['13:30', '18:00'] };

export const isSummer = (date = new Date()) => {
  const month = date.getMonth() + 1;
  return month >= 4 && month <= 10;
};

export const getWorkingHours = (date = new Date()) => (isSummer(date) ? SUMMER : WINTER);

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Danh sách khung khám 30 phút ('07:00 - 07:30', ...) theo mùa của ngày được chọn. */
export const getTimeSlots = (date = new Date()) => {
  const hours = getWorkingHours(date);
  const slots = [];
  [hours.morning, hours.afternoon].forEach(([from, to]) => {
    for (let t = toMinutes(from); t < toMinutes(to); t += SLOT_MINUTES) {
      slots.push(`${toHHMM(t)} - ${toHHMM(t + SLOT_MINUTES)}`);
    }
  });
  return slots;
};

/** Nhận chuỗi 'YYYY-MM-DD' (hoặc Date) và trả về Date theo giờ địa phương. */
export const parseLocalDate = (value) => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
};

/** '07:00 - 11:00, 13:00 - 17:30' theo mùa hiện tại – dùng cho thẻ bác sĩ. */
export const hoursCompact = (date = new Date()) => {
  const { morning, afternoon } = getWorkingHours(date);
  return `${morning[0]} - ${morning[1]}, ${afternoon[0]} - ${afternoon[1]}`;
};

export const HOURS_TEXT = {
  summer: 'Mùa hè (01/04 – 31/10): sáng 07:00 – 11:00, chiều 13:00 – 17:30',
  winter: 'Mùa đông (01/11 – 31/03, lùi 30 phút): sáng 07:30 – 11:30, chiều 13:30 – 18:00',
  days: 'Thứ 2 – Chủ nhật',
  bhyt: 'Khám BHYT: Thứ 2 – Thứ 7',
  emergency: 'Cấp cứu & điều trị: 24/24, kể cả ngày lễ'
};
