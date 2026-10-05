import React, { useState, useEffect, useRef } from 'react';
import { patientService } from '../../services/patientService';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import SensitiveMask from './SensitiveMask';

/**
 * GlobalPatientSearch: Hộp tìm kiếm bệnh nhân toàn cục cho nhân viên y tế
 * Phím tắt: Ctrl + K hoặc F2. Tìm kiếm đa tiêu chí: Họ tên, Mã hồ sơ, SĐT, CCCD.
 */
export default function GlobalPatientSearch({ isOpen, onClose, onSelectPatient }) {
  useEscapeKey(isOpen, onClose);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      searchPatients('');
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  const searchPatients = async (keyword) => {
    setLoading(true);
    try {
      const allPatients = await patientService.getPatients();
      const kw = keyword.trim().toLowerCase();
      if (!kw) {
        setResults(allPatients.slice(0, 8));
      } else {
        const filtered = allPatients.filter((p) => {
          const name = (p.fullName || '').toLowerCase();
          const code = (p.patientCode || '').toLowerCase();
          const phone = (p.phone || '').toLowerCase();
          const cccd = (p.nationalId || '').toLowerCase();
          return name.includes(kw) || code.includes(kw) || phone.includes(kw) || cccd.includes(kw);
        });
        setResults(filtered);
      }
    } catch (err) {
      console.error('Lỗi tìm kiếm bệnh nhân:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    searchPatients(val);
  };

  const handleSelect = (patient) => {
    if (onSelectPatient) {
      onSelectPatient(patient);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-3 sm:pt-16">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
        
        {/* Header Search Input */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">
            manage_search
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Tìm theo Tên bệnh nhân, Mã hồ sơ (BN-xxxx), SĐT hoặc CCCD..."
            className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 text-base font-medium outline-hidden placeholder:text-slate-400"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-500 border border-slate-200 dark:border-slate-700">
              ESC
            </kbd>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Short Hints Bar */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            {loading ? 'Đang tìm kiếm dữ liệu y tế...' : `Tìm thấy ${results.length} hồ sơ bệnh nhân`}
          </span>
          <span className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">
            💡 Mẹo: Nhập ít nhất 2 ký tự để lọc nhanh
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2">
          {results.length === 0 && !loading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">
                person_search
              </span>
              <p className="text-sm">Không tìm thấy bệnh nhân phù hợp với từ khóa "{query}"</p>
              <p className="text-xs text-slate-500">Hãy kiểm tra lại số điện thoại hoặc mã bệnh nhân</p>
            </div>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className="w-full text-left p-3 rounded-xl hover:bg-teal-50/70 dark:hover:bg-slate-800 flex items-center justify-between gap-3 group transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0">
                    {p.fullName ? p.fullName.split(' ').slice(-1)[0][0] : 'BN'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                        {p.fullName}
                      </span>
                      <span className="badge badge-outline text-[11px] font-mono">
                        {p.patientCode || `BN-${p.id}`}
                      </span>
                      {p.gender && (
                        <span className="text-xs text-slate-400">
                          ({p.gender === 'MALE' ? 'Nam' : 'Nữ'}, {p.dob ? `${new Date().getFullYear() - new Date(p.dob).getFullYear()} tuổi` : ''})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>SĐT: <SensitiveMask value={p.phone} type="phone" /></span>
                      {p.nationalId && <span>• CCCD: <SensitiveMask value={p.nationalId} type="cccd" /></span>}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <span className="text-xs text-teal-700 dark:text-teal-400 font-medium group-hover:underline">
                    Chọn hồ sơ
                  </span>
                  <span className="material-symbols-outlined text-sm text-slate-400 group-hover:translate-x-0.5 transition-transform">
                    chevron_right
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
