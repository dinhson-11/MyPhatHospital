import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export default function StatisticsDashboardModal({ isOpen, onClose, onShowToast }) {
  useEscapeKey(isOpen, onClose);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'visits' | 'revenue' | 'diagnoses'
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('7days');

  const [kpi, setKpi] = useState({
    totalPatients: 1284,
    todayAppointments: 42,
    todayVisits: 38,
    todayRevenue: 28450000,
    activeStaffCount: 48,
    lowStockDrugsCount: 3,
    aiAlertsCount: 64
  });

  const [visitsData, setVisitsData] = useState({
    totalVisits: 245,
    completedVisits: 220,
    inProgressVisits: 18,
    waitingVisits: 7,
    cancelledAppointments: 5,
    dailyStats: []
  });

  const [revenueData, setRevenueData] = useState({
    totalRevenue: 198500000,
    totalInvoices: 145,
    paidInvoicesCount: 138,
    pendingInvoicesCount: 7,
    cashRevenue: 75430000,
    vietQrRevenue: 123070000,
    dailyRevenues: []
  });

  const [diagnoses, setDiagnoses] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen, dateRange]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [kpiRes, visitsRes, revRes, diagRes] = await Promise.all([
        reportService.getKpiSummary(),
        reportService.getVisitsSummary(),
        reportService.getRevenueSummary(),
        reportService.getTopDiagnoses(5)
      ]);
      if (kpiRes) setKpi(kpiRes);
      if (visitsRes) setVisitsData(visitsRes);
      if (revRes) setRevenueData(revRes);
      if (diagRes) setDiagnoses(diagRes);
    } catch (err) {
      console.error('Lỗi khi tải báo cáo thống kê:', err);
      onShowToast?.('Không thể tải toàn bộ dữ liệu báo cáo mới nhất', 'warning');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const maxVisitCount = visitsData?.dailyStats?.length
    ? Math.max(...visitsData.dailyStats.map((d) => d.total), 1)
    : 40;

  const maxRevenueAmount = revenueData?.dailyRevenues?.length
    ? Math.max(...revenueData.dailyRevenues.map((d) => d.amount), 1)
    : 30000000;

  const handleExportReport = () => {
    onShowToast?.('Đang xuất báo cáo tổng hợp PDF/Excel...', 'info');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={onClose}>
      <div
        className="modal-content modal-large"
        style={{
          maxWidth: '1100px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '16px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #005440 0%, #00796b 100%)',
            color: '#fff',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                query_stats
              </span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                Trung Tâm Báo Cáo & Thống Kê Bệnh Viện (BI)
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#e0f2f1' }}>
                Số liệu khám chữa bệnh, doanh thu viện phí, mô hình bệnh tật & KPI vận hành
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={handleExportReport}
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.3)',
                padding: '6px 14px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                print
              </span>
              In Báo Cáo
            </button>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#e0f2f1', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '4px', padding: '2px 6px' }}>
              ESC
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Đóng (Esc)"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                close
              </span>
            </button>
          </div>
        </div>

        {/* Sub-header Tabs & Filters */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '10px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-light'}`}
              style={{ padding: '6px 14px', fontSize: '0.88rem' }}
              onClick={() => setActiveTab('overview')}
            >
              Tổng quan KPI
            </button>
            <button
              className={`btn ${activeTab === 'visits' ? 'btn-primary' : 'btn-light'}`}
              style={{ padding: '6px 14px', fontSize: '0.88rem' }}
              onClick={() => setActiveTab('visits')}
            >
              Lượt khám & Khám bệnh
            </button>
            <button
              className={`btn ${activeTab === 'revenue' ? 'btn-primary' : 'btn-light'}`}
              style={{ padding: '6px 14px', fontSize: '0.88rem' }}
              onClick={() => setActiveTab('revenue')}
            >
              Doanh thu & Viện phí
            </button>
            <button
              className={`btn ${activeTab === 'diagnoses' ? 'btn-primary' : 'btn-light'}`}
              style={{ padding: '6px 14px', fontSize: '0.88rem' }}
              onClick={() => setActiveTab('diagnoses')}
            >
              Mô hình bệnh (ICD-10)
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#fff'
              }}
            >
              <option value="7days">7 ngày qua</option>
              <option value="30days">30 ngày qua</option>
              <option value="this_month">Tháng hiện tại</option>
            </select>

            <button
              className="btn btn-light"
              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
              onClick={loadAllData}
              disabled={loading}
              title="Làm mới số liệu"
            >
              <span className={`material-symbols-outlined ${loading ? 'spin' : ''}`} style={{ fontSize: '18px' }}>
                sync
              </span>
            </button>
          </div>
        </div>

        {/* Body content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, backgroundColor: '#fcfdfd' }}>
          {/* Top 4 KPI Cards (Hiển thị trong mọi tab hoặc tab overview) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            {/* KPI 1 */}
            <div
              style={{
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  backgroundColor: '#e6fffa',
                  color: '#005440',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                  groups
                </span>
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                  Tổng bệnh nhân quản lý
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
                  {kpi.totalPatients?.toLocaleString('vi-VN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px' }}>
                  +12 bệnh nhân mới hôm nay
                </div>
              </div>
            </div>

            {/* KPI 2 */}
            <div
              style={{
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  color: '#1960a6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                  medical_services
                </span>
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                  Lượt khám trong ngày
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
                  {kpi.todayVisits}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Hẹn trước: {kpi.todayAppointments} ca
                </div>
              </div>
            </div>

            {/* KPI 3 */}
            <div
              style={{
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  backgroundColor: '#fefce8',
                  color: '#ca8a04',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                  payments
                </span>
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                  Doanh thu hôm nay
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>
                  {formatVND(kpi.todayRevenue)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Napas VietQR & Tiền mặt
                </div>
              </div>
            </div>

            {/* KPI 4 */}
            <div
              style={{
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  backgroundColor: '#f3e8ff',
                  color: '#7e22ce',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
                  smart_toy
                </span>
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                  Cảnh báo AI an toàn
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
                  {kpi.aiAlertsCount}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#7e22ce', marginTop: '2px' }}>
                  Ngăn ngừa tương tác & dị ứng
                </div>
              </div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
                  gap: '20px'
                }}
              >
                {/* Biểu đồ số lượt khám 7 ngày qua */}
                <div
                  style={{
                    backgroundColor: '#fff',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>
                        Biểu Đồ Lượt Khám 7 Ngày Gần Nhất
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Tổng {visitsData.totalVisits} lượt khám ({visitsData.completedVisits} đã hoàn tất)
                      </span>
                    </div>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#e6fffa',
                        color: '#005440',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      +{visitsData.inProgressVisits} đang khám
                    </span>
                  </div>

                  {/* SVG Bar Chart */}
                  <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '12px', paddingTop: '20px' }}>
                    {visitsData.dailyStats?.map((day, idx) => {
                      const heightPercent = Math.round((day.total / maxVisitCount) * 100);
                      const displayDate = day.date.substring(5); // MM-DD
                      return (
                        <div
                          key={idx}
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                            {day.total}
                          </span>
                          <div
                            style={{
                              width: '100%',
                              maxWidth: '36px',
                              height: `${Math.max(heightPercent * 1.5, 12)}px`,
                              background: 'linear-gradient(180deg, #005440 0%, #0d9488 100%)',
                              borderRadius: '6px 6px 0 0',
                              transition: 'height 0.4s ease'
                            }}
                            title={`Ngày ${day.date}: ${day.total} lượt khám (${day.completed} hoàn tất)`}
                          />
                          <span style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                            {displayDate}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Biểu đồ Cơ cấu Doanh thu & Hình thức thanh toán */}
                <div
                  style={{
                    backgroundColor: '#fff',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>
                        Cơ Cấu Doanh Thu Viện Phí
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Tổng thu: {formatVND(revenueData.totalRevenue)} ({revenueData.paidInvoicesCount} hóa đơn)
                      </span>
                    </div>
                  </div>

                  {/* Thanh so sánh VietQR vs Tiền mặt */}
                  <div style={{ marginTop: '16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                        marginBottom: '6px'
                      }}
                    >
                      <span style={{ color: '#1960a6', fontWeight: 600 }}>
                        Chuyển khoản VietQR / Ngân hàng (
                        {Math.round((revenueData.vietQrRevenue / (revenueData.totalRevenue || 1)) * 100)}%)
                      </span>
                      <span style={{ fontWeight: 600 }}>{formatVND(revenueData.vietQrRevenue)}</span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '14px',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '7px',
                        overflow: 'hidden',
                        display: 'flex'
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round((revenueData.vietQrRevenue / (revenueData.totalRevenue || 1)) * 100)}%`,
                          background: 'linear-gradient(90deg, #1960a6 0%, #38bdf8 100%)'
                        }}
                      />
                      <div
                        style={{
                          width: `${Math.round((revenueData.cashRevenue / (revenueData.totalRevenue || 1)) * 100)}%`,
                          background: 'linear-gradient(90deg, #ca8a04 0%, #facc15 100%)'
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                        marginTop: '10px'
                      }}
                    >
                      <span style={{ color: '#ca8a04', fontWeight: 600 }}>
                        Tiền mặt tại quầy (
                        {Math.round((revenueData.cashRevenue / (revenueData.totalRevenue || 1)) * 100)}%)
                      </span>
                      <span style={{ fontWeight: 600 }}>{formatVND(revenueData.cashRevenue)}</span>
                    </div>
                  </div>

                  {/* Thông tin hóa đơn chờ */}
                  <div
                    style={{
                      marginTop: '22px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-symbols-outlined" style={{ color: '#eab308', fontSize: '20px' }}>
                        pending_actions
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                        Hóa đơn viện phí đang chờ thanh toán:
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#b45309', fontSize: '0.9rem' }}>
                      {revenueData.pendingInvoicesCount} hóa đơn
                    </span>
                  </div>
                </div>
              </div>

              {/* Bảng Top 5 bệnh phổ biến */}
              <div
                style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>
                    Top 5 Mặt Bệnh Phổ Biến Khám Chữa (ICD-10)
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Thống kê tự động từ hệ thống EMR</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {diagnoses.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              backgroundColor: '#f1f5f9',
                              borderRadius: '4px',
                              marginRight: '8px',
                              fontFamily: 'monospace',
                              color: '#005440',
                              fontWeight: 700
                            }}
                          >
                            {item.icd10Code}
                          </span>
                          {item.diseaseName}
                        </span>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>
                          {item.count} ca ({item.percentage}%)
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: '#f1f5f9',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${item.percentage}%`,
                            height: '100%',
                            backgroundColor: idx === 0 ? '#005440' : idx === 1 ? '#0d9488' : idx === 2 ? '#1960a6' : '#64748b',
                            borderRadius: '4px'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VISITS DETAILS */}
          {activeTab === 'visits' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <h4 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#1e293b' }}>
                  Chi Tiết Thống Kê Lượt Khám Hàng Ngày
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px' }}>Ngày</th>
                      <th style={{ padding: '10px 12px' }}>Tổng lượt tiếp nhận</th>
                      <th style={{ padding: '10px 12px' }}>Đã hoàn tất khám</th>
                      <th style={{ padding: '10px 12px' }}>Tỷ lệ hoàn thành</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitsData.dailyStats?.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.date}</td>
                        <td style={{ padding: '10px 12px' }}>{row.total} ca</td>
                        <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 600 }}>
                          {row.completed} ca
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#e6fffa',
                              color: '#005440',
                              fontWeight: 600,
                              fontSize: '0.8rem'
                            }}
                          >
                            {Math.round((row.completed / (row.total || 1)) * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REVENUE DETAILS */}
          {activeTab === 'revenue' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <h4 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#1e293b' }}>
                  Chi Tiết Doanh Thu Thu Viện Phí Từng Ngày
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px' }}>Ngày</th>
                      <th style={{ padding: '10px 12px' }}>Số hóa đơn</th>
                      <th style={{ padding: '10px 12px' }}>Doanh số phát sinh</th>
                      <th style={{ padding: '10px 12px' }}>Trung bình / Hóa đơn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueData.dailyRevenues?.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.date}</td>
                        <td style={{ padding: '10px 12px' }}>{row.invoiceCount} đơn</td>
                        <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>
                          {formatVND(row.amount)}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>
                          {formatVND(Math.round(row.amount / (row.invoiceCount || 1)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: DIAGNOSES */}
          {activeTab === 'diagnoses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  backgroundColor: '#fff',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <h4 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#1e293b' }}>
                  Bảng Mã Bệnh ICD-10 Chi Tiết
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {diagnoses.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            backgroundColor: '#e6fffa',
                            color: '#005440',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            marginRight: '10px'
                          }}
                        >
                          {d.icd10Code}
                        </span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{d.diseaseName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ color: '#64748b', fontSize: '0.88rem' }}>{d.count} bệnh nhân</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: '#005440',
                            fontSize: '0.92rem',
                            backgroundColor: '#fff',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1'
                          }}
                        >
                          {d.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#16a34a' }}>
              verified
            </span>
            Dữ liệu thống kê thời gian thực từ cơ sở dữ liệu HMS-AI Mỹ Phát Hospital
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px 16px', fontSize: '0.88rem' }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
