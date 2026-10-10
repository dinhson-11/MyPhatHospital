import React, { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { DEPARTMENTS } from '../../services/dataService';

const CATEGORY_LABELS = {
  CLINICAL: 'Lâm sàng',
  SUPPORT: 'Cận lâm sàng & Tiện ích'
};

const FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'CLINICAL', label: 'Chuyên khoa lâm sàng' },
  { key: 'SUPPORT', label: 'Cận lâm sàng & Tiện ích' }
];

const countOf = (key) => (key === 'ALL' ? DEPARTMENTS.length : DEPARTMENTS.filter((d) => d.category === key).length);

export default function AllDepartmentsModal({ isOpen, onClose, onSelectDepartment }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const filteredDepts = useMemo(() => {
    let list = DEPARTMENTS;
    if (selectedCategory !== 'ALL') {
      list = list.filter((d) => d.category === selectedCategory);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) =>
      [d.name, d.desc, d.room].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [search, selectedCategory]);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      icon="domain"
      title="Danh Mục Khoa Phòng & Dịch Vụ"
      subtitle={`${DEPARTMENTS.length} khoa lâm sàng và cận lâm sàng của Mỹ Phát Hospital`}
      closeOnBackdrop
      bodyClassName="overflow-y-auto"
    >
      {/* Bộ lọc & tìm kiếm (dính trên cùng khi cuộn) */}
      <div className="sticky top-0 z-10 bg-white px-5 sm:px-6 pt-4 pb-3 border-b border-slate-200 space-y-3">
        <div className="segmented flex-wrap" role="group" aria-label="Lọc theo nhóm khoa">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={selectedCategory === f.key}
              onClick={() => setSelectedCategory(f.key)}
              className={selectedCategory === f.key ? 'is-active' : ''}
            >
              {f.label} ({countOf(f.key)})
            </button>
          ))}
        </div>

        <div className="input-group">
          <label htmlFor="departments-search" className="sr-only">Tìm kiếm chuyên khoa</label>
          <span className="material-symbols-outlined input-icon" aria-hidden="true">search</span>
          <input
            id="departments-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên khoa, bệnh lý hoặc khu vực phòng khám..."
            className="input"
          />
        </div>
        <p className="text-xs text-slate-500" role="status" aria-live="polite">
          Hiển thị {filteredDepts.length}/{DEPARTMENTS.length} khoa phòng
        </p>
      </div>

      {/* Danh sách khoa */}
      <div className="px-5 sm:px-6 py-5">
        {filteredDepts.length === 0 ? (
          <div className="empty-state border border-dashed border-slate-300 rounded-xl">
            <div className="empty-state-icon">
              <span className="material-symbols-outlined" aria-hidden="true">search_off</span>
            </div>
            <p className="empty-state-title">Không tìm thấy khoa phòng phù hợp</p>
            <p className="empty-state-text">Thử từ khóa khác hoặc gọi hotline 0789 065 493 để được tư vấn chọn khoa.</p>
            <button type="button" onClick={resetFilters} className="btn btn-light btn-sm mt-2">
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDepts.map((dept) => {
              const isBookable = dept.canBook !== false;
              return (
                <li
                  key={dept.id}
                  className="card p-5 flex flex-col justify-between hover:border-primary/40 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-2xl" aria-hidden="true">{dept.icon}</span>
                      </span>
                      <span className={`badge ${dept.category === 'CLINICAL' ? 'bg-teal-50 text-teal-800' : 'badge-neutral'}`}>
                        {CATEGORY_LABELS[dept.category] || 'Khác'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base mb-1">{dept.name}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed mb-3">{dept.desc}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 min-w-0 flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-base text-slate-400 shrink-0" aria-hidden="true">meeting_room</span>
                      <span className="truncate">{dept.room}</span>
                    </span>
                    {isBookable ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectDepartment?.(dept.id);
                        }}
                        aria-label={`Đặt khám ${dept.name}`}
                        className="btn btn-primary btn-sm shrink-0"
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>
                        Đặt khám
                      </button>
                    ) : (
                      <span className="badge badge-neutral shrink-0">
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">info</span>
                        Dịch vụ hỗ trợ
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
