import React, { useId, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  reportService,
  getReportRange,
  getMethodBreakdown,
  getPayerSplit,
  formatPercent,
  formatCount
} from '../../services/reportService';
import { formatVND, formatDate } from '../../utils/format';
import { useAsyncData } from './useAsyncData';
import { Icon, ErrorPanel, EmptyPanel, KpiCard, KpiSkeleton, BlockSkeleton } from './ReportStates';

const RANGE_OPTIONS = [
  { value: '7days', label: '7 ngày qua' },
  { value: '30days', label: '30 ngày qua' },
  { value: 'this_month', label: 'Tháng này' }
];

const TABS = [
  { key: 'overview', label: 'Tổng quan', icon: 'dashboard', adminOnly: true },
  { key: 'visits', label: 'Lượt khám', icon: 'how_to_reg', adminOnly: true },
  { key: 'revenue', label: 'Doanh thu & viện phí', icon: 'payments', adminOnly: false },
  { key: 'diagnoses', label: 'Mô hình bệnh (ICD-10)', icon: 'monitoring', adminOnly: true }
];

/** Màu cố định cho từng phương thức thanh toán (dùng chung cho thanh tỷ lệ và chú thích). */
const METHOD_COLORS = {
  CASH: 'bg-amber-500',
  VIETQR: 'bg-primary',
  BANK_TRANSFER: 'bg-sky-500',
  CARD: 'bg-teal-500'
};

const Section = ({ title, subtitle, actions, children, className = '' }) => (
  <section className={`card p-5 ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="text-heading">{title}</h3>
        {subtitle && <p className="text-caption mt-0.5">{subtitle}</p>}
      </div>
      {actions}
    </div>
    {children}
  </section>
);

/** Thanh tỷ lệ xếp chồng + chú thích. items: [{ key, label, amount, percent, colorClass }] */
function StackedShare({ items, ariaLabel }) {
  const visible = items.filter((i) => i.percent > 0);
  return (
    <div>
      <div className="flex w-full h-3 rounded-full overflow-hidden bg-slate-100" role="img" aria-label={ariaLabel}>
        {visible.map((i) => (
          <div key={i.key} className={i.colorClass} style={{ width: `${Math.min(100, i.percent)}%` }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((i) => (
          <li key={i.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className={`w-3 h-3 rounded-full shrink-0 ${i.colorClass}`} aria-hidden="true" />
              <span className="text-slate-700 truncate">{i.label}</span>
            </span>
            <span className="flex items-baseline gap-2 shrink-0 tabular-nums">
              <span className="font-semibold text-slate-900">{formatVND(i.amount)}</span>
              <span className="text-xs text-slate-500 w-14 text-right">{formatPercent(i.percent)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MethodBreakdown({ revenue }) {
  const breakdown = getMethodBreakdown(revenue);
  if (!revenue?.patientCollected) {
    return <EmptyPanel icon="payments" title="Chưa có khoản thu từ người bệnh" text="Không có hóa đơn nào được thu trong khoảng thời gian này." />;
  }
  return (
    <StackedShare
      ariaLabel={`Cơ cấu thu theo phương thức: ${breakdown.map((m) => `${m.label} ${formatPercent(m.percent)}`).join(', ')}`}
      items={breakdown.map((m) => ({ key: m.method, label: m.label, amount: m.amount, percent: m.percent, colorClass: METHOD_COLORS[m.method] }))}
    />
  );
}

function PayerSplit({ revenue }) {
  const split = getPayerSplit(revenue);
  if (!split.total) {
    return <EmptyPanel icon="health_and_safety" title="Chưa có doanh thu" text="Không có hóa đơn nào được thu trong khoảng thời gian này." />;
  }
  return (
    <StackedShare
      ariaLabel={`BHYT chi trả ${formatPercent(split.insurancePercent)}, người bệnh thanh toán ${formatPercent(split.patientPercent)}`}
      items={[
        { key: 'patient', label: 'Người bệnh thanh toán', amount: split.patient, percent: split.patientPercent, colorClass: 'bg-primary' },
        { key: 'insurance', label: 'BHYT chi trả', amount: split.insurance, percent: split.insurancePercent, colorClass: 'bg-teal-500' }
      ]}
    />
  );
}

function VisitsChart({ visits }) {
  const rows = visits?.dailyStats || [];
  if (rows.length === 0 || rows.every((r) => !r.total)) {
    return <EmptyPanel icon="bar_chart" title="Chưa có lượt khám" text="Không có lượt khám nào trong khoảng thời gian này." />;
  }
  const max = Math.max(1, ...rows.map((r) => r.total));
  const dense = rows.length > 10;
  return (
    <div
      className="h-52 flex items-end gap-1 sm:gap-2 pt-6"
      role="img"
      aria-label={`Biểu đồ lượt khám theo ngày: ${rows.map((r) => `${formatDate(r.date)} ${r.total} lượt`).join('; ')}`}
    >
      {rows.map((day) => (
        <div key={day.date} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1">
          {!dense && <span className="text-xs font-semibold text-slate-700 tabular-nums">{day.total}</span>}
          <div
            className="w-full max-w-[36px] rounded-t-lg bg-primary"
            style={{ height: `${Math.max((day.total / max) * 100, day.total ? 4 : 1)}%` }}
            title={`${formatDate(day.date)}: ${day.total} lượt khám (${day.completed} hoàn tất)`}
          />
          {!dense && <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(day.date).slice(0, 5)}</span>}
        </div>
      ))}
    </div>
  );
}

function DiagnosisList({ diagnoses }) {
  if (!diagnoses?.length) {
    return <EmptyPanel icon="monitoring" title="Chưa có dữ liệu chẩn đoán" text="Số liệu xuất hiện khi bác sĩ hoàn tất khám và ghi mã ICD-10." />;
  }
  const max = Math.max(1, ...diagnoses.map((d) => d.count));
  return (
    <ul className="space-y-3">
      {diagnoses.map((d) => (
        <li key={d.icd10Code} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-800" title={d.diseaseName}>
              <span className="font-mono font-bold text-primary mr-2">{d.icd10Code}</span>
              {d.diseaseName}
            </span>
            <span className="shrink-0 text-xs font-semibold text-slate-600 tabular-nums">
              {formatCount(d.count)} ca · {formatPercent(d.percentage)}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
            <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.round((d.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Hiển thị nội dung theo trạng thái tải: khung chờ → lỗi (thử lại) → nội dung. */
function Loadable({ resource, skeleton, children }) {
  if (resource.status === 'loading' || resource.status === 'idle') return skeleton;
  if (resource.status === 'error') return <ErrorPanel compact message={resource.error} onRetry={resource.reload} />;
  return children(resource.data);
}

export default function StatisticsDashboardModal({ isOpen, onClose }) {
  const { isAdmin, isAccountant } = useAuth();
  const canSeeOps = isAdmin; // KPI, lượt khám, mô hình bệnh: chỉ ADMIN (theo quyền backend)
  const canSeeRevenue = isAdmin || isAccountant;

  const tabs = useMemo(
    () => TABS.filter((t) => (t.adminOnly ? canSeeOps : canSeeRevenue)),
    [canSeeOps, canSeeRevenue]
  );
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'revenue');
  const [rangeKey, setRangeKey] = useState('7days');
  const range = getReportRange(rangeKey);
  const rangeLabel = `${formatDate(range.from)} – ${formatDate(range.to)}`;
  const tabsId = useId();
  const rangeSelectId = useId();

  // Tab hiện tại luôn hợp lệ theo quyền (suy ra khi render, không cần effect)
  const currentTab = tabs.some((t) => t.key === activeTab) ? activeTab : tabs[0]?.key;

  const dataKey = `${rangeKey}:${range.from}:${range.to}`;
  const kpi = useAsyncData(() => reportService.getKpiSummary(), { enabled: isOpen && canSeeOps, key: dataKey });
  const visits = useAsyncData(() => reportService.getVisitsSummary(range.from, range.to), { enabled: isOpen && canSeeOps, key: dataKey });
  const revenue = useAsyncData(() => reportService.getRevenueSummary(range.from, range.to), { enabled: isOpen && canSeeRevenue, key: dataKey });
  const diagnoses = useAsyncData(() => reportService.getTopDiagnoses(10), { enabled: isOpen && canSeeOps, key: dataKey });

  const resources = [canSeeOps && kpi, canSeeOps && visits, canSeeRevenue && revenue, canSeeOps && diagnoses].filter(Boolean);
  const anyLoading = resources.some((r) => r.status === 'loading');
  const refreshAll = () => resources.forEach((r) => r.reload());

  const handlePrint = () => {
    document.body.classList.add('print-dialog');
    const cleanup = () => document.body.classList.remove('print-dialog');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    cleanup();
  };

  const handleTabKeyDown = (event, index) => {
    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    setActiveTab(tabs[next].key);
    document.getElementById(`${tabsId}-tab-${tabs[next].key}`)?.focus();
  };

  if (!canSeeRevenue && !canSeeOps) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Báo cáo & thống kê" icon="query_stats" size="sm">
        <ErrorPanel title="Không có quyền truy cập" message="Chỉ quản trị viên và kế toán được xem báo cáo thống kê." />
      </Modal>
    );
  }

  const rev = revenue.data;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Báo cáo & thống kê bệnh viện"
      subtitle="Lượt khám, doanh thu viện phí, mô hình bệnh tật – số liệu trực tiếp từ hệ thống"
      icon="query_stats"
      size="full"
      bodyClassName="overflow-y-auto"
      footer={(
        <>
          <p className="mr-auto text-xs text-slate-500 flex items-center gap-1.5">
            <Icon name="info" className="text-[16px]" />
            Doanh thu ghi nhận theo ngày thu tiền; hóa đơn đã hoàn tiền không được tính.
          </p>
          <button type="button" className="btn btn-secondary" onClick={handlePrint}>
            <Icon name="print" />
            <span>In báo cáo</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Đóng
          </button>
        </>
      )}
    >
      {/* Thanh công cụ: tab + khoảng thời gian */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 sm:px-6 pt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex gap-1 overflow-x-auto -mb-px" role="tablist" aria-label="Nhóm báo cáo">
          {tabs.map((tab, index) => {
            const selected = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={`${tabsId}-tab-${tab.key}`}
                aria-selected={selected}
                aria-controls={`${tabsId}-panel`}
                tabIndex={selected ? 0 : -1}
                className={`tab ${selected ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
              >
                <Icon name={tab.icon} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pb-2">
          <label htmlFor={rangeSelectId} className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Khoảng thời gian
          </label>
          <div className="w-36">
            <select
              id={rangeSelectId}
              value={rangeKey}
              onChange={(e) => setRangeKey(e.target.value)}
              className="select select-sm"
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-secondary btn-icon"
            onClick={refreshAll}
            disabled={anyLoading}
            aria-label="Làm mới số liệu"
            title="Làm mới số liệu"
          >
            <Icon name="sync" className={anyLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div
        id={`${tabsId}-panel`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-tab-${currentTab}`}
        className="px-5 sm:px-6 py-5 space-y-5 bg-slate-50/60"
      >
        <p className="text-xs text-slate-500">
          Kỳ báo cáo: <strong className="text-slate-700">{rangeLabel}</strong>
        </p>

        {/* ===== TỔNG QUAN ===== */}
        {currentTab === 'overview' && canSeeOps && (
          <>
            <Loadable resource={kpi} skeleton={<KpiSkeleton />}>
              {(k) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard label="Tổng bệnh nhân" icon="groups" value={formatCount(k.totalPatients)} hint="Hồ sơ đang quản lý" />
                  <KpiCard label="Lượt khám hôm nay" icon="medical_services" value={formatCount(k.todayVisits)} hint="Tính theo thời điểm tiếp nhận" />
                  <KpiCard label="Doanh thu hôm nay" icon="payments" tone="success" valueClassName="text-xl" value={formatVND(k.todayRevenue)} hint="Tổng chi phí hóa đơn đã thu (gồm BHYT)" />
                  <KpiCard label="Gợi ý lâm sàng AI" icon="smart_toy" tone="neutral" value={formatCount(k.aiAlertsCount)} hint="Tổng số lượt AI hỗ trợ đã ghi nhận" />
                </div>
              )}
            </Loadable>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <Section
                title="Lượt khám theo ngày"
                subtitle={visits.status === 'success'
                  ? `Tổng ${formatCount(visits.data.totalVisits)} lượt · ${formatCount(visits.data.completedVisits)} đã hoàn tất`
                  : rangeLabel}
              >
                <Loadable resource={visits} skeleton={<div className="skeleton h-52 w-full" />}>
                  {(v) => <VisitsChart visits={v} />}
                </Loadable>
              </Section>

              <Section
                title="Cơ cấu thu theo phương thức"
                subtitle={rev ? `Thực thu người bệnh: ${formatVND(rev.patientCollected)} · ${formatCount(rev.paidInvoicesCount)} hóa đơn` : 'Tỷ lệ trên số tiền thực thu từ người bệnh'}
              >
                <Loadable resource={revenue} skeleton={<BlockSkeleton rows={5} />}>
                  {(r) => <MethodBreakdown revenue={r} />}
                </Loadable>
              </Section>
            </div>

            <Section title="Mô hình bệnh tật thường gặp (ICD-10)" subtitle="Tỷ lệ trên tổng số lượt khám có chẩn đoán">
              <Loadable resource={diagnoses} skeleton={<BlockSkeleton rows={5} />}>
                {(d) => <DiagnosisList diagnoses={d.slice(0, 5)} />}
              </Loadable>
            </Section>
          </>
        )}

        {/* ===== LƯỢT KHÁM ===== */}
        {currentTab === 'visits' && canSeeOps && (
          <Loadable resource={visits} skeleton={<><KpiSkeleton /><BlockSkeleton rows={7} /></>}>
            {(v) => (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard label="Tổng lượt khám" icon="how_to_reg" value={formatCount(v.totalVisits)} hint="Trong kỳ báo cáo" />
                  <KpiCard label="Đã hoàn tất" icon="task_alt" tone="success" value={formatCount(v.completedVisits)} hint={v.totalVisits ? `Tỷ lệ ${formatPercent((v.completedVisits / v.totalVisits) * 100)}` : 'Trong kỳ báo cáo'} />
                  <KpiCard label="Đang khám" icon="stethoscope" tone="warning" value={formatCount(v.inProgressVisits)} hint="Trong kỳ báo cáo" />
                  <KpiCard label="Lịch hẹn đã hủy" icon="event_busy" tone="neutral" value={formatCount(v.cancelledAppointments)} hint="Toàn bộ thời gian" />
                </div>

                <Section title="Chi tiết lượt khám theo ngày" subtitle={rangeLabel}>
                  {v.dailyStats.length === 0 ? (
                    <EmptyPanel icon="bar_chart" title="Chưa có lượt khám" />
                  ) : (
                    <div className="table-wrap">
                      <table className="table table-compact">
                        <caption className="sr-only">Số lượt khám và tỷ lệ hoàn thành theo ngày</caption>
                        <thead>
                          <tr>
                            <th scope="col">Ngày</th>
                            <th scope="col" className="text-right">Lượt tiếp nhận</th>
                            <th scope="col" className="text-right">Đã hoàn tất</th>
                            <th scope="col" className="text-right">Tỷ lệ hoàn thành</th>
                          </tr>
                        </thead>
                        <tbody>
                          {v.dailyStats.map((row) => (
                            <tr key={row.date}>
                              <td className="cell-primary">{formatDate(row.date)}</td>
                              <td className="cell-num">{formatCount(row.total)}</td>
                              <td className="cell-num text-emerald-700 font-semibold">{formatCount(row.completed)}</td>
                              <td className="cell-num">{row.total ? formatPercent((row.completed / row.total) * 100) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>
              </>
            )}
          </Loadable>
        )}

        {/* ===== DOANH THU ===== */}
        {currentTab === 'revenue' && canSeeRevenue && (
          <Loadable resource={revenue} skeleton={<><KpiSkeleton /><BlockSkeleton rows={7} /></>}>
            {(r) => (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard label="Tổng doanh thu" icon="payments" tone="success" valueClassName="text-xl" value={formatVND(r.totalRevenue)} hint={`${formatCount(r.paidInvoicesCount)} hóa đơn đã thu (gồm phần BHYT)`} />
                  <KpiCard label="Thực thu người bệnh" icon="point_of_sale" valueClassName="text-xl" value={formatVND(r.patientCollected)} hint="Tiền mặt, VietQR, chuyển khoản, thẻ" />
                  <KpiCard label="BHYT chi trả" icon="health_and_safety" tone="accent" valueClassName="text-xl" value={formatVND(r.insuranceAmount)} hint="Phải thu từ cơ quan BHXH" />
                  <KpiCard
                    label="Đã hoàn tiền"
                    icon="currency_exchange"
                    tone="error"
                    valueClassName="text-xl"
                    value={formatVND(r.refundedAmount)}
                    hint={`${formatCount(r.refundedInvoicesCount)} hóa đơn · không tính vào doanh thu`}
                  />
                </div>

                {r.pendingInvoicesCount > 0 && (
                  <div className="alert alert-warning">
                    <Icon name="pending_actions" />
                    <div>
                      Có <strong>{formatCount(r.pendingInvoicesCount)}</strong> hóa đơn lập trong kỳ đang chờ thu tiền
                      (tổng {formatCount(r.totalInvoices)} hóa đơn được lập).
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  <Section title="Cơ cấu thu theo phương thức" subtitle="Tỷ lệ trên số tiền thực thu từ người bệnh">
                    <MethodBreakdown revenue={r} />
                  </Section>
                  <Section title="Nguồn chi trả" subtitle="BHYT chi trả so với người bệnh thanh toán, trên tổng doanh thu">
                    <PayerSplit revenue={r} />
                  </Section>
                </div>

                <Section title="Doanh thu theo ngày" subtitle={`${rangeLabel} · theo ngày thu tiền`}>
                  {r.dailyRevenues.length === 0 ? (
                    <EmptyPanel icon="receipt_long" title="Chưa có doanh thu trong kỳ" />
                  ) : (
                    <div className="table-wrap">
                      <table className="table table-compact">
                        <caption className="sr-only">Doanh thu và số hóa đơn đã thu theo ngày</caption>
                        <thead>
                          <tr>
                            <th scope="col">Ngày</th>
                            <th scope="col" className="text-right">Số hóa đơn</th>
                            <th scope="col" className="text-right">Doanh thu</th>
                            <th scope="col" className="text-right">Trung bình / hóa đơn</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.dailyRevenues.map((row) => (
                            <tr key={row.date}>
                              <td className="cell-primary">{formatDate(row.date)}</td>
                              <td className="cell-num">{formatCount(row.invoiceCount)}</td>
                              <td className="cell-num font-semibold text-slate-900">{formatVND(row.amount)}</td>
                              <td className="cell-num">{row.invoiceCount ? formatVND(row.amount / row.invoiceCount) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>
              </>
            )}
          </Loadable>
        )}

        {/* ===== MÔ HÌNH BỆNH ===== */}
        {currentTab === 'diagnoses' && canSeeOps && (
          <Section title="Bảng mã bệnh ICD-10 thường gặp" subtitle="10 chẩn đoán có số ca nhiều nhất (toàn bộ thời gian)">
            <Loadable resource={diagnoses} skeleton={<BlockSkeleton rows={6} />}>
              {(list) =>
                list.length === 0 ? (
                  <EmptyPanel icon="monitoring" title="Chưa có dữ liệu chẩn đoán" text="Số liệu xuất hiện khi bác sĩ hoàn tất khám và ghi mã ICD-10." />
                ) : (
                  <div className="table-wrap">
                    <table className="table table-compact">
                      <caption className="sr-only">Mã bệnh ICD-10, số ca và tỷ lệ</caption>
                      <thead>
                        <tr>
                          <th scope="col">Mã ICD-10</th>
                          <th scope="col">Tên bệnh</th>
                          <th scope="col" className="text-right">Số ca</th>
                          <th scope="col" className="text-right">Tỷ lệ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((d) => (
                          <tr key={d.icd10Code}>
                            <td className="font-mono font-bold text-primary">{d.icd10Code}</td>
                            <td className="cell-primary">{d.diseaseName}</td>
                            <td className="cell-num">{formatCount(d.count)}</td>
                            <td className="cell-num">{formatPercent(d.percentage)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </Loadable>
          </Section>
        )}
      </div>
    </Modal>
  );
}
