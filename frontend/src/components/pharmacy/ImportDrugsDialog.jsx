import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { pharmacyService } from '../../services/pharmacyService';
import { formatDate, formatNumber, formatVND } from '../../utils/format';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const TEMPLATE_NAME = 'mau-nhap-thuoc.xlsx';

const STATUS = {
  NEW: { label: 'Mới', className: 'badge badge-success' },
  EXISTS: { label: 'Đã tồn tại', className: 'badge badge-warning' },
  INVALID: { label: 'Lỗi', className: 'badge badge-error' }
};

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const toItem = (row, action) => ({
  rowNumber: row.rowNumber,
  code: row.code,
  name: row.name,
  unit: row.unit,
  price: row.price,
  quantity: row.quantity,
  expiryDate: row.expiryDate,
  action
});

/**
 * Hộp thoại nhập thuốc hàng loạt từ file Excel (Dược sĩ, Quản trị viên).
 * Bước 1 chọn file → máy chủ đọc và phân loại từng dòng (chưa lưu gì).
 * Bước 2 xem trước: dòng mới được nhập, dòng trùng mã chỉ nhập khi tích "Nhập tiếp"
 * (cộng tồn kho, cập nhật giá / hạn dùng), dòng lỗi bị bỏ qua.
 */
export default function ImportDrugsDialog({ isOpen, onClose, onImported }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState('');
  const [restock, setRestock] = useState(() => new Set());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRows(null);
      setFileName('');
      setRestock(new Set());
      setError('');
      setBusy('');
    }
  }, [isOpen]);

  const counts = useMemo(() => {
    const c = { NEW: 0, EXISTS: 0, INVALID: 0 };
    (rows || []).forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  const items = useMemo(() => (rows || []).flatMap((r) => {
    if (r.status === 'NEW') return [toItem(r, 'CREATE')];
    if (r.status === 'EXISTS' && restock.has(r.rowNumber)) return [toItem(r, 'RESTOCK')];
    return [];
  }), [rows, restock]);

  const downloadTemplate = async () => {
    setBusy('template');
    setError('');
    try {
      saveBlob(await pharmacyService.downloadDrugImportTemplate(), TEMPLATE_NAME);
    } catch (err) {
      setError(err.message || 'Không tải được file mẫu.');
    } finally {
      setBusy('');
    }
  };

  const chooseFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError('File vượt quá dung lượng cho phép (tối đa 5MB).');
      return;
    }
    setBusy('preview');
    setError('');
    try {
      const result = await pharmacyService.previewDrugImport(file);
      setRows(result);
      setFileName(file.name);
      setRestock(new Set());
    } catch (err) {
      setError(err.message || 'Không đọc được file Excel.');
    } finally {
      setBusy('');
    }
  };

  const toggleRestock = (rowNumber) => setRestock((prev) => {
    const next = new Set(prev);
    if (next.has(rowNumber)) next.delete(rowNumber);
    else next.add(rowNumber);
    return next;
  });

  const restockAll = (on) => setRestock(on
    ? new Set(rows.filter((r) => r.status === 'EXISTS').map((r) => r.rowNumber))
    : new Set());

  const submit = async () => {
    setBusy('import');
    setError('');
    try {
      const result = await pharmacyService.importDrugs(items);
      onImported?.({
        created: result?.created ?? 0,
        restocked: result?.restocked ?? 0,
        skipped: rows.length - items.length
      });
    } catch (err) {
      setError(err.message || 'Nhập thuốc từ Excel không thành công.');
    } finally {
      setBusy('');
    }
  };

  const backToSelect = () => {
    setRows(null);
    setError('');
  };

  const footer = rows === null ? (
    <button type="button" className="btn btn-light" onClick={onClose} disabled={Boolean(busy)}>Đóng</button>
  ) : (
    <>
      <button type="button" className="btn btn-ghost mr-auto" onClick={backToSelect} disabled={Boolean(busy)}>
        <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        Chọn file khác
      </button>
      <button type="button" className="btn btn-light" onClick={onClose} disabled={busy === 'import'}>Hủy</button>
      <button type="button" className="btn btn-primary" onClick={submit} disabled={Boolean(busy) || items.length === 0}>
        {busy === 'import' ? 'Đang nhập…' : `Nhập ${items.length} thuốc`}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy === 'import' ? () => {} : onClose}
      size="xl"
      icon="upload_file"
      title="Nhập thuốc từ Excel"
      subtitle="Thêm nhiều thuốc cùng lúc hoặc nhập thêm tồn kho cho thuốc đã có"
      footer={footer}
    >
      <div className="space-y-4">
        {error && (
          <div role="alert" className="alert alert-error">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <span>{error}</span>
          </div>
        )}

        {rows === null ? (
          <>
            <ol className="list-decimal pl-5 text-[13px] text-slate-600 space-y-1">
              <li>Tải file mẫu và điền danh sách thuốc, mỗi dòng một thuốc (tối đa 1000 dòng).</li>
              <li>Chọn file để xem trước. Ở bước này chưa có dữ liệu nào được lưu.</li>
              <li>Kiểm tra từng dòng, chọn &quot;Nhập tiếp&quot; cho thuốc đã có rồi bấm Nhập.</li>
            </ol>
            <button type="button" className="btn btn-light btn-sm" onClick={downloadTemplate} disabled={Boolean(busy)}>
              <span className="material-symbols-outlined" aria-hidden="true">download</span>
              {busy === 'template' ? 'Đang tải…' : 'Tải file mẫu'}
            </button>
            <label className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center ${busy ? 'opacity-60' : 'cursor-pointer hover:bg-slate-50'}`}>
              <span className={`material-symbols-outlined text-4xl text-primary ${busy === 'preview' ? 'animate-spin' : ''}`} aria-hidden="true">
                {busy === 'preview' ? 'progress_activity' : 'upload_file'}
              </span>
              <span className="font-semibold text-slate-800">
                {busy === 'preview' ? 'Đang đọc file…' : 'Bấm để chọn file Excel (.xlsx)'}
              </span>
              <span className="text-[12px] text-slate-500">Dung lượng tối đa 5MB</span>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                aria-label="Chọn file Excel"
                className="sr-only"
                onChange={chooseFile}
                disabled={Boolean(busy)}
              />
            </label>
          </>
        ) : (
          <>
            <p className="text-[13px] text-slate-700">
              <strong className="mr-1">{fileName}</strong>
              <span>{rows.length} dòng · {counts.NEW} mới · {counts.EXISTS} đã tồn tại · {counts.INVALID} lỗi</span>
            </p>

            {counts.EXISTS > 0 && (
              <div className="alert alert-warning flex-wrap">
                <span className="material-symbols-outlined" aria-hidden="true">warning</span>
                <span className="flex-1 min-w-[16rem]">
                  {counts.EXISTS} thuốc đã có trong hệ thống. Tích &quot;Nhập tiếp&quot; để cộng số lượng vào tồn kho và cập nhật giá / hạn dùng (ô trống giữ nguyên); không tích thì bỏ qua.
                </span>
                <span className="flex gap-2">
                  <button type="button" className="btn btn-light btn-sm" onClick={() => restockAll(true)} disabled={Boolean(busy)}>Nhập tiếp tất cả</button>
                  <button type="button" className="btn btn-light btn-sm" onClick={() => restockAll(false)} disabled={Boolean(busy)}>Bỏ qua tất cả</button>
                </span>
              </div>
            )}

            {rows.length === 0 ? (
              <p className="text-[13px] text-slate-500">File không có dòng dữ liệu nào.</p>
            ) : (
              <div className="table-wrap max-h-[55vh] overflow-auto">
                <table className="w-full text-left text-[13px]" aria-label="Xem trước dữ liệu nhập">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th scope="col" className="px-3 py-2">Dòng</th>
                      <th scope="col" className="px-3 py-2">Mã thuốc</th>
                      <th scope="col" className="px-3 py-2">Tên thuốc</th>
                      <th scope="col" className="px-3 py-2">Đơn vị</th>
                      <th scope="col" className="px-3 py-2 text-right">Giá</th>
                      <th scope="col" className="px-3 py-2 text-right">Số lượng</th>
                      <th scope="col" className="px-3 py-2">Hạn dùng</th>
                      <th scope="col" className="px-3 py-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => {
                      const status = STATUS[r.status] || STATUS.INVALID;
                      const exists = r.status === 'EXISTS';
                      return (
                        <tr key={r.rowNumber} className={r.status === 'INVALID' ? 'bg-red-50/60' : undefined}>
                          <td className="px-3 py-2 text-slate-500 tabular-nums">{r.rowNumber}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{r.code || '—'}</td>
                          <td className="px-3 py-2">
                            <div>{exists ? r.existing?.name : (r.name || '—')}</div>
                            {exists && r.existing && (
                              <div className="text-[12px] text-slate-500">
                                Tồn hiện tại: {formatNumber(r.existing.stockQuantity ?? 0)} · Giá hiện tại: {formatVND(r.existing.price)}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">{exists ? r.existing?.unit : (r.unit || 'Viên')}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.price != null ? formatVND(r.price) : '—'}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {r.quantity != null ? `${exists ? '+' : ''}${formatNumber(r.quantity)}` : '—'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.expiryDate ? formatDate(r.expiryDate) : '—'}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={status.className}>{status.label}</span>
                              {exists && (
                                <label className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    className="checkbox"
                                    aria-label={`Nhập tiếp dòng ${r.rowNumber}`}
                                    checked={restock.has(r.rowNumber)}
                                    onChange={() => toggleRestock(r.rowNumber)}
                                    disabled={Boolean(busy)}
                                  />
                                  <span aria-hidden="true">Nhập tiếp</span>
                                </label>
                              )}
                            </div>
                            {r.errors?.length > 0 && (
                              <div className="mt-1 text-[12px] text-red-700">{r.errors.join('; ')}</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
