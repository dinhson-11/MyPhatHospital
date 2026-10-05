import React, { useState, useEffect } from 'react';
import invoiceService from '../../services/invoiceService';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export default function InvoiceModal({ isOpen, onClose, onShowToast, defaultVisitId }) {
  useEscapeKey(isOpen, () => {
    if (showPaymentModal) {
      setShowPaymentModal(false);
    } else {
      onClose();
    }
  });
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // Thanh toán
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('VIETQR'); // 'CASH' | 'VIETQR'
  const [cashGiven, setCashGiven] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInvoices();
      if (defaultVisitId) {
        handleGenerateForVisit(defaultVisitId);
      }
    }
  }, [isOpen, defaultVisitId]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await invoiceService.getInvoices();
      setInvoices(data);
      if (data && data.length > 0 && !selectedInvoice) {
        setSelectedInvoice(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForVisit = async (vId) => {
    try {
      const inv = await invoiceService.generateInvoice(vId);
      setSelectedInvoice(inv);
      loadInvoices();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const data = await invoiceService.getInvoices({ keyword: searchTerm });
      setInvoices(data);
      if (data && data.length > 0) {
        setSelectedInvoice(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedInvoice) return;
    setIsProcessingPayment(true);
    try {
      const res = await invoiceService.payInvoice(selectedInvoice.id, {
        paymentMethod,
        transactionCode: paymentMethod === 'VIETQR' ? `VQR-${Date.now()}` : `CASH-${Date.now()}`
      });
      setSelectedInvoice(res);
      setShowPaymentModal(false);
      onShowToast?.(`Thanh toán thành công hóa đơn #${selectedInvoice.id}!`, 'success');
      loadInvoices();
    } catch (err) {
      onShowToast?.(err.message || 'Lỗi khi thanh toán', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const filteredInvoices = invoices.filter(i => {
    if (statusFilter === 'ALL') return true;
    return i.status === statusFilter;
  });

  const changeDue = Math.max(0, (Number(cashGiven) || 0) - (selectedInvoice?.totalAmount || 0));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-teal-100 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <span className="material-symbols-outlined text-white text-[24px]">receipt_long</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Quản Lý Viện Phí & Hóa Đơn Khám Bệnh</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase">
                  FR-7
                </span>
              </div>
              <p className="text-xs text-teal-100">Mỹ Phát Hospital – Phân hệ Thu Viện Phí (FR-7)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-teal-100/70 border border-teal-100/25 rounded">
              ESC
            </span>
            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <span className="material-symbols-outlined text-white text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Layout 2 cột: Danh sách hóa đơn + Chi tiết hóa đơn */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Cột trái: Danh sách hóa đơn */}
          <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-800/30">
            {/* Search & Filter */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
              <form onSubmit={handleSearch} className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-sm">search</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên/mã BN..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Xóa tìm kiếm"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </form>

              <div className="flex gap-1">
                {['ALL', 'PENDING', 'PAID'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                      statusFilter === s
                        ? 'bg-teal-700 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {s === 'ALL' ? 'Tất cả' : s === 'PENDING' ? 'Chờ thu' : 'Đã thu'}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <div className="p-6 text-center text-slate-400 space-y-2">
                  <span className="material-symbols-outlined text-3xl">receipt_long</span>
                  <p className="text-xs">Không tìm thấy hóa đơn nào phù hợp</p>
                </div>
              ) : (
                filteredInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedInvoice?.id === inv.id
                        ? 'bg-teal-50 dark:bg-teal-950/50 border-l-4 border-teal-700'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {inv.patientName}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {inv.status === 'PAID' ? 'Đã thu' : 'Chờ thu'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                      <span>HĐ #{inv.id}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {Number(inv.totalAmount).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cột phải: Phiếu thu viện phí chi tiết */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-white dark:bg-slate-900">
            {selectedInvoice ? (
              <div className="space-y-6">
                
                {/* Tiêu đề & Thông tin cơ quan */}
                <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-sky-800 dark:text-sky-400 uppercase tracking-wide">
                      Mỹ Phát Hospital
                    </h3>
                    <p className="text-xs text-slate-500">1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang</p>
                    <p className="text-xs text-slate-500">Điện thoại liên hệ / Cấp cứu: 0789 065 493</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      Bảng Kê Chi Phí Khám Bệnh
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">Mã hóa đơn: VP-{selectedInvoice.id}</p>
                    <p className="text-xs text-slate-500">Lượt khám #{selectedInvoice.visitId}</p>
                  </div>
                </div>

                {/* Thông tin bệnh nhân */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <p><span className="text-slate-500">Họ và tên:</span> <strong className="text-slate-900 dark:text-white">{selectedInvoice.patientName}</strong></p>
                    <p className="mt-1"><span className="text-slate-500">Mã bệnh nhân:</span> <strong className="font-mono text-slate-700 dark:text-slate-300">{selectedInvoice.patientCode}</strong></p>
                  </div>
                  <div>
                    <p><span className="text-slate-500">Bác sĩ khám:</span> <strong className="text-slate-900 dark:text-white">{selectedInvoice.doctorName}</strong></p>
                    <p className="mt-1"><span className="text-slate-500">Chẩn đoán:</span> <strong className="text-slate-700 dark:text-slate-300">{selectedInvoice.diagnosisCode || 'Chưa ghi nhận'}</strong></p>
                  </div>
                </div>

                {/* Bảng chi tiết từng khoản viện phí */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Bảng chi tiết các khoản chi phí (3 nhóm: Khám, Thuốc, Cận lâm sàng)
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">STT</th>
                          <th className="py-2.5 px-3">Phân loại</th>
                          <th className="py-2.5 px-3">Nội dung chi phí / Dịch vụ</th>
                          <th className="py-2.5 px-3 text-right">Thành tiền (VNĐ)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedInvoice.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${
                                item.itemType === 'SERVICE'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                  : item.itemType === 'DRUG'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              }`}>
                                {item.itemType === 'SERVICE' ? 'KHÁM BỆNH' : item.itemType === 'DRUG' ? 'THUỐC' : 'CẬN LÂM SÀNG'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-medium">
                              {item.description}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-100">
                              {Number(item.amount).toLocaleString('vi-VN')} đ
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 font-bold text-xs">
                        <tr>
                          <td colSpan={3} className="py-3 px-3 text-right text-slate-700 dark:text-slate-300 uppercase">
                            Tổng viện phí thanh toán:
                          </td>
                          <td className="py-3 px-3 text-right text-sm font-extrabold text-sky-700 dark:text-sky-400">
                            {Number(selectedInvoice.totalAmount).toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Trạng thái thanh toán & Các nút thao tác */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <span className="text-xs text-slate-500">Trạng thái viện phí: </span>
                    {selectedInvoice.status === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 ml-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        ĐÃ THANH TOÁN ({selectedInvoice.paymentMethod}) - Mã GD: {selectedInvoice.transactionCode}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 ml-1">
                        <span className="material-symbols-outlined text-sm">pending</span>
                        CHỜ THANH TOÁN
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">print</span>
                      In phiếu thu
                    </button>

                    {selectedInvoice.status !== 'PAID' && (
                      <button
                        type="button"
                        onClick={() => setShowPaymentModal(true)}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm">payments</span>
                        Thu tiền viện phí
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">receipt</span>
                <p className="text-sm">Chọn hóa đơn bên danh sách để xem chi tiết</p>
              </div>
            )}
          </div>

        </div>

        {/* Modal Thanh toán (Tiền mặt / VietQR) */}
        {showPaymentModal && selectedInvoice && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 w-full max-w-md space-y-4 shadow-2xl">
              
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-700">point_of_sale</span>
                  Thu Tiền Hóa Đơn #{selectedInvoice.id}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
                  title="Đóng"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="text-center py-2.5 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-100 dark:border-teal-900">
                <p className="text-xs text-teal-800 dark:text-teal-300 font-medium">Tổng tiền viện phí cần thu:</p>
                <p className="text-2xl font-black text-teal-900 dark:text-teal-100">
                  {Number(selectedInvoice.totalAmount).toLocaleString('vi-VN')} đ
                </p>
              </div>

              {/* Lựa chọn phương thức thanh toán */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('VIETQR')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'VIETQR'
                      ? 'border-teal-700 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">qr_code_2</span>
                  Quét VietQR
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'CASH'
                      ? 'border-teal-700 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">local_atm</span>
                  Tiền mặt
                </button>
              </div>

              {/* Nội dung theo phương thức */}
              {paymentMethod === 'VIETQR' ? (
                <div className="text-center space-y-2 py-1">
                  <div className="inline-block p-2 bg-white rounded-xl shadow-inner border border-slate-200">
                    <img
                      src={invoiceService.generateVietQRUrl({
                        amount: selectedInvoice.totalAmount,
                        description: `VP ${selectedInvoice.id} ${selectedInvoice.patientCode}`
                      })}
                      alt="Mã QR thanh toán viện phí"
                      className="w-48 h-48 object-contain mx-auto"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Mở ứng dụng ngân hàng bất kỳ để quét mã thanh toán</p>
                  <p className="text-[11px] font-mono text-slate-400">Nội dung: VP {selectedInvoice.id} {selectedInvoice.patientCode}</p>
                </div>
              ) : (
                <div className="space-y-3 py-1 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-600 dark:text-slate-300 font-semibold">Tiền khách đưa (VNĐ):</label>
                      <button
                        type="button"
                        onClick={() => setCashGiven(String(selectedInvoice.totalAmount))}
                        className="text-[11px] text-teal-700 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                      >
                        Đủ tiền ({Number(selectedInvoice.totalAmount).toLocaleString('vi-VN')} đ)
                      </button>
                    </div>
                    <input
                      type="number"
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      placeholder="VD: 500000"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[100000, 200000, 500000, 1000000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashGiven(String(amt))}
                          className="px-2 py-0.5 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                        >
                          {amt.toLocaleString('vi-VN')} đ
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">Tiền thừa trả lại:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {changeDue.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              )}

              {/* Thao tác */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handleConfirmPayment}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  Xác nhận đã thu tiền
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
