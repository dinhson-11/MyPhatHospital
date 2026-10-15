import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import pharmacyService, { STOCK_ADJUSTMENT_LABELS } from '../../services/pharmacyService';
import { isDrugExpired } from '../../services/visitService';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../common/ConfirmDialog';
import Modal from '../common/Modal';
import { formatDate, formatDateTime, formatVND } from '../../utils/format';
import NewDrugDialog from './NewDrugDialog';
import ImportDrugsDialog from './ImportDrugsDialog';

const TABS = [
  { id: 'dispense', label: 'Cấp phát theo đơn', icon: 'local_pharmacy' },
  { id: 'inventory', label: 'Kho dược', icon: 'inventory_2' }
];

const LOW_STOCK_THRESHOLD = 20;
const EXPIRING_DAYS = 45;

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  if (!y) return null;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

/**
 * Nhà thuốc & kho dược.
 * - Tra cứu đơn thuốc theo MÃ CA KHÁM (dữ liệu thật) – không còn đơn mẫu tự nạp hay đơn bịa theo số tra cứu.
 * - Đối chiếu tồn kho / hạn dùng từng thuốc trước khi cấp phát; xác nhận trước khi trừ kho.
 * - Máy chủ chỉ cho cấp phát khi ca khám đã hoàn tất; mọi lỗi hiển thị đúng thông điệp.
 */
export default function PharmacyDispenseModal({ isOpen, onClose, onShowToast }) {
  const { showToast } = useToast();
  const notify = onShowToast || showToast;
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('dispense');
  const tabRefs = useRef({});

  // Tra cứu & cấp phát
  const [visitQuery, setVisitQuery] = useState('');
  const [queryError, setQueryError] = useState('');
  const [lookup, setLookup] = useState({ status: 'idle', visitId: null, prescriptions: [], error: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [dispenseNote, setDispenseNote] = useState('');
  const [dispensing, setDispensing] = useState(false);
  const [dispenseError, setDispenseError] = useState('');

  // Kho dược
  const [inventory, setInventory] = useState({ status: 'idle', items: [], error: '' });
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [stockDrug, setStockDrug] = useState(null);
  const [showNewDrug, setShowNewDrug] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [stockQty, setStockQty] = useState('');
  const [stockType, setStockType] = useState('IMPORT');
  const [stockError, setStockError] = useState('');
  const [savingStock, setSavingStock] = useState(false);

  const loadInventory = useCallback(async () => {
    setInventory((prev) => ({ ...prev, status: 'loading', error: '' }));
    try {
      const items = await pharmacyService.getDrugs();
      setInventory({ status: 'ready', items, error: '' });
    } catch (err) {
      setInventory({ status: 'error', items: [], error: err.message });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setLookup({ status: 'idle', visitId: null, prescriptions: [], error: '' });
    setSelectedId(null);
    setVisitQuery('');
    loadInventory();
  }, [isOpen, loadInventory]);

  const drugMap = useMemo(() => {
    const m = new Map();
    inventory.items.forEach((d) => m.set(String(d.id), d));
    return m;
  }, [inventory.items]);

  const selected = lookup.prescriptions.find((p) => p.id === selectedId) || null;

  const handleSearch = async (e) => {
    e.preventDefault();
    const raw = visitQuery.trim();
    if (!/^\d+$/.test(raw)) {
      setQueryError('Mã ca khám chỉ gồm chữ số (VD: 125).');
      return;
    }
    setQueryError('');
    setSelectedId(null);
    setDispenseNote('');
    setDispenseError('');
    setLookup({ status: 'loading', visitId: Number(raw), prescriptions: [], error: '' });
    try {
      const list = await pharmacyService.getPrescriptionsByVisit(Number(raw));
      const withStatus = await Promise.all(list.map(async (p) => {
        try {
          const dispensed = await pharmacyService.isDispensed(p.id);
          return { ...p, dispenseStatus: dispensed ? 'DISPENSED' : 'PENDING' };
        } catch {
          return { ...p, dispenseStatus: 'UNKNOWN' };
        }
      }));
      setLookup({ status: 'ready', visitId: Number(raw), prescriptions: withStatus, error: '' });
      if (withStatus.length === 1) setSelectedId(withStatus[0].id);
    } catch (err) {
      setLookup({ status: 'error', visitId: Number(raw), prescriptions: [], error: err.message });
    }
  };

  const stockStatusOf = (item) => {
    const drug = drugMap.get(String(item.drugId));
    if (!drug) return { level: 'unknown', text: 'Chưa đối chiếu được kho' };
    if (isDrugExpired(drug)) return { level: 'error', text: `Lô trong kho đã hết hạn (${formatDate(drug.expiryDate)})` };
    const stock = Number(drug.stockQuantity || 0);
    if (stock < Number(item.quantity || 0)) return { level: 'error', text: `Không đủ – còn ${stock} ${drug.unit || ''}` };
    return { level: 'ok', text: `Đủ (còn ${stock})` };
  };

  const blockingItems = selected ? (selected.items || []).filter((it) => stockStatusOf(it).level === 'error') : [];

  const handleDispense = async () => {
    if (!selected || dispensing || selected.dispenseStatus === 'DISPENSED') return;
    const ok = await confirm({
      title: `Cấp phát đơn thuốc #${selected.id}?`,
      message: 'Hệ thống sẽ trừ tồn kho theo đúng số lượng trong đơn. Thao tác không thể hoàn tác.',
      details: (selected.items || []).map((it) => `${it.drugName}: ${it.quantity} ${it.unit || ''}`.trim()),
      tone: 'primary',
      confirmText: 'Cấp phát & trừ kho'
    });
    if (!ok) return;
    setDispensing(true);
    setDispenseError('');
    try {
      const res = await pharmacyService.dispensePrescription(selected.id, { note: dispenseNote.trim() });
      setLookup((prev) => ({
        ...prev,
        prescriptions: prev.prescriptions.map((p) => (p.id === selected.id ? { ...p, dispenseStatus: 'DISPENSED', dispense: res } : p))
      }));
      notify(`Đã cấp phát đơn thuốc #${selected.id}.`, 'success');
      loadInventory();
    } catch (err) {
      setDispenseError(err.message);
      notify(err.message || 'Cấp phát thuốc không thành công', 'error');
    } finally {
      setDispensing(false);
    }
  };

  const openStock = (drug) => {
    setStockDrug(drug);
    setStockQty('');
    setStockType('IMPORT');
    setStockError('');
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!stockDrug || savingStock) return;
    const qty = Number(stockQty);
    if (!Number.isInteger(qty) || qty < 1) {
      setStockError('Số lượng phải là số nguyên lớn hơn 0.');
      return;
    }
    if (stockType === 'EXPORT' && qty > Number(stockDrug.stockQuantity || 0)) {
      setStockError(`Không thể xuất quá tồn kho hiện có (${stockDrug.stockQuantity}).`);
      return;
    }
    setSavingStock(true);
    try {
      await pharmacyService.updateStock(stockDrug.id, { quantity: qty, adjustmentType: stockType, note: 'Điều chỉnh tại quầy nhà thuốc' });
      notify(`Đã cập nhật tồn kho ${stockDrug.name}.`, 'success');
      setStockDrug(null);
      loadInventory();
    } catch (err) {
      setStockError(err.message);
    } finally {
      setSavingStock(false);
    }
  };

  const filteredDrugs = inventory.items.filter((d) => {
    if (inventoryFilter === 'low_stock') return Number(d.stockQuantity || 0) <= LOW_STOCK_THRESHOLD;
    if (inventoryFilter === 'expiring') {
      const days = daysUntil(d.expiryDate);
      return days !== null && days <= EXPIRING_DAYS;
    }
    return true;
  });

  const handleTabKeyDown = (e, index) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = TABS[(index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    setActiveTab(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!dispensing && !savingStock) onClose?.(); }}
      title="Nhà thuốc & kho dược"
      subtitle="Cấp phát thuốc theo đơn và theo dõi tồn kho, hạn dùng"
      icon="medication"
      size="xl"
      bodyClassName="p-0 flex flex-col min-h-0"
    >
      <div role="tablist" aria-label="Nghiệp vụ nhà thuốc" className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6">
        {TABS.map((tab, index) => {
          const isSel = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[tab.id] = el; }}
              type="button"
              role="tab"
              id={`pharmacy-tab-${tab.id}`}
              aria-selected={isSel}
              aria-controls={`pharmacy-panel-${tab.id}`}
              tabIndex={isSel ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${isSel ? 'border-primary text-primary bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`pharmacy-panel-${activeTab}`} aria-labelledby={`pharmacy-tab-${activeTab}`} className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
        {activeTab === 'dispense' ? (
          <div className="space-y-5">
            <form onSubmit={handleSearch} noValidate className="flex flex-col sm:flex-row gap-2 sm:items-start">
              <div className="form-field flex-1">
                <label htmlFor="pharmacy-visit-id" className="form-label">Mã ca khám</label>
                <input
                  id="pharmacy-visit-id"
                  type="text"
                  inputMode="numeric"
                  value={visitQuery}
                  onChange={(e) => { setVisitQuery(e.target.value); setQueryError(''); }}
                  placeholder="Nhập mã ca khám in trên phiếu khám (VD: 125)"
                  aria-invalid={queryError ? 'true' : undefined}
                  aria-describedby="pharmacy-visit-hint"
                  className={`input ${queryError ? 'is-error' : ''}`}
                />
                {queryError
                  ? <p id="pharmacy-visit-hint" className="form-error">{queryError}</p>
                  : <p id="pharmacy-visit-hint" className="form-hint">Chỉ cấp phát được khi bác sĩ đã hoàn tất ca khám.</p>}
              </div>
              <button type="submit" disabled={lookup.status === 'loading'} className="btn btn-primary sm:mt-[26px]">
                <span className="material-symbols-outlined" aria-hidden="true">search</span>
                {lookup.status === 'loading' ? 'Đang tra cứu…' : 'Tra cứu'}
              </button>
            </form>

            {lookup.status === 'error' && (
              <div role="alert" className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-900">{lookup.error}</div>
            )}

            {lookup.status === 'ready' && lookup.prescriptions.length === 0 && (
              <p role="status" className="p-4 rounded-xl border border-dashed border-slate-300 text-sm text-slate-700">
                Ca khám #{lookup.visitId} chưa có đơn thuốc nào.
              </p>
            )}

            {lookup.status === 'ready' && lookup.prescriptions.length > 1 && (
              <fieldset>
                <legend className="form-label mb-2">Đơn thuốc của ca khám #{lookup.visitId}</legend>
                <div className="flex flex-wrap gap-2">
                  {lookup.prescriptions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={p.id === selectedId}
                      onClick={() => { setSelectedId(p.id); setDispenseError(''); }}
                      className={`px-3 py-2 rounded-lg border text-[13px] font-semibold ${p.id === selectedId ? 'bg-primary text-white border-primary' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'}`}
                    >
                      Đơn #{p.id} · {p.dispenseStatus === 'DISPENSED' ? 'Đã cấp phát' : p.dispenseStatus === 'UNKNOWN' ? 'Chưa rõ trạng thái' : 'Chờ cấp phát'}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {selected && (
              <section className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4" aria-labelledby="rx-detail-title">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 id="rx-detail-title" className="text-sm font-bold text-slate-900">Đơn thuốc #{selected.id}</h3>
                    <span className={`badge ${selected.dispenseStatus === 'DISPENSED' ? 'badge-success' : selected.dispenseStatus === 'UNKNOWN' ? 'badge-neutral' : 'badge-warning'}`}>
                      {selected.dispenseStatus === 'DISPENSED' ? 'Đã cấp phát' : selected.dispenseStatus === 'UNKNOWN' ? 'Chưa rõ trạng thái cấp phát' : 'Chờ cấp phát'}
                    </span>
                    {selected.overrideReason && <span className="badge badge-error">Bác sĩ kê vượt cảnh báo</span>}
                  </div>
                  <p className="text-[13px] text-slate-600">Ca khám #{selected.visitId ?? lookup.visitId} · Kê lúc {formatDateTime(selected.createdAt)}</p>
                </div>

                {selected.overrideReason && (
                  <p className="text-[13px] p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-900">
                    <strong>Lý do bác sĩ vẫn kê đơn: </strong>{selected.overrideReason}
                  </p>
                )}

                <div className="table-wrap">
                  <table className="w-full text-left text-[13px]">
                    <caption className="sr-only">Danh sách thuốc trong đơn #{selected.id}</caption>
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th scope="col" className="py-2.5 px-3">STT</th>
                        <th scope="col" className="py-2.5 px-3">Thuốc</th>
                        <th scope="col" className="py-2.5 px-3">Liều & cách dùng</th>
                        <th scope="col" className="py-2.5 px-3 text-right">Số lượng</th>
                        <th scope="col" className="py-2.5 px-3">Tồn kho</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selected.items || []).map((item, idx) => {
                        const st = stockStatusOf(item);
                        return (
                          <tr key={item.id || idx}>
                            <td className="py-2.5 px-3 text-slate-600">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {item.drugName}
                              {item.drugCode && <span className="block text-xs font-normal text-slate-600">{item.drugCode}</span>}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              <div>{item.dosage}</div>
                              {item.instruction && <div className="text-xs text-slate-600">{item.instruction}</div>}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">{item.quantity} {item.unit || ''}</td>
                            <td className="py-2.5 px-3">
                              <span className={`badge ${st.level === 'ok' ? 'badge-success' : st.level === 'error' ? 'badge-error' : 'badge-neutral'}`}>{st.text}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {selected.dispense && (
                  <p role="status" className="text-[13px] p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                    Đã cấp phát lúc {formatDateTime(selected.dispense.dispensedAt)}
                    {selected.dispense.dispensedByName ? ` bởi ${selected.dispense.dispensedByName}` : ''}.
                  </p>
                )}

                {selected.dispenseStatus !== 'DISPENSED' && (
                  <div className="form-field">
                    <label htmlFor="dispense-note" className="form-label">Ghi chú cấp phát / dặn dò bệnh nhân</label>
                    <input
                      id="dispense-note"
                      type="text"
                      value={dispenseNote}
                      onChange={(e) => setDispenseNote(e.target.value)}
                      maxLength={255}
                      className="input"
                    />
                  </div>
                )}

                {blockingItems.length > 0 && selected.dispenseStatus !== 'DISPENSED' && (
                  <p role="alert" className="text-[13px] p-3 rounded-lg bg-red-50 border border-red-200 text-red-900">
                    Không thể cấp phát: {blockingItems.length} thuốc hết hạn hoặc không đủ tồn kho. Liên hệ bác sĩ để điều chỉnh đơn hoặc nhập kho.
                  </p>
                )}
                {dispenseError && (
                  <p role="alert" className="text-[13px] p-3 rounded-lg bg-red-50 border border-red-200 text-red-900">{dispenseError}</p>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => window.print()} className="btn btn-secondary btn-sm">
                    <span className="material-symbols-outlined" aria-hidden="true">print</span>
                    In phiếu
                  </button>
                  <button
                    type="button"
                    onClick={handleDispense}
                    disabled={dispensing || selected.dispenseStatus === 'DISPENSED' || blockingItems.length > 0}
                    className="btn btn-primary"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">{selected.dispenseStatus === 'DISPENSED' ? 'task_alt' : 'inventory'}</span>
                    {selected.dispenseStatus === 'DISPENSED' ? 'Đã cấp phát' : dispensing ? 'Đang cấp phát…' : 'Cấp phát & trừ kho'}
                  </button>
                </div>
              </section>
            )}

            {lookup.status === 'idle' && (
              <p className="p-6 text-center text-sm text-slate-600 border border-dashed border-slate-300 rounded-xl">
                Nhập mã ca khám để tra cứu đơn thuốc cần cấp phát.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc kho dược">
                {[
                  { id: 'all', label: `Tất cả (${inventory.items.length})` },
                  { id: 'low_stock', label: `Sắp hết hàng (≤ ${LOW_STOCK_THRESHOLD})` },
                  { id: 'expiring', label: `Hết hạn / sắp hết hạn (≤ ${EXPIRING_DAYS} ngày)` }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={inventoryFilter === f.id}
                    onClick={() => setInventoryFilter(f.id)}
                    className={`px-3 py-1.5 text-[13px] font-semibold rounded-lg border ${inventoryFilter === f.id ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowNewDrug(true)} className="btn btn-secondary btn-sm">
                  <span className="material-symbols-outlined" aria-hidden="true">add</span>
                  Thêm thuốc mới
                </button>
                <button type="button" onClick={() => setShowImport(true)} className="btn btn-secondary btn-sm">
                  <span className="material-symbols-outlined" aria-hidden="true">upload_file</span>
                  Nhập từ Excel
                </button>
                <button type="button" onClick={loadInventory} disabled={inventory.status === 'loading'} className="btn btn-ghost btn-sm">
                  <span className={`material-symbols-outlined ${inventory.status === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true">refresh</span>
                  Làm mới
                </button>
              </div>
            </div>

            {inventory.status === 'error' ? (
              <div role="alert" className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-900 flex flex-wrap items-center gap-3">
                <span>{inventory.error}</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={loadInventory}>Thử lại</button>
              </div>
            ) : inventory.status === 'loading' && inventory.items.length === 0 ? (
              <p className="p-6 text-center text-[13px] text-slate-600" aria-live="polite">Đang tải kho dược…</p>
            ) : (
              <div className="table-wrap">
                <table className="w-full text-left text-[13px]">
                  <caption className="sr-only">Danh mục thuốc trong kho</caption>
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th scope="col" className="py-2.5 px-3">Mã</th>
                      <th scope="col" className="py-2.5 px-3">Tên thuốc</th>
                      <th scope="col" className="py-2.5 px-3 text-right">Đơn giá</th>
                      <th scope="col" className="py-2.5 px-3 text-right">Tồn kho</th>
                      <th scope="col" className="py-2.5 px-3">Hạn dùng</th>
                      <th scope="col" className="py-2.5 px-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDrugs.length === 0 ? (
                      <tr><td colSpan={6} className="py-6 text-center text-slate-600">Không có thuốc phù hợp bộ lọc.</td></tr>
                    ) : filteredDrugs.map((d) => {
                      const isLow = Number(d.stockQuantity || 0) <= LOW_STOCK_THRESHOLD;
                      const days = daysUntil(d.expiryDate);
                      const expired = days !== null && days < 0;
                      const expiring = days !== null && days >= 0 && days <= EXPIRING_DAYS;
                      return (
                        <tr key={d.id}>
                          <td className="py-2 px-3 font-mono text-slate-700">{d.code}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{d.name} <span className="text-xs font-normal text-slate-600">({d.unit})</span></td>
                          <td className="py-2 px-3 text-right">{formatVND(d.price)}</td>
                          <td className="py-2 px-3 text-right">
                            <span className={isLow ? 'badge badge-error' : 'font-semibold'}>{d.stockQuantity}</span>
                          </td>
                          <td className="py-2 px-3">
                            {formatDate(d.expiryDate)}
                            {expired && <span className="badge badge-error ml-2">Đã hết hạn</span>}
                            {expiring && <span className="badge badge-warning ml-2">Còn {days} ngày</span>}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button type="button" onClick={() => openStock(d)} className="btn btn-soft btn-sm">Nhập/xuất kho</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(stockDrug)}
        onClose={() => { if (!savingStock) setStockDrug(null); }}
        title="Điều chỉnh tồn kho"
        subtitle={stockDrug ? `${stockDrug.name} – tồn hiện tại ${stockDrug.stockQuantity} ${stockDrug.unit || ''}` : ''}
        icon="inventory"
        size="sm"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setStockDrug(null)} disabled={savingStock}>Hủy</button>
            <button type="submit" form="stock-form" className="btn btn-primary" disabled={savingStock}>
              {savingStock ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </>
        )}
      >
        <form id="stock-form" onSubmit={handleUpdateStock} noValidate className="space-y-3">
          <div className="form-field">
            <label htmlFor="stock-type" className="form-label">Loại điều chỉnh</label>
            <select id="stock-type" value={stockType} onChange={(e) => { setStockType(e.target.value); setStockError(''); }} className="select">
              {Object.entries(STOCK_ADJUSTMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="stock-qty" className="form-label">
              {stockType === 'ADJUSTMENT' ? 'Số lượng thực tế sau kiểm kê' : 'Số lượng'} ({stockDrug?.unit || 'đơn vị'})
            </label>
            <input
              id="stock-qty"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              data-autofocus
              value={stockQty}
              onChange={(e) => { setStockQty(e.target.value); setStockError(''); }}
              aria-invalid={stockError ? 'true' : undefined}
              aria-describedby={stockError ? 'stock-qty-err' : undefined}
              className={`input ${stockError ? 'is-error' : ''}`}
            />
            {stockError && <p id="stock-qty-err" role="alert" className="form-error">{stockError}</p>}
          </div>
        </form>
      </Modal>
      <NewDrugDialog
        isOpen={showNewDrug}
        onClose={() => setShowNewDrug(false)}
        onCreated={(drug) => {
          setShowNewDrug(false);
          notify(`Đã thêm thuốc ${drug?.name || ''} vào danh mục.`.replace('  ', ' '), 'success');
          loadInventory();
        }}
      />
      <ImportDrugsDialog
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={({ created, restocked, skipped }) => {
          setShowImport(false);
          const parts = [];
          if (created) parts.push(`thêm ${created} thuốc mới`);
          if (restocked) parts.push(`cập nhật tồn kho ${restocked} thuốc`);
          const done = parts.join(', ');
          notify(`Đã ${done}${skipped ? `; bỏ qua ${skipped} dòng` : ''}.`, 'success');
          loadInventory();
        }}
      />
    </Modal>
  );
}
