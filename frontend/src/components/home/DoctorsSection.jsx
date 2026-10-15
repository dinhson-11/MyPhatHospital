import React, { useState, useMemo, useSyncExternalStore } from 'react';
import { DOCTORS, getCatalogVersion, subscribeCatalog } from '../../services/dataService';
import Avatar from '../common/Avatar';

export default function DoctorsSection({ onOpenBooking }) {
  const [selectedDeptId, setSelectedDeptId] = useState(0); // 0 = Tất cả
  // Vẽ lại khi đồng bộ xong với máy chủ (ảnh đại diện, mã bác sĩ thật)
  useSyncExternalStore(subscribeCatalog, getCatalogVersion, getCatalogVersion);

  // Danh sách khoa có trong danh sách bác sĩ
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-fixed text-primary text-xs font-bold uppercase tracking-wider mb-4 border border-primary-fixed-dim">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">badge</span>
            <span>Đội Ngũ Bác Sĩ & Chuyên Gia</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Đội Ngũ Bác Sĩ Chuyên Môn Cao
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Đội ngũ y bác sĩ giàu y đức, vững tay nghề, nhiều năm kinh nghiệm lâm sàng, luôn tận tụy phục vụ vì sức khỏe nhân dân.
          </p>
        </div>

        {/* Lọc bác sĩ theo khoa */}
        <div role="group" aria-label="Lọc bác sĩ theo khoa" className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {filterOptions.map((opt) => {
            const selected = selectedDeptId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                id={`filter-dept-${opt.id}`}
                aria-pressed={selected}
                onClick={() => setSelectedDeptId(opt.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  selected
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-white text-slate-600 hover:bg-primary-fixed hover:text-primary border border-slate-200/80'
                }`}
              >
                {opt.name}
              </button>
            );
          })}
        </div>

        {/* Danh sách bác sĩ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Ảnh & tên bác sĩ */}
                <div className="relative bg-gradient-to-br from-primary-fixed via-white to-slate-50 p-6 pb-4 flex items-center gap-4 border-b border-slate-100">
                  <div className="relative shrink-0">
                    <Avatar
                      name={doc.name}
                      src={doc.avatarUrl}
                      alt={doc.name}
                      className="avatar w-20 h-20 rounded-2xl text-2xl border-2 border-white shadow-md group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="overflow-hidden">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-white text-primary text-xs font-bold mb-1 max-w-full truncate border border-primary-fixed-dim">
                      {doc.departmentName}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-primary transition-colors leading-snug">
                      {doc.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{doc.title}</p>
                  </div>
                </div>

                {/* Thông tin chi tiết */}
                <div className="p-6 space-y-3.5">
                  <p className="text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                    <span aria-hidden="true" className="material-symbols-outlined text-teal-600 text-[17px] shrink-0 mt-0.5">workspace_premium</span>
                    <span>{doc.experience}</span>
                  </p>

                  <p className="text-xs text-slate-600 flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-slate-400 text-[17px] shrink-0">schedule</span>
                    <span>{doc.schedule}</span>
                  </p>

                  <p className="text-xs text-slate-600 flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-slate-400 text-[17px] shrink-0">location_on</span>
                    <span className="font-medium text-slate-700">{doc.room}</span>
                  </p>

                  {doc.canBook !== false && (
                    <div className="pt-3 flex items-center justify-end border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => onOpenBooking({ doctorId: doc.id, departmentId: doc.departmentId })}
                        aria-label={`Đặt lịch khám với ${doc.name}`}
                        className="text-xs font-bold text-white bg-primary hover:bg-primary-dark px-3 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        Đặt lịch khám
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Thanh thông tin cuối thẻ */}
              <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 text-teal-800 font-medium">
                  <span aria-hidden="true" className="material-symbols-outlined text-[14px] text-teal-600">verified</span>
                  Đạt chuẩn y đức
                </span>
                <span className="text-slate-500">Mỹ Phát Hospital</span>
              </div>
            </div>
          ))}
        </div>

        {/* Khối kêu gọi đặt lịch */}
        <div className="mt-14 rounded-2xl bg-primary-fixed border border-primary-fixed-dim p-8 sm:p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-primary text-xs font-bold uppercase tracking-wider mb-2 border border-primary-fixed-dim">
              <span aria-hidden="true" className="material-symbols-outlined text-[15px]">calendar_add_on</span>
              Dịch Vụ Đặt Khám Trực Tuyến
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-slate-900">
              Đặt Lịch Khám Riêng Với Bác Sĩ Chuyên Khoa
            </h3>
            <p className="text-slate-600 text-sm mt-2 leading-relaxed">
              Chủ động chọn chuyên khoa, bác sĩ phụ trách, ngày giờ khám phù hợp và nhận phiếu hẹn điện tử ngay tại nhà, hạn chế thời gian xếp hàng.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
            <button
              type="button"
              id="btn-section-open-booking"
              onClick={() => onOpenBooking()}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-primary hover:bg-primary-dark text-white font-label text-sm font-bold shadow-lg shadow-primary/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">calendar_month</span>
              <span>Đặt Lịch Khám Tại Đây</span>
            </button>
            <a
              href="tel:0789065493"
              aria-label="Gọi hotline 0789 065 493"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-label text-sm font-bold border border-slate-200 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-red-600">call</span>
              <span>0789 065 493</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
