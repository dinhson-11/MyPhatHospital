import React from 'react';
import {
  formatDateTime,
  formatVND,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS
} from '../../utils/format';

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  CANCELLED: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  REFUNDED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'
};

const GROUPS = [
  { type: 'SERVICE', label: 'Khám bệnh', tone: 'text-primary' },
  { type: 'LAB', label: 'Cận lâm sàng', tone: 'text-violet-700' },
  { type: 'DRUG', label: 'Thuốc', tone: 'text-emerald-700' }
];

export function InvoiceStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.CANCELLED}`}>
      {INVOICE_STATUS_LABELS[status] || status}
    </span>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="text-slate-500 shrink-0 w-28">{label}</dt>
      <dd className="font-medium text-slate-900 dark:text-slate-100 min-w-0 break-words">{children || '—'}</dd>
    </div>
  );
}

/**
 * Chi tiết một hóa đơn: thông tin người bệnh, bảng kê theo nhóm, BHYT / người bệnh trả,
 * thông tin thu tiền hoặc hủy / hoàn tiền, và các thao tác phù hợp trạng thái.
 */
export default function InvoiceDetail({
  invoice,
  canRefund,
  busyAction,
  onPay,
  onCancel,
  onRefund,
  onRecalculate,
  onPrint,
  onBack
}) {
  const items = invoice.items || [];
  const itemsTotal = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const mismatch = Math.abs(itemsTotal - Number(invoice.totalAmount || 0)) >= 1;
  const hasInsurance = Number(invoice.insuranceAmount) > 0;
  const isPending = invoice.status === 'PENDING';
  const busy = Boolean(busyAction);

  return (
    <article className="space-y-5" aria-labelledby="invoice-detail-title">
      {onBack && (
        <button type="button" onClick={onBack} className="lg:hidden inline-flex items-center gap-1 text-sm font-semibold text-primary">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
          Danh sách hóa đơn
        </button>
      )}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] uppercase tracking-wide text-slate-500">
            {isPending ? 'Bảng kê chi phí' : 'Hóa đơn viện phí'}
          </p>
          <h3 id="invoice-detail-title" className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            {invoice.invoiceCode || `#${invoice.id}`}
          </h3>
          <p className="text-[13px] text-slate-500">Lập lúc {formatDateTime(invoice.createdAt)} · Ca khám #{invoice.visitId}</p>
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </header>

      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <InfoRow label="Người bệnh">{invoice.patientName}</InfoRow>
        <InfoRow label="Mã bệnh nhân"><span className="font-mono">{invoice.patientCode}</span></InfoRow>
        <InfoRow label="Bác sĩ">{invoice.doctorName}</InfoRow>
        <InfoRow label="Ngày khám">{formatDateTime(invoice.visitTime)}</InfoRow>
        <InfoRow label="Chẩn đoán">
          {[invoice.diagnosisCode, invoice.diagnosisNote].filter(Boolean).join(' – ')}
        </InfoRow>
        <InfoRow label="Thẻ BHYT">
          {invoice.insuranceNumber
            ? <span className="font-mono">{invoice.insuranceNumber}</span>
            : 'Không áp dụng'}
        </InfoRow>
      </dl>

      <section aria-label="Bảng kê chi phí">
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13px]">
              <tr>
                <th scope="col" className="py-2 px-3 text-left font-semibold">Nội dung</th>
                <th scope="col" className="py-2 px-3 text-right font-semibold w-14">SL</th>
                <th scope="col" className="py-2 px-3 text-right font-semibold w-28 hidden sm:table-cell">Đơn giá</th>
                <th scope="col" className="py-2 px-3 text-right font-semibold w-32">Thành tiền</th>
              </tr>
            </thead>
            {GROUPS.map((group) => {
              const groupItems = items.filter((i) => i.itemType === group.type);
              if (groupItems.length === 0) return null;
              const subtotal = groupItems.reduce((s, i) => s + Number(i.amount || 0), 0);
              return (
                <tbody key={group.type} className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="bg-white dark:bg-slate-900">
                    <th scope="rowgroup" colSpan={3} className={`pt-3 pb-1 px-3 text-left text-[12px] font-bold uppercase tracking-wide ${group.tone}`}>
                      {group.label}
                    </th>
                    <td className="pt-3 pb-1 px-3 text-right text-[12px] font-semibold text-slate-500 hidden sm:table-cell">
                      {formatVND(subtotal)}
                    </td>
                  </tr>
                  {groupItems.map((item) => (
                    <tr key={item.id ?? item.description}>
                      <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{item.description}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{item.quantity ?? 1}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-600 hidden sm:table-cell">
                        {formatVND(item.unitPrice ?? item.amount)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold">{formatVND(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
        {mismatch && (
          <p className="mt-2 text-[13px] text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
            Tổng các khoản ({formatVND(itemsTotal)}) không khớp tổng hóa đơn ({formatVND(invoice.totalAmount)}).
            {isPending ? ' Vui lòng bấm "Tính lại" trước khi thu tiền.' : ''}
          </p>
        )}
      </section>

      <section aria-label="Tổng thanh toán" className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
        <div className="flex justify-between px-4 py-2.5 text-sm">
          <span className="text-slate-600 dark:text-slate-300">Tổng chi phí</span>
          <span className="font-semibold tabular-nums">{formatVND(invoice.totalAmount)}</span>
        </div>
        <div className="flex justify-between gap-3 px-4 py-2.5 text-sm">
          <span className="text-slate-600 dark:text-slate-300">
            BHYT chi trả{hasInsurance ? ` (${Number(invoice.insuranceRate)}%)` : ''}
            {invoice.insuranceNote && <span className="block text-[12px] text-slate-500">{invoice.insuranceNote}</span>}
          </span>
          <span className={`font-semibold tabular-nums ${hasInsurance ? 'text-emerald-700' : ''}`}>
            {hasInsurance ? `− ${formatVND(invoice.insuranceAmount)}` : formatVND(0)}
          </span>
        </div>
        <div className="flex justify-between items-center px-4 py-3 bg-primary-fixed/60 dark:bg-slate-800 rounded-b-xl">
          <span className="font-semibold text-slate-900 dark:text-white">Người bệnh phải trả</span>
          <span className="text-2xl font-extrabold text-primary dark:text-sky-300 tabular-nums">{formatVND(invoice.patientAmount)}</span>
        </div>
      </section>

      {(invoice.status === 'PAID' || invoice.status === 'REFUNDED') && (
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-900">
          <InfoRow label="Hình thức">{PAYMENT_METHOD_LABELS[invoice.paymentMethod] || invoice.paymentMethod}</InfoRow>
          <InfoRow label="Mã giao dịch"><span className="font-mono">{invoice.transactionCode}</span></InfoRow>
          <InfoRow label="Thời gian thu">{formatDateTime(invoice.paidAt)}</InfoRow>
          <InfoRow label="Thu ngân">{invoice.cashierName}</InfoRow>
          {invoice.paymentMethod === 'CASH' && (
            <>
              <InfoRow label="Khách đưa">{formatVND(invoice.amountReceived)}</InfoRow>
              <InfoRow label="Trả lại">{formatVND(invoice.changeAmount)}</InfoRow>
            </>
          )}
          {invoice.note && <InfoRow label="Ghi chú">{invoice.note}</InfoRow>}
        </dl>
      )}

      {(invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED') && (
        <dl className="grid gap-y-2 p-4 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/60 dark:border-slate-700">
          <InfoRow label={invoice.status === 'REFUNDED' ? 'Lý do hoàn' : 'Lý do hủy'}>{invoice.voidReason}</InfoRow>
          <InfoRow label="Người thực hiện">{invoice.voidedBy}</InfoRow>
          <InfoRow label="Thời gian">{formatDateTime(invoice.voidedAt)}</InfoRow>
        </dl>
      )}

      <footer className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        {invoice.status !== 'CANCELLED' && (
          <button type="button" onClick={onPrint} className="btn btn-light inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">print</span>
            {isPending ? 'In bảng kê' : 'In phiếu thu'}
          </button>
        )}
        {isPending && (
          <>
            <button type="button" onClick={onCancel} disabled={busy}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
              Hủy hóa đơn
            </button>
            <button type="button" onClick={onRecalculate} disabled={busy}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">calculate</span>
              {busyAction === 'recalculate' ? 'Đang tính lại…' : 'Tính lại'}
            </button>
            <button type="button" onClick={onPay} disabled={busy || mismatch}
              className="px-5 py-2 rounded-lg text-sm font-bold bg-primary hover:bg-primary-dark text-white shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">payments</span>
              Thu tiền
            </button>
          </>
        )}
        {invoice.status === 'PAID' && canRefund && (
          <button type="button" onClick={onRefund} disabled={busy}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-red-700 border border-red-200 hover:bg-red-50 disabled:opacity-50">
            Hoàn tiền
          </button>
        )}
      </footer>
    </article>
  );
}
