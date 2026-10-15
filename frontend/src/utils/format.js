/**
 * Định dạng hiển thị dùng chung (tiền tệ, ngày giờ, nhãn trạng thái tiếng Việt).
 * Mọi màn hình nên dùng các hàm này thay vì tự gọi toLocaleString để thống nhất cách hiển thị.
 */

const vndFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/** 1234000 → "1.234.000 đ". Giá trị rỗng / không hợp lệ → "—". */
export function formatVND(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${vndFormatter.format(Math.round(n))} đ`;
}

/** 1234000 → "1.234.000" (không kèm đơn vị, dùng cho ô nhập tiền). */
export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? vndFormatter.format(Math.round(n)) : '';
}

/** "1.234.000" / "1234000" → 1234000; chuỗi rỗng → null. */
export function parseNumber(text) {
  if (text === null || text === undefined) return null;
  const digits = String(text).replace(/[^\d]/g, '');
  return digits === '' ? null : Number(digits);
}

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n) => String(n).padStart(2, '0');

/** "Vi Mai Anh" → "MA" (2 chữ cái cuối của họ tên, như cách gọi tên người Việt) – dùng cho ảnh đại diện. */
export function getInitials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}

/** "2026-10-10" → "10/10/2026". */
export function formatDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = toDate(value);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '—';
}

/** "2026-10-10T08:30:00" → "08:30 10/10/2026". */
export function formatDateTime(value) {
  const d = toDate(value);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())} ${formatDate(d)}` : '—';
}

/** Ngày hôm nay theo giờ máy (không phải UTC) dạng yyyy-MM-dd – dùng cho min của input date. */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const GENDER_LABELS = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };
export const formatGender = (g) => GENDER_LABELS[g] || 'Chưa rõ';

export const PAYMENT_METHOD_LABELS = {
  CASH: 'Tiền mặt',
  VIETQR: 'VietQR',
  BANK_TRANSFER: 'Chuyển khoản',
  CARD: 'Thẻ ngân hàng (POS)'
};

export const INVOICE_STATUS_LABELS = {
  PENDING: 'Chờ thu',
  PAID: 'Đã thu',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền'
};

export const APPOINTMENT_STATUS_LABELS = {
  BOOKED: 'Đã đặt – chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Đã khám xong',
  CANCELLED: 'Đã hủy',
  NO_SHOW: 'Không đến khám'
};

export const VISIT_STATUS_LABELS = {
  IN_PROGRESS: 'Đang khám',
  COMPLETED: 'Đã hoàn tất'
};

/** Mức độ cảnh báo (tương tác thuốc / dị ứng) – gộp cả 2 bộ từ vựng của backend và AI service. */
export const SEVERITY_LABELS = {
  CRITICAL: 'Nghiêm trọng',
  SEVERE: 'Nghiêm trọng',
  WARNING: 'Cần thận trọng',
  MODERATE: 'Trung bình',
  INFO: 'Tham khảo',
  MILD: 'Nhẹ'
};

/** Chuẩn hóa mức độ về 3 bậc hiển thị: 'critical' | 'warning' | 'info'. */
export function severityLevel(severity) {
  const s = String(severity || '').toUpperCase();
  if (s === 'CRITICAL' || s === 'SEVERE') return 'critical';
  if (s === 'WARNING' || s === 'MODERATE') return 'warning';
  return 'info';
}

export const labelOf = (map, key, fallback = '—') => (key && map[key]) || fallback;

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const SCALES = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

function readTriple(n, isLeading) {
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const units = n % 10;
  const words = [];

  if (hundreds > 0 || !isLeading) {
    words.push(DIGITS[hundreds], 'trăm');
  }
  if (tens === 0) {
    if (units > 0 && (hundreds > 0 || !isLeading)) words.push('linh');
  } else if (tens === 1) {
    words.push('mười');
  } else {
    words.push(DIGITS[tens], 'mươi');
  }
  if (units > 0) {
    if (units === 1 && tens >= 2) words.push('mốt');
    else if (units === 4 && tens >= 2) words.push('tư');
    else if (units === 5 && tens >= 1) words.push('lăm');
    else words.push(DIGITS[units]);
  }
  return words.join(' ');
}

/** 136000 → "Một trăm ba mươi sáu nghìn đồng" – dùng cho dòng "Số tiền bằng chữ" trên phiếu thu. */
export function amountInWords(value) {
  let n = Math.round(Math.abs(Number(value) || 0));
  if (n === 0) return 'Không đồng';
  const groups = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const parts = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    if (groups[i] === 0) continue;
    const text = readTriple(groups[i], i === groups.length - 1);
    parts.push(SCALES[i] ? `${text} ${SCALES[i]}` : text);
  }
  const sentence = `${parts.join(' ')} đồng`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
