/**
 * Chuẩn hóa lỗi từ axios / backend thành thông điệp tiếng Việt cho người dùng.
 * Backend trả lỗi dạng { errorCode, message, details[] } (ApiErrorResponse).
 */

export const NETWORK_ERROR_MESSAGE =
  'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại – dữ liệu CHƯA được lưu.';

export function isNetworkError(err) {
  return Boolean(err) && !err.response && (err.code === 'ECONNABORTED' || err.message === 'Network Error'
    || err.code === 'ERR_NETWORK' || /timeout|network/i.test(err.message || ''));
}

export function getErrorCode(err) {
  return err?.errorCode || err?.response?.data?.errorCode || null;
}

export function getErrorDetails(err) {
  const details = err?.details || err?.response?.data?.details;
  return Array.isArray(details) ? details : [];
}

export function getErrorMessage(err, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại.') {
  if (!err) return fallback;
  if (isNetworkError(err)) return NETWORK_ERROR_MESSAGE;
  const status = err.response?.status;
  const data = err.response?.data;
  const details = getErrorDetails(err);
  if (data?.message) {
    return details.length && data.errorCode === 'VALIDATION_ERROR' ? details.join('; ') : data.message;
  }
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (status === 401) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.';
  if (status === 404) return 'Không tìm thấy dữ liệu yêu cầu.';
  if (status === 409) return 'Dữ liệu vừa được người khác cập nhật. Vui lòng tải lại và thử lại.';
  if (status >= 500) return 'Máy chủ đang gặp sự cố, vui lòng thử lại sau.';
  return err.message && !/^Request failed/.test(err.message) ? err.message : fallback;
}

/**
 * Bọc lỗi axios thành Error mang theo errorCode / details để giao diện xử lý tiếp
 * (VD: PRESCRIPTION_SAFETY_BLOCK cần mở hộp thoại xác nhận lý do kê đơn).
 */
export function toAppError(err, fallback) {
  const appErr = new Error(getErrorMessage(err, fallback));
  appErr.errorCode = getErrorCode(err);
  appErr.details = getErrorDetails(err);
  appErr.status = err?.response?.status ?? null;
  appErr.isNetworkError = isNetworkError(err);
  appErr.cause = err;
  return appErr;
}
