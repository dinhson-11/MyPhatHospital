import React, { useState, useMemo } from 'react';
import { DOCTORS, DEPARTMENTS } from '../../services/dataService';

export default function DoctorsSection({ onOpenBooking }) {
  const [selectedDeptId, setSelectedDeptId] = useState(0); // 0 = Tất cả

  // Get unique departments present in doctors list
  const filterOptions = useMemo(() => {
    const list = [{ id: 0, name: 'Tất cả chuyên khoa' }];
    const seen = new Set();
    DOCTORS.forEach(doc => {
      if (!seen.has(doc.departmentId)) {
        seen.add(doc.departmentId);
        list.push({ id: doc.departmentId, name: doc.departmentName.replace('Khoa ', '') });
      }
    });
    return list;
  }, []);

  const filteredDoctors = useMemo(() => {
    if (selectedDeptId === 0) return DOCTORS;
    return DOCTORS.filter(d => d.departmentId === selectedDeptId);
  }, [selectedDeptId]);

  return (
    <section id="doctors" className="py-20 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-secondary text-xs font-bold uppercase tracking-wider mb-4 border border-blue-100">
            <span className="material-symbols-outlined text-sm">badge</span>
            Chuyên Gia - Bác Sĩ
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Đội Ngũ Y Bác Sĩ Chuyên Môn Cao
          </h2>
          <p className="text-slate-600 text-base sm:text-lg">
            Hội tụ các Phó Giáo sư, Tiến sĩ, Bác sĩ Chuyên khoa II từng công tác tại các bệnh viện tuyến trung ương với hơn 15+ năm kinh nghiệm điều trị.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              id={`filter-dept-${opt.id}`}
              onClick={() => setSelectedDeptId(opt.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                selectedDeptId === opt.id
                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.name}
            </button>
          ))}
        </div>

        {/* Doctors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Doctor Header Banner & Avatar */}
                <div className="relative bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 p-6 pb-0 flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={doc.avatar}
                      alt={doc.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform duration-300 bg-slate-100"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name)}&background=005440&color=fff&size=128`;
                      }}
                    />
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-1">
                      {doc.departmentName}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors leading-snug">
                      {doc.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{doc.title}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-600 pb-3 border-b border-slate-100">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-amber-500 text-sm">star</span>
                      <strong className="text-slate-900">{doc.rating}</strong> ({doc.reviewsCount} đánh giá)
                    </span>
                    <span className="font-semibold text-primary">
                      {doc.fee.toLocaleString('vi-VN')} đ/lượt
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-base">workspace_premium</span>
                    <span>{doc.experience}</span>
                  </p>

                  <p className="text-xs text-slate-600 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-base">schedule</span>
                    <span>{doc.schedule}</span>
                  </p>

                  <p className="text-xs text-slate-600 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-base">location_on</span>
                    <span>{doc.room}</span>
                  </p>
                </div>
              </div>

              {/* Action */}
              <div className="p-6 pt-0">
                <button
                  type="button"
                  id={`btn-book-doctor-${doc.id}`}
                  onClick={() => onOpenBooking({ doctorId: doc.id, departmentId: doc.departmentId })}
                  className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 group-hover:shadow-lg"
                >
                  <span className="material-symbols-outlined text-base">event_available</span>
                  Đặt Lịch Khám Ngay
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
