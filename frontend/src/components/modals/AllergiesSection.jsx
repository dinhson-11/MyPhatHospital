import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../common/ConfirmDialog';
import { patientService } from '../../services/patientService';

/**
 * AllergiesSection – danh sách dị ứng của bệnh nhân (thuốc, thức ăn, môi trường).
 * Dữ liệu này được bác sĩ dùng để cảnh báo khi kê đơn nên:
 *  - không tải được → hiển thị lỗi + Thử lại (không hiển thị "chưa ghi nhận dị ứng");
 *  - xóa dị ứng phải xác nhận.
 */
const SEVERITY_CONFIG = {
  SEVERE: { label: 'Nghiêm trọng', color: 'bg-red-50 text-red-900 border-red-300', dot: 'bg-red-600' },
  MODERATE: { label: 'Trung bình', color: 'bg-amber-50 text-amber-900 border-amber-300', dot: 'bg-amber-500' },
  MILD: { label: 'Nhẹ', color: 'bg-sky-50 text-sky-900 border-sky-200', dot: 'bg-sky-500' }
};

export default function AllergiesSection({ patientId }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [state, setState] = useState({ status: 'idle', items: [], error: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAllergy, setNewAllergy] = useState({ allergen: '', severity: 'MILD', note: '' });
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadAllergies = useCallback(async () => {
    if (!patientId) return;
    setState((prev) => ({ ...prev, status: 'loading', error: '' }));
    try {
      const items = await patientService.getAllergies(patientId);
      setState({ status: 'ready', items, error: '' });
    } catch (err) {
      setState({ status: 'error', items: [], error: err.message });
    }
  }, [patientId]);

  useEffect(() => {
    loadAllergies();
  }, [loadAllergies]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (adding) return;
    if (!newAllergy.allergen.trim()) {
      setAddError('Vui lòng nhập tên chất gây dị ứng');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      const added = await patientService.addAllergy(patientId, newAllergy);
      setState((prev) => ({ ...prev, items: [...prev.items, added] }));
      setNewAllergy({ allergen: '', severity: 'MILD', note: '' });
      setShowAddForm(false);
      showToast(`Đã thêm dị ứng "${added?.allergen || newAllergy.allergen}".`, 'success');
    } catch (err) {
      setAddError(err.message);
      showToast(err.message || 'Không thêm được dị ứng', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (allergy) => {
    if (deletingId) return;
    const ok = await confirm({
      title: 'Xóa thông tin dị ứng?',
      message: `Bác sĩ sẽ không còn được cảnh báo về dị ứng "${allergy.allergen}" khi kê đơn.`,
      tone: 'danger',
      confirmText: 'Xóa dị ứng'
    });
    if (!ok) return;
    setDeletingId(allergy.id);
    try {
      await patientService.deleteAllergy(patientId, allergy.id);
      setState((prev) => ({ ...prev, items: prev.items.filter((a) => a.id !== allergy.id) }));
      showToast(`Đã xóa dị ứng "${allergy.allergen}".`, 'success');
    } catch (err) {
      showToast(err.message || 'Không xóa được dị ứng', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const items = state.items;

  return (
    <section className="space-y-3" aria-labelledby="allergy-title">
      <div className="flex items-center justify-between">
        <h4 id="allergy-title" className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-red-700" aria-hidden="true">allergies</span>
          Thông tin dị ứng
          {items.length > 0 && <span className="badge badge-error">{items.length}</span>}
        </h4>
        <button
          type="button"
          onClick={() => { setShowAddForm((v) => !v); setAddError(''); }}
          aria-expanded={showAddForm}
          aria-controls="allergy-add-form"
          className="btn btn-soft btn-sm"
        >
          <span className="material-symbols-outlined" aria-hidden="true">{showAddForm ? 'close' : 'add_circle'}</span>
          {showAddForm ? 'Đóng' : 'Thêm'}
        </button>
      </div>

      {showAddForm && (
        <form id="allergy-add-form" onSubmit={handleAdd} noValidate className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="form-field">
            <label htmlFor="allergy-allergen" className="form-label">Chất gây dị ứng <span className="required">*</span></label>
            <input
              id="allergy-allergen"
              type="text"
              value={newAllergy.allergen}
              onChange={(e) => { setNewAllergy((prev) => ({ ...prev, allergen: e.target.value })); setAddError(''); }}
              placeholder="VD: Penicillin, hải sản, phấn hoa…"
              aria-invalid={addError ? 'true' : undefined}
              aria-describedby={addError ? 'allergy-add-error' : undefined}
              className={`input ${addError ? 'is-error' : ''}`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-field">
              <label htmlFor="allergy-severity" className="form-label">Mức độ</label>
              <select
                id="allergy-severity"
                value={newAllergy.severity}
                onChange={(e) => setNewAllergy((prev) => ({ ...prev, severity: e.target.value }))}
                className="select"
              >
                <option value="MILD">Nhẹ</option>
                <option value="MODERATE">Trung bình</option>
                <option value="SEVERE">Nghiêm trọng</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="allergy-note" className="form-label">Biểu hiện / ghi chú</label>
              <input
                id="allergy-note"
                type="text"
                value={newAllergy.note}
                onChange={(e) => setNewAllergy((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="VD: nổi mề đay, khó thở"
                className="input"
              />
            </div>
          </div>
          {addError && <p id="allergy-add-error" role="alert" className="form-error">{addError}</p>}
          <button type="submit" disabled={adding} className="btn btn-primary btn-block">
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
            {adding ? 'Đang lưu…' : 'Thêm dị ứng'}
          </button>
        </form>
      )}

      {state.status === 'loading' || state.status === 'idle' ? (
        <p className="py-6 text-center text-[13px] text-slate-600" aria-live="polite">Đang tải thông tin dị ứng…</p>
      ) : state.status === 'error' ? (
        <div role="alert" className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-[13px] space-y-2">
          <p>{state.error || 'Không tải được thông tin dị ứng.'}</p>
          <button type="button" onClick={loadAllergies} className="btn btn-secondary btn-sm">
            <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
            Thử lại
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-center py-5 bg-slate-50 rounded-2xl text-[13px] text-slate-600">Chưa ghi nhận dị ứng nào.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((allergy) => {
            const config = SEVERITY_CONFIG[allergy.severity] || SEVERITY_CONFIG.MILD;
            return (
              <li key={allergy.id} className={`flex items-center gap-3 p-3 rounded-xl border ${config.color}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${config.dot} shrink-0`} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold">{allergy.allergen}</span>
                    <span className="text-xs font-semibold">{config.label}</span>
                  </p>
                  {allergy.note && <p className="text-xs mt-0.5">{allergy.note}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(allergy)}
                  disabled={Boolean(deletingId)}
                  className="btn btn-ghost btn-sm btn-icon"
                  aria-label={`Xóa dị ứng ${allergy.allergen}`}
                  title="Xóa dị ứng"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-slate-600 flex items-start gap-1 pt-1">
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">info</span>
        Thông tin dị ứng được dùng để cảnh báo bác sĩ khi kê đơn thuốc.
      </p>
    </section>
  );
}
