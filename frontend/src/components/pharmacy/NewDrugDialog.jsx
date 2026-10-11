import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { pharmacyService } from '../../services/pharmacyService';

const EMPTY = { code: '', name: '', unit: '', price: '', stockQuantity: '0', expiryDate: '' };

/** Kiểm tra biểu mẫu thêm thuốc (máy chủ vẫn kiểm tra lại). Trả về thông báo lỗi hoặc ''. */
export function validateNewDrug(form) {
  if (!form.code.trim()) return 'Vui lòng nhập mã thuốc.';
  if (!form.name.trim()) return 'Vui lòng nhập tên thuốc.';
  const price = Number(form.price);
  if (form.price === '' || !Number.isFinite(price) || price < 0) return 'Đơn giá phải là số không âm.';
  const stock = Number(form.stockQuantity);
  if (form.stockQuantity === '' || !Number.isInteger(stock) || stock < 0) return 'Tồn kho ban đầu phải là số nguyên không âm.';
  return '';
}

/**
 * Hộp thoại thêm thuốc mới vào danh mục kho dược (POST /drugs – Dược sĩ, Quản trị viên).
 * Điều chỉnh tồn kho của thuốc đã có thực hiện ở bảng kho dược.
 */
export default function NewDrugDialog({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY);
      setError('');
      setSaving(false);
    }
  }, [isOpen]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const problem = validateNewDrug(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await pharmacyService.createDrug({
        code: form.code.trim(),
        name: form.name.trim(),
        unit: form.unit.trim() || null,
        price: Number(form.price),
        stockQuantity: Number(form.stockQuantity),
        expiryDate: form.expiryDate || null
      });
      onCreated?.(created);
    } catch (err) {
      setError(err.message || 'Không thêm được thuốc mới.');
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      size="md"
      icon="add_circle"
      title="Thêm thuốc mới"
      subtitle="Thuốc mới xuất hiện trong danh mục kho dược và khi bác sĩ kê đơn"
    >
      <form onSubmit={submit} noValidate className="space-y-3.5" aria-label="Thêm thuốc mới">
        {error && (
          <div role="alert" className="alert alert-error">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <span>{error}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="form-field">
            <label htmlFor="nd-code" className="form-label">Mã thuốc<span className="required" aria-hidden="true">*</span></label>
            <input id="nd-code" className="input" value={form.code} onChange={update('code')} placeholder="DRUG-0016" />
          </div>
          <div className="form-field">
            <label htmlFor="nd-unit" className="form-label">Đơn vị</label>
            <input id="nd-unit" className="input" value={form.unit} onChange={update('unit')} placeholder="viên, ống, chai…" />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="nd-name" className="form-label">Tên thuốc<span className="required" aria-hidden="true">*</span></label>
          <input id="nd-name" className="input" value={form.name} onChange={update('name')} placeholder="Paracetamol 500mg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="form-field">
            <label htmlFor="nd-price" className="form-label">Đơn giá (đ)<span className="required" aria-hidden="true">*</span></label>
            <input id="nd-price" type="number" min="0" className="input" value={form.price} onChange={update('price')} />
          </div>
          <div className="form-field">
            <label htmlFor="nd-stock" className="form-label">Tồn kho ban đầu<span className="required" aria-hidden="true">*</span></label>
            <input id="nd-stock" type="number" min="0" step="1" className="input" value={form.stockQuantity} onChange={update('stockQuantity')} />
          </div>
          <div className="form-field">
            <label htmlFor="nd-expiry" className="form-label">Hạn dùng</label>
            <input id="nd-expiry" type="date" className="input" value={form.expiryDate} onChange={update('expiryDate')} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-light" onClick={onClose} disabled={saving}>Hủy</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Thêm thuốc'}</button>
        </div>
      </form>
    </Modal>
  );
}
