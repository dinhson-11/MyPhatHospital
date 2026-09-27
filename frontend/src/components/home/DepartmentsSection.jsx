import React from 'react';
import { DEPARTMENTS } from '../../services/dataService';

export default function DepartmentsSection({ onOpenBooking, onOpenAllDepartments }) {
  // Show top 6 departments on the home page, rest available via modal
  const featuredDepartments = DEPARTMENTS.slice(0, 6);

  return (
    <section id="departments" className="py-20 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-primary-dark text-xs font-bold uppercase tracking-wider mb-4 border border-emerald-200">
            <span className="material-symbols-outlined text-sm">local_hospital</span>
            Chuyên Khoa Trọng Điểm
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Đa Dạng Chuyên Khoa Kỹ Thuật Cao
          </h2>
          <p className="text-slate-600 text-base sm:text-lg">
            Hệ thống 10 chuyên khoa lâm sàng và cận lâm sàng trang bị máy móc hiện đại bậc nhất khu vực, đạt chuẩn an toàn y tế quốc tế.
          </p>
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredDepartments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-primary group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors duration-300 shadow-inner">
                    <span className="material-symbols-outlined text-3xl">{dept.icon}</span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">group</span>
                    {dept.doctorsCount} Bác sĩ
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-primary transition-colors">
                  {dept.name}
                </h3>
                
                <p className="text-slate-500 text-sm mb-4 leading-relaxed line-clamp-3">
                  {dept.desc}
                </p>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-6 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="material-symbols-outlined text-sm text-primary">meeting_room</span>
                  <span className="truncate">{dept.room}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  type="button"
                  id={`btn-book-dept-${dept.id}`}
                  onClick={() => onOpenBooking({ departmentId: dept.id })}
                  className="flex-1 py-2.5 px-4 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">calendar_month</span>
                  Đặt khám
                </button>
                <button
                  type="button"
                  id={`btn-view-dept-${dept.id}`}
                  onClick={onOpenAllDepartments}
                  className="p-2.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-xl transition-colors"
                  title="Xem thông tin chi tiết chuyên khoa"
                >
                  <span className="material-symbols-outlined text-lg">info</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* View All Departments Button */}
        <div className="mt-12 text-center">
          <button
            type="button"
            id="btn-view-all-departments"
            onClick={onOpenAllDepartments}
            className="inline-flex items-center gap-3 px-8 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold hover:border-primary hover:text-primary shadow-sm hover:shadow transition-all duration-200"
          >
            <span>Xem đầy đủ danh mục 10 Chuyên khoa</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </div>
    </section>
  );
}
