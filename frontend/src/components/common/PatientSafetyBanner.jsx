import React from 'react';

/**
 * PatientSafetyBanner: Thanh cảnh báo an toàn lâm sàng dành cho Bác sĩ & Điều dưỡng
 * Đảm bảo các thông tin sống còn (Dị ứng thuốc, Sinh hiệu nguy kịch) luôn hiển thị trực quan
 */
export default function PatientSafetyBanner({ allergies = [], vitalWarnings = [], className = '' }) {
  const hasAllergies = Array.isArray(allergies) && allergies.length > 0;
  const hasWarnings = Array.isArray(vitalWarnings) && vitalWarnings.length > 0;

  if (!hasAllergies && !hasWarnings) {
    return (
      <div className={`p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 ${className}`}>
        <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">
          verified_user
        </span>
        <span className="font-semibold">An toàn lâm sàng:</span>
        <span>Chưa ghi nhận dị ứng thuốc & sinh hiệu trong ngưỡng an toàn</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Cảnh báo dị ứng thuốc - Bắt buộc nhận diện tức thì */}
      {hasAllergies && (
        <div className="p-3 bg-red-50 dark:bg-red-950/50 border-2 border-red-500/80 rounded-xl flex flex-wrap items-center gap-3 text-red-900 dark:text-red-100 shadow-xs animate-pulse">
          <div className="flex items-center gap-1.5 shrink-0 bg-red-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px]">warning</span>
            <span>CẢNH BÁO DỊ ỨNG</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {allergies.map((allergy, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-xs font-bold"
              >
                ⚠️ {typeof allergy === 'object' ? `${allergy.allergen || allergy.name} (${allergy.reaction || 'Nguy kịch'})` : allergy}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cảnh báo sinh hiệu bất thường */}
      {hasWarnings && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded-r-xl flex flex-wrap items-center gap-3 text-amber-900 dark:text-amber-100">
          <div className="flex items-center gap-1.5 shrink-0 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase">
            <span className="material-symbols-outlined text-[18px]">vital_signs</span>
            <span>SINH HIỆU BẤT THƯỜNG:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {vitalWarnings.map((warn, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-semibold"
              >
                • {warn}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
