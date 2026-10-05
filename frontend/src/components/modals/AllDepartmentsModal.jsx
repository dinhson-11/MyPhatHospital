import React, { useState, useMemo } from 'react';
import { DEPARTMENTS } from '../../services/dataService';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export default function AllDepartmentsModal({ isOpen, onClose, onSelectDepartment }) {
  useEscapeKey(isOpen, onClose);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const filteredDepts = useMemo(() => {
    let list = DEPARTMENTS;
    if (selectedCategory !== 'ALL') {
      list = list.filter((d) => d.category === selectedCategory);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.desc.toLowerCase().includes(q) ||
        d.room.toLowerCase().includes(q)
    );
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100/60 text-teal-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">domain</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Danh Mục Khoa Phòng & Dịch Vụ</h3>
              <p className="text-xs text-slate-500">10 Khoa Lâm sàng & Cận lâm sàng Mỹ Phát Hospital</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-200 rounded">
              ESC
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-6 pb-2 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({DEPARTMENTS.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('CLINICAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'CLINICAL'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Chuyên khoa lâm sàng ({DEPARTMENTS.filter(d => d.category === 'CLINICAL').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('SUPPORT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'SUPPORT'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Cận lâm sàng & Tiện ích ({DEPARTMENTS.filter(d => d.category === 'SUPPORT').length})
            </button>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm chuyên khoa theo tên, bệnh lý hoặc khu vực phòng khám..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-700 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Departments Grid */}
        <div className="p-6 max-h-[60vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDepts.map((dept) => {
            const isBookable = dept.canBook !== false;
            return (
              <div
                key={dept.id}
                className="p-5 rounded-2xl border border-slate-200/90 hover:border-teal-700/50 bg-white hover:bg-slate-50/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-700 group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-2xl">{dept.icon}</span>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      dept.category === 'CLINICAL'
                        ? 'bg-teal-50 text-teal-800 border border-teal-200/60'
                        : 'bg-sky-50 text-sky-800 border border-sky-200/60'
                    }`}>
                      {dept.category === 'CLINICAL' ? 'Lâm sàng' : 'Cận lâm sàng & Tiện ích'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-base mb-1 group-hover:text-teal-700 transition-colors">
                    {dept.name}
                  </h4>
                  <p className="text-slate-500 text-xs leading-relaxed mb-3">{dept.desc}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 truncate flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-xs text-teal-600">meeting_room</span>
                    {dept.room}
                  </span>
                  {isBookable ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectDepartment(dept.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">calendar_month</span>
                      Đặt khám
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-medium shrink-0 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-slate-400">info</span>
                      Dịch vụ hỗ trợ
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
