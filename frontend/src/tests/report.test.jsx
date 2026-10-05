import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { reportService } from '../services/reportService';
import StatisticsDashboardModal from '../components/reporting/StatisticsDashboardModal';
import { ToastProvider } from '../context/ToastContext';

describe('Reporting & BI Dashboard Suite (Sprint 9 - ADMIN / ACCOUNTANT Role)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('reportService Unit Tests', () => {
    it('lấy KPI tổng hợp toàn viện chính xác', async () => {
      const kpi = await reportService.getKpiSummary();
      expect(kpi).toBeDefined();
      expect(kpi.totalPatients).toBeGreaterThan(0);
      expect(kpi.todayVisits).toBeGreaterThan(0);
      expect(kpi.todayRevenue).toBeGreaterThan(0);
      expect(kpi.aiAlertsCount).toBeGreaterThan(0);
      expect(kpi.activeStaffCount).toBeGreaterThan(0);
    });

    it('lấy báo cáo lượt khám bệnh viện 7 ngày qua', async () => {
      const summary = await reportService.getVisitsSummary();
      expect(summary).toBeDefined();
      expect(summary.totalVisits).toBeGreaterThan(0);
      expect(summary.completedVisits).toBeGreaterThan(0);
      expect(Array.isArray(summary.dailyStats)).toBe(true);
      expect(summary.dailyStats.length).toBe(7);
      expect(summary.dailyStats[0]).toHaveProperty('date');
      expect(summary.dailyStats[0]).toHaveProperty('total');
      expect(summary.dailyStats[0]).toHaveProperty('completed');
    });

    it('lấy báo cáo doanh thu viện phí phân loại Tiền mặt vs VietQR', async () => {
      const rev = await reportService.getRevenueSummary();
      expect(rev).toBeDefined();
      expect(rev.totalRevenue).toBeGreaterThan(0);
      expect(rev.paidInvoicesCount).toBeGreaterThan(0);
      expect(rev.cashRevenue).toBeGreaterThan(0);
      expect(rev.vietQrRevenue).toBeGreaterThan(0);
      expect(rev.cashRevenue + rev.vietQrRevenue).toBe(rev.totalRevenue);
      expect(Array.isArray(rev.dailyRevenues)).toBe(true);
      expect(rev.dailyRevenues.length).toBe(7);
    });

    it('lấy danh sách Top 5 bệnh phổ biến theo mã ICD-10', async () => {
      const topDiseases = await reportService.getTopDiagnoses(5);
      expect(topDiseases).toBeDefined();
      expect(topDiseases.length).toBe(5);
      expect(topDiseases[0].icd10Code).toBe('I10');
      expect(topDiseases[0].diseaseName).toContain('Tăng huyết áp');
      expect(topDiseases.every((d) => d.percentage > 0)).toBe(true);
    });
  });

  describe('StatisticsDashboardModal Component Tests', () => {
    it('render modal báo cáo thống kê BI với các thẻ KPI', async () => {
      render(
        <ToastProvider>
          <StatisticsDashboardModal isOpen={true} onClose={() => {}} />
        </ToastProvider>
      );

      expect(screen.getByText(/Trung Tâm Báo Cáo & Thống Kê Bệnh Viện \(BI\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Tổng bệnh nhân quản lý/i)).toBeInTheDocument();
      expect(screen.getByText(/Lượt khám trong ngày/i)).toBeInTheDocument();
      expect(screen.getByText(/Cảnh báo AI an toàn/i)).toBeInTheDocument();
    });

    it('chuyển tab Lượt khám & Khám bệnh hiển thị bảng thống kê ngày', async () => {
      render(
        <ToastProvider>
          <StatisticsDashboardModal isOpen={true} onClose={() => {}} />
        </ToastProvider>
      );

      const visitsTab = screen.getByText(/Lượt khám & Khám bệnh/i);
      fireEvent.click(visitsTab);

      await waitFor(() => {
        expect(screen.getByText(/Chi Tiết Thống Kê Lượt Khám Hàng Ngày/i)).toBeInTheDocument();
        expect(screen.getByText(/Tỷ lệ hoàn thành/i)).toBeInTheDocument();
      });
    });

    it('chuyển tab Doanh thu & Viện phí hiển thị bảng doanh số', async () => {
      render(
        <ToastProvider>
          <StatisticsDashboardModal isOpen={true} onClose={() => {}} />
        </ToastProvider>
      );

      const revenueTab = screen.getByText(/Doanh thu & Viện phí/i);
      fireEvent.click(revenueTab);

      await waitFor(() => {
        expect(screen.getByText(/Chi Tiết Doanh Thu Thu Viện Phí Từng Ngày/i)).toBeInTheDocument();
        expect(screen.getByText(/Doanh số phát sinh/i)).toBeInTheDocument();
      });
    });

    it('chuyển tab Mô hình bệnh (ICD-10) hiển thị danh sách mã bệnh', async () => {
      render(
        <ToastProvider>
          <StatisticsDashboardModal isOpen={true} onClose={() => {}} />
        </ToastProvider>
      );

      const diagnosesTab = screen.getByText(/Mô hình bệnh \(ICD-10\)/i);
      fireEvent.click(diagnosesTab);

      await waitFor(() => {
        expect(screen.getByText(/Bảng Mã Bệnh ICD-10 Chi Tiết/i)).toBeInTheDocument();
        expect(screen.getAllByText('I10').length).toBeGreaterThan(0);
      });
    });
  });
});
