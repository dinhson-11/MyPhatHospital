/**
 * Cỡ chữ do người dùng chọn (giúp người lớn tuổi, người kém mắt). Đặt phần trăm lên font-size của <html>
 * nên mọi cỡ chữ và chiều cao điều khiển dùng rem đều co giãn theo.
 */
export const TEXT_SIZES = [
  { id: 'normal', label: 'Chữ thường', percent: 100 },
  { id: 'large', label: 'Chữ lớn', percent: 115 },
  { id: 'xlarge', label: 'Chữ rất lớn', percent: 130 }
];

export const DEFAULT_TEXT_SIZE = 'normal';
const STORAGE_KEY = 'hms_text_size';

const isValid = (id) => TEXT_SIZES.some((s) => s.id === id);

export function loadTextSize() {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return isValid(id) ? id : DEFAULT_TEXT_SIZE;
  } catch {
    // localStorage có thể bị chặn (chế độ riêng tư) – dùng cỡ mặc định
    return DEFAULT_TEXT_SIZE;
  }
}

export function applyTextSize(id) {
  const size = TEXT_SIZES.find((s) => s.id === id) || TEXT_SIZES[0];
  document.documentElement.style.fontSize = size.percent === 100 ? '' : `${size.percent}%`;
  return size.id;
}

export function saveTextSize(id) {
  const applied = applyTextSize(id);
  try {
    localStorage.setItem(STORAGE_KEY, applied);
  } catch {
    // không lưu được vẫn áp dụng cho phiên hiện tại
  }
  return applied;
}
