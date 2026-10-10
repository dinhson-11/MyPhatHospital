import React, { useCallback, useEffect, useRef, useState } from 'react';
import Modal from '../common/Modal';
import { useConfirm } from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import invoiceService from '../../services/invoiceService';
import InvoiceDetail, { InvoiceStatusBadge } from './InvoiceDetail';
import PaymentDialog from './PaymentDialog';
import ReceiptPrint, { printReceipt } from './ReceiptPrint';
import { formatDateTime, formatVND, PAYMENT_METHOD_LABELS } from '../../utils/format';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ thu' },
  { value: 'PAID', label: 'Đã thu' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'REFUNDED', label: 'Hoàn tiền' }
];

function ShiftSummary({ summary, loading, error, onRefresh }) {
  const methods = (summary?.byMethod || []).filter((m) => m.count > 0);
  return (
    <section aria-label="Tổng hợp thu ngân hôm nay"
      className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900">
      <div>
        <p className="text-[12px] text-slate-500">Đã thu hôm nay</p>
        <p className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
          {loading ? '…' : summary ? formatVND(summary.collectedAmount) : '—'}
          {summary && <span className="ml-1 text-[12px] font-medium text-slate-500">({summary.paidCount} hóa đơn)</span>}
        </p>
      </div>
      {methods.map((m) => (
        <div key={m.method}>
          <p className="text-[12px] text-slate-500">{PAYMENT_METHOD_LABELS[m.method]}</p>
          <p className="text-sm font-bold tabular-nums">{formatVND(m.amount)}</p>
        </div>
      ))}
      {summary && Number(summary.insuranceAmount) > 0 && (
        <div>
          <p className="text-[12px] text-slate-500">BHYT chi trả</p>
          <p className="text-sm font-bold text-emerald-700 tabular-nums">{formatVND(summary.insuranceAmount)}</p>
        </div>
      )}
      {summary && Number(summary.refundedAmount) > 0 && (
        <div>
          <p className="text-[12px] text-slate-500">Đã hoàn ({summary.refundedCount})</p>
          <p className="text-sm font-bold text-red-700 tabular-nums">− {formatVND(summary.refundedAmount)}</p>
        </div>
      )}
      <div>
        <p className="text-[12px] text-slate-500">Chờ thu</p>
        <p className="text-sm font-bold text-amber-700 tabular-nums">
          {summary ? `${summary.pendingCount} · ${formatVND(summary.pendingAmount)}` : '—'}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {error && <span className="text-[12px] text-red-700">{error}</span>}
        <button type="button" onClick={onRefresh} className="btn btn-light inline-flex items-center gap-1 text-[13px]" aria-label="Tải lại tổng hợp thu ngân">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>
          Làm mới
        </button>
      </div>
    </section>
  );
}

function ListSkeleton() {
  return (
    <ul className="p-3 space-y-2" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      ))}
    </ul>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="p-6 text-center space-y-3" role="alert">
      <span className="material-symbols-outlined text-3xl text-red-600" aria-hidden="true">cloud_off</span>
      <p className="text-sm text-slate-700 dark:text-slate-200">{message}</p>
      <button type="button" onClick={onRetry} className="btn btn-light">Thử lại</button>
    </div>
  );
}

export default function InvoiceModal({ isOpen, onClose, onShowToast, defaultVisitId }) {
  const { isAdmin } = useAuth();
  const confirm = useConfirm();
  const toast = useCallback((msg, type) => onShowToast?.(msg, type), [onShowToast]);

  const [tab, setTab] = useState('invoices'); // 'invoices' | 'queue'
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [list, setList] = useState({ loading: false, error: '', items: [], total: 0 });
  const [queue, setQueue] = useState({ loading: false, error: '', items: [] });
  const [summary, setSummary] = useState({ loading: false, error: '', data: null });
  const [selected, setSelected] = useState(null);
  const [mobilePane, setMobilePane] = useState('list');
  const [busyAction, setBusyAction] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [manualVisitId, setManualVisitId] = useState('');
  const requestSeq = useRef(0);

  const loadSummary = useCallback(async () => {
    setSummary((s) => ({ ...s, loading: true, error: '' }));
    try {
      setSummary({ loading: false, error: '', data: await invoiceService.getShiftSummary() });
    } catch (err) {
      setSummary({ loading: false, error: err.message, data: null });
    }
  }, []);

  const loadList = useCallback(async (kw, status) => {
    const seq = ++requestSeq.current;
    setList((l) => ({ ...l, loading: true, error: '' }));
    try {
      const { items, totalElements } = await invoiceService.getInvoices({ keyword: kw, status });
      if (seq !== requestSeq.current) return;
      setList({ loading: false, error: '', items, total: totalElements });
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setList({ loading: false, error: err.message, items: [], total: 0 });
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setQueue((q) => ({ ...q, loading: true, error: '' }));
    try {
      setQueue({ loading: false, error: '', items: await invoiceService.getUninvoicedVisits() });
    } catch (err) {
      setQueue({ loading: false, error: err.message, items: [] });
    }
  }, []);

  const refreshAll = useCallback(() => {
    loadList(keyword, statusFilter);
    loadQueue();
    loadSummary();
  }, [keyword, statusFilter, loadList, loadQueue, loadSummary]);

  // Mở modal: nạp tổng hợp + hàng chờ
  useEffect(() => {
    if (!isOpen) return;
    loadQueue();
    loadSummary();
  }, [isOpen, loadQueue, loadSummary]);

  // Tìm kiếm phía máy chủ, trễ 350ms khi gõ
  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setTimeout(() => loadList(keyword, statusFilter), keyword ? 350 : 0);
    return () => clearTimeout(t);
  }, [isOpen, keyword, statusFilter, loadList]);

  const selectInvoice = (inv) => {
    setSelected(inv);
    setMobilePane('detail');
  };

  const applyUpdated = (updated) => {
    setSelected(updated);
    setList((l) => ({ ...l, items: l.items.map((i) => (i.id === updated.id ? updated : i)) }));
  };

  const generateForVisit = useCallback(async (visitId) => {
    setBusyAction(`generate-${visitId}`);
    try {
      const inv = await invoiceService.generateInvoice(visitId);
      toast(`Đã lập hóa đơn ${inv.invoiceCode} cho ca khám #${visitId}`, 'success');
      setTab('invoices');
      selectInvoice(inv);
      loadQueue();
      loadSummary();
      loadList(keyword, statusFilter);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyAction('');
    }
  }, [toast, loadQueue, loadSummary, loadList, keyword, statusFilter]);

  useEffect(() => {
    if (isOpen && defaultVisitId) generateForVisit(defaultVisitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultVisitId]);

  const runAction = async (name, fn, successMsg) => {
    setBusyAction(name);
    try {
      const updated = await fn();
      applyUpdated(updated);
      toast(successMsg, 'success');
      loadSummary();
      if (name !== 'recalculate') loadQueue();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyAction('');
    }
  };

  const handleCancel = async () => {
    const reason = await confirm({
      title: `Hủy hóa đơn ${selected.invoiceCode}?`,
      message: 'Hóa đơn bị hủy sẽ không thu tiền được nữa. Ca khám sẽ quay lại hàng chờ để lập hóa đơn mới nếu cần.',
      tone: 'danger',
      requireReason: true,
      reasonLabel: 'Lý do hủy',
      confirmText: 'Hủy hóa đơn'
    });
    if (!reason) return;
    runAction('cancel', () => invoiceService.cancelInvoice(selected.id, reason), 'Đã hủy hóa đơn');
  };

  const handleRefund = async () => {
    const reason = await confirm({
      title: `Hoàn tiền hóa đơn ${selected.invoiceCode}?`,
      message: 'Chỉ thực hiện sau khi đã trả lại tiền cho người bệnh. Thao tác được ghi nhận người thực hiện và thời gian.',
      details: [
        `Số tiền hoàn: ${formatVND(selected.patientAmount)}`,
        `Đã thu bằng: ${PAYMENT_METHOD_LABELS[selected.paymentMethod] || selected.paymentMethod} – mã ${selected.transactionCode}`
      ],
      tone: 'danger',
      requireReason: true,
      reasonLabel: 'Lý do hoàn tiền',
      confirmText: 'Xác nhận hoàn tiền'
    });
    if (!reason) return;
    runAction('refund', () => invoiceService.refundInvoice(selected.id, reason), 'Đã ghi nhận hoàn tiền');
  };

  const handlePaid = (updated) => {
    setPayOpen(false);
    applyUpdated(updated);
    toast(`Đã thu ${formatVND(updated.patientAmount)} – hóa đơn ${updated.invoiceCode}`, 'success');
    loadSummary();
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Viện phí & thu ngân"
        subtitle="Lập hóa đơn từ ca khám, áp dụng BHYT, thu tiền và đối soát cuối ca"
        icon="receipt_long"
        size="full"
        bodyClassName="p-0 flex flex-col overflow-hidden"
      >
        <ShiftSummary summary={summary.data} loading={summary.loading} error={summary.error} onRefresh={refreshAll} />

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* Cột trái: danh sách / hàng chờ */}
          <div className={`${mobilePane === 'detail' ? 'hidden lg:flex' : 'flex'} flex-col lg:w-96 shrink-0 border-r border-slate-200 dark:border-slate-800 min-h-0`}>
            <div role="tablist" aria-label="Danh sách" className="grid grid-cols-2 p-2 gap-1 border-b border-slate-200 dark:border-slate-800">
              {[
                ['invoices', 'Hóa đơn'],
                ['queue', `Chờ lập hóa đơn${queue.items.length ? ` (${queue.items.length})` : ''}`]
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                    tab === value ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'invoices' ? (
              <>
                <div className="p-3 space-y-2 border-b border-slate-200 dark:border-slate-800">
                  <label htmlFor="invoice-search" className="sr-only">Tìm hóa đơn</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[20px]" aria-hidden="true">search</span>
                    <input
                      id="invoice-search"
                      type="search"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="Tên, mã bệnh nhân hoặc mã hóa đơn"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1" role="group" aria-label="Lọc theo trạng thái">
                    {STATUS_FILTERS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        aria-pressed={statusFilter === f.value}
                        onClick={() => setStatusFilter(f.value)}
                        className={`px-2.5 py-1 text-[12px] font-semibold rounded-full border transition-colors ${
                          statusFilter === f.value
                            ? 'bg-primary text-white border-primary'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto" aria-busy={list.loading}>
                  {list.loading && list.items.length === 0 ? <ListSkeleton /> : list.error ? (
                    <ErrorState message={list.error} onRetry={() => loadList(keyword, statusFilter)} />
                  ) : list.items.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 space-y-1">
                      <span className="material-symbols-outlined text-3xl" aria-hidden="true">receipt_long</span>
                      <p className="text-sm">Không có hóa đơn phù hợp.</p>
                      {statusFilter === 'PENDING' && queue.items.length > 0 && (
                        <button type="button" onClick={() => setTab('queue')} className="text-sm font-semibold text-primary hover:underline">
                          Xem {queue.items.length} ca khám chờ lập hóa đơn
                        </button>
                      )}
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {list.items.map((inv) => (
                        <li key={inv.id}>
                          <button
                            type="button"
                            onClick={() => selectInvoice(inv)}
                            aria-current={selected?.id === inv.id ? 'true' : undefined}
                            className={`w-full text-left px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 ${
                              selected?.id === inv.id ? 'bg-primary-fixed dark:bg-slate-800 border-l-4 border-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{inv.patientName}</span>
                              <InvoiceStatusBadge status={inv.status} />
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-1 text-[12px] text-slate-500">
                              <span className="font-mono">{inv.invoiceCode || `#${inv.id}`}</span>
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-[13px] tabular-nums">
                                {formatVND(inv.patientAmount ?? inv.totalAmount)}
                              </span>
                            </div>
                            {Number(inv.insuranceAmount) > 0 && (
                              <span className="inline-block mt-1 text-[12px] font-semibold text-emerald-700">
                                BHYT {Number(inv.insuranceRate)}%
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {list.total > list.items.length && (
                    <p className="px-4 py-2 text-[12px] text-slate-500">
                      Hiển thị {list.items.length}/{list.total} hóa đơn mới nhất – dùng ô tìm kiếm để thu hẹp.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <form
                  className="p-3 flex gap-2 border-b border-slate-200 dark:border-slate-800"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const id = Number(manualVisitId);
                    if (Number.isInteger(id) && id > 0) generateForVisit(id);
                  }}
                >
                  <label htmlFor="manual-visit-id" className="sr-only">Mã ca khám</label>
                  <input
                    id="manual-visit-id"
                    inputMode="numeric"
                    value={manualVisitId}
                    onChange={(e) => setManualVisitId(e.target.value.replace(/\D/g, ''))}
                    placeholder="Nhập mã ca khám"
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button type="submit" disabled={!manualVisitId || Boolean(busyAction)}
                    className="px-3 py-2 rounded-lg text-sm font-semibold bg-primary text-white disabled:opacity-50">
                    Lập HĐ
                  </button>
                </form>
                {queue.loading && queue.items.length === 0 ? <ListSkeleton /> : queue.error ? (
                  <ErrorState message={queue.error} onRetry={loadQueue} />
                ) : queue.items.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-500">Không có ca khám nào chờ lập hóa đơn.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {queue.items.map((v) => (
                      <li key={v.visitId} className="px-4 py-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{v.patientName}</span>
                          {v.insuranceEligible && (
                            <span className="text-[12px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Có BHYT</span>
                          )}
                        </div>
                        <p className="text-[12px] text-slate-500">
                          Ca #{v.visitId} · {formatDateTime(v.visitTime)} · {v.doctorName || 'Chưa rõ bác sĩ'}
                        </p>
                        {(v.diagnosisCode || v.diagnosisNote) && (
                          <p className="text-[12px] text-slate-600 dark:text-slate-300 truncate">
                            {[v.diagnosisCode, v.diagnosisNote].filter(Boolean).join(' – ')}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => generateForVisit(v.visitId)}
                          disabled={Boolean(busyAction)}
                          className="mt-1 px-3 py-1.5 rounded-lg text-[13px] font-semibold border border-primary/40 text-primary hover:bg-primary-fixed disabled:opacity-50"
                        >
                          {busyAction === `generate-${v.visitId}` ? 'Đang lập…' : 'Lập hóa đơn'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Cột phải: chi tiết */}
          <div className={`${mobilePane === 'list' ? 'hidden lg:block' : 'block'} flex-1 min-w-0 overflow-y-auto px-5 sm:px-6 py-5`}>
            {selected ? (
              <InvoiceDetail
                invoice={selected}
                canRefund={isAdmin}
                busyAction={busyAction}
                onPay={() => setPayOpen(true)}
                onCancel={handleCancel}
                onRefund={handleRefund}
                onRecalculate={() => runAction('recalculate', () => invoiceService.recalculateInvoice(selected.id), 'Đã tính lại hóa đơn theo dữ liệu mới nhất')}
                onPrint={printReceipt}
                onBack={() => setMobilePane('list')}
              />
            ) : (
              <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-slate-500 text-center gap-2">
                <span className="material-symbols-outlined text-4xl" aria-hidden="true">receipt</span>
                <p className="text-sm">Chọn một hóa đơn để xem chi tiết, hoặc lập hóa đơn từ hàng chờ.</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <PaymentDialog isOpen={payOpen} invoice={selected} onClose={() => setPayOpen(false)} onPaid={handlePaid} />
      <ReceiptPrint invoice={selected} />
    </>
  );
}
