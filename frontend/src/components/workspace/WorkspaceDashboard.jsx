import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { reportService, getMethodBreakdown, formatPercent, formatCount } from '../../services/reportService';
import { receptionService } from '../../services/receptionService';
import { formatVND, formatDate, todayISO, APPOINTMENT_STATUS_LABELS } from '../../utils/format';
import { useAsyncData } from '../reporting/useAsyncData';
import { Icon, ErrorPanel, EmptyPanel, KpiCard, KpiSkeleton } from '../reporting/ReportStates';

const QUEUE_STATUS = {
  CHECKED_IN: { label: 'Đã vào khám', className: 'badge-success' },
  CONFIRMED: { label: APPOINTMENT_STATUS_LABELS.CONFIRMED, className: 'badge-info' },
  BOOKED: { label: 'Chờ xác nhận', className: 'badge-warning' },
  COMPLETED: { label: APPOINTMENT_STATUS_LABELS.COMPLETED, className: 'badge-neutral' },
  CANCELLED: { label: APPOINTMENT_STATUS_LABELS.CANCELLED, className: 'badge-error' },
  NO_SHOW: { label: APPOINTMENT_STATUS_LABELS.NO_SHOW, className: 'badge-neutral' }
};

export default function WorkspaceDashboard({
  onOpenReception,
  onOpenClinical,
  onOpenNurse,
  onOpenPharmacy,
  onOpenInvoice,
  onOpenReports,
  onOpenSchedule,
  onOpenAdmin
}) {
  const { user, isAdmin, isDoctor, isReceptionist, isNurse, isPharmacist } = useAuth();

  // Chỉ gọi những API mà vai trò hiện tại có quyền (tránh lỗi 403 hiển thị vô nghĩa)
  const canSeeKpi = isAdmin; // /reports/kpi-summary: ADMIN
  const canSeeRevenue = isReceptionist; // /reports/revenue: ADMIN, RECEPTIONIST (Lễ tân - Kế toán; isReceptionist đã gồm ADMIN)
  const canSeeDiagnoses = isAdmin || isDoctor; // /reports/top-diagnoses: ADMIN, DOCTOR
  const canSeeQueue = isAdmin || isReceptionist || isNurse || isDoctor;

  const kpi = useAsyncData(() => reportService.getKpiSummary(), { enabled: canSeeKpi });
  const revenueToday = useAsyncData(() => {
    const today = todayISO();
    return reportService.getRevenueSummary(today, today);
  }, { enabled: canSeeRevenue });
  const diagnoses = useAsyncData(() => reportService.getTopDiagnoses(5), { enabled: canSeeDiagnoses });
  const queue = useAsyncData(async () => {
    const list = await receptionService.getTodayQueue();
    return Array.isArray(list) ? list : [];
  }, { enabled: canSeeQueue });

  const roleTitle = isAdmin
    ? 'Quản trị viên hệ thống'
    : isDoctor
    ? 'Bác sĩ điều trị'
    : isReceptionist
    ? 'Lễ tân - Kế toán'
    : isNurse
    ? 'Điều dưỡng viên'
    : isPharmacist
    ? 'Dược sĩ lâm sàng'
    : 'Nhân viên y tế';

  const rev = revenueToday.data;
  const topMethod = rev
    ? getMethodBreakdown(rev)
        .filter((m) => m.amount > 0)
        .sort((a, b) => b.amount - a.amount)[0]
    : null;

  const revenueHint = (() => {
    if (!rev) return 'Theo ngày thu tiền';
    const parts = [`Thực thu người bệnh ${formatVND(rev.patientCollected)}`];
    if (rev.insuranceAmount) parts.push(`BHYT ${formatVND(rev.insuranceAmount)}`);
    return parts.join(' · ');
  })();

  const launchItems = [
    { key: 'reception', show: isReceptionist, action: onOpenReception, icon: 'desk', tag: 'Lễ tân', title: 'Quầy tiếp đón', desc: 'Tiếp nhận ca khám, tạo hồ sơ bệnh nhân và check-in vào buồng khám' },
    { key: 'nurse', show: isNurse, action: onOpenNurse, icon: 'vital_signs', tag: 'Điều dưỡng', title: 'Trạm điều dưỡng & xét nghiệm', desc: 'Đo sinh hiệu (huyết áp, mạch, BMI) và cập nhật kết quả cận lâm sàng' },
    { key: 'clinical', show: isDoctor, action: onOpenClinical, icon: 'stethoscope', tag: 'Bác sĩ', title: 'Phòng khám bác sĩ', desc: 'Khám bệnh, tham khảo gợi ý ICD-10 của AI và kê đơn có kiểm tra an toàn' },
    { key: 'pharmacy', show: isPharmacist, action: onOpenPharmacy, icon: 'medication', tag: 'Dược sĩ', title: 'Nhà thuốc & kho dược', desc: 'Cấp phát thuốc theo đơn điện tử và theo dõi tồn kho' },
    { key: 'invoice', show: isReceptionist, action: () => onOpenInvoice?.(), icon: 'receipt_long', tag: 'Thu ngân', title: 'Hóa đơn & viện phí', desc: 'Thu viện phí (tiền mặt, VietQR, chuyển khoản, thẻ) và in phiếu thu' },
    { key: 'reports', show: isReceptionist, action: onOpenReports, icon: 'query_stats', tag: 'Báo cáo', title: 'Báo cáo & thống kê', desc: 'Lượt khám, doanh thu viện phí theo phương thức và mô hình bệnh ICD-10' },
    { key: 'schedule', show: true, action: () => onOpenSchedule?.(), icon: 'calendar_month', tag: 'Nhân sự', title: 'Lịch trực tuần', desc: 'Xem ca trực sáng, chiều, đêm của bác sĩ và điều dưỡng' },
    { key: 'admin', show: isAdmin, action: onOpenAdmin, icon: 'admin_panel_settings', tag: 'Quản trị', title: 'Quản trị hệ thống', desc: 'Quản lý lịch hẹn, tài khoản và danh mục của bệnh viện' }
  ].filter((item) => item.show && item.action);

  const queueItems = (queue.data || []).slice(0, 5);
  const diagList = diagnoses.data || [];
  const maxDiagCount = Math.max(1, ...diagList.map((d) => d.count || 0));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Lời chào */}
      <section className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-primary-dark via-primary to-primary-container text-white shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold">
              <Icon name="calendar_today" className="text-[16px]" />
              <span>Hôm nay {formatDate(new Date())} · Mỹ Phát Hospital</span>
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Xin chào, {user?.fullName || 'đồng nghiệp'}!
            </h1>
            <p className="text-sm text-white/90 max-w-2xl leading-relaxed">
              Bạn đang đăng nhập với vai trò <strong className="text-white">{roleTitle}</strong>. Chọn phân hệ bên dưới để bắt đầu công việc.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isDoctor && onOpenClinical && (
              <button type="button" onClick={onOpenClinical} className="btn bg-white text-primary hover:bg-primary-fixed font-semibold">
                <Icon name="stethoscope" />
                <span>Phòng khám bác sĩ</span>
              </button>
            )}
            {isReceptionist && onOpenReception && (
              <button type="button" onClick={onOpenReception} className="btn bg-white text-primary hover:bg-primary-fixed font-semibold">
                <Icon name="desk" />
                <span>Quầy tiếp đón</span>
              </button>
            )}
            {onOpenSchedule && (
              <button
                type="button"
                onClick={() => onOpenSchedule()}
                className="btn bg-white/10 hover:bg-white/20 text-white border border-white/30"
              >
                <Icon name="calendar_month" />
                <span>Lịch trực tuần</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Chỉ số tổng quan – Quản trị viên */}
      {canSeeKpi && (
        <section aria-labelledby="ws-kpi-title" className="space-y-3">
          <h2 id="ws-kpi-title" className="text-section-title">Chỉ số hôm nay</h2>
          {kpi.status === 'loading' && <KpiSkeleton />}
          {kpi.status === 'error' && (
            <div className="card">
              <ErrorPanel message={kpi.error} onRetry={kpi.reload} />
            </div>
          )}
          {kpi.status === 'success' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <KpiCard label="Tổng bệnh nhân" icon="group" value={formatCount(kpi.data.totalPatients)} hint="Hồ sơ bệnh nhân đang quản lý" />
                <KpiCard label="Lượt khám hôm nay" icon="how_to_reg" value={formatCount(kpi.data.todayVisits)} hint="Tính theo thời điểm tiếp nhận" />
                <KpiCard
                  label="Doanh thu hôm nay"
                  icon="payments"
                  tone="success"
                  valueClassName="text-xl"
                  value={formatVND(rev ? rev.totalRevenue : kpi.data.todayRevenue)}
                  hint={revenueToday.status === 'error' ? 'Không tải được chi tiết thu' : revenueHint}
                />
                <KpiCard
                  label="Gợi ý lâm sàng AI"
                  icon="smart_toy"
                  tone="neutral"
                  value={formatCount(kpi.data.aiAlertsCount)}
                  hint="Tổng số lượt AI hỗ trợ chẩn đoán, kê đơn đã ghi nhận"
                />
              </div>
              {kpi.data.lowStockDrugsCount > 0 && (
                <div className="alert alert-warning" role="status">
                  <Icon name="inventory_2" />
                  <div className="flex-1">
                    Có <strong>{formatCount(kpi.data.lowStockDrugsCount)}</strong> loại thuốc tồn kho thấp (≤ 20 đơn vị).
                  </div>
                  {isPharmacist && onOpenPharmacy && (
                    <button type="button" onClick={onOpenPharmacy} className="btn btn-sm btn-secondary">
                      Mở kho dược
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Doanh thu hôm nay – Lễ tân - Kế toán (không phải quản trị) */}
      {!canSeeKpi && canSeeRevenue && (
        <section aria-labelledby="ws-revenue-title" className="space-y-3">
          <h2 id="ws-revenue-title" className="text-section-title">Thu viện phí hôm nay</h2>
          {revenueToday.status === 'loading' && <KpiSkeleton />}
          {revenueToday.status === 'error' && (
            <div className="card">
              <ErrorPanel message={revenueToday.error} onRetry={revenueToday.reload} />
            </div>
          )}
          {revenueToday.status === 'success' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <KpiCard label="Tổng doanh thu" icon="payments" tone="success" valueClassName="text-xl" value={formatVND(rev.totalRevenue)} hint="Tổng chi phí hóa đơn đã thu (gồm BHYT)" />
              <KpiCard label="Thực thu người bệnh" icon="point_of_sale" valueClassName="text-xl" value={formatVND(rev.patientCollected)} hint={topMethod ? `Nhiều nhất: ${topMethod.label} (${formatPercent(topMethod.percent)})` : 'Chưa có khoản thu'} />
              <KpiCard label="BHYT chi trả" icon="health_and_safety" tone="neutral" valueClassName="text-xl" value={formatVND(rev.insuranceAmount)} hint="Phải thu từ cơ quan BHXH" />
              <KpiCard label="Hóa đơn chờ thu" icon="pending_actions" tone="warning" value={formatCount(rev.pendingInvoicesCount)} hint={`Đã thu: ${formatCount(rev.paidInvoicesCount)} hóa đơn`} />
            </div>
          )}
        </section>
      )}

      {/* Truy cập nhanh các phân hệ */}
      <section aria-labelledby="ws-launch-title">
        <div className="mb-4">
          <h2 id="ws-launch-title" className="text-section-title">Phân hệ nghiệp vụ</h2>
          <p className="text-caption">Truy cập nhanh các nghiệp vụ theo quyền tài khoản của bạn</p>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
          {launchItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.action}
              className="card card-interactive p-4 text-left flex flex-col justify-between group"
            >
              <span className="flex items-center justify-between mb-3">
                <span className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                  <Icon name={item.icon} />
                </span>
                <span className="badge badge-neutral">{item.tag}</span>
              </span>
              <span>
                <span className="block font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">{item.title}</span>
                <span className="block text-xs text-slate-500 mt-1 line-clamp-2">{item.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {(canSeeQueue || canSeeDiagnoses) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Hàng đợi tiếp nhận hôm nay */}
          {canSeeQueue && (
            <section aria-labelledby="ws-queue-title" className={`${canSeeDiagnoses ? 'lg:col-span-7' : 'lg:col-span-12'} card overflow-hidden`}>
              <div className="card-header">
                <div>
                  <h2 id="ws-queue-title" className="text-heading">Hàng đợi tiếp nhận hôm nay</h2>
                  <p className="text-caption">Bệnh nhân đã đăng ký khám tại bệnh viện</p>
                </div>
                {isReceptionist && onOpenReception && (
                  <button type="button" onClick={onOpenReception} className="btn btn-sm btn-secondary shrink-0">
                    <span>Xem tất cả{queue.status === 'success' ? ` (${queue.data.length})` : ''}</span>
                    <Icon name="arrow_forward" />
                  </button>
                )}
              </div>

              {queue.status === 'loading' && (
                <div className="p-5 space-y-3" aria-busy="true" aria-label="Đang tải hàng đợi">
                  {[0, 1, 2].map((i) => <div key={i} className="skeleton h-10 w-full" />)}
                </div>
              )}
              {queue.status === 'error' && <ErrorPanel compact message={queue.error} onRetry={queue.reload} />}
              {queue.status === 'success' && queueItems.length === 0 && (
                <EmptyPanel icon="groups" title="Chưa có bệnh nhân trong hàng đợi" text="Bệnh nhân đặt lịch hoặc được tiếp nhận hôm nay sẽ hiển thị tại đây." />
              )}
              {queue.status === 'success' && queueItems.length > 0 && (
                <div className="table-wrap border-0 rounded-none">
                  <table className="table">
                    <caption className="sr-only">5 bệnh nhân đầu tiên trong hàng đợi hôm nay</caption>
                    <thead>
                      <tr>
                        <th scope="col">Bệnh nhân</th>
                        <th scope="col">Chuyên khoa</th>
                        <th scope="col">Giờ hẹn</th>
                        <th scope="col">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queueItems.map((item) => {
                        const status = QUEUE_STATUS[item.status] || { label: 'Chờ tiếp đón', className: 'badge-warning' };
                        return (
                          <tr key={item.id}>
                            <td>
                              <div className="cell-primary">{item.fullName}</div>
                              <div className="cell-muted font-mono">{item.patientCode || '—'}</div>
                            </td>
                            <td>
                              <div className="text-xs font-semibold text-slate-800">{item.departmentName || '—'}</div>
                              <div className="cell-muted">{item.doctorName || ''}</div>
                            </td>
                            <td className="text-xs font-mono text-slate-600 whitespace-nowrap">{item.appointmentTime || '—'}</td>
                            <td>
                              <span className={`badge ${status.className}`}>{status.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Mô hình bệnh tật ICD-10 */}
          {canSeeDiagnoses && (
            <section aria-labelledby="ws-diag-title" className={`${canSeeQueue ? 'lg:col-span-5' : 'lg:col-span-12'} card overflow-hidden`}>
              <div className="card-header">
                <div>
                  <h2 id="ws-diag-title" className="text-heading">Mô hình bệnh tật (ICD-10)</h2>
                  <p className="text-caption">Chẩn đoán thường gặp nhất tại bệnh viện</p>
                </div>
                {isAdmin && onOpenReports && (
                  <button type="button" onClick={onOpenReports} className="btn btn-sm btn-ghost text-primary shrink-0">
                    <span>Xem báo cáo</span>
                  </button>
                )}
              </div>

              <div className="card-body">
                {diagnoses.status === 'loading' && (
                  <div className="space-y-4" aria-busy="true" aria-label="Đang tải mô hình bệnh tật">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="skeleton h-3 w-3/4" />
                        <div className="skeleton h-2 w-full" />
                      </div>
                    ))}
                  </div>
                )}
                {diagnoses.status === 'error' && <ErrorPanel compact message={diagnoses.error} onRetry={diagnoses.reload} />}
                {diagnoses.status === 'success' && diagList.length === 0 && (
                  <EmptyPanel icon="monitoring" title="Chưa có dữ liệu chẩn đoán" text="Số liệu sẽ xuất hiện khi bác sĩ hoàn tất khám và ghi mã ICD-10." />
                )}
                {diagnoses.status === 'success' && diagList.length > 0 && (
                  <ul className="space-y-4">
                    {diagList.map((d) => (
                      <li key={d.icd10Code} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-semibold text-slate-800 truncate" title={d.diseaseName}>
                            <span className="font-mono text-primary font-bold mr-1.5">{d.icd10Code}</span>
                            {d.diseaseName}
                          </span>
                          <span className="text-slate-600 font-semibold whitespace-nowrap tabular-nums">
                            {formatPercent(d.percentage)} · {formatCount(d.count)} ca
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden" aria-hidden="true">
                          <div className="bg-secondary h-2 rounded-full" style={{ width: `${Math.round((d.count / maxDiagCount) * 100)}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
