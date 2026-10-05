import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { patientService } from '../../services/patientService';

/**
 * AllergiesSection – Quản lý danh sách dị ứng bệnh nhân.
 * Hiển thị, thêm mới và xóa dị ứng (thuốc, thức ăn, môi trường).
 * Dữ liệu đầu vào quan trọng cho AI cảnh báo dị ứng thuốc (FR-11.2).
 */

const SEVERITY_CONFIG = {
  SEVERE: { label: 'Nghiêm trọng', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: 'error', dot: 'bg-rose-500' },
  MODERATE: { label: 'Trung bình', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'warning', dot: 'bg-amber-500' },
  MILD: { label: 'Nhẹ', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: 'info', dot: 'bg-blue-500' }
};

export default function AllergiesSection({ patientId }) {
  const { showToast } = useToast();
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAllergy, setNewAllergy] = useState({ allergen: '', severity: 'MILD', note: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (patientId) loadAllergies();
  }, [patientId]);

  const loadAllergies = async () => {
    setLoading(true);
    try {
      const data = await patientService.getMyAllergies();
      setAllergies(data || []);
    } catch {
      showToast('Không thể tải thông tin dị ứng', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newAllergy.allergen.trim()) {
      showToast('Vui lòng nhập tên dị ứng', 'warning');
      return;
    }

    setAdding(true);
    try {
      const added = await patientService.addAllergy(patientId, newAllergy);
      setAllergies(prev => [...prev, added]);
      setNewAllergy({ allergen: '', severity: 'MILD', note: '' });
      setShowAddForm(false);
      showToast(`Đã thêm dị ứng "${added.allergen}"`, 'success');
    } catch {
      showToast('Không thể thêm dị ứng. Vui lòng thử lại.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (allergy) => {
    if (!confirm(`Xác nhận xóa dị ứng "${allergy.allergen}"?`)) return;

    try {
      await patientService.deleteAllergy(patientId, allergy.id);
      setAllergies(prev => prev.filter(a => a.id !== allergy.id));
      showToast(`Đã xóa dị ứng "${allergy.allergen}"`, 'info');
    } catch {
      showToast('Không thể xóa dị ứng', 'error');
    }
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-rose-500">allergies</span>
          Thông tin dị ứng
          {allergies.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">
              {allergies.length}
            </span>
          )}
        </h4>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">
            {showAddForm ? 'close' : 'add_circle'}
          </span>
          {showAddForm ? 'Đóng' : 'Thêm'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-3 animate-fade-in">
          <div>
            <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
              Tên dị ứng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newAllergy.allergen}
              onChange={(e) => setNewAllergy(prev => ({ ...prev, allergen: e.target.value }))}
              placeholder="VD: Penicillin, Hải sản, Phấn hoa..."
              className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-rose-200 text-sm text-slate-800 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                Mức độ
              </label>
              <select
                value={newAllergy.severity}
                onChange={(e) => setNewAllergy(prev => ({ ...prev, severity: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-rose-200 text-sm text-slate-800 outline-none focus:border-rose-400 transition-all"
              >
                <option value="MILD">Nhẹ</option>
                <option value="MODERATE">Trung bình</option>
                <option value="SEVERE">Nghiêm trọng</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                Ghi chú
              </label>
              <input
                type="text"
                value={newAllergy.note}
                onChange={(e) => setNewAllergy(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Triệu chứng..."
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-rose-200 text-sm text-slate-800 outline-none focus:border-rose-400 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !newAllergy.allergen.trim()}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-sm">add</span>
            )}
            Thêm dị ứng
          </button>
        </div>
      )}

      {/* Allergy List */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
          <span className="ml-2 text-xs text-slate-500">Đang tải...</span>
        </div>
      ) : allergies.length === 0 ? (
        <div className="text-center py-6 bg-slate-50 rounded-2xl">
          <span className="material-symbols-outlined text-3xl text-slate-300">check_circle</span>
          <p className="text-xs text-slate-500 mt-1">Chưa ghi nhận dị ứng nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allergies.map(allergy => {
            const config = SEVERITY_CONFIG[allergy.severity] || SEVERITY_CONFIG.MILD;
            return (
              <div
                key={allergy.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${config.color} transition-all hover:shadow-sm group`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${config.dot} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold truncate">{allergy.allergen}</span>
                    <span className="text-[10px] font-medium opacity-75 flex-shrink-0">
                      {config.label}
                    </span>
                  </div>
                  {allergy.note && (
                    <p className="text-[11px] opacity-70 mt-0.5 truncate">{allergy.note}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(allergy)}
                  className="w-7 h-7 rounded-lg bg-white/60 hover:bg-white text-current opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all flex-shrink-0"
                  title="Xóa dị ứng"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Disclaimer */}
      {allergies.length > 0 && (
        <p className="text-[10px] text-slate-400 flex items-start gap-1 pt-1">
          <span className="material-symbols-outlined text-xs mt-px">info</span>
          Thông tin dị ứng được sử dụng bởi hệ thống AI để cảnh báo khi kê đơn thuốc.
        </p>
      )}
    </div>
  );
}
