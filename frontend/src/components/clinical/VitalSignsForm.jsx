import React from 'react';
import { VITAL_SIGN_FIELDS, calculateBmi, parseVitalValue } from '../../services/visitService';

const BMI_TONE = {
  normal: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  warning: 'bg-amber-50 border-amber-300 text-amber-900',
  danger: 'bg-red-50 border-red-300 text-red-900'
};

const formatDecimal = (n) => String(n).replace('.', ',');

/**
 * Biểu mẫu sinh hiệu dùng chung (phòng khám bác sĩ & trạm điều dưỡng).
 * - Ô trống giữ nguyên là "chưa đo" (không bị hiểu thành 0).
 * - Mỗi ô có nhãn gắn htmlFor, đơn vị, giới hạn min/max/step theo ràng buộc backend và lỗi ngay dưới ô.
 * - BMI tính theo ngưỡng châu Á (hàm calculateBmi dùng chung).
 *
 * Props: values (chuỗi theo từng trường), errors, onChange(field, value), idPrefix, disabled.
 */
export default function VitalSignsForm({ values = {}, errors = {}, onChange, idPrefix = 'vitals', disabled = false }) {
  const weight = parseVitalValue(values.weight);
  const height = parseVitalValue(values.height);
  const bmi = !errors.weight && !errors.height && weight > 0 && height > 0 ? calculateBmi(weight, height) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {VITAL_SIGN_FIELDS.map((field) => {
          const id = `${idPrefix}-${field.key}`;
          const error = errors[field.key];
          const hintId = `${id}-hint`;
          return (
            <div key={field.key} className="form-field">
              <label htmlFor={id} className="form-label">{field.label}</label>
              <div className="relative">
                <input
                  id={id}
                  name={field.key}
                  type="number"
                  inputMode="decimal"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={values[field.key] ?? ''}
                  disabled={disabled}
                  onChange={(e) => onChange?.(field.key, e.target.value)}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={hintId}
                  className={`input pr-20 font-semibold tabular-nums ${error ? 'is-error' : ''}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
                  {field.unit}
                </span>
              </div>
              {error ? (
                <p id={hintId} className="form-error">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
                  {error}
                </p>
              ) : (
                <p id={hintId} className="form-hint">
                  {field.normal ? `Bình thường: ${field.normal}` : `Từ ${formatDecimal(field.min)} đến ${formatDecimal(field.max)}`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div aria-live="polite" className="min-h-[1.5rem]">
        {bmi ? (
          <span
            data-testid={`${idPrefix}-bmi`}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${BMI_TONE[bmi.tone]}`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">monitor_weight</span>
            BMI {formatDecimal(bmi.bmi)} kg/m² · {bmi.category}
          </span>
        ) : (
          <span className="text-xs text-slate-500">BMI tự tính khi nhập cân nặng và chiều cao (ngưỡng người châu Á).</span>
        )}
      </div>
    </div>
  );
}
