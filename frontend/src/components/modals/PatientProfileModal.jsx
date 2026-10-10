import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { patientService, validatePatientProfile, insuranceStatus, BLOOD_TYPES } from '../../services/patientService';
import Modal from '../common/Modal';
import AllergiesSection from './AllergiesSection';
import { formatDate, formatGender, todayISO } from '../../utils/format';

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' }
];

const INSURANCE_BADGE = { VALID: 'badge-success', EXPIRED: 'badge-error', NOT_YET: 'badge-warning', NONE: 'badge-neutral' };

/**
 * Hồ sơ sức khỏe của bệnh nhân: thông tin cá nhân (tự cập nhật), thẻ BHYT (chỉ xem – quầy tiếp đón cập nhật)
 * và danh sách dị ứng.
 */
export default function PatientProfileModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [state, setState] = useState({ status: 'idle', profile: null, error: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const profile = state.profile;

  const loadProfile = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: '' }));
    try {
      const data = await patientService.getMyProfile();
      setState({ status: 'ready', profile: data, error: '' });
      setEditForm(data || {});
    } catch (err) {
      setState({ status: 'error', profile: null, error: err.message });
    }
  }, []);

  useEffect(() => {
    if (isOpen && user) {
      setIsEditing(false);
      setErrors({});
      loadProfile();
    }
  }, [isOpen, user, loadProfile]);

  const handleSave = async () => {
    if (saving) return;
    const validationErrors = validatePatientProfile(editForm);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setSaving(true);
    try {
      const updated = await patientService.updateMyProfile({
        fullName: editForm.fullName,
        dob: editForm.dob,
        gender: editForm.gender,
        nationalId: editForm.nationalId,
        address: editForm.address,
        phone: editForm.phone,
        bloodType: editForm.bloodType || ''
      });
      const next = updated || { ...profile, ...editForm };
      setState({ status: 'ready', profile: next, error: '' });
      setEditForm(next);
      setIsEditing(false);
      showToast('Cập nhật hồ sơ thành công!', 'success');
    } catch (err) {
      setErrors({ form: err.message });
      showToast(err.message || 'Không lưu được hồ sơ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm(profile || {});
    setErrors({});
    setIsEditing(false);
  };

  const handleChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] || prev.form ? { ...prev, [field]: undefined, form: undefined } : prev));
  };

  const ins = insuranceStatus(profile);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hồ sơ sức khỏe"
      subtitle={profile?.patientCode ? `Mã bệnh nhân: ${profile.patientCode}` : 'Thông tin y tế cá nhân'}
      icon="health_and_safety"
      size="md"
    >
      {state.status === 'loading' || state.status === 'idle' ? (
        <p className="py-12 text-center text-sm text-slate-600" aria-live="polite">Đang tải hồ sơ…</p>
      ) : state.status === 'error' ? (
        <div role="alert" className="py-8 text-center space-y-3">
          <p className="text-sm text-red-800">{state.error}</p>
          <button type="button" className="btn btn-secondary" onClick={loadProfile}>
            <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
            Thử lại
          </button>
        </div>
      ) : profile ? (
        <div className="space-y-5">
          <section className="space-y-3" aria-labelledby="profile-personal-title">
            <div className="flex items-center justify-between gap-2">
              <h3 id="profile-personal-title" className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">person</span>
                Thông tin cá nhân
              </h3>
              {!isEditing ? (
                <button type="button" onClick={() => setIsEditing(true)} className="btn btn-soft btn-sm">
                  <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                  Chỉnh sửa
                </button>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={handleCancel} className="btn btn-secondary btn-sm" disabled={saving}>Hủy</button>
                  <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
                    <span className="material-symbols-outlined" aria-hidden="true">save</span>
                    {saving ? 'Đang lưu…' : 'Lưu'}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <ProfileField id="pp-fullName" label="Họ và tên" icon="badge" editing={isEditing}
                value={isEditing ? editForm.fullName : profile.fullName}
                onChange={(v) => handleChange('fullName', v)} error={errors.fullName} />
              <ProfileField id="pp-dob" label="Ngày sinh" icon="calendar_today" type="date" editing={isEditing}
                value={isEditing ? (editForm.dob || '').slice(0, 10) : profile.dob}
                displayValue={profile.dob ? formatDate(profile.dob) : null}
                max={todayISO()}
                onChange={(v) => handleChange('dob', v)} error={errors.dob} />
              <ProfileField id="pp-gender" label="Giới tính" icon="wc" type="select" editing={isEditing}
                value={isEditing ? editForm.gender : profile.gender}
                options={GENDER_OPTIONS}
                displayValue={profile.gender ? formatGender(profile.gender) : null}
                onChange={(v) => handleChange('gender', v)} />
              <ProfileField id="pp-nationalId" label="CCCD/CMND" icon="id_card" editing={isEditing}
                value={isEditing ? editForm.nationalId : profile.nationalId}
                onChange={(v) => handleChange('nationalId', v)} error={errors.nationalId} />
              <ProfileField id="pp-phone" label="Số điện thoại" icon="call" type="tel" editing={isEditing}
                value={isEditing ? editForm.phone : profile.phone}
                onChange={(v) => handleChange('phone', v)} error={errors.phone} />
              <ProfileField id="pp-bloodType" label="Nhóm máu" icon="bloodtype" type="select" editing={isEditing}
                value={isEditing ? editForm.bloodType : profile.bloodType}
                options={BLOOD_TYPES.map((b) => ({ value: b, label: b }))}
                onChange={(v) => handleChange('bloodType', v)} error={errors.bloodType} />
              <ProfileField id="pp-address" label="Địa chỉ" icon="location_on" editing={isEditing}
                value={isEditing ? editForm.address : profile.address}
                onChange={(v) => handleChange('address', v)} error={errors.address} />
            </div>
            {errors.form && <p role="alert" className="text-sm p-3 rounded-xl bg-red-50 border border-red-200 text-red-900">{errors.form}</p>}
          </section>

          <section className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2" aria-labelledby="profile-insurance-title">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 id="profile-insurance-title" className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">card_membership</span>
                Thẻ bảo hiểm y tế
              </h3>
              <span className={`badge ${INSURANCE_BADGE[ins.code]}`}>{ins.label}</span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
              <div><dt className="text-slate-600">Mã thẻ</dt><dd className="font-mono font-semibold text-slate-900">{profile.insuranceNumber || '—'}</dd></div>
              <div><dt className="text-slate-600">Hiệu lực từ</dt><dd className="font-semibold text-slate-900">{profile.insuranceValidFrom ? formatDate(profile.insuranceValidFrom) : '—'}</dd></div>
              <div><dt className="text-slate-600">Hiệu lực đến</dt><dd className="font-semibold text-slate-900">{profile.insuranceValidTo ? formatDate(profile.insuranceValidTo) : '—'}</dd></div>
            </dl>
            <p className="text-xs text-slate-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">info</span>
              Liên hệ quầy tiếp đón để cập nhật thẻ BHYT.
            </p>
          </section>

          <div className="border-t border-slate-200" />

          <AllergiesSection patientId={profile.id} />
        </div>
      ) : (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-4xl text-slate-400" aria-hidden="true">folder_off</span>
          <p className="text-sm text-slate-700 mt-2">Chưa có hồ sơ bệnh nhân</p>
          <p className="text-[13px] text-slate-600 mt-1">Hồ sơ sẽ được tạo khi bạn đặt lịch khám lần đầu.</p>
        </div>
      )}
    </Modal>
  );
}

/** Một trường thông tin: chế độ xem hoặc sửa (nhãn gắn htmlFor, lỗi hiển thị ngay dưới ô). */
function ProfileField({ id, label, icon, value, editing, type = 'text', options, displayValue, onChange, error, max }) {
  if (editing) {
    const errId = error ? `${id}-error` : undefined;
    return (
      <div className="py-2 px-3 rounded-xl bg-primary-fixed/60 border border-primary-fixed-dim">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">{icon}</span>
          <div className="flex-1">
            <label htmlFor={id} className="text-xs text-slate-600 font-semibold">{label}</label>
            {type === 'select' ? (
              <select
                id={id}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={errId}
                className="w-full text-sm font-semibold text-slate-900 bg-transparent border-none outline-none p-0 mt-0.5 focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
              >
                <option value="">-- Chọn --</option>
                {options?.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            ) : (
              <input
                id={id}
                type={type}
                value={value || ''}
                max={max}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={errId}
                className="w-full text-sm font-semibold text-slate-900 bg-transparent border-none outline-none p-0 mt-0.5 focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
              />
            )}
          </div>
        </div>
        {error && <p id={errId} role="alert" className="text-xs text-red-700 mt-1 ml-8">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-xl">
      <span className="material-symbols-outlined text-base text-slate-500" aria-hidden="true">{icon}</span>
      <div className="flex-1">
        <span className="text-xs text-slate-600 font-semibold">{label}</span>
        <p className="text-sm font-semibold text-slate-900 mt-0.5">
          {displayValue || value || <span className="text-slate-500 font-normal italic">Chưa cập nhật</span>}
        </p>
      </div>
    </div>
  );
}
