import React, { useState, useMemo } from 'react';
import { DEPARTMENTS } from '../../services/dataService';

const CLINICAL_COUNT = DEPARTMENTS.filter((d) => d.category === 'CLINICAL').length;
const SUPPORT_COUNT = DEPARTMENTS.filter((d) => d.category === 'SUPPORT').length;

const CATEGORIES = [
  { id: 'ALL', name: 'Tất cả khoa phòng', count: DEPARTMENTS.length },
  { id: 'CLINICAL', name: 'Chuyên khoa lâm sàng', count: CLINICAL_COUNT },
  { id: 'SUPPORT', name: 'Cận lâm sàng & Tiện ích', count: SUPPORT_COUNT }
];

export default function DepartmentsSection({ onOpenBooking, onOpenAllDepartments }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL'); // 'ALL' | 'CLINICAL' | 'SUPPORT'

  const displayedDepartments = useMemo(() => {
    if (selectedCategory === 'ALL') return DEPARTMENTS;
    return DEPARTMENTS.filter((d) => d.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <section id="departments" className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div aria-hidden="true" className="h-1 w-10 bg-primary mb-3" />
        <h2 className="text-3xl font-semibold text-slate-900 mb-2">Khoa phòng</h2>
        <p className="text-slate-700 mb-6">
          {CLINICAL_COUNT} chuyên khoa lâm sàng và {SUPPORT_COUNT} khoa cận lâm sàng, tiện ích hỗ trợ.
        </p>

        <div role="group" aria-label="Lọc theo nhóm khoa phòng" className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => {
            const selected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                id={`filter-cat-${cat.id.toLowerCase()}`}
                aria-pressed={selected}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${
                  selected
                    ? 'border-primary bg-primary-fixed text-primary font-semibold'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            );
          })}
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 md:gap-x-10 border-t border-slate-200">
          {displayedDepartments.map((dept) => {
            const isBookable = dept.canBook !== false;
            return (
              <li key={dept.id} className="py-4 pl-4 border-b border-slate-200 border-l-4 border-l-primary-fixed-dim hover:border-l-primary">
                <h3 className="font-semibold text-slate-900 text-lg">{dept.name}</h3>
                <p className="text-sm text-slate-600 mt-0.5">{dept.room}</p>
                <p className="text-slate-700 mt-2 line-clamp-2">{dept.desc}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm">
                  {isBookable ? (
                    <button
                      type="button"
                      id={`btn-book-dept-${dept.id}`}
                      onClick={() => onOpenBooking({ departmentId: dept.id })}
                      aria-label={`Đặt khám ${dept.name}`}
                      className="link-btn"
                    >
                      Đặt khám
                    </button>
                  ) : (
                    <button
                      type="button"
                      id={`btn-info-dept-${dept.id}`}
                      onClick={onOpenAllDepartments}
                      aria-label={`Thông tin dịch vụ ${dept.name}`}
                      className="link-btn"
                    >
                      Thông tin dịch vụ
                    </button>
                  )}
                  <button
                    type="button"
                    id={`btn-view-dept-${dept.id}`}
                    onClick={onOpenAllDepartments}
                    aria-label={`Xem chi tiết ${dept.name}`}
                    className="link-btn"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-6">
          <button type="button" id="btn-view-all-departments" onClick={onOpenAllDepartments} className="link-btn">
            Xem toàn bộ danh mục khoa phòng và dịch vụ
          </button>
        </p>
      </div>
    </section>
  );
}
