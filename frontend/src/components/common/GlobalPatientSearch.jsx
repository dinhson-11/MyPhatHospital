import React, { useEffect, useRef, useState } from 'react';
import { patientService } from '../../services/patientService';
import Modal from './Modal';
import SensitiveMask from './SensitiveMask';
import { formatDate, formatGender } from '../../utils/format';

function ageFrom(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

/**
 * Tìm kiếm bệnh nhân toàn cục cho nhân viên y tế (Ctrl + K / F2).
 * Tìm trên máy chủ theo họ tên, mã hồ sơ, SĐT; hiển thị lỗi + Thử lại khi không kết nối được.
 */
export default function GlobalPatientSearch({ isOpen, onClose, onSelectPatient }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ status: 'idle', items: [], error: '' });
  const inputRef = useRef(null);
  const requestRef = useRef(0);

  const runSearch = async (keyword) => {
    const reqId = ++requestRef.current;
    setState((prev) => ({ ...prev, status: 'loading', error: '' }));
    try {
      const items = await patientService.searchPatients(keyword, { size: 20 });
      if (reqId === requestRef.current) setState({ status: 'ready', items, error: '' });
    } catch (err) {
      if (reqId === requestRef.current) setState({ status: 'error', items: [], error: err.message });
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setState({ status: 'idle', items: [], error: '' });
      return undefined;
    }
    const kw = query.trim();
    if (kw.length === 1) return undefined; // chờ đủ 2 ký tự
    const timer = setTimeout(() => runSearch(kw), kw ? 300 : 0);
    return () => clearTimeout(timer);
  }, [isOpen, query]);

  const handleSelect = (patient) => {
    onSelectPatient?.(patient);
    onClose?.();
  };

  const kw = query.trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tìm hồ sơ bệnh nhân"
      subtitle="Tìm theo họ tên, mã hồ sơ hoặc số điện thoại"
      icon="manage_search"
      size="lg"
      initialFocusRef={inputRef}
      closeOnBackdrop
    >
      <div className="space-y-3">
        <div className="input-group">
          <span className="material-symbols-outlined input-icon" aria-hidden="true">search</span>
          <label htmlFor="global-patient-search" className="sr-only">Từ khóa tìm bệnh nhân</label>
          <input
            id="global-patient-search"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="VD: Nguyễn Văn A, BN-2026…, 0912…"
            aria-describedby="global-patient-search-status"
            className="input"
          />
        </div>

        <p id="global-patient-search-status" className="text-[13px] text-slate-600" aria-live="polite">
          {kw.length === 1
            ? 'Nhập ít nhất 2 ký tự để tìm.'
            : state.status === 'loading'
              ? 'Đang tìm kiếm…'
              : state.status === 'ready' ? `Tìm thấy ${state.items.length} hồ sơ${kw ? '' : ' gần đây'}.` : ''}
        </p>

        {state.status === 'error' ? (
          <div role="alert" className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-900 flex flex-wrap items-center gap-3">
            <span>{state.error}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => runSearch(kw)}>Thử lại</button>
          </div>
        ) : state.status === 'ready' && state.items.length === 0 ? (
          <div className="py-10 text-center text-slate-600 space-y-1">
            <span className="material-symbols-outlined text-4xl text-slate-400" aria-hidden="true">person_search</span>
            <p className="text-sm">Không tìm thấy bệnh nhân phù hợp{kw ? ` với "${kw}"` : ''}.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100" aria-label="Kết quả tìm kiếm">
            {state.items.map((p) => {
              const age = ageFrom(p.dob);
              return (
                <li key={p.id} className="p-3 rounded-xl hover:bg-primary-fixed/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-primary-fixed text-primary font-bold flex items-center justify-center shrink-0" aria-hidden="true">
                      {(p.fullName || '?').trim().split(/\s+/).slice(-1)[0]?.[0] || '?'}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{p.fullName}</span>
                        <span className="badge badge-neutral font-mono">{p.patientCode || `#${p.id}`}</span>
                      </p>
                      <p className="text-[13px] text-slate-600 mt-0.5">
                        {formatGender(p.gender)} · {p.dob ? `${formatDate(p.dob)}${age !== null ? ` (${age} tuổi)` : ''}` : 'Chưa rõ ngày sinh'}
                      </p>
                      <p className="text-[13px] text-slate-600">
                        SĐT: <SensitiveMask value={p.phone} type="phone" />
                        {p.nationalId && <> · CCCD: <SensitiveMask value={p.nationalId} type="cccd" /></>}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelect(p)}
                    aria-label={`Chọn hồ sơ ${p.fullName}`}
                    className="btn btn-soft btn-sm shrink-0"
                  >
                    Chọn
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
