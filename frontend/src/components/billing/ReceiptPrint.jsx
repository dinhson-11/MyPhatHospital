import React from 'react';
import { createPortal } from 'react-dom';
import {
  amountInWords,
  formatDateTime,
  formatVND,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS
} from '../../utils/format';

const ITEM_TYPE_LABELS = { SERVICE: 'Khám bệnh', DRUG: 'Thuốc', LAB: 'Cận lâm sàng' };

/**
 * In phiếu: thêm class print-receipt vào body để CSS @media print chỉ in vùng phiếu
 * (xem index.css – mục "Phiếu thu viện phí").
 */
export function printReceipt() {
  const body = document.body;
  const cleanup = () => {
    body.classList.remove('print-receipt');
    window.removeEventListener('afterprint', cleanup);
  };
  body.classList.add('print-receipt');
  window.addEventListener('afterprint', cleanup);
  window.print();
  cleanup();
}

/**
 * Mẫu in: PHIẾU THU (đã thu / đã hoàn tiền) hoặc BẢNG KÊ CHI PHÍ (chưa thu).
 * Luôn render ẩn trên màn hình; chỉ hiện khi in.
 */
export default function ReceiptPrint({ invoice }) {
  if (!invoice || typeof document === 'undefined') return null;

  const isReceipt = invoice.status === 'PAID' || invoice.status === 'REFUNDED';
  const title = isReceipt ? 'PHIẾU THU VIỆN PHÍ' : 'BẢNG KÊ CHI PHÍ KHÁM BỆNH';
  const cell = { border: '1px solid #94a3b8', padding: '4px 6px', fontSize: '10pt' };

  return createPortal(
    <div className="receipt-print-root" style={{ color: '#0f172a', fontFamily: "'Be Vietnam Pro', Arial, sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '12pt' }}>BỆNH VIỆN MỸ PHÁT</div>
          <div style={{ fontSize: '9pt' }}>1170 Quang Trung, Thị trấn Chũ, Lục Ngạn, Bắc Giang</div>
          <div style={{ fontSize: '9pt' }}>Điện thoại: 0789 065 493</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '9pt' }}>
          <div>Số: <strong>{invoice.invoiceCode || invoice.id}</strong></div>
          <div>Ngày lập: {formatDateTime(invoice.createdAt)}</div>
          {!isReceipt && <div>Trạng thái: {INVOICE_STATUS_LABELS[invoice.status]}</div>}
        </div>
      </div>

      <h1 style={{ textAlign: 'center', fontSize: '15pt', fontWeight: 800, margin: '8px 0 12px' }}>{title}</h1>
      {invoice.status === 'REFUNDED' && (
        <p style={{ textAlign: 'center', fontWeight: 700, color: '#a80000' }}>ĐÃ HOÀN TIỀN – {invoice.voidReason}</p>
      )}

      <table style={{ width: '100%', fontSize: '10pt', marginBottom: 10 }}>
        <tbody>
          <tr>
            <td>Họ tên người bệnh: <strong>{invoice.patientName}</strong></td>
            <td>Mã BN: <strong>{invoice.patientCode}</strong></td>
          </tr>
          <tr>
            <td>Bác sĩ khám: {invoice.doctorName || '—'}</td>
            <td>Ngày khám: {formatDateTime(invoice.visitTime)}</td>
          </tr>
          <tr>
            <td colSpan={2}>
              Chẩn đoán: {[invoice.diagnosisCode, invoice.diagnosisNote].filter(Boolean).join(' – ') || '—'}
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              Thẻ BHYT: {invoice.insuranceNumber || 'Không áp dụng'}
              {Number(invoice.insuranceRate) > 0 ? ` (mức hưởng ${Number(invoice.insuranceRate)}%)` : ''}
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={cell}>STT</th>
            <th style={cell}>Nội dung</th>
            <th style={cell}>Nhóm</th>
            <th style={{ ...cell, textAlign: 'right' }}>SL</th>
            <th style={{ ...cell, textAlign: 'right' }}>Đơn giá</th>
            <th style={{ ...cell, textAlign: 'right' }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items || []).map((item, idx) => (
            <tr key={item.id ?? idx}>
              <td style={{ ...cell, textAlign: 'center' }}>{idx + 1}</td>
              <td style={cell}>{item.description}</td>
              <td style={cell}>{ITEM_TYPE_LABELS[item.itemType] || item.itemType}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{item.quantity ?? 1}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{formatVND(item.unitPrice ?? item.amount)}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{formatVND(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ width: '60%', marginLeft: 'auto', fontSize: '10pt' }}>
        <tbody>
          <tr><td>Tổng chi phí:</td><td style={{ textAlign: 'right' }}>{formatVND(invoice.totalAmount)}</td></tr>
          <tr><td>BHYT chi trả:</td><td style={{ textAlign: 'right' }}>{formatVND(invoice.insuranceAmount || 0)}</td></tr>
          <tr style={{ fontWeight: 800, fontSize: '11pt' }}>
            <td>Người bệnh thanh toán:</td><td style={{ textAlign: 'right' }}>{formatVND(invoice.patientAmount)}</td>
          </tr>
        </tbody>
      </table>
      <p style={{ fontSize: '10pt', fontStyle: 'italic', margin: '6px 0 10px' }}>
        Bằng chữ: {amountInWords(invoice.patientAmount)}.
      </p>

      {isReceipt && (
        <p style={{ fontSize: '10pt' }}>
          Hình thức: {PAYMENT_METHOD_LABELS[invoice.paymentMethod] || '—'} · Mã giao dịch: {invoice.transactionCode || '—'} ·
          Thời gian thu: {formatDateTime(invoice.paidAt)}
          {invoice.paymentMethod === 'CASH' && invoice.amountReceived != null && (
            <> · Khách đưa: {formatVND(invoice.amountReceived)} · Trả lại: {formatVND(invoice.changeAmount || 0)}</>
          )}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 24, fontSize: '10pt', textAlign: 'center' }}>
        <div><strong>Người nộp tiền</strong><br /><em>(Ký, ghi rõ họ tên)</em></div>
        <div>
          <strong>{isReceipt ? 'Thu ngân' : 'Người lập bảng kê'}</strong><br /><em>(Ký, ghi rõ họ tên)</em>
          <div style={{ marginTop: 48 }}>{invoice.cashierName || ''}</div>
        </div>
      </div>
      {!isReceipt && (
        <p style={{ fontSize: '9pt', textAlign: 'center', marginTop: 16 }}>
          Bảng kê chưa phải phiếu thu – vui lòng thanh toán tại quầy thu ngân.
        </p>
      )}
    </div>,
    document.body
  );
}
