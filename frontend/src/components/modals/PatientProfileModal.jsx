import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { patientService, validatePatientProfile, BLOOD_TYPES } from '../../services/patientService';
import AllergiesSection from './AllergiesSection';
import { useEscapeKey } from '../../hooks/useEscapeKey';

/**
 * PatientProfileModal – Hồ sơ sức khỏe bệnh nhân.
 * Hiển thị & chỉnh sửa thông tin cá nhân (họ tên, ngày sinh, CCCD, địa chỉ, SĐT).
 * Tích hợp AllergiesSection để quản lý dị ứng.
 */
export default function PatientProfileModal({ isOpen, onClose }) {
  useEscapeKey(isOpen, onClose);
  const { user } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Tải hồ sơ khi mở modal
  useEffect(() => {
    if (isOpen && user) {
      loadProfile();
    }
  }, [isOpen, user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await patientService.getMyProfile();
      setProfile(data);
      setEditForm(data);
    } catch (err) {
      showToast('Không thể tải hồ sơ bệnh nhân', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const validationErrors = validatePatientProfile(editForm);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      showToast(Object.values(validationErrors)[0], 'warning');
      return;
    }
    setSaving(true);
    try {
      const updateData = {
        fullName: editForm.fullName,
        dob: editForm.dob,
        gender: editForm.gender,
        nationalId: editForm.nationalId,
        address: editForm.address,
        phone: editForm.phone,
        bloodType: editForm.bloodType || ''
      };
      const updated = await patientService.updateMyProfile(updateData);
      setProfile(updated);
      setIsEditing(false);
      showToast('Cập nhật hồ sơ thành công!', 'success');
    } catch (err) {
      showToast('Không thể lưu hồ sơ. Vui lòng thử lại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm(profile);
    setErrors({});
    setIsEditing(false);
  };

  const handleChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  const genderLabel = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl">health_and_safety</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Hồ Sơ Sức Khỏe</h3>
              <p className="text-xs text-slate-500">
                {profile?.patientCode ? `Mã BN: ${profile.patientCode}` : 'Thông tin y tế cá nhân'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-200 rounded">
              ESC
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-500 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
              title="Đóng (Esc)"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="ml-3 text-sm text-slate-500">Đang tải hồ sơ...</span>
            </div>
          ) : profile ? (
            <>
              {/* Thông tin cá nhân */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-primary">person</span>
                    Thông tin cá nhân
                  </h4>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Chỉnh sửa
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {saving ? (
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-sm">save</span>
                        )}
                        Lưu
                      </button>
                    </div>
                  )}
                </div>

                {/* Form Fields */}
                <div className="space-y-2.5">
                  <ProfileField
                    label="Họ và tên"
                    icon="badge"
                    value={isEditing ? editForm.fullName : profile.fullName}
                    editing={isEditing}
                    onChange={(v) => handleChange('fullName', v)}
                    error={errors.fullName}
                  />
                  <ProfileField
                    label="Ngày sinh"
                    icon="calendar_today"
                    value={isEditing ? editForm.dob : profile.dob}
                    editing={isEditing}
                    type="date"
                    displayValue={profile.dob ? new Date(profile.dob).toLocaleDateString('vi-VN') : null}
                    onChange={(v) => handleChange('dob', v)}
                  />
                  <ProfileField
                    label="Giới tính"
                    icon="wc"
                    value={isEditing ? editForm.gender : profile.gender}
                    editing={isEditing}
                    type="select"
                    options={[
                      { value: 'MALE', label: 'Nam' },
                      { value: 'FEMALE', label: 'Nữ' },
                      { value: 'OTHER', label: 'Khác' }
                    ]}
                    displayValue={genderLabel[profile.gender]}
                    onChange={(v) => handleChange('gender', v)}
                  />
                  <ProfileField
                    label="CCCD/CMND"
                    icon="id_card"
                    value={isEditing ? editForm.nationalId : profile.nationalId}
                    editing={isEditing}
                    onChange={(v) => handleChange('nationalId', v)}
                  />
                  <ProfileField
                    label="Số điện thoại"
                    icon="call"
                    value={isEditing ? editForm.phone : profile.phone}
                    editing={isEditing}
                    onChange={(v) => handleChange('phone', v)}
                    error={errors.phone}
                  />
                  <ProfileField
                    label="Nhóm máu"
                    icon="bloodtype"
                    value={isEditing ? editForm.bloodType : profile.bloodType}
                    editing={isEditing}
                    type="select"
                    options={BLOOD_TYPES.map(b => ({ value: b, label: b }))}
                    onChange={(v) => handleChange('bloodType', v)}
                    error={errors.bloodType}
                  />
                  <ProfileField
                    label="Địa chỉ"
                    icon="location_on"
                    value={isEditing ? editForm.address : profile.address}
                    editing={isEditing}
                    onChange={(v) => handleChange('address', v)}
                  />
                </div>
              </div>

              {/* Phân cách */}
              <div className="border-t border-slate-100" />

              {/* Section Dị ứng */}
              <AllergiesSection patientId={profile.id} />
            </>
          ) : (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-slate-300">folder_off</span>
              <p className="text-sm text-slate-500 mt-2">Chưa có hồ sơ bệnh nhân</p>
              <p className="text-xs text-slate-400 mt-1">Hồ sơ sẽ được tạo khi bạn đặt lịch khám lần đầu</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ProfileField – Component hiển thị/chỉnh sửa 1 trường thông tin.
 */
function ProfileField({ label, icon, value, editing, type = 'text', options, displayValue, onChange, error }) {
  if (editing) {
    if (type === 'select') {
      return (
        <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-blue-50/50 border border-blue-100">
          <span className="material-symbols-outlined text-base text-blue-500">{icon}</span>
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{label}</label>
            <select
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full text-sm font-semibold text-slate-800 bg-transparent border-none outline-none p-0 mt-0.5"
            >
              <option value="">-- Chọn --</option>
              {options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    return (
      <div className="py-2 px-3 rounded-xl bg-blue-50/50 border border-blue-100">
        <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-base text-blue-500">{icon}</span>
        <div className="flex-1">
          <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{label}</label>
          <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full text-sm font-semibold text-slate-800 bg-transparent border-none outline-none p-0 mt-0.5"
            placeholder={`Nhập ${label.toLowerCase()}`}
          />
        </div>
        </div>
        {error && <p role="alert" className="text-[11px] text-rose-600 mt-1 ml-8">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors">
      <span className="material-symbols-outlined text-base text-slate-400">{icon}</span>
      <div className="flex-1">
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{label}</span>
        <p className="text-sm font-semibold text-slate-800 mt-0.5">
          {displayValue || value || <span className="text-slate-400 font-normal italic">Chưa cập nhật</span>}
        </p>
      </div>
    </div>
  );
}
