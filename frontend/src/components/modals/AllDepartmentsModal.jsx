import React, { useState, useMemo } from 'react';
import { DEPARTMENTS } from '../../services/dataService';

export default function AllDepartmentsModal({ isOpen, onClose, onSelectDepartment }) {
  const [search, setSearch] = useState('');

  const filteredDepts = useMemo(() => {
    if (!search.trim()) return DEPARTMENTS;
    const q = search.toLowerCase();
    return DEPARTMENTS.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.desc.toLowerCase().includes(q) ||
        d.room.toLowerCase().includes(q)
    );
  }, [search]);

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
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">domain</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Danh Mục Chuyên Khoa</h3>
              <p className="text-xs text-slate-500">10 Khoa Lâm sàng & Cận lâm sàng Bệnh viện Đa khoa Thanh Sơn</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 pb-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm chuyên khoa theo tên, bệnh lý hoặc khu vực phòng khám..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Departments Grid */}
        <div className="p-6 max-h-[60vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDepts.map((dept) => (
            <div
              key={dept.id}
              className="p-5 rounded-2xl border border-slate-200/90 hover:border-primary/50 bg-white hover:bg-slate-50/50 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-2xl">{dept.icon}</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                    {dept.doctorsCount} Bác sĩ
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-base mb-1 group-hover:text-primary transition-colors">
                  {dept.name}
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed mb-3">{dept.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-primary">meeting_room</span>
                  {dept.room}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectDepartment(dept.id);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                  Đặt khám
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
