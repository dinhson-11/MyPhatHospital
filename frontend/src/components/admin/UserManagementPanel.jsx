import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import AvatarUploader from '../common/AvatarUploader';
import { useConfirm } from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DEPARTMENTS } from '../../services/dataService';
import { getErrorMessage } from '../../services/apiError';
import { ROLE_OPTIONS, roleLabel, userService } from '../../services/userService';
import { formatDateTime } from '../../utils/format';

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  username: '', password: '', fullName: '', email: '', phone: '',
  roleCodes: [], departmentId: '', specialty: '', licenseNo: '', status: 'ACTIVE'
};

const isStaffRole = (code) => ROLE_OPTIONS.find((r) => r.code === code)?.staff === true;

/** Hồ sơ nhân viên chỉ cần khi tài khoản có vai trò nhân viên y tế (không áp dụng cho Quản trị viên, Bệnh nhân). */
const needsStaffProfile = (roleCodes) => roleCodes.some(isStaffRole);

function toForm(user) {
  return {
    username: user.username || '',
    password: '',
    fullName: user.fullName || '',
    email: user.email || '',
    phone: user.phone || '',
    roleCodes: (user.roles || []).map((r) => String(r).replace(/^ROLE_/, '')),
    departmentId: '',
    specialty: user.staffProfile?.specialty || '',
    licenseNo: user.staffProfile?.licenseNo || '',
    status: user.status || 'ACTIVE'
  };
}

function toPayload(form, isEdit) {
  const payload = {
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    roleCodes: form.roleCodes
  };
  if (needsStaffProfile(form.roleCodes)) {
    payload.staffProfile = {
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      specialty: form.specialty.trim() || null,
      licenseNo: form.licenseNo.trim() || null
    };
  }
  if (!isEdit) {
    payload.username = form.username.trim();
    payload.password = form.password;
    // Email trống: không gửi để tránh vi phạm ràng buộc email duy nhất với chuỗi rỗng
    if (!payload.email) delete payload.email;
  }
  return payload;
}

/** Kiểm tra phía giao diện (máy chủ vẫn kiểm tra lại). Trả về thông báo lỗi hoặc ''. */
export function validateUserForm(form, isEdit) {
  if (!isEdit) {
    if (form.username.trim().length < 3) return 'Tên đăng nhập phải từ 3 ký tự.';
    if (form.password.length < 8 || !/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) {
      return 'Mật khẩu phải từ 8 ký tự, gồm chữ hoa, chữ thường và chữ số.';
    }
  }
  if (!form.fullName.trim()) return 'Vui lòng nhập họ và tên.';
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Email không hợp lệ.';
  if (form.phone.trim() && !/^0[0-9]{9,10}$/.test(form.phone.trim())) return 'Số điện thoại phải bắt đầu bằng 0 và có 10–11 chữ số.';
  if (form.roleCodes.length === 0) return 'Phải chọn ít nhất một vai trò.';
  return '';
}

function UserFormDialog({ isOpen, user, onClose, onSaved, onAvatarChanged }) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(user ? toForm(user) : EMPTY_FORM);
      setError('');
      setSaving(false);
    }
  }, [isOpen, user]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const toggleRole = (code) => setForm((f) => ({
    ...f,
    roleCodes: f.roleCodes.includes(code) ? f.roleCodes.filter((c) => c !== code) : [...f.roleCodes, code]
  }));

  const submit = async (e) => {
    e.preventDefault();
    const problem = validateUserForm(form, isEdit);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = isEdit
        ? await userService.updateUser(user.id, toPayload(form, true))
        : await userService.createUser(toPayload(form, false));
      onSaved(saved, isEdit);
    } catch (err) {
      setError(getErrorMessage(err, 'Không lưu được tài khoản. Vui lòng thử lại.'));
      setSaving(false);
    }
  };

  const showStaff = needsStaffProfile(form.roleCodes);

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      size="lg"
      icon={isEdit ? 'manage_accounts' : 'person_add'}
      title={isEdit ? `Sửa tài khoản ${user.username}` : 'Thêm tài khoản'}
      subtitle={isEdit ? 'Không đổi được tên đăng nhập và mật khẩu ở đây' : 'Tài khoản nhân viên do quản trị viên cấp'}
    >
      {isEdit && (
        <section aria-label="Ảnh đại diện" className="mb-4 p-3 rounded-xl border border-slate-200 bg-slate-50/60">
          <AvatarUploader
            key={user.id}
            name={user.fullName || user.username}
            avatarUrl={user.avatarUrl}
            avatarClassName="avatar w-16 h-16 rounded-2xl text-xl"
            onUpload={async (file) => {
              const avatarUrl = await userService.uploadUserAvatar(user.id, file);
              onAvatarChanged?.(user, avatarUrl);
              return avatarUrl;
            }}
            onRemove={async () => {
              await userService.removeUserAvatar(user.id);
              onAvatarChanged?.(user, null);
            }}
          >
            <p className="text-sm font-semibold text-slate-800">Ảnh đại diện</p>
            <p className="text-xs text-slate-500">Lưu ngay khi chọn ảnh, không cần bấm Lưu bên dưới.</p>
          </AvatarUploader>
        </section>
      )}
      <form onSubmit={submit} noValidate className="space-y-3.5" aria-label={isEdit ? 'Sửa tài khoản' : 'Thêm tài khoản'}>
        {error && (
          <div role="alert" className="alert alert-error">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <span>{error}</span>
          </div>
        )}

        {!isEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-field">
              <label htmlFor="um-username" className="form-label">Tên đăng nhập<span className="required" aria-hidden="true">*</span></label>
              <input id="um-username" className="input" autoComplete="off" value={form.username} onChange={update('username')} placeholder="vd: bs.nguyenan" />
            </div>
            <div className="form-field">
              <label htmlFor="um-password" className="form-label">Mật khẩu<span className="required" aria-hidden="true">*</span></label>
              <input id="um-password" type="password" className="input" autoComplete="new-password" value={form.password} onChange={update('password')} placeholder="Tối thiểu 8 ký tự" />
            </div>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="um-fullname" className="form-label">Họ và tên<span className="required" aria-hidden="true">*</span></label>
          <input id="um-fullname" className="input" value={form.fullName} onChange={update('fullName')} placeholder="Nguyễn Văn An" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="form-field">
            <label htmlFor="um-email" className="form-label">Email</label>
            <input id="um-email" type="email" className="input" value={form.email} onChange={update('email')} placeholder="ten@benhvien.vn" />
          </div>
          <div className="form-field">
            <label htmlFor="um-phone" className="form-label">Số điện thoại</label>
            <input id="um-phone" type="tel" className="input" value={form.phone} onChange={update('phone')} placeholder="0912345678" />
          </div>
        </div>

        <fieldset className="form-field">
          <legend className="form-label">Vai trò<span className="required" aria-hidden="true">*</span></legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ROLE_OPTIONS.map((r) => (
              <label key={r.code} className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.roleCodes.includes(r.code)}
                  onChange={() => toggleRole(r.code)}
                />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>

        {showStaff && (
          <fieldset className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <legend className="px-1 text-xs font-bold text-slate-700">Hồ sơ nhân viên y tế</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-field">
                <label htmlFor="um-dept" className="form-label">Khoa / bộ phận</label>
                <select id="um-dept" className="select" value={form.departmentId} onChange={update('departmentId')}>
                  <option value="">{isEdit ? 'Giữ nguyên' : 'Chưa gán'}</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>{d.shortName || d.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="um-license" className="form-label">Số chứng chỉ hành nghề</label>
                <input id="um-license" className="input" value={form.licenseNo} onChange={update('licenseNo')} placeholder="CCHN-000000-BYT" />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="um-specialty" className="form-label">Chuyên môn</label>
              <input id="um-specialty" className="input" value={form.specialty} onChange={update('specialty')} placeholder="Nội tổng quát" />
            </div>
          </fieldset>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-light" onClick={onClose} disabled={saving}>Hủy</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Tab "Tài khoản" của Bảng điều khiển quản trị: tìm kiếm, phân trang, thêm, sửa, khóa/mở khóa.
 * Quản trị viên không tự khóa được tài khoản của chính mình (tránh bị mất quyền quản trị).
 */
export default function UserManagementPanel() {
  const { user: me, updateUser } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState({ open: false, user: null });

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    userService.getUsers({ page, size: PAGE_SIZE, search: query }).then(
      (res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotalPages(Math.max(1, res.totalPages));
        setTotalElements(res.totalElements);
        setStatus('ready');
      },
      (err) => {
        if (cancelled) return;
        setError(getErrorMessage(err, 'Không tải được danh sách tài khoản.'));
        setStatus('error');
      }
    );
    return () => { cancelled = true; };
  }, [page, query, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(0);
    setQuery(search);
  };

  const toggleLock = async (u) => {
    const locking = u.status !== 'LOCKED';
    const ok = await confirm({
      title: locking ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
      message: locking
        ? `Khóa tài khoản "${u.username}"? Người này sẽ không đăng nhập được và phiên đang mở bị vô hiệu ngay.`
        : `Mở khóa tài khoản "${u.username}"?`,
      confirmText: locking ? 'Khóa' : 'Mở khóa',
      tone: locking ? 'danger' : 'primary'
    });
    if (!ok) return;
    try {
      if (locking) await userService.lockUser(u.id);
      else await userService.unlockUser(u.id);
      showToast(locking ? `Đã khóa tài khoản ${u.username}.` : `Đã mở khóa tài khoản ${u.username}.`, 'success');
      reload();
    } catch (err) {
      showToast(getErrorMessage(err, 'Không đổi được trạng thái tài khoản.'), 'error');
    }
  };

  const onSaved = (saved, wasEdit) => {
    setDialog({ open: false, user: null });
    showToast(wasEdit ? 'Đã cập nhật tài khoản.' : `Đã tạo tài khoản ${saved?.username || ''}.`.trim(), 'success');
    reload();
  };

  const isMe = (u) => me?.username && u.username === me.username;

  const onAvatarChanged = (u, avatarUrl) => {
    // Ảnh của chính quản trị viên → cập nhật luôn phiên đăng nhập (thanh điều hướng, hồ sơ)
    if (isMe(u)) updateUser({ avatarUrl });
    showToast(avatarUrl ? `Đã cập nhật ảnh đại diện của ${u.username}.` : `Đã gỡ ảnh đại diện của ${u.username}.`, 'success');
    reload();
  };

  return (
    <section aria-labelledby="admin-users-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="admin-users-title" className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">group</span>
          Tài khoản hệ thống {status === 'ready' && <span className="text-slate-500 font-normal">({totalElements})</span>}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={submitSearch} role="search" className="input-group w-56">
            <label htmlFor="admin-user-search" className="sr-only">Tìm theo họ tên</label>
            <span className="material-symbols-outlined input-icon" aria-hidden="true">search</span>
            <input
              id="admin-user-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo họ tên…"
              className="input"
            />
          </form>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialog({ open: true, user: null })}>
            <span className="material-symbols-outlined" aria-hidden="true">person_add</span>
            Thêm tài khoản
          </button>
        </div>
      </div>

      {status === 'loading' ? (
        <div role="status" aria-live="polite" className="space-y-2">
          <span className="sr-only">Đang tải danh sách tài khoản…</span>
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12" aria-hidden="true" />)}
        </div>
      ) : status === 'error' ? (
        <div className="empty-state border border-red-200 bg-red-50 rounded-xl">
          <p className="empty-state-title">Không tải được danh sách tài khoản</p>
          <p role="alert" className="empty-state-text !text-red-800">{error}</p>
          <button type="button" onClick={reload} className="btn btn-primary btn-sm mt-2">Thử lại</button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state border border-dashed border-slate-300 rounded-xl">
          <p className="empty-state-title">Không có tài khoản phù hợp</p>
          <p className="empty-state-text">Thử từ khóa khác hoặc thêm tài khoản mới.</p>
        </div>
      ) : (
        <div className="table-wrap max-h-[55vh]">
          <table className="table">
            <caption className="sr-only">Danh sách tài khoản ({items.length} trên trang này)</caption>
            <thead>
              <tr>
                <th scope="col">Tài khoản</th>
                <th scope="col">Liên hệ</th>
                <th scope="col">Vai trò</th>
                <th scope="col">Trạng thái</th>
                <th scope="col"><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={u.fullName || u.username} src={u.avatarUrl} className="avatar avatar-sm" />
                      <span className="min-w-0">
                        <span className="cell-primary block">{u.fullName}</span>
                        <span className="block text-xs text-slate-500 font-mono">{u.username}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className="block text-xs text-slate-700 break-all">{u.email || '—'}</span>
                    <span className="block text-xs text-slate-500">{u.phone || ''}</span>
                  </td>
                  <td>
                    <span className="flex flex-wrap gap-1">
                      {(u.roles || []).map((r) => <span key={r} className="badge badge-primary">{roleLabel(r)}</span>)}
                    </span>
                    {u.createdAt && <span className="block text-xs text-slate-400 mt-0.5">Tạo {formatDateTime(u.createdAt)}</span>}
                  </td>
                  <td>
                    <span className={`badge ${u.status === 'LOCKED' ? 'badge-error' : 'badge-success'}`}>
                      {u.status === 'LOCKED' ? 'Đã khóa' : 'Hoạt động'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button
                      type="button"
                      className="btn btn-light btn-sm"
                      onClick={() => setDialog({ open: true, user: u })}
                      aria-label={`Sửa tài khoản ${u.username}`}
                    >
                      Sửa
                    </button>{' '}
                    <button
                      type="button"
                      className={`btn btn-sm ${u.status === 'LOCKED' ? 'btn-secondary' : 'btn-light'}`}
                      onClick={() => toggleLock(u)}
                      disabled={isMe(u)}
                      title={isMe(u) ? 'Không thể tự khóa tài khoản của chính mình' : undefined}
                      aria-label={`${u.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'} tài khoản ${u.username}`}
                    >
                      {u.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status === 'ready' && totalPages > 1 && (
        <nav aria-label="Phân trang tài khoản" className="flex items-center justify-between gap-2 text-sm">
          <button type="button" className="btn btn-light btn-sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Trang trước
          </button>
          <span className="text-slate-600">Trang {page + 1} / {totalPages}</span>
          <button type="button" className="btn btn-light btn-sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Trang sau
          </button>
        </nav>
      )}

      <UserFormDialog
        isOpen={dialog.open}
        user={dialog.user}
        onClose={() => setDialog({ open: false, user: null })}
        onSaved={onSaved}
        onAvatarChanged={onAvatarChanged}
      />
    </section>
  );
}
