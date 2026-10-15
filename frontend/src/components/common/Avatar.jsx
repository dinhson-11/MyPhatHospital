import React, { useState } from 'react';
import { getInitials } from '../../utils/format';

/**
 * Ảnh đại diện tài khoản: hiện ảnh nếu có link, chưa có ảnh hoặc ảnh tải lỗi → chữ cái đầu tên.
 * alt rỗng = ảnh trang trí (tên đã hiển thị ngay bên cạnh) nên bị ẩn khỏi trình đọc màn hình.
 * className mặc định là .avatar (tròn 36px); truyền thêm utility Tailwind để đổi cỡ / bo góc.
 */
export default function Avatar({ name, src, alt = '', className = 'avatar' }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={alt}
        aria-hidden={alt ? undefined : true}
        className={`${className} object-cover`}
        loading="lazy"
        onError={() => setFailedSrc(src)}
      />
    );
  }
  return (
    <span
      className={className}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      {getInitials(name)}
    </span>
  );
}
