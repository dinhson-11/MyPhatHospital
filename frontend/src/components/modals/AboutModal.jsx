import React from 'react';

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">local_hospital</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Về Bệnh Viện Đa Khoa Thanh Sơn</h3>
              <p className="text-xs text-slate-500">Bệnh viện Đa khoa hạng I - Phú Thọ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto space-y-6 text-slate-600 text-sm leading-relaxed">
          <div>
            <h4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">history_edu</span>
              Lịch Sử & Tầm Nhìn Phát Triển
            </h4>
            <p>
              Bệnh viện Đa khoa Thanh Sơn tiền thân là cơ sở y tế tuyến huyện, trải qua hơn 40 năm xây dựng và trưởng thành đã vươn mình trở thành một trong những trung tâm khám chữa bệnh kỹ thuật cao uy tín hàng đầu khu vực Tây Bắc và tỉnh Phú Thọ.
            </p>
            <p className="mt-2">
              Với phương châm <strong>&ldquo;Y Đức Vẹn Toàn - Tận Tâm Phục Vụ&rdquo;</strong>, bệnh viện không ngừng cải tiến quy trình khám chữa bệnh, tiên phong áp dụng công nghệ chuyển đổi số thông minh HMS-AI giúp rút ngắn thời gian chờ đợi và nâng tầm trải nghiệm của người bệnh.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <span className="material-symbols-outlined text-primary text-2xl mb-1">verified_user</span>
              <h5 className="font-bold text-slate-900 text-sm mb-1">Tiêu Chuẩn Quản Lý JCI</h5>
              <p className="text-xs text-slate-600">
                Tuân thủ nghiêm ngặt 14 chương mục an toàn người bệnh quốc tế, quy trình kiểm soát nhiễm khuẩn vô trùng tuyệt đối.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
              <span className="material-symbols-outlined text-secondary text-2xl mb-1">biotech</span>
              <h5 className="font-bold text-slate-900 text-sm mb-1">Trang Thiết Bị Kỹ Thuật Cao</h5>
              <p className="text-xs text-slate-600">
                Hệ thống MRI 3.0 Tesla, CT-Scanner 128 lát cắt, máy siêu âm 4D Doppler màu tim mạch và hệ thống nội soi NBI phóng đại cao.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">corporate_fare</span>
              Quy Mô Cơ Sở Vật Chất
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
              <li>Quy mô hơn 650 giường bệnh nội trú tiêu chuẩn quốc tế.</li>
              <li>10 phòng mổ vô khuẩn áp lực dương một chiều thế hệ mới nhất.</li>
              <li>Hệ thống xét nghiệm tự động Cobas 8000 công suất 8.000 test/giờ.</li>
              <li>Đội ngũ hơn 350 cán bộ nhân viên y tế tận tụy, giàu y đức.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
