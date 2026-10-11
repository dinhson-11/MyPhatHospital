import { QRCodeSVG } from 'qrcode.react';
import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import invoiceService from '../../services/invoiceService';
import { formatNumber, formatVND, parseNumber, PAYMENT_METHOD_LABELS } from '../../utils/format';

const METHODS = [
  { value: 'CASH', icon: 'payments', hint: 'Thu tại quầy, máy tính tiền thừa' },
  { value: 'VIETQR', icon: 'qr_code_2', hint: 'Người bệnh quét mã bằng app ngân hàng' },
  { value: 'BANK_TRANSFER', icon: 'account_balance', hint: 'Chuyển khoản thủ công, nhập mã giao dịch' },
  { value: 'CARD', icon: 'credit_card', hint: 'Quẹt thẻ qua máy POS, nhập mã chuẩn chi' }
];

const TXN_PATTERN = /^[A-Za-z0-9._/-]+$/;

/** Các mệnh giá gợi ý làm tròn lên (VD: phải thu 136.000 → 140.000, 150.000, 200.000, 500.000). */
export function suggestCashAmounts(due) {
  if (!due || due <= 0) return [];
  const steps = [10000, 50000, 100000, 200000, 500000];
  const values = new Set();
  steps.forEach((s) => {
    const v = Math.ceil(due / s) * s;
    if (v > due) values.add(v);
  });
  return [...values].sort((a, b) => a - b).slice(0, 4);
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard?.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="text-[12px] font-semibold text-primary hover:underline shrink-0"
      aria-label={`Sao chép ${label}`}
    >
      {copied ? 'Đã chép' : 'Sao chép'}
    </button>
  );
}

function BankInfo({ qr }) {
  const rows = [
    ['Ngân hàng', qr.bankName || qr.bankBin],
    ['Số tài khoản', qr.accountNo, true],
    ['Chủ tài khoản', qr.accountName],
    ['Số tiền', formatVND(qr.amount)],
    ['Nội dung', qr.transferContent, true]
  ];
  return (
    <dl className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">
      {rows.map(([label, value, copyable]) => (
        <div key={label} className="flex items-center justify-between gap-3 px-3 py-2">
          <dt className="text-slate-500 shrink-0">{label}</dt>
          <dd className="flex items-center gap-2 min-w-0 font-semibold text-slate-900 dark:text-white text-right">
            <span className="truncate font-mono">{value}</span>
            {copyable && value && <CopyButton text={String(value)} label={label.toLowerCase()} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function PaymentDialog({ isOpen, invoice, onClose, onPaid }) {
  const due = Number(invoice?.patientAmount ?? 0);
  const [method, setMethod] = useState('CASH');
  const [cashText, setCashText] = useState('');
  const [txnCode, setTxnCode] = useState('');
  const [note, setNote] = useState('');
  const [qr, setQr] = useState({ loading: false, data: null, error: null });
  const [qrImageFailed, setQrImageFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Mỗi lần mở cho một hóa đơn mới thì làm sạch form
  useEffect(() => {
    if (!isOpen) return;
    setMethod('CASH');
    setCashText('');
    setTxnCode('');
    setNote('');
    setQr({ loading: false, data: null, error: null });
    setQrImageFailed(false);
    setError('');
  }, [isOpen, invoice?.id]);

  const needsBankInfo = method === 'VIETQR' || method === 'BANK_TRANSFER';
  useEffect(() => {
    if (!isOpen || !needsBankInfo || !invoice?.id || due <= 0 || qr.data || qr.loading || qr.error) return;
    setQr({ loading: true, data: null, error: null });
    invoiceService.getPaymentQr(invoice.id)
      .then((data) => setQr({ loading: false, data, error: null }))
      .catch((err) => setQr({ loading: false, data: null, error: err.message }));
  }, [isOpen, needsBankInfo, invoice?.id, due, qr.data, qr.loading, qr.error]);

  const received = parseNumber(cashText);
  const change = received !== null ? received - due : null;
  const suggestions = useMemo(() => suggestCashAmounts(due), [due]);

  const validation = (() => {
    if (method === 'CASH') {
      if (due > 0 && received === null) return 'Nhập số tiền khách đưa';
      if (received !== null && received < due) return `Khách đưa còn thiếu ${formatVND(due - received)}`;
      return '';
    }
    const code = txnCode.trim();
    if (code.length < 4) return method === 'CARD' ? 'Nhập mã chuẩn chi trên hóa đơn POS (tối thiểu 4 ký tự)'
      : 'Nhập mã giao dịch ngân hàng (tối thiểu 4 ký tự) sau khi kiểm tra tiền đã vào tài khoản';
    if (!TXN_PATTERN.test(code)) return 'Mã giao dịch chỉ gồm chữ, số và . _ / -';
    return '';
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validation || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const updated = await invoiceService.payInvoice(invoice.id, {
        paymentMethod: method,
        amountReceived: method === 'CASH' ? (received ?? 0) : undefined,
        transactionCode: method === 'CASH' ? undefined : txnCode,
        note
      });
      onPaid?.(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title={`Thu tiền hóa đơn ${invoice.invoiceCode || `#${invoice.id}`}`}
      subtitle={`${invoice.patientName} · ${invoice.patientCode}`}
      icon="point_of_sale"
      size="md"
      footer={(
        <>
          <button type="button" className="btn btn-light" onClick={onClose} disabled={submitting}>Hủy</button>
          <button
            type="submit"
            form="payment-form"
            disabled={Boolean(validation) || submitting}
            className="px-5 py-2.5 rounded-lg text-sm font-bold bg-primary hover:bg-primary-dark text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {submitting ? 'progress_activity' : 'check_circle'}
            </span>
            {submitting ? 'Đang ghi nhận…' : `Xác nhận đã thu ${formatVND(due)}`}
          </button>
        </>
      )}
    >
      <form id="payment-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="rounded-xl bg-primary-fixed dark:bg-slate-800 border border-primary-fixed-dim dark:border-slate-700 p-4">
          <p className="text-[13px] text-slate-600 dark:text-slate-300">Người bệnh phải trả</p>
          <p className="text-3xl font-extrabold text-primary dark:text-sky-300 tracking-tight">{formatVND(due)}</p>
          {Number(invoice.insuranceAmount) > 0 && (
            <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-1">
              Tổng chi phí {formatVND(invoice.totalAmount)} – BHYT chi trả {formatVND(invoice.insuranceAmount)}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-2">Phương thức thanh toán</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => {
              const active = method === m.value;
              return (
                <label
                  key={m.value}
                  className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                    active
                      ? 'border-primary bg-primary-fixed/60 ring-2 ring-primary/20 dark:bg-slate-800'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m.value}
                    checked={active}
                    onChange={() => { setMethod(m.value); setError(''); }}
                    className="sr-only"
                  />
                  <span className={`material-symbols-outlined text-[22px] ${active ? 'text-primary' : 'text-slate-500'}`} aria-hidden="true">{m.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 dark:text-white">{PAYMENT_METHOD_LABELS[m.value]}</span>
                    <span className="block text-[12px] text-slate-500 leading-snug">{m.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {method === 'CASH' && (
          <div className="space-y-3">
            <div>
              <label htmlFor="cash-received" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Tiền khách đưa (đ)
              </label>
              <input
                id="cash-received"
                data-autofocus
                inputMode="numeric"
                autoComplete="off"
                value={cashText}
                onChange={(e) => setCashText(formatNumber(parseNumber(e.target.value)))}
                placeholder={formatNumber(due) || '0'}
                aria-invalid={Boolean(validation) && cashText !== ''}
                aria-describedby="cash-help"
                className="w-full px-3 py-2.5 text-lg font-bold text-right border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex flex-wrap gap-1.5 mt-2" aria-label="Chọn nhanh số tiền">
                <button type="button" onClick={() => setCashText(formatNumber(due))}
                  className="px-2.5 py-1 text-[12px] font-semibold rounded-lg border border-primary/40 text-primary hover:bg-primary-fixed">
                  Đủ tiền
                </button>
                {suggestions.map((amt) => (
                  <button key={amt} type="button" onClick={() => setCashText(formatNumber(amt))}
                    className="px-2.5 py-1 text-[12px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                    {formatVND(amt)}
                  </button>
                ))}
              </div>
            </div>
            <div id="cash-help" className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
              change !== null && change < 0
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200'
            }`}>
              <span className="text-sm font-medium">{change !== null && change < 0 ? 'Còn thiếu' : 'Tiền thừa trả khách'}</span>
              <span className="text-xl font-extrabold">{change === null ? '—' : formatVND(Math.abs(change))}</span>
            </div>
          </div>
        )}

        {needsBankInfo && due > 0 && (
          <div className="space-y-3">
            {qr.loading && <p className="text-sm text-slate-500" role="status">Đang tạo thông tin chuyển khoản…</p>}
            {qr.error && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 text-[13px]" role="alert">
                {qr.error}
              </div>
            )}
            {qr.data && (
              <>
                {qr.data.demo && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 text-[13px] font-semibold" role="alert">
                    Tài khoản DEMO – không dùng để nhận tiền thật.
                  </div>
                )}
                {method === 'VIETQR' && (
                  <div className="flex justify-center">
                    {qr.data.qrPayload ? (
                      // Mã QR dựng tại trình duyệt từ chuỗi VietQR do máy chủ sinh: không cần Internet, số tiền + nội dung chính xác
                      <div
                        role="img"
                        aria-label={`Mã VietQR chuyển ${formatVND(qr.data.amount)} – nội dung ${qr.data.transferContent}`}
                        data-testid="vietqr-code"
                        className="rounded-xl border border-slate-200 bg-white p-2"
                      >
                        <QRCodeSVG value={qr.data.qrPayload} size={208} level="M" marginSize={1} bgColor="#ffffff" fgColor="#000000" />
                      </div>
                    ) : qrImageFailed ? (
                      <p className="text-[13px] text-slate-600 text-center max-w-xs">
                        Không tải được ảnh mã QR (cần kết nối Internet). Người bệnh có thể chuyển khoản theo thông tin bên dưới.
                      </p>
                    ) : (
                      <img
                        src={qr.data.qrImageUrl}
                        alt={`Mã VietQR chuyển ${formatVND(qr.data.amount)} – nội dung ${qr.data.transferContent}`}
                        onError={() => setQrImageFailed(true)}
                        className="w-52 h-52 object-contain rounded-xl border border-slate-200 bg-white p-2"
                      />
                    )}
                  </div>
                )}
                <BankInfo qr={qr.data} />
              </>
            )}
          </div>
        )}

        {method !== 'CASH' && (
          <div>
            <label htmlFor="txn-code" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
              {method === 'CARD' ? 'Mã chuẩn chi (trên hóa đơn POS)' : 'Mã giao dịch ngân hàng'} <span className="text-red-600">*</span>
            </label>
            <input
              id="txn-code"
              autoComplete="off"
              value={txnCode}
              onChange={(e) => setTxnCode(e.target.value.toUpperCase())}
              placeholder={method === 'CARD' ? 'VD: 123456' : 'VD: FT26283123456'}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-[12px] text-slate-500 mt-1">
              Chỉ xác nhận sau khi đã thấy tiền vào tài khoản / máy POS báo thành công. Mỗi mã chỉ dùng cho một hóa đơn.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="pay-note" className="block text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-1">Ghi chú (không bắt buộc)</label>
          <input
            id="pay-note"
            maxLength={255}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {validation && (cashText !== '' || txnCode !== '') && (
          <p className="text-[13px] text-amber-800">{validation}</p>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm" role="alert">{error}</div>
        )}
      </form>
    </Modal>
  );
}
