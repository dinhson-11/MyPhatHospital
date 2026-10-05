import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import pharmacyService from '../services/pharmacyService';
import PharmacyDispenseModal from '../components/pharmacy/PharmacyDispenseModal';
import { ToastProvider } from '../context/ToastContext';

describe('Pharmacy & Dispense Module Suite (Sprint 8 - FR-6)', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  describe('pharmacyService Unit Tests', () => {
    it('lấy danh sách thuốc danh mục thành công', async () => {
      const drugs = await pharmacyService.getDrugs();
      expect(drugs).toBeDefined();
      expect(drugs.length).toBeGreaterThanOrEqual(15);
      expect(drugs.some(d => d.code === 'DRUG-PARA-500')).toBe(true);
    });

    it('tìm kiếm thuốc theo từ khóa tên hoặc mã code', async () => {
      const results = await pharmacyService.getDrugs('Aspirin');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Aspirin');
    });

    it('cấp phát đơn thuốc thành công và trừ tồn kho tự động', async () => {
      const prescriptionId = 888;
      const initialDrugs = await pharmacyService.getDrugs();
      const amloBefore = initialDrugs.find(d => d.code === 'DRUG-AMLO-5');
      const beforeStock = amloBefore ? amloBefore.stockQuantity : 1600;

      const dispenseData = {
        visitId: 105,
        patientName: 'Lê Văn An',
        patientCode: 'BN-2026-0888',
        doctorName: 'BSCKII. Nguyễn Văn Hùng',
        items: [
          { drugId: 9, drugCode: 'DRUG-AMLO-5', drugName: 'Amlodipine 5mg', quantity: 30 }
        ]
      };

      const result = await pharmacyService.dispensePrescription(prescriptionId, dispenseData);
      expect(result).toBeDefined();
      expect(result.prescriptionId).toBe(prescriptionId);
      expect(result.patientName).toBe('Lê Văn An');

      // Kiểm tra trạng thái isDispensed
      const isDispensed = await pharmacyService.isDispensed(prescriptionId);
      expect(isDispensed).toBe(true);

      // Kiểm tra tồn kho đã bị trừ 30 viên
      const afterDrugs = await pharmacyService.getDrugs();
      const amloAfter = afterDrugs.find(d => d.code === 'DRUG-AMLO-5');
      expect(amloAfter.stockQuantity).toBe(beforeStock - 30);
    });

    it('chặn cấp phát lại đơn thuốc đã được cấp phát trước đó', async () => {
      const prescriptionId = 777;
      await pharmacyService.dispensePrescription(prescriptionId, {
        patientName: 'Test Patient',
        items: []
      });

      await expect(
        pharmacyService.dispensePrescription(prescriptionId, { patientName: 'Test Patient', items: [] })
      ).rejects.toThrow(/đã được cấp phát trước đó/);
    });

    it('lọc danh sách thuốc sắp hết hàng tồn kho <= 20', async () => {
      const lowStock = await pharmacyService.getLowStockDrugs(20);
      expect(lowStock).toBeDefined();
      expect(lowStock.length).toBeGreaterThan(0);
      expect(lowStock.every(d => d.stockQuantity <= 20)).toBe(true);
      expect(lowStock.some(d => d.code === 'DRUG-WAR-5')).toBe(true); // Warfarin tồn 15
    });

    it('lọc danh sách thuốc sắp hết hạn', async () => {
      const expiring = await pharmacyService.getExpiringSoonDrugs(45);
      expect(expiring).toBeDefined();
      expect(expiring.some(d => d.code === 'DRUG-DIAZ-5')).toBe(true); // Sắp hết hạn trong 20 ngày
    });

    it('cập nhật tồn kho nhập và xuất chính xác', async () => {
      const drugId = 1; // Paracetamol
      const imported = await pharmacyService.updateStock(drugId, {
        quantity: 500,
        adjustmentType: 'IMPORT'
      });
      expect(imported.stockQuantity).toBe(3000); // 2500 + 500

      const exported = await pharmacyService.updateStock(drugId, {
        quantity: 200,
        adjustmentType: 'EXPORT'
      });
      expect(exported.stockQuantity).toBe(2800); // 3000 - 200
    });
  });

  describe('PharmacyDispenseModal UI Tests', () => {
    it('render modal hiển thị thông tin đơn thuốc và các tab điều hướng', async () => {
      render(
        <ToastProvider>
          <PharmacyDispenseModal isOpen={true} onClose={() => {}} onShowToast={() => {}} />
        </ToastProvider>
      );

      expect(screen.getByText(/Nhà Thuốc & Quản Lý Kho Dược/i)).toBeInTheDocument();
      expect(screen.getByText(/Cấp Phát Thuốc Theo Đơn/i)).toBeInTheDocument();
      expect(screen.getByText(/Kho Dược & Cảnh Báo Tồn Kho/i)).toBeInTheDocument();

      // Kiểm tra đơn thuốc mẫu mặc định xuất hiện
      await waitFor(() => {
        expect(screen.getByText(/Nguyễn Văn A/i)).toBeInTheDocument();
        expect(screen.getByText(/Amlodipine 5mg/i)).toBeInTheDocument();
      });
    });

    it('chuyển tab Kho Dược hiển thị danh mục thuốc và nút điều chỉnh tồn kho', async () => {
      render(
        <ToastProvider>
          <PharmacyDispenseModal isOpen={true} onClose={() => {}} onShowToast={() => {}} />
        </ToastProvider>
      );

      const tabInventory = screen.getByText(/Kho Dược & Cảnh Báo Tồn Kho/i);
      fireEvent.click(tabInventory);

      await waitFor(() => {
        expect(screen.getByText(/Tất cả danh mục/i)).toBeInTheDocument();
        expect(screen.getByText(/Sắp hết hàng/i)).toBeInTheDocument();
      });
    });
  });

});
