import React from 'react';

/**
 * Khung bảng cuộn ngang. Khung cuộn được phải focus được bằng Tab (WCAG 2.1.1) thì người dùng bàn phím
 * mới cuộn tới các cột bị che ở màn nhỏ hoặc chữ lớn; `label` đặt tên cho vùng để trình đọc màn hình báo đúng.
 */
export default function TableWrap({ label, className = '', children }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className={`table-wrap ${className}`.trim()}>
      {children}
    </div>
  );
}
