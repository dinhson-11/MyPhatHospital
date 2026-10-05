import React, { useState, useMemo } from 'react';
import { DEPARTMENTS } from '../../services/dataService';

export default function DepartmentsSection({ onOpenBooking, onOpenAllDepartments }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL'); // 'ALL' | 'CLINICAL' | 'SUPPORT'

  const categories = [
    { id: 'ALL', name: 'Tất cả khoa phòng', count: DEPARTMENTS.length, icon: 'domain' },
    { id: 'CLINICAL', name: 'Chuyên khoa lâm sàng', count: DEPARTMENTS.filter(d => d.category === 'CLINICAL').length, icon: 'stethoscope' },
    { id: 'SUPPORT', name: 'Cận lâm sàng & Tiện ích', count: DEPARTMENTS.filter(d => d.category === 'SUPPORT').length, icon: 'biotech' }
  ];

  const displayedDepartments = useMemo(() => {
    if (selectedCategory === 'ALL') return DEPARTMENTS;
    return DEPARTMENTS.filter(d => d.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <section id="departments" className="py-20 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100 text-teal-900 text-xs font-bold uppercase tracking-wider mb-4 border border-teal-200">
            <span className="material-symbols-outlined text-[16px] text-teal-700">local_hospital</span>
            <span>Hệ Thống Khoa Phòng Chuẩn Y Tế</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Đa Dạng Chuyên Khoa Kỹ Thuật Cao
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Mỹ Phát Hospital đầu tư đồng bộ hệ thống 6 chuyên khoa lâm sàng và 4 khoa cận lâm sàng & tiện ích hỗ trợ, trang thiết bị số hóa hiện đại, phục vụ bệnh nhân toàn diện.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-12">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              id={`filter-cat-${cat.id.toLowerCase()}`}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                selectedCategory === cat.id
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20 scale-102'
                  : 'bg-white text-slate-600 hover:bg-teal-50 hover:text-teal-800 border border-slate-200/80'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
              <span>{cat.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {displayedDepartments.map((dept) => {
            const isBookable = dept.canBook !== false;
            return (
              <div
                key={dept.id}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-13 h-13 rounded-2xl bg-teal-50 text-teal-700 group-hover:bg-teal-700 group-hover:text-white flex items-center justify-center transition-colors duration-300 shadow-inner">
                      <span className="material-symbols-outlined text-2xl">{dept.icon}</span>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      dept.category === 'CLINICAL'
                        ? 'bg-teal-50 text-teal-800 border border-teal-200/60'
                        : 'bg-sky-50 text-sky-800 border border-sky-200/60'
                    }`}>
                      {dept.category === 'CLINICAL' ? 'Lâm sàng' : 'Cận lâm sàng & Tiện ích'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2.5 group-hover:text-teal-700 transition-colors leading-snug">
                    {dept.name}
                  </h3>
                  
                  <p className="text-slate-500 text-xs sm:text-sm mb-4 leading-relaxed line-clamp-3">
                    {dept.desc}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="material-symbols-outlined text-[16px] text-teal-600 shrink-0">meeting_room</span>
                    <span className="truncate font-medium">{dept.room}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center gap-2.5">
                  {isBookable ? (
                    <button
                      type="button"
                      id={`btn-book-dept-${dept.id}`}
                      onClick={() => onOpenBooking({ departmentId: dept.id })}
                      className="flex-1 py-2.5 px-4 bg-teal-50 hover:bg-teal-700 text-teal-800 hover:text-white rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer group/btn"
                    >
                      <span className="material-symbols-outlined text-[17px]">calendar_month</span>
                      <span>Đặt khám</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id={`btn-info-dept-${dept.id}`}
                      onClick={onOpenAllDepartments}
                      className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[17px] text-teal-600">info</span>
                      <span>Thông tin dịch vụ</span>
                    </button>
                  )}
                  <button
                    type="button"
                    id={`btn-view-dept-${dept.id}`}
                    onClick={onOpenAllDepartments}
                    className="p-2.5 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="Xem thông tin chi tiết chuyên khoa"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_outward</span>
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
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold hover:border-teal-700 hover:text-teal-800 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <span>Tra cứu toàn bộ danh mục khoa phòng & dịch vụ</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </div>
    </section>
  );
}
