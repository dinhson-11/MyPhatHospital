import React from 'react';
import logoHospital from '../../assets/logo.png';
import bannerImg from '../../assets/myphat_banner.jpg';
import awardImg from '../../assets/myphat_president_award.jpg';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export default function AboutModal({ isOpen, onClose }) {
  useEscapeKey(isOpen, onClose);
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
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 p-1 flex items-center justify-center shadow-xs shrink-0">
              <img
                src={logoHospital}
                alt="Logo Mỹ Phát Hospital"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png';
                }}
              />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Về Mỹ Phát Hospital</h3>
              <p className="text-xs text-slate-500 font-medium">1170 Quang Trung, TT. Chũ, Lục Ngạn, Bắc Giang • Hotline: 0789 065 493</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-200 rounded">
              ESC
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto space-y-6 text-slate-600 text-sm leading-relaxed">
          {/* Official Banner Card */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs relative group bg-slate-950">
            <img
              src={bannerImg}
              alt="Mỹ Phát Hospital"
              className="w-full h-44 sm:h-52 object-contain transition-transform duration-500 group-hover:scale-101"
              onError={(e) => {
                e.currentTarget.src = '/myphat_banner.jpg';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex flex-col justify-end p-4 text-white">
              <span className="font-headline text-lg sm:text-xl font-extrabold text-white tracking-wide">
                MỸ PHÁT HOSPITAL
              </span>
              <span className="text-xs sm:text-sm text-teal-300 font-semibold tracking-wide">
                SÁNG Y ĐỨC – VỮNG CHUYÊN MÔN – VUÔNG TRÒN HẠNH PHÚC
              </span>
            </div>
          </div>

          {/* Prestige Recognition / Photo with President */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-4">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden shrink-0 shadow-md border-2 border-amber-300 bg-slate-950 flex items-center justify-center p-0.5">
              <img
                src={awardImg}
                alt="Ban lãnh đạo Mỹ Phát Hospital vinh dự đón nhận biểu trưng y đức từ nguyên Chủ tịch nước"
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = '/myphat_president_award.jpg';
                }}
              />
            </div>
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                <span className="material-symbols-outlined text-[15px] text-amber-700">military_tech</span>
                Vinh Danh Y Đức Tiêu Biểu
              </div>
              <h5 className="font-bold text-slate-900 text-sm sm:text-base">
                Kỷ Niệm Chương & Biểu Trưng Y Đức Vì Sức Khỏe Nhân Dân
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ban lãnh đạo Mỹ Phát Hospital vinh dự đón nhận biểu trưng danh dự từ nguyên Chủ tịch nước Trương Tấn Sang – dấu mốc khẳng định tinh thần phụng sự và chất lượng khám chữa bệnh uy tín qua nhiều năm hoạt động.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">history_edu</span>
              Sứ Mệnh & Giá Trị Cốt Lõi
            </h4>
            <p>
              Mỹ Phát Hospital tọa lạc tại địa chỉ số <strong>1170 Quang Trung, Thị trấn Chũ, Huyện Lục Ngạn, Tỉnh Bắc Giang</strong>. Chúng tôi tự hào là điểm tựa y tế tin cậy hàng đầu cho bà con nhân dân huyện Lục Ngạn và các khu vực lân cận.
            </p>
            <p className="mt-2">
              Lấy kim chỉ nam <strong>&ldquo;Sáng Y Đức - Vững Chuyên Môn - Vuông Tròn Hạnh Phúc&rdquo;</strong>, Mỹ Phát Hospital không ngừng đầu tư hệ thống trang thiết bị tiên tiến, liên kết chuyên môn cùng các chuyên gia đầu ngành và đẩy mạnh ứng dụng giải pháp chuyển đổi số y tế HMS-AI.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <span className="material-symbols-outlined text-primary text-2xl mb-1">verified_user</span>
              <h5 className="font-bold text-slate-900 text-sm mb-1">Tận Tâm & An Toàn Người Bệnh</h5>
              <p className="text-xs text-slate-600">
                Tuân thủ quy trình kiểm soát nhiễm khuẩn nghiêm ngặt, quy chế chuyên môn của Bộ Y tế, bảo đảm quyền lợi tối đa cho bệnh nhân BHYT và dịch vụ.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
              <span className="material-symbols-outlined text-secondary text-2xl mb-1">biotech</span>
              <h5 className="font-bold text-slate-900 text-sm mb-1">Cận Lâm Sàng Hiện Đại</h5>
              <p className="text-xs text-slate-600">
                Hệ thống X-quang kỹ thuật số, siêu âm màu Doppler 4D, nội soi tiêu hóa phóng đại NBI, máy xét nghiệm tự động hóa trả kết quả nhanh chóng, chính xác.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">corporate_fare</span>
              Thông Tin Liên Hệ & Tiếp Nhận
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <p>📍 <strong>Địa chỉ:</strong> 1170 Quang Trung, Thị Trấn Chũ, Lục Ngạn, Bắc Giang</p>
              <p>📞 <strong>Hotline Cấp cứu & Tư vấn:</strong> <a href="tel:0789065493" className="font-bold text-rose-600 hover:underline">0789 065 493</a></p>
              <p>⏰ <strong>Thời gian làm việc:</strong> Thứ Hai – Chủ Nhật: 07:00 – 17:30 (Trực cấp cứu 24/24)</p>
              <p>✉️ <strong>Email hỗ trợ:</strong> lienhe@myphathospital.vn</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
