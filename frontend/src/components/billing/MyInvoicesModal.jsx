import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../common/Modal';
import invoiceService from '../../services/invoiceService';
import ReceiptPrint, { printReceipt } from './ReceiptPrint';
import { InvoiceStatusBadge } from './InvoiceDetail';
import { formatDateTime, formatVND, PAYMENT_METHOD_LABELS } from '../../utils/format';

/**
 * Bệnh nhân xem hóa đơn viện phí của chính mình (GET /invoices/me) và in lại phiếu thu.
 */
export default function MyInvoicesModal({ isOpen, onClose }) {
  const [state, setState] = useState({ loading: false, error: '', items: [] });
  const [expandedId, setExpandedId] = useState(null);
  const [printing, setPrinting] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      setState({ loading: false, error: '', items: await invoiceService.getMyInvoices() });
    } catch (err) {
      setState({ loading: false, error: err.message, items: [] });
    }
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  useEffect(() => {
    if (!printing) return;
    printReceipt();
    setPrinting(null);
  }, [printing]);

  const pending = state.items.filter((i) => i.status === 'PENDING');
  const pendingTotal = pending.reduce((s, i) => s + Number(i.patientAmount || 0), 0);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Hóa đơn viện phí của tôi" icon="receipt_long" size="lg">
        {state.loading && <p className="text-sm text-slate-500" role="status">Đang tải hóa đơn…</p>}
        {state.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm flex items-center justify-between gap-3" role="alert">
            <span>{state.error}</span>
            <button type="button" onClick={load} className="btn btn-light">Thử lại</button>
          </div>
        )}
        {!state.loading && !state.error && state.items.length === 0 && (
          <p className="text-sm text-slate-500 py-6 text-center">Bạn chưa có hóa đơn viện phí nào.</p>
        )}

        {pending.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
            Bạn có {pending.length} hóa đơn chờ thanh toán, tổng <strong>{formatVND(pendingTotal)}</strong>.
            Vui lòng thanh toán tại quầy thu ngân (tiền mặt, thẻ hoặc quét VietQR).
          </div>
        )}

        <ul className="space-y-3">
          {state.items.map((inv) => {
            const expanded = expandedId === inv.id;
            return (
              <li key={inv.id} className="rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setExpandedId(expanded ? null : inv.id)}
                  className="w-full text-left px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                >
                  <span>
                    <span className="block font-mono text-sm font-semibold">{inv.invoiceCode}</span>
                    <span className="block text-[12px] text-slate-500">
                      Khám {formatDateTime(inv.visitTime)} · {inv.doctorName || '—'}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-base font-bold tabular-nums">{formatVND(inv.patientAmount)}</span>
                    <InvoiceStatusBadge status={inv.status} />
                  </span>
                </button>
                {expanded && (
                  <div className="px-4 pb-4 space-y-2 text-sm border-t border-slate-100 dark:border-slate-800 pt-3">
                    <ul className="space-y-1">
                      {(inv.items || []).map((item) => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <span className="text-slate-700 dark:text-slate-200">{item.description}</span>
                          <span className="tabular-nums">{formatVND(item.amount)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                      <span>Tổng chi phí</span><span className="tabular-nums">{formatVND(inv.totalAmount)}</span>
                    </div>
                    {Number(inv.insuranceAmount) > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>BHYT chi trả ({Number(inv.insuranceRate)}%)</span>
                        <span className="tabular-nums">− {formatVND(inv.insuranceAmount)}</span>
                      </div>
                    )}
                    {inv.status === 'PAID' && (
                      <p className="text-[13px] text-slate-500">
                        Đã thanh toán {formatDateTime(inv.paidAt)} bằng {PAYMENT_METHOD_LABELS[inv.paymentMethod] || inv.paymentMethod}
                      </p>
                    )}
                    {(inv.status === 'PAID' || inv.status === 'PENDING') && (
                      <button type="button" onClick={() => setPrinting(inv)} className="btn btn-light inline-flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">print</span>
                        {inv.status === 'PAID' ? 'In phiếu thu' : 'In bảng kê'}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Modal>
      <ReceiptPrint invoice={printing || state.items.find((i) => i.id === expandedId)} />
    </>
  );
}
