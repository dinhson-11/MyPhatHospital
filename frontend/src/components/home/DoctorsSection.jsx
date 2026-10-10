import React, { useState, useMemo } from 'react';
import { DOCTORS } from '../../services/dataService';

export default function DoctorsSection({ onOpenBooking }) {
  const [selectedDeptId, setSelectedDeptId] = useState(0); // 0 = Tất cả

  // Get unique departments present in doctors list
  const filterOptions = useMemo(() => {
    const list = [{ id: 0, name: 'Tất cả khoa phòng' }];
    const seen = new Set();
    DOCTORS.forEach((doc) => {
      if (!seen.has(doc.departmentId)) {
        seen.add(doc.departmentId);
        list.push({ id: doc.departmentId, name: doc.departmentName.replace('Khoa ', '') });
      }
    });
    return list;
  }, []);

  const filteredDoctors = useMemo(() => {
    if (selectedDeptId === 0) return DOCTORS;
    return DOCTORS.filter((d) => d.departmentId === selectedDeptId);
  }, [selectedDeptId]);

  return (
    <section id="doctors" className="py-20 bg-slate-50/60 relative border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100 text-teal-900 text-xs font-bold uppercase tracking-wider mb-4 border border-teal-200">
            <span className="material-symbols-outlined text-[16px] text-teal-700">badge</span>
            <span>Đội Ngũ Bác Sĩ & Chuyên Gia</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Đội Ngũ Bác Sĩ Chuyên Môn Cao
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Hội đồng y bác sĩ giàu y đức, vững tay nghề, từng công tác tại các bệnh viện lớn với hơn 15+ năm kinh nghiệm, luôn tận tụy phục vụ vì sức khỏe nhân dân.
          </p>
        </div>

        {/* Filter Tabs by Department */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              id={`filter-dept-${opt.id}`}
              onClick={() => setSelectedDeptId(opt.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                selectedDeptId === opt.id
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20 scale-103'
                  : 'bg-white text-slate-600 hover:bg-teal-50 hover:text-teal-800 border border-slate-200/80'
              }`}
            >
              {opt.name}
            </button>
          ))}
        </div>

        {/* Doctors Executive Grid - Clean, Professional & Clutter-Free */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Doctor Header Banner & Avatar */}
                <div className="relative bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-slate-50 p-6 pb-4 flex items-center gap-4 border-b border-slate-100">
                  <div className="relative shrink-0">
                    <img
                      src={doc.avatar}
                      alt={doc.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md group-hover:scale-103 transition-transform duration-300 bg-slate-100"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name)}&background=0f766e&color=fff&size=128`;
                      }}
                    />
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div className="overflow-hidden">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold mb-1 max-w-full truncate border border-teal-200/70">
                      {doc.departmentName}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-snug">
                      {doc.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{doc.title}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 space-y-3.5">
                  <div className="flex items-center justify-between text-xs text-slate-600 pb-3 border-b border-slate-100">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-amber-500 text-sm">star</span>
                      <strong className="text-slate-900">{doc.rating}</strong> ({doc.reviewsCount} đánh giá)
                    </span>
                    <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                      Chính quy • Tận tâm
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                    <span className="material-symbols-outlined text-teal-600 text-[17px] shrink-0 mt-0.5">workspace_premium</span>
                    <span>{doc.experience}</span>
                  </p>

                  <p className="text-xs text-slate-600 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[17px] shrink-0">schedule</span>
                    <span>{doc.schedule}</span>
                  </p>

                  <p className="text-xs text-slate-600 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[17px] shrink-0">location_on</span>
                    <span className="font-medium text-slate-700">{doc.room}</span>
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span />
                    {doc.canBook !== false && (
                      <button
                        type="button"
                        onClick={() => onOpenBooking({ doctorId: doc.id, departmentId: doc.departmentId })}
                        className="text-[11px] font-bold text-white bg-teal-700 hover:bg-teal-800 px-3 py-1 rounded-xl transition-all shadow-2xs cursor-pointer hover:scale-102"
                      >
                        Đặt lịch khám
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Card Bar: Informational Status */}
              <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-teal-800 font-medium">
                  <span className="material-symbols-outlined text-[14px] text-teal-600">verified</span>
                  Đạt chuẩn y đức
                </span>
                <span className="text-slate-400">
                  Mỹ Phát Hospital
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Dedicated Call to Action for Appointment Booking (Separate from Doctors Directory) */}
        <div className="mt-14 rounded-3xl bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-800/80 text-teal-200 text-xs font-bold uppercase tracking-wider mb-2 border border-teal-700">
              <span className="material-symbols-outlined text-[15px]">calendar_add_on</span>
              Dịch Vụ Đặt Khám Trực Tuyến
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              Đặt Lịch Khám Riêng Với Bác Sĩ Chuyên Khoa
            </h3>
            <p className="text-teal-100/90 text-sm mt-2 leading-relaxed">
              Chủ động chọn chuyên khoa, bác sĩ phụ trách, ngày giờ khám linh hoạt và nhận phiếu khám điện tử có mã số ưu tiên ngay tại nhà, không cần xếp hàng.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
            <button
              type="button"
              id="btn-section-open-booking"
              onClick={() => onOpenBooking()}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white text-teal-900 hover:bg-teal-50 font-label text-sm font-bold shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-102"
            >
              <span className="material-symbols-outlined text-[20px] text-teal-700">calendar_month</span>
              <span>Đặt Lịch Khám Tại Đây</span>
            </button>
            <a
              href="tel:0789065493"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-teal-800/90 hover:bg-teal-700 text-white font-label text-sm font-bold border border-teal-600/60 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px] text-rose-400 animate-pulse">call</span>
              <span>0789 065 493</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
