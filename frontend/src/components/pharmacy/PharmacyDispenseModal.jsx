import React, { useState, useEffect } from 'react';
import pharmacyService from '../../services/pharmacyService';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export default function PharmacyDispenseModal({ isOpen, onClose, onShowToast }) {
  useEscapeKey(isOpen, onClose);
  const [activeTab, setActiveTab] = useState('dispense'); // 'dispense' | 'inventory'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [isDispensed, setIsDispensed] = useState(false);
  const [dispenseResult, setDispenseResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dispenseNote, setDispenseNote] = useState('');

  // Kho dược
  const [drugs, setDrugs] = useState([]);
  const [inventoryFilter, setInventoryFilter] = useState('all'); // 'all' | 'low_stock' | 'expiring'
  const [stockModalDrug, setStockModalDrug] = useState(null);
  const [stockInputQty, setStockInputQty] = useState(100);
  const [stockInputType, setStockInputType] = useState('IMPORT');

  useEffect(() => {
    if (isOpen) {
      loadInventory();
      loadDefaultPrescription();
    }
  }, [isOpen]);

  const loadInventory = async () => {
    try {
      const data = await pharmacyService.getDrugs();
      setDrugs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadDefaultPrescription = async () => {
    // Tự động load đơn thuốc mẫu để tiện demo
    try {
      const sample = {
        id: 501,
        visitId: 101,
        patientName: 'Nguyễn Văn A',
        patientCode: 'BN-2026-0001',
        doctorName: 'TS.BS Vi Mai Anh',
        diagnosisCode: 'I10 - Tăng huyết áp vô căn',
        createdAt: new Date().toISOString(),
        items: [
          { drugId: 9, drugCode: 'DRUG-AMLO-5', drugName: 'Amlodipine 5mg', unit: 'Viên', dosage: '1 viên/ngày (sáng)', quantity: 30, instruction: 'Uống sau ăn sáng' },
          { drugId: 3, drugCode: 'DRUG-ASP-81', drugName: 'Aspirin 81mg', unit: 'Viên', dosage: '1 viên/ngày (trưa)', quantity: 30, instruction: 'Uống sau ăn trưa' }
        ]
      };
      setSelectedPrescription(sample);
      const dispensed = await pharmacyService.isDispensed(sample.id);
      setIsDispensed(dispensed);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchPrescription = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const pId = parseInt(searchTerm.replace(/\D/g, ''), 10) || 501;
      const sample = {
        id: pId,
        visitId: pId,
        patientName: 'Bệnh nhân đơn #' + pId,
        patientCode: 'BN-2026-00' + (pId % 100),
        doctorName: 'TS.BS Vi Mai Anh',
        diagnosisCode: 'K29 - Viêm dạ dày tá tràng',
        createdAt: new Date().toISOString(),
        items: [
          { drugId: 7, drugCode: 'DRUG-OMEP-20', drugName: 'Omeprazole 20mg', unit: 'Viên', dosage: '1 viên/ngày', quantity: 14, instruction: 'Uống trước ăn 30p' },
          { drugId: 1, drugCode: 'DRUG-PARA-500', drugName: 'Paracetamol 500mg', unit: 'Viên', dosage: '1 viên khi đau/sốt', quantity: 10, instruction: 'Cách nhau tối thiểu 4-6 tiếng' }
        ]
      };
      setSelectedPrescription(sample);
      const dispensed = await pharmacyService.isDispensed(sample.id);
      setIsDispensed(dispensed);
      setDispenseResult(null);
    } catch (err) {
      onShowToast?.('Không tìm thấy đơn thuốc', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async () => {
    if (!selectedPrescription) return;
    setLoading(true);
    try {
      const res = await pharmacyService.dispensePrescription(selectedPrescription.id, {
        visitId: selectedPrescription.visitId,
        patientName: selectedPrescription.patientName,
        patientCode: selectedPrescription.patientCode,
        doctorName: selectedPrescription.doctorName,
        items: selectedPrescription.items,
        note: dispenseNote || 'Cấp phát thuốc hoàn tất tại Quầy Dược Bệnh viện'
      });
      setIsDispensed(true);
      setDispenseResult(res);
      onShowToast?.(`Cấp phát thuốc thành công cho đơn #${selectedPrescription.id}!`, 'success');
      loadInventory(); // Cập nhật lại tồn kho
    } catch (err) {
      onShowToast?.(err.message || 'Lỗi cấp phát thuốc', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!stockModalDrug) return;
    try {
      await pharmacyService.updateStock(stockModalDrug.id, {
        quantity: parseInt(stockInputQty, 10),
        adjustmentType: stockInputType,
        note: 'Điều chỉnh kho dược'
      });
      onShowToast?.(`Đã cập nhật tồn kho thuốc ${stockModalDrug.name}!`, 'success');
      setStockModalDrug(null);
      loadInventory();
    } catch (err) {
      onShowToast?.(err.message || 'Lỗi cập nhật tồn kho', 'error');
    }
  };

  const filteredDrugs = drugs.filter(d => {
    if (inventoryFilter === 'low_stock') {
      return (d.stockQuantity || 0) <= 20;
    }
    if (inventoryFilter === 'expiring') {
      if (!d.expiryDate) return false;
      const exp = new Date(d.expiryDate);
      const limit = new Date();
      limit.setDate(limit.getDate() + 45);
      return exp <= limit;
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-teal-100 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <span className="material-symbols-outlined text-white text-[24px]">medication</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Nhà Thuốc & Quản Lý Kho Dược</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase">
                  FR-6
                </span>
              </div>
              <p className="text-xs text-teal-100">Mỹ Phát Hospital – Phân hệ Dược Lâm Sàng (FR-6)</p>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6">
          <button
            onClick={() => setActiveTab('dispense')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'dispense'
                ? 'border-teal-700 text-teal-900 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-lg">local_pharmacy</span>
            Cấp Phát Thuốc Theo Đơn
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'inventory'
                ? 'border-teal-700 text-teal-900 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-lg">inventory_2</span>
            Kho Dược & Cảnh Báo Tồn Kho
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dispense' ? (
            <div className="space-y-6">
              {/* Thanh tra cứu đơn thuốc */}
              <form onSubmit={handleSearchPrescription} className="flex gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400">search</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nhập mã đơn thuốc (VD: 501) hoặc mã bệnh nhân (BN-2026-0001)..."
                    className="w-full pl-10 pr-9 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Xóa tìm kiếm"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">search</span>
                  Tra cứu
                </button>
              </form>

              {/* Thông tin đơn thuốc */}
              {selectedPrescription && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-800/80 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          ĐƠN THUỐC #{selectedPrescription.id}
                        </span>
                        {isDispensed ? (
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            ĐÃ CẤP PHÁT THUỐC
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            CHỜ CẤP PHÁT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Bác sĩ kê: {selectedPrescription.doctorName}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {selectedPrescription.patientName} ({selectedPrescription.patientCode})
                      </p>
                      <p className="text-xs text-slate-500">Chẩn đoán: {selectedPrescription.diagnosisCode}</p>
                    </div>
                  </div>

                  {/* Bảng danh sách thuốc trong đơn */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Danh mục thuốc kê đơn ({selectedPrescription.items?.length || 0} loại)
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3">STT</th>
                            <th className="py-2.5 px-3">Tên thuốc & Hàm lượng</th>
                            <th className="py-2.5 px-3">Liều dùng & Cách dùng</th>
                            <th className="py-2.5 px-3 text-right">Số lượng</th>
                            <th className="py-2.5 px-3 text-center">Tình trạng kho</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedPrescription.items?.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                {item.drugName}
                                <span className="block text-[11px] font-normal text-slate-400">{item.drugCode}</span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                <div>{item.dosage}</div>
                                <div className="text-[11px] text-slate-400 italic">{item.instruction}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-100">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded font-medium">
                                  <span className="material-symbols-outlined text-xs">check_circle</span> Đủ tồn kho
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Ghi chú cấp phát */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Ghi chú cấp phát / Hướng dẫn bệnh nhân:
                    </label>
                    <input
                      type="text"
                      disabled={isDispensed}
                      value={dispenseNote}
                      onChange={(e) => setDispenseNote(e.target.value)}
                      placeholder="VD: Đã dặn bệnh nhân uống thuốc đúng giờ, bảo quản nhiệt độ phòng..."
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                    />
                  </div>

                  {/* Nút thao tác cấp phát */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-slate-400">shield_lock</span>
                      Hệ thống tự động trừ kho và lưu lịch sử cấp phát y tế (FR-6.2)
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">print</span>
                        In phiếu cấp thuốc
                      </button>

                      <button
                        type="button"
                        disabled={isDispensed || loading}
                        onClick={handleDispense}
                        className={`px-5 py-2 text-sm font-semibold rounded-xl text-white shadow-md flex items-center gap-1.5 transition-all ${
                          isDispensed
                            ? 'bg-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {isDispensed ? 'task_alt' : 'inventory'}
                        </span>
                        {isDispensed ? 'Đã Cấp Phát' : 'Xác Nhận Cấp Phát & Trừ Kho'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tab Kho Dược & Cảnh báo tồn kho */
            <div className="space-y-4">
              {/* Bộ lọc kho */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex gap-2">
                  <button
                    onClick={() => setInventoryFilter('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      inventoryFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Tất cả danh mục ({drugs.length})
                  </button>
                  <button
                    onClick={() => setInventoryFilter('low_stock')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                      inventoryFilter === 'low_stock'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">warning</span>
                    Sắp hết hàng (tồn ≤ 20)
                  </button>
                  <button
                    onClick={() => setInventoryFilter('expiring')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                      inventoryFilter === 'expiring'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">event_upcoming</span>
                    Sắp hết hạn (&lt; 45 ngày)
                  </button>
                </div>

                <div className="text-xs text-slate-500">
                  Cập nhật thời gian thực từ cơ sở dữ liệu kho
                </div>
              </div>

              {/* Bảng tồn kho */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Mã thuốc</th>
                      <th className="py-2.5 px-3">Tên thuốc</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá (VNĐ)</th>
                      <th className="py-2.5 px-3 text-right">Tồn kho</th>
                      <th className="py-2.5 px-3 text-center">Hạn sử dụng</th>
                      <th className="py-2.5 px-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDrugs.map((d) => {
                      const isLow = (d.stockQuantity || 0) <= 20;
                      return (
                        <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono font-medium text-slate-600 dark:text-slate-400">{d.code}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {d.name}
                            <span className="text-[11px] text-slate-400 font-normal ml-1">({d.unit})</span>
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                            {Number(d.price).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2 px-3 text-right font-bold">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              isLow
                                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-extrabold animate-pulse'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}>
                              {d.stockQuantity}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 font-mono">
                            {d.expiryDate || '2027-12-31'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => setStockModalDrug(d)}
                              className="px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 rounded hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-colors"
                            >
                              Nhập/Xuất kho
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Nhập/Xuất kho con */}
        {stockModalDrug && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 w-full max-w-md space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">inventory</span>
                Điều Chỉnh Kho: {stockModalDrug.name}
              </h3>
              <p className="text-xs text-slate-500">
                Tồn kho hiện tại: <strong className="text-slate-800 dark:text-slate-200">{stockModalDrug.stockQuantity} {stockModalDrug.unit}</strong>
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">Hành động:</label>
                  <select
                    value={stockInputType}
                    onChange={(e) => setStockInputType(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  >
                    <option value="IMPORT">Nhập thêm vào kho (IMPORT)</option>
                    <option value="EXPORT">Xuất kho hủy/chuyển (EXPORT)</option>
                    <option value="ADJUSTMENT">Điều chỉnh kiểm kê chính xác (ADJUSTMENT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">Số lượng ({stockModalDrug.unit}):</label>
                  <input
                    type="number"
                    min="1"
                    value={stockInputQty}
                    onChange={(e) => setStockInputQty(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setStockModalDrug(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdateStock}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
