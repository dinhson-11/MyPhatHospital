import React, { useState, useMemo } from 'react';
import { DEPARTMENTS } from '../../services/dataService';

const CLINICAL_COUNT = DEPARTMENTS.filter((d) => d.category === 'CLINICAL').length;
const SUPPORT_COUNT = DEPARTMENTS.filter((d) => d.category === 'SUPPORT').length;

const CATEGORIES = [
  { id: 'ALL', name: 'Tất cả khoa phòng', count: DEPARTMENTS.length, icon: 'domain' },
  { id: 'CLINICAL', name: 'Chuyên khoa lâm sàng', count: CLINICAL_COUNT, icon: 'stethoscope' },
  { id: 'SUPPORT', name: 'Cận lâm sàng & Tiện ích', count: SUPPORT_COUNT, icon: 'biotech' }
];

export default function DepartmentsSection({ onOpenBooking, onOpenAllDepartments }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL'); // 'ALL' | 'CLINICAL' | 'SUPPORT'

  const displayedDepartments = useMemo(() => {
    if (selectedCategory === 'ALL') return DEPARTMENTS;
    return DEPARTMENTS.filter((d) => d.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <section id="departments" className="py-20 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-fixed text-primary text-xs font-bold uppercase tracking-wider mb-4 border border-primary-fixed-dim">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">local_hospital</span>
            <span>Hệ Thống Khoa Phòng</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Đa Dạng Chuyên Khoa Kỹ Thuật Cao
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Mỹ Phát Hospital đầu tư đồng bộ {CLINICAL_COUNT} chuyên khoa lâm sàng và {SUPPORT_COUNT} khoa cận lâm sàng & tiện ích hỗ trợ, trang thiết bị hiện đại, phục vụ người bệnh toàn diện.
          </p>
        </div>

        {/* Bộ lọc nhóm khoa */}
        <div role="group" aria-label="Lọc theo nhóm khoa phòng" className="flex flex-wrap items-center justify-center gap-2.5 mb-12">
          {CATEGORIES.map((cat) => {
            const selected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                id={`filter-cat-${cat.id.toLowerCase()}`}
                aria-pressed={selected}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                  selected
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-white text-slate-600 hover:bg-primary-fixed hover:text-primary border border-slate-200/80'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                <span>{cat.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                    selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {displayedDepartments.map((dept) => {
            const isBookable = dept.canBook !== false;
            return (
              <div
                key={dept.id}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-primary group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors duration-300 shadow-inner">
                      <span aria-hidden="true" className="material-symbols-outlined text-2xl">{dept.icon}</span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        dept.category === 'CLINICAL'
                          ? 'bg-teal-50 text-teal-800 border border-teal-200/60'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {dept.category === 'CLINICAL' ? 'Lâm sàng' : 'Cận lâm sàng & Tiện ích'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2.5 group-hover:text-primary transition-colors leading-snug">
                    {dept.name}
                  </h3>

                  <p className="text-slate-500 text-xs sm:text-sm mb-4 leading-relaxed line-clamp-3">
                    {dept.desc}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-primary shrink-0">meeting_room</span>
                    <span className="truncate font-medium">{dept.room}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center gap-2.5">
                  {isBookable ? (
                    <button
                      type="button"
                      id={`btn-book-dept-${dept.id}`}
                      onClick={() => onOpenBooking({ departmentId: dept.id })}
                      aria-label={`Đặt khám ${dept.name}`}
                      className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[17px]">calendar_month</span>
                      <span>Đặt khám</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id={`btn-info-dept-${dept.id}`}
                      onClick={onOpenAllDepartments}
                      aria-label={`Thông tin dịch vụ ${dept.name}`}
                      className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[17px] text-primary">info</span>
                      <span>Thông tin dịch vụ</span>
                    </button>
                  )}
                  <button
                    type="button"
                    id={`btn-view-dept-${dept.id}`}
                    onClick={onOpenAllDepartments}
                    aria-label={`Xem chi tiết ${dept.name}`}
                    title="Xem thông tin chi tiết chuyên khoa"
                    className="p-2.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_outward</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Departments Button */}
        <div className="mt-12 text-center">
          <button
            type="button"
            id="btn-view-all-departments"
            onClick={onOpenAllDepartments}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold hover:border-primary hover:text-primary shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <span>Tra cứu toàn bộ danh mục khoa phòng & dịch vụ</span>
            <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </div>
    </section>
  );
}
