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
    <section id="doctors" className="bg-slate-50 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div aria-hidden="true" className="h-1 w-10 bg-primary mb-3" />
        <h2 className="text-3xl font-semibold text-slate-900 mb-2">Bác sĩ</h2>
        <p className="text-slate-700 mb-6">Lọc theo khoa để xem lịch khám và phòng khám của từng bác sĩ.</p>

        <div role="group" aria-label="Lọc bác sĩ theo khoa" className="flex flex-wrap gap-2 mb-6">
          {filterOptions.map((opt) => {
            const selected = selectedDeptId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                id={`filter-dept-${opt.id}`}
                aria-pressed={selected}
                onClick={() => setSelectedDeptId(opt.id)}
                className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${
                  selected
                    ? 'border-primary bg-white text-primary font-semibold'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {opt.name}
              </button>
            );
          })}
        </div>

        <ul className="border-t border-slate-300">
          {filteredDoctors.map((doc) => (
            <li
              key={doc.id}
              className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_7.5rem] gap-x-8 gap-y-2 py-4 border-b border-slate-300 items-start"
            >
              <div className="flex items-start gap-4">
                <Avatar
                  name={doc.name}
                  src={doc.avatarUrl}
                  alt={doc.name}
                  className="shrink-0 w-12 h-12 rounded-full bg-primary-fixed-dim text-primary font-semibold flex items-center justify-center"
                />
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 text-lg leading-snug">{doc.name}</h3>
                  <p className="text-sm text-slate-600">{doc.title}</p>
                  <p className="text-sm text-primary font-medium">{doc.departmentName}</p>
                </div>
              </div>

              <div className="text-slate-700">
                <p>{doc.experience}</p>
                <p className="text-sm text-slate-600 mt-1">
                  {doc.schedule} · {doc.room}
                </p>
              </div>

              <div>
                {doc.canBook !== false && (
                  <button
                    type="button"
                    onClick={() => onOpenBooking({ doctorId: doc.id, departmentId: doc.departmentId })}
                    aria-label={`Đặt lịch khám với ${doc.name}`}
                    className="btn btn-outline btn-sm"
                  >
                    Đặt lịch khám
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
