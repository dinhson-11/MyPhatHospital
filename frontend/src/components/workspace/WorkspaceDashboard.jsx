import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import { receptionService } from '../../services/receptionService';

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
  const { user, isAdmin, isDoctor, isReceptionist, isNurse, isPharmacist, isAccountant } = useAuth();
  const [kpi, setKpi] = useState({
    totalPatients: 1284,
    todayAppointments: 42,
    todayVisits: 38,
    todayRevenue: 28450000,
    activeStaffCount: 48,
    lowStockDrugsCount: 3,
    aiAlertsCount: 64
  });
  const [queue, setQueue] = useState([]);
  const [topDiagnoses, setTopDiagnoses] = useState([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [kpiData, queueData, diagData] = await Promise.all([
          reportService.getKpiSummary(),
          receptionService.getTodayQueue(),
          reportService.getTopDiagnoses(4)
        ]);
        if (mounted) {
          if (kpiData) setKpi(kpiData);
          if (Array.isArray(queueData)) setQueue(queueData.slice(0, 5));
          if (Array.isArray(diagData)) setTopDiagnoses(diagData);
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu dashboard:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const roleTitle = isAdmin
    ? 'Quản trị viên Hệ thống'
    : isDoctor
    ? 'Bác sĩ điều trị'
    : isReceptionist
    ? 'Lễ tân tiếp đón'
    : isNurse
    ? 'Điều dưỡng viên'
    : isPharmacist
    ? 'Dược sĩ lâm sàng'
    : isAccountant
    ? 'Kế toán viện phí'
    : 'Nhân viên y tế';

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Welcome Banner */}
      <div className="card p-6 sm:p-8 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-teal-500/20 to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-teal-200 text-xs font-semibold backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Mỹ Phát Hospital • 1170 Quang Trung, Chũ, Bắc Giang</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Xin chào, {user?.fullName || 'Đồng nghiệp'}!
            </h1>
            <p className="text-sm text-teal-100/90 max-w-2xl leading-relaxed">
              Phân hệ làm việc HMS-AI đang trực tuyến. Bạn đang đăng nhập với vai trò <strong className="text-white">{roleTitle}</strong>. Dưới đây là bức tranh hoạt động y tế hôm nay.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isDoctor && (
              <button
                type="button"
                onClick={onOpenClinical}
                className="btn bg-white text-teal-900 hover:bg-teal-50 shadow-xs font-semibold"
              >
                <span className="material-symbols-outlined text-teal-700">stethoscope</span>
                <span>Phòng khám Bác sĩ</span>
              </button>
            )}
            {isReceptionist && (
              <button
                type="button"
                onClick={onOpenReception}
                className="btn bg-white text-teal-900 hover:bg-teal-50 shadow-xs font-semibold"
              >
                <span className="material-symbols-outlined text-teal-700">desk</span>
                <span>Quầy Tiếp đón</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenSchedule}
              className="btn bg-teal-700/80 hover:bg-teal-600 text-white border border-teal-500/40"
            >
              <span className="material-symbols-outlined text-teal-200">calendar_month</span>
              <span>Lịch trực tuần</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="card p-5 hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng Bệnh Nhân
            </span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <span className="material-symbols-outlined">group</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-headline tabular-nums">
              {kpi.totalPatients?.toLocaleString('vi-VN')}
            </span>
            <span className="badge badge-success text-[11px]">+12.4%</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Hồ sơ điện tử lưu trữ an toàn</p>
        </div>

        {/* Metric 2 */}
        <div className="card p-5 hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lượt Khám Hôm Nay
            </span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <span className="material-symbols-outlined">how_to_reg</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-headline tabular-nums">
              {kpi.todayVisits || kpi.todayAppointments}
            </span>
            <span className="text-xs font-medium text-slate-500">/ {kpi.todayAppointments} lịch hẹn</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-sky-600 h-1.5 rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="card p-5 hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Viện Phí Hôm Nay
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined">payments</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-slate-900 font-headline tabular-nums">
              {formatVND(kpi.todayRevenue)}
            </span>
          </div>
          <p className="text-xs text-emerald-700 font-medium mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">qr_code_scanner</span>
            VietQR chiếm 62%
          </p>
        </div>

        {/* Metric 4 */}
        <div className="card p-5 hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cảnh Báo An Toàn AI
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined">smart_toy</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-headline tabular-nums">
              {kpi.aiAlertsCount || 64}
            </span>
            <span className="badge badge-warning text-[11px]">Bảo vệ kê đơn</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Tương tác thuốc & tiền sử dị ứng</p>
        </div>
      </div>

      {/* Quick Launchpad – 7 phân hệ nghiệp vụ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-section-title">Phân Hệ Nghiệp Vụ Y Tế</h2>
            <p className="text-caption">Truy cập nhanh các nghiệp vụ theo quyền tài khoản của bạn</p>
          </div>
          <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/60">
            HMS-AI Enterprise
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Lễ tân */}
          {(isReceptionist || isAdmin) && (
            <button
              type="button"
              onClick={onOpenReception}
              className="card card-interactive p-4 text-left flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined">desk</span>
                </div>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Lễ tân
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">
                  Quầy Tiếp Đón
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  Tiếp nhận ca khám, tạo mã hồ sơ BN & check-in vào buồng khám
                </p>
              </div>
            </button>
          )}

          {/* Điều dưỡng */}
          {(isNurse || isAdmin) && (
            <button
              type="button"
              onClick={onOpenNurse}
              className="card card-interactive p-4 text-left flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined">vital_signs</span>
                </div>
                <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                  Điều dưỡng
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">
                  Trạm Điều Dưỡng & Lab
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  Đo sinh hiệu huyết áp/mạch/BMI & cập nhật kết quả cận lâm sàng
                </p>
              </div>
            </button>
          )}

          {/* Bác sĩ */}
          {(isDoctor || isAdmin) && (
            <button
              type="button"
              onClick={onOpenClinical}
              className="card card-interactive p-4 text-left flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined">stethoscope</span>
                </div>
                <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                  Bác sĩ
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">
                  Phòng Khám Bác Sĩ
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  Khám bệnh, tham vấn AI gợi ý ICD-10 & kê đơn có kiểm tra an toàn
                </p>
              </div>
            </button>
          )}

          {/* Nhà thuốc */}
          {(isPharmacist || isAdmin) && (
            <button
              type="button"
              onClick={onOpenPharmacy}
              className="card card-interactive p-4 text-left flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined">medication</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Dược sĩ
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">
                  Nhà Thuốc & Kho Dược
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  Cấp phát thuốc theo đơn điện tử và kiểm soát tồn kho tự động
                </p>
              </div>
            </button>
          )}

          {/* Viện phí */}
          {(isAccountant || isAdmin) && (
            <button
              type="button"
              onClick={onOpenInvoice}
              className="card card-interactive p-4 text-left flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
                <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                  Kế toán
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">
                  Hóa Đơn & Viện Phí
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  Thu viện phí, thanh toán VietQR và in bảng kê chi phí KCB
                </p>
              </div>
            </button>
          )}

          {/* Báo cáo BI */}
          {(isAccountant || isAdmin) && (
            <button
              type="button"
              onClick={onOpenReports}
              className="card card-interactive p-4 text-left flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined">query_stats</span>
                </div>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  BI Report
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">
                  Báo Cáo & Thống Kê
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  Phân tích lượt khám, doanh số viện phí và mô hình bệnh ICD-10
                </p>
              </div>
            </button>
          )}

          {/* Lịch trực */}
          <button
            type="button"
            onClick={onOpenSchedule}
            className="card card-interactive p-4 text-left flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined">calendar_month</span>
              </div>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                Nhân sự
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">
                Lịch Trực Tuần
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Xem ca trực sáng/chiều/đêm của đội ngũ bác sĩ & điều dưỡng
              </p>
            </div>
          </button>

          {/* Admin */}
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="card card-interactive p-4 text-left flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full">
                  Admin
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">
                  Quản Trị Hệ Thống
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  Quản lý danh sách lịch hẹn đặt trước, tài khoản & cơ sở dữ liệu
                </p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Two-column Bottom Content: Live Queue & Top Diseases */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Queue snapshot (7 cols) */}
        <div className="lg:col-span-7 card overflow-hidden">
          <div className="card-header">
            <div>
              <h3 className="text-heading">Hàng Đợi Tiếp Nhận Hôm Nay</h3>
              <p className="text-caption">Bệnh nhân đã đăng ký khám tại cơ sở Mỹ Phát Hospital (1170 Quang Trung, Chũ, Bắc Giang)</p>
            </div>
            {(isReceptionist || isAdmin) && (
              <button
                type="button"
                onClick={onOpenReception}
                className="btn btn-sm btn-secondary"
              >
                <span>Xem tất cả ({queue.length})</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            )}
          </div>

          <div className="table-wrap border-0 rounded-none">
            <table className="table">
              <thead>
                <tr>
                  <th>Bệnh nhân</th>
                  <th>Chuyên khoa</th>
                  <th>Khung giờ</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-slate-400 text-xs">
                      Chưa có bệnh nhân nào trong hàng đợi tiếp nhận
                    </td>
                  </tr>
                ) : (
                  queue.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="cell-primary">{item.fullName}</div>
                        <div className="cell-muted font-mono">{item.patientCode || item.phone}</div>
                      </td>
                      <td>
                        <div className="text-xs font-semibold text-slate-800">{item.departmentName}</div>
                        <div className="cell-muted">{item.doctorName}</div>
                      </td>
                      <td className="text-xs font-mono text-slate-600">
                        {item.appointmentTime}
                      </td>
                      <td>
                        {item.status === 'CHECKED_IN' ? (
                          <span className="badge badge-success text-[11px]">Đã vào khám</span>
                        ) : item.status === 'CONFIRMED' ? (
                          <span className="badge badge-info text-[11px]">Đã xác nhận</span>
                        ) : (
                          <span className="badge badge-warning text-[11px]">Chờ tiếp đón</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Top Diseases / ICD-10 (5 cols) */}
        <div className="lg:col-span-5 card overflow-hidden">
          <div className="card-header">
            <div>
              <h3 className="text-heading">Mô Hình Bệnh Tật (ICD-10)</h3>
              <p className="text-caption">Thống kê dịch tễ học thường gặp tại bệnh viện</p>
            </div>
            {(isAccountant || isAdmin) && (
              <button
                type="button"
                onClick={onOpenReports}
                className="btn btn-sm btn-ghost text-teal-700"
              >
                <span>Báo cáo BI</span>
              </button>
            )}
          </div>

          <div className="card-body space-y-4">
            {topDiagnoses.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">Đang nạp mô hình bệnh...</div>
            ) : (
              topDiagnoses.map((d) => (
                <div key={d.icd10Code} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate max-w-[220px]" title={d.diseaseName}>
                      <span className="font-mono text-teal-700 font-bold mr-1.5">[{d.icd10Code}]</span>
                      {d.diseaseName}
                    </span>
                    <span className="text-slate-500 font-bold">{d.percentage}% ({d.count} ca)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, d.percentage * 2)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1 mt-4">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <span className="material-symbols-outlined text-sm text-teal-700">verified</span>
                <span>Tiêu chuẩn kết nối liên thông Bộ Y Tế</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Mã hóa ICD-10 tự động đồng bộ sang hồ sơ bảo hiểm y tế điện tử và hệ thống giám định BHYT trực tuyến.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
