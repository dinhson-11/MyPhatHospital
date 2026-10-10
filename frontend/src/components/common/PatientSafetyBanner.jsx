import React from 'react';
import { SEVERITY_LABELS } from '../../utils/format';

/**
 * PatientSafetyBanner – thanh cảnh báo an toàn người bệnh (dị ứng + sinh hiệu bất thường).
 *
 * Phân biệt rõ 3 trạng thái dị ứng để không gây hiểu nhầm:
 *  - 'loading'/'error': CHƯA XÁC ĐỊNH được dị ứng (không được hiển thị là "an toàn")
 *  - 'ready' + danh sách rỗng: chưa ghi nhận dị ứng
 *  - 'ready' + có dữ liệu: cảnh báo dị ứng màu đỏ
 *
 * Props: allergies (mảng đối tượng {allergen, severity, note} hoặc chuỗi), allergiesStatus,
 * onRetryAllergies, vitalWarnings (mảng chuỗi), className.
 */
const SEVERE_FIRST = { SEVERE: 0, CRITICAL: 0, MODERATE: 1, WARNING: 1, MILD: 2 };

export default function PatientSafetyBanner({
  allergies = [],
  allergiesStatus = 'ready',
  onRetryAllergies,
  vitalWarnings = [],
  className = ''
}) {
  const list = Array.isArray(allergies) ? allergies : [];
  const warnings = Array.isArray(vitalWarnings) ? vitalWarnings : [];
  const allergyUnknown = allergiesStatus === 'loading' || allergiesStatus === 'error';
  const hasAllergies = !allergyUnknown && list.length > 0;
  const sorted = [...list].sort((a, b) =>
    (SEVERE_FIRST[String(a?.severity || '').toUpperCase()] ?? 3) - (SEVERE_FIRST[String(b?.severity || '').toUpperCase()] ?? 3));

  return (
    <section aria-label="Cảnh báo an toàn người bệnh" className={`space-y-2 ${className}`}>
      {allergiesStatus === 'loading' && (
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-[13px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] animate-spin" aria-hidden="true">progress_activity</span>
          Đang tải thông tin dị ứng của bệnh nhân…
        </div>
      )}

      {allergiesStatus === 'error' && (
        <div role="alert" className="p-3 rounded-xl border-2 border-amber-500 bg-amber-50 text-amber-950 text-[13px] flex flex-wrap items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-amber-700" aria-hidden="true">help</span>
          <span className="font-semibold">Chưa xác định được tiền sử dị ứng</span>
          <span>– hỏi lại bệnh nhân trước khi kê đơn.</span>
          {onRetryAllergies && (
            <button type="button" onClick={onRetryAllergies} className="btn btn-secondary btn-sm ml-auto">
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
              Tải lại
            </button>
          )}
        </div>
      )}

      {hasAllergies && (
        <div className="p-3 rounded-xl border-2 border-red-600 bg-red-50 text-red-950 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 shrink-0 bg-red-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">warning</span>
            Dị ứng
          </span>
          <ul className="flex flex-wrap items-center gap-2" aria-label="Danh sách dị ứng">
            {sorted.map((allergy, idx) => {
              const isObj = allergy && typeof allergy === 'object';
              const name = isObj ? allergy.allergen || allergy.name : allergy;
              const sev = isObj ? SEVERITY_LABELS[String(allergy.severity || '').toUpperCase()] : null;
              return (
                <li
                  key={(isObj && allergy.id) || `${name}-${idx}`}
                  className="px-2.5 py-1 rounded-md bg-white border border-red-300 text-red-800 text-xs font-bold"
                  title={isObj && allergy.note ? allergy.note : undefined}
                >
                  {name}{sev ? ` · ${sev}` : ''}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!allergyUnknown && !hasAllergies && (
        <div className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-[13px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-slate-500" aria-hidden="true">info</span>
          Chưa ghi nhận dị ứng trong hồ sơ.
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-3 rounded-xl border-l-4 border-amber-500 bg-amber-50 text-amber-950 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-bold text-[13px] text-amber-800">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">vital_signs</span>
            Sinh hiệu bất thường:
          </span>
          <ul className="flex flex-wrap items-center gap-2">
            {warnings.map((warn) => (
              <li key={warn} className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-semibold">
                {warn}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
