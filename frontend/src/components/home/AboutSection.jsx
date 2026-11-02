import React from 'react';
import presidentAwardImg from '../../assets/myphat_president_award.jpg';

/** Dải navy giới thiệu ngắn: khẩu hiệu thật của phòng khám và ảnh Ban lãnh đạo được trao bằng khen. */
export default function AboutSection({ onOpenAbout }) {
  return (
    <section id="about" className="bg-primary text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7">
          <p className="text-sm text-primary-fixed-dim mb-3">Về Mỹ Phát</p>
          <h2 className="text-3xl sm:text-4xl font-semibold leading-tight mb-4">
            Sáng y đức, vững chuyên môn, vuông tròn hạnh phúc
          </h2>
          <p className="text-lg text-primary-fixed max-w-xl mb-6">
            Phòng khám đa khoa Mỹ Phát (Công ty TNHH Bệnh viện Mỹ Phát) phục vụ người dân thị trấn Chũ, huyện Lục Ngạn và vùng lân cận.
          </p>
          {onOpenAbout && (
            <button type="button" onClick={onOpenAbout} className="btn btn-lg bg-white text-primary hover:bg-primary-fixed">
              Giới thiệu bệnh viện
            </button>
          )}
        </div>

        <figure className="lg:col-span-5 max-w-sm lg:max-w-none lg:justify-self-end">
          <img
            alt="Ban lãnh đạo Mỹ Phát Hospital được Nguyên Chủ tịch nước Trương Tấn Sang trao bằng khen"
            className="w-full max-w-xs h-auto border border-white/40"
            src={presidentAwardImg}
          />
          <figcaption className="text-sm text-primary-fixed mt-2">
            Ban lãnh đạo Mỹ Phát Hospital được Nguyên Chủ tịch nước trao bằng khen.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
