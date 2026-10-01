import React, { useState } from 'react';
import { AI_DISCLAIMER_TEXT } from '../../services/aiAlertService';

/**
 * DrugInteractionAlert (Sprint 5 - FR-11.1, FR-11.2, NFR-8)
 * Component hiển thị cảnh báo tương tác thuốc và dị ứng do AI phân tích.
 */
export default function DrugInteractionAlert({
  safetyData = null,
  interactions = [],
  allergyAlerts = [],
  disclaimer = AI_DISCLAIMER_TEXT,
  showSafeStatus = false,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Chuẩn hóa dữ liệu đầu vào (từ safetyData hoặc props riêng lẻ)
  const allInteractions = safetyData?.interactions || interactions || [];
  const allAllergies = safetyData?.allergy_alerts || allergyAlerts || [];
  const displayDisclaimer = safetyData?.disclaimer || disclaimer || AI_DISCLAIMER_TEXT;

  const interactionCount = allInteractions.length;
  const allergyCount = allAllergies.length;
  const totalWarnings = interactionCount + allergyCount;

  // Xác định mức độ nghiêm trọng cao nhất
  const hasCritical =
    allInteractions.some(i => i.severity === 'CRITICAL') ||
    allAllergies.some(a => a.severity === 'CRITICAL');

  const hasWarning = totalWarnings > 0;

  // Nếu không có cảnh báo và không yêu cầu hiển thị trạng thái an toàn thì không render
  if (!hasWarning && !showSafeStatus) {
    return null;
  }

  // Trường hợp an toàn (Không phát hiện tương tác hay dị ứng)
  if (!hasWarning && showSafeStatus) {
    return (
      <div
        data-testid="drug-alert-safe"
        className={`rounded-xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 transition-all ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <span className="material-symbols-outlined text-[20px]">verified</span>
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-emerald-800 flex items-center gap-2">
              <span>Đơn thuốc an toàn</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-200/80 font-medium text-emerald-800">
                AI Verified
              </span>
            </div>
            <p className="text-xs text-emerald-700 mt-0.5">
              Hệ thống AI không phát hiện tương tác thuốc bất lợi hoặc xung đột với tiền sử dị ứng đã ghi nhận của bệnh nhân.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Trường hợp CÓ CẢNH BÁO
  const theme = hasCritical
    ? {
        container: 'bg-red-50/90 border-red-300 text-red-950',
        badge: 'bg-red-600 text-white',
        accentBg: 'bg-white/80 border-red-200/70',
        icon: 'emergency_home',
        iconColor: 'text-red-600',
        title: 'Cảnh báo lâm sàng nguy cơ cao (CRITICAL)'
      }
    : {
        container: 'bg-amber-50/90 border-amber-300 text-amber-950',
        badge: 'bg-amber-600 text-white',
        accentBg: 'bg-white/80 border-amber-200/70',
        icon: 'warning',
        iconColor: 'text-amber-600',
        title: 'Cảnh báo tương tác thuốc cần chú ý (WARNING)'
      };

  return (
    <div
      data-testid="drug-interaction-alert-banner"
      className={`rounded-2xl border p-4 shadow-sm space-y-3 transition-all animate-fade-in ${theme.container} ${className}`}
    >
      {/* Header Banner */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0">
            <span className={`material-symbols-outlined text-[24px] ${theme.iconColor}`}>
              {theme.icon}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-headline font-bold text-sm tracking-tight text-on-surface">
                {theme.title}
              </h4>
              <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${theme.badge}`}>
                {hasCritical ? 'NGHIÊM TRỌNG' : 'CẦN THEO DÕI'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Phát hiện{' '}
              <strong className="text-primary font-bold">
                {interactionCount > 0 ? `${interactionCount} tương tác thuốc` : ''}
                {interactionCount > 0 && allergyCount > 0 ? ' và ' : ''}
                {allergyCount > 0 ? `${allergyCount} nguy cơ dị ứng` : ''}
              </strong>{' '}
              trong đơn thuốc hiện tại.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/70 hover:bg-white text-on-surface-variant border border-outline-variant/30 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          aria-label={isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
        >
          <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
          <span className="material-symbols-outlined text-[16px]">
            {isExpanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {/* Expanded Details Body */}
      {isExpanded && (
        <div className="space-y-3 pt-1">
          {/* 1. Phần Tương tác thuốc (DDI) */}
          {interactionCount > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-primary">sync_problem</span>
                <span>Tương tác giữa các thuốc ({interactionCount})</span>
              </div>

              <div className="space-y-2">
                {allInteractions.map((item, idx) => {
                  const isCrit = item.severity === 'CRITICAL';
                  return (
                    <div
                      key={idx}
                      data-testid={`interaction-item-${idx}`}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${theme.accentBg}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="font-bold text-sm flex items-center gap-1.5 text-on-surface">
                          <span className="text-primary">{item.drug_a_name || item.drugAName}</span>
                          <span className="material-symbols-outlined text-[16px] text-outline">swap_horiz</span>
                          <span className="text-primary">{item.drug_b_name || item.drugBName}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isCrit ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </div>

                      {item.mechanism && (
                        <div className="text-on-surface-variant leading-relaxed">
                          <strong className="text-on-surface">Cơ chế: </strong>
                          {item.mechanism}
                        </div>
                      )}

                      <div className="text-on-surface font-medium leading-relaxed">
                        <strong className="text-error">Hậu quả: </strong>
                        {item.description}
                      </div>

                      {item.recommendation && (
                        <div className="p-2 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/30 leading-relaxed flex items-start gap-1.5 mt-1">
                          <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">
                            medical_information
                          </span>
                          <div>
                            <strong className="text-primary font-bold">Khuyến cáo xử trí: </strong>
                            {item.recommendation}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Phần Dị ứng thuốc (Allergy Alerts) */}
          {allergyCount > 0 && (
            <div className="space-y-2 pt-2 border-t border-surface-variant/30">
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-purple-900">
                <span className="material-symbols-outlined text-[16px] text-purple-700">emergency</span>
                <span>Xung đột tiền sử dị ứng bệnh nhân ({allergyCount})</span>
              </div>

              <div className="space-y-2">
                {allAllergies.map((allergy, idx) => (
                  <div
                    key={idx}
                    data-testid={`allergy-item-${idx}`}
                    className="p-3.5 rounded-xl border border-purple-200/80 bg-purple-50/70 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-bold text-sm text-purple-950 flex items-center gap-2">
                        <span>Thuốc: <strong className="text-purple-700">{allergy.drug_name || allergy.drugName}</strong></span>
                        <span className="text-outline">✕</span>
                        <span>Dị ứng: <strong className="text-red-600">{allergy.allergen}</strong></span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white uppercase">
                        {allergy.reaction_type === 'DIRECT_MATCH' ? 'DỊ ỨNG TRỰC TIẾP' : 'DỊ ỨNG CHÉO'}
                      </span>
                    </div>

                    <div className="text-purple-950 leading-relaxed font-medium">
                      <strong className="text-red-700">Nguy cơ: </strong>
                      {allergy.description}
                    </div>

                    {allergy.recommendation && (
                      <div className="p-2 rounded-lg bg-white/90 text-purple-950 border border-purple-200 leading-relaxed flex items-start gap-1.5 mt-1">
                        <span className="material-symbols-outlined text-purple-700 text-[16px] shrink-0 mt-0.5">
                          verified_user
                        </span>
                        <div>
                          <strong className="text-purple-800 font-bold">Khuyến cáo: </strong>
                          {allergy.recommendation}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. BẮT BUỘC: Disclaimer y tế (NFR-8) */}
          <div
            data-testid="ai-medical-disclaimer"
            className="pt-2 border-t border-outline-variant/30 flex items-center gap-2 text-[11px] text-on-surface-variant italic"
          >
            <span className="material-symbols-outlined text-[16px] text-outline shrink-0">info</span>
            <span>{displayDisclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
}
