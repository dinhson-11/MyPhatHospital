import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../../services/apiError';

/**
 * Tải dữ liệu bất đồng bộ cho màn hình báo cáo: { status, data, error, reload }.
 *  - status: 'idle' (không được phép / chưa bật) | 'loading' | 'success' | 'error'
 *  - enabled = false → không gọi API (VD: vai trò không có quyền xem)
 *  - key: đổi giá trị (VD: khoảng thời gian) → tải lại
 * Trạng thái được suy ra từ "kết quả này thuộc về lần tải nào", nên kết quả của request cũ
 * (khoảng thời gian trước, đã hủy) không bao giờ hiển thị nhầm.
 */
export function useAsyncData(loader, { enabled = true, key = '' } = {}) {
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState({ forKey: null, data: null, error: null });
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const requestKey = `${key}#${reloadToken}`;

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    Promise.resolve()
      .then(() => loaderRef.current())
      .then(
        (data) => {
          if (!cancelled) setResult({ forKey: requestKey, data, error: null });
        },
        (err) => {
          if (!cancelled) {
            setResult({ forKey: requestKey, data: null, error: getErrorMessage(err, 'Không tải được dữ liệu.') });
          }
        }
      );
    return () => {
      cancelled = true;
    };
  }, [enabled, requestKey]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  let status = 'idle';
  if (enabled) {
    if (result.forKey !== requestKey) status = 'loading';
    else status = result.error ? 'error' : 'success';
  }

  return {
    status,
    data: status === 'success' ? result.data : null,
    error: status === 'error' ? result.error : null,
    reload
  };
}

export default useAsyncData;
