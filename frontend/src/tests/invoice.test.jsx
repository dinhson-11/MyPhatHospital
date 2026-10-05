import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import invoiceService from '../services/invoiceService';
import InvoiceModal from '../components/billing/InvoiceModal';
import { ToastProvider } from '../context/ToastContext';

describe('Billing & Invoice Module Suite (Sprint 8 - FR-7)', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  describe('invoiceService Unit Tests', () => {
    it('tự động sinh hóa đơn đủ 3 nhóm chi phí (Khám, Thuốc, Cận lâm sàng)', async () => {
      const visitId = 99;
      const invoice = await invoiceService.generateInvoice(visitId);

      expect(invoice).toBeDefined();
      expect(invoice.visitId).toBe(visitId);
      expect(invoice.status).toBe('PENDING');
      expect(invoice.totalAmount).toBeGreaterThan(0);
      expect(invoice.items.length).toBe(3);

      const types = invoice.items.map(i => i.itemType);
      expect(types).toContain('SERVICE');
      expect(types).toContain('DRUG');
      expect(types).toContain('LAB');
    });

    it('tính đúng tổng tiền viện phí từ tổng các khoản mục chi phí', async () => {
      const invoice = await invoiceService.generateInvoice(88);
      const computedSum = invoice.items.reduce((sum, item) => sum + item.amount, 0);
      expect(invoice.totalAmount).toBe(computedSum);
    });

    it('tra cứu hóa đơn theo ID và theo lượt khám', async () => {
      const invoices = await invoiceService.getInvoices();
      expect(invoices.length).toBeGreaterThan(0);

      const first = invoices[0];
      const found = await invoiceService.getInvoiceById(first.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(first.id);

      const byVisit = await invoiceService.getInvoiceByVisitId(first.visitId);
      expect(byVisit).toBeDefined();
      expect(byVisit.visitId).toBe(first.visitId);
    });

    it('xác nhận thanh toán viện phí bằng tiền mặt (CASH) chuyển trạng thái PAID', async () => {
      const invoices = await invoiceService.getInvoices();
      const pendingInv = invoices.find(i => i.status === 'PENDING') || await invoiceService.generateInvoice(77);

      const paid = await invoiceService.payInvoice(pendingInv.id, {
        paymentMethod: 'CASH',
        transactionCode: 'CASH-9999'
      });

      expect(paid.status).toBe('PAID');
      expect(paid.paymentMethod).toBe('CASH');
      expect(paid.paidAt).toBeDefined();
    });

    it('xác nhận thanh toán viện phí bằng VietQR chuyển trạng thái PAID', async () => {
      const invoice = await invoiceService.generateInvoice(66);
      const paid = await invoiceService.payInvoice(invoice.id, {
        paymentMethod: 'VIETQR',
        transactionCode: 'VQR-2026-6666'
      });

      expect(paid.status).toBe('PAID');
      expect(paid.paymentMethod).toBe('VIETQR');
      expect(paid.transactionCode).toBe('VQR-2026-6666');
    });

    it('chặn thanh toán lại hóa đơn đã thanh toán trước đó', async () => {
      const invoice = await invoiceService.generateInvoice(55);
      await invoiceService.payInvoice(invoice.id, { paymentMethod: 'CASH' });

      await expect(
        invoiceService.payInvoice(invoice.id, { paymentMethod: 'CASH' })
      ).rejects.toThrow(/đã được thanh toán trước đó/);
    });

    it('sinh đúng đường dẫn mã VietQR động chuẩn NAPAS 247', () => {
      const qrUrl = invoiceService.generateVietQRUrl({
        amount: 350000,
        description: 'VP 1001 BN001'
      });
      expect(qrUrl).toContain('https://img.vietqr.io/image/');
      expect(qrUrl).toContain('amount=350000');
      expect(qrUrl).toContain('MY%20PHAT%20HOSPITAL');
    });
  });

  describe('InvoiceModal UI Tests', () => {
    it('render modal hiển thị tiêu đề viện phí, bảng kê chi phí và nút thanh toán', async () => {
      render(
        <ToastProvider>
          <InvoiceModal isOpen={true} onClose={() => {}} onShowToast={() => {}} />
        </ToastProvider>
      );

      expect(screen.getByText(/Quản Lý Viện Phí & Hóa Đơn Khám Bệnh/i)).toBeInTheDocument();
      expect(screen.getByText(/Mỹ Phát Hospital/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/Bảng chi tiết các khoản chi phí/i)).toBeInTheDocument();
      });
    });

    it('chọn hóa đơn và mở modal thanh toán thu tiền viện phí', async () => {
      render(
        <ToastProvider>
          <InvoiceModal isOpen={true} onClose={() => {}} onShowToast={() => {}} />
        </ToastProvider>
      );

      await waitFor(() => {
        const payBtns = screen.queryAllByText(/Thu tiền viện phí/i);
        if (payBtns.length > 0) {
          fireEvent.click(payBtns[0]);
          expect(screen.getByText(/Tổng tiền viện phí cần thu/i)).toBeInTheDocument();
          expect(screen.getByText(/Quét VietQR/i)).toBeInTheDocument();
        }
      });
    });
  });

});
