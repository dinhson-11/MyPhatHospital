import React, { useState } from 'react';
import Avatar from './Avatar';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Đổi / gỡ ảnh đại diện. Ảnh được lưu ngay khi chọn (máy chủ kiểm tra lại định dạng và dung lượng).
 *  - onUpload(file) → Promise<link ảnh mới>
 *  - onRemove() → Promise
 *  - children: nội dung hiển thị cạnh ảnh (VD: họ tên, vai trò)
 */
export default function AvatarUploader({
  name,
  avatarUrl,
  onUpload,
  onRemove,
  children,
  avatarClassName = 'avatar w-20 h-20 rounded-2xl text-2xl'
}) {
  const [current, setCurrent] = useState(avatarUrl || null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const choose = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Ảnh vượt quá dung lượng cho phép (tối đa 5MB).');
      return;
    }
    setBusy('upload');
    setError('');
    try {
      setCurrent((await onUpload(file)) || null);
    } catch (err) {
      setError(err.message || 'Không đổi được ảnh đại diện.');
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    setBusy('remove');
    setError('');
    try {
      await onRemove();
      setCurrent(null);
    } catch (err) {
      setError(err.message || 'Không gỡ được ảnh đại diện.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span className="relative shrink-0">
        <Avatar name={name} src={current} className={avatarClassName} />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70" aria-hidden="true">
            <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
          </span>
        )}
      </span>
      <div className="min-w-0 space-y-1.5">
        {children}
        <div className="flex flex-wrap gap-2">
          <label className={`btn btn-light btn-sm ${busy ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}>
            <span className="material-symbols-outlined" aria-hidden="true">photo_camera</span>
            {busy === 'upload' ? 'Đang tải ảnh…' : current ? 'Đổi ảnh' : 'Tải ảnh lên'}
            <input
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              aria-label="Chọn ảnh đại diện"
              className="sr-only"
              onChange={choose}
              disabled={Boolean(busy)}
            />
          </label>
          {current && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={remove} disabled={Boolean(busy)}>
              {busy === 'remove' ? 'Đang gỡ…' : 'Gỡ ảnh'}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">JPG, PNG hoặc WebP, tối đa 5MB. Ảnh được cắt vuông theo khuôn mặt.</p>
        {error && <p role="alert" className="form-error">{error}</p>}
      </div>
    </div>
  );
}
