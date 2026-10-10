import React, { useState } from 'react';
import { AI_DISCLAIMER_TEXT } from '../../services/aiAlertService';
import { SEVERITY_LABELS, severityLevel } from '../../utils/format';

/**
 * DrugInteractionAlert – hiển thị cảnh báo tương tác thuốc & dị ứng.
 *
 * - Mức độ chuẩn hóa bằng severityLevel(): CRITICAL/SEVERE = nghiêm trọng (đỏ), WARNING/MODERATE = thận trọng (vàng).
 * - Cảnh báo nghiêm trọng: role="alert", luôn hiển thị chi tiết (không cho thu gọn).
 * - Kết quả từ quy tắc cục bộ (dịch vụ AI không phản hồi) được ghi chú rõ.
 */
const LEVEL_BADGE = {
  critical: 'bg-red-700 text-white',
  warning: 'bg-amber-600 text-white',
  info: 'bg-slate-600 text-white'
};

const REACTION_LABELS = {
  DIRECT_MATCH: 'Dị ứng trực tiếp',
  CROSS_REACTIVITY: 'Dị ứng chéo'
};

const severityText = (sev) => SEVERITY_LABELS[String(sev || '').toUpperCase()] || 'Cần lưu ý';

export default function DrugInteractionAlert({
  safetyData = null,
  interactions = [],
  allergyAlerts = [],
  disclaimer = AI_DISCLAIMER_TEXT,
  showSafeStatus = false,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const allInteractions = safetyData?.interactions || interactions || [];
  const allAllergies = safetyData?.allergy_alerts || allergyAlerts || [];
  const displayDisclaimer = safetyData?.disclaimer || disclaimer || AI_DISCLAIMER_TEXT;
  const isLocal = safetyData?.source === 'local';

  const interactionCount = allInteractions.length;
  const allergyCount = allAllergies.length;
  const totalWarnings = interactionCount + allergyCount;

  const hasCritical =
    allInteractions.some((i) => severityLevel(i.severity) === 'critical') ||
    allAllergies.some((a) => severityLevel(a.severity) === 'critical');

  if (totalWarnings === 0 && !showSafeStatus) return null;

  const localNote = isLocal && (
    <p className="text-xs mt-1 flex items-center gap-1">
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">cloud_off</span>
      Dịch vụ AI không phản hồi – kết quả từ bộ quy tắc cục bộ, chỉ bao phủ các cặp thuốc phổ biến.
    </p>
  );

  if (totalWarnings === 0) {
    return (
      <div
        data-testid="drug-alert-safe"
        role="status"
        className={`rounded-xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 ${className}`}
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">verified</span>
          </span>
          <div className="flex-1">
            <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
              <span>Đơn thuốc an toàn</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200/80 font-semibold">Đã kiểm tra</span>
            </div>
            <p className="text-[13px] mt-0.5">
              Không phát hiện tương tác thuốc bất lợi hoặc xung đột với tiền sử dị ứng đã ghi nhận.
            </p>
            {localNote}
          </div>
        </div>
      </div>
    );
  }

  const theme = hasCritical
    ? {
        container: 'bg-red-50 border-red-400 text-red-950',
        icon: 'emergency_home',
        iconColor: 'text-red-700',
        title: 'Cảnh báo nguy cơ cao – cần xem xét trước khi kê đơn',
        badge: LEVEL_BADGE.critical,
        badgeText: 'Nghiêm trọng'
      }
    : {
        container: 'bg-amber-50 border-amber-300 text-amber-950',
        icon: 'warning',
        iconColor: 'text-amber-700',
        title: 'Cảnh báo cần thận trọng',
        badge: LEVEL_BADGE.warning,
        badgeText: 'Cần thận trọng'
      };

  const showDetails = hasCritical || isExpanded;

  return (
    <div
      data-testid="drug-interaction-alert-banner"
      role={hasCritical ? 'alert' : 'status'}
      className={`rounded-2xl border-2 p-4 space-y-3 ${theme.container} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0">
            <span className={`material-symbols-outlined text-[24px] ${theme.iconColor}`} aria-hidden="true">{theme.icon}</span>
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm">{theme.title}</h4>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${theme.badge}`}>{theme.badgeText}</span>
            </div>
            <p className="text-[13px] mt-0.5">
              Phát hiện{' '}
              <strong>
                {interactionCount > 0 ? `${interactionCount} tương tác thuốc` : ''}
                {interactionCount > 0 && allergyCount > 0 ? ' và ' : ''}
                {allergyCount > 0 ? `${allergyCount} nguy cơ dị ứng` : ''}
              </strong>{' '}
              trong đơn thuốc.
            </p>
            {localNote}
          </div>
        </div>

        {!hasCritical && (
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className="btn btn-secondary btn-sm shrink-0"
          >
            <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
            <span className="material-symbols-outlined" aria-hidden="true">{isExpanded ? 'expand_less' : 'expand_more'}</span>
          </button>
        )}
      </div>

      {showDetails && (
        <div className="space-y-3 pt-1">
          {interactionCount > 0 && (
            <div className="space-y-2">
              <h5 className="text-[13px] font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">sync_problem</span>
                Tương tác giữa các thuốc ({interactionCount})
              </h5>
              <ul className="space-y-2">
                {allInteractions.map((item, idx) => {
                  const level = severityLevel(item.severity);
                  return (
                    <li
                      key={idx}
                      data-testid={`interaction-item-${idx}`}
                      className={`p-3.5 rounded-xl border bg-white text-[13px] space-y-1.5 ${level === 'critical' ? 'border-red-300' : 'border-amber-200'}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="font-bold text-sm flex items-center gap-1.5 text-slate-900">
                          <span>{item.drug_a_name || item.drugAName}</span>
                          <span className="material-symbols-outlined text-[16px] text-slate-500" aria-hidden="true">swap_horiz</span>
                          <span className="sr-only">và</span>
                          <span>{item.drug_b_name || item.drugBName}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${LEVEL_BADGE[level]}`}>
                          {severityText(item.severity)}
                        </span>
                      </div>
                      {item.mechanism && (
                        <p className="text-slate-700"><strong className="text-slate-900">Cơ chế: </strong>{item.mechanism}</p>
                      )}
                      {item.description && (
                        <p className="text-slate-900 font-medium"><strong className="text-red-800">Hậu quả: </strong>{item.description}</p>
                      )}
                      {item.recommendation && (
                        <p className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900">
                          <strong className="text-primary">Khuyến cáo xử trí: </strong>{item.recommendation}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {allergyCount > 0 && (
            <div className="space-y-2 pt-2 border-t border-current/10">
              <h5 className="text-[13px] font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">allergies</span>
                Xung đột tiền sử dị ứng bệnh nhân ({allergyCount})
              </h5>
              <ul className="space-y-2">
                {allAllergies.map((allergy, idx) => {
                  const level = severityLevel(allergy.severity);
                  return (
                    <li
                      key={idx}
                      data-testid={`allergy-item-${idx}`}
                      className={`p-3.5 rounded-xl border bg-white text-[13px] space-y-1.5 ${level === 'critical' ? 'border-red-300' : 'border-amber-200'}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="font-bold text-sm text-slate-900 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Thuốc: <strong className="text-primary">{allergy.drug_name || allergy.drugName}</strong></span>
                          <span>Dị ứng: <strong className="text-red-800">{allergy.allergen}</strong></span>
                        </div>
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                            {REACTION_LABELS[allergy.reaction_type] || 'Nguy cơ dị ứng'}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${LEVEL_BADGE[level]}`}>
                            {severityText(allergy.severity)}
                          </span>
                        </span>
                      </div>
                      {allergy.description && (
                        <p className="text-slate-900 font-medium"><strong className="text-red-800">Nguy cơ: </strong>{allergy.description}</p>
                      )}
                      {allergy.recommendation && (
                        <p className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900">
                          <strong className="text-primary">Khuyến cáo: </strong>{allergy.recommendation}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <p
            data-testid="ai-medical-disclaimer"
            className="pt-2 border-t border-current/10 flex items-center gap-2 text-xs text-slate-700 italic"
          >
            <span className="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">info</span>
            <span>{displayDisclaimer}</span>
          </p>
        </div>
      )}
    </div>
  );
}
