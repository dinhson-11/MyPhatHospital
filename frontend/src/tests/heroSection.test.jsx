import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeroSection from '../components/home/HeroSection';

describe('HeroSection – nội dung', () => {
  const renderHero = () => render(<HeroSection onOpenBooking={() => {}} onScrollToAI={() => {}} />);

  it('không còn tab "Bác Sĩ & AI"', () => {
    renderHero();
    expect(screen.queryByText(/Bác Sĩ & AI/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hội chẩn số AI/i)).not.toBeInTheDocument();
  });

  it('ảnh hero là ảnh mặt tiền thật, không còn chú thích "Diện kiến"', () => {
    renderHero();
    expect(screen.getByAltText(/Mặt tiền Phòng khám đa khoa Mỹ Phát/)).toBeInTheDocument();
    expect(screen.queryByText(/Diện kiến/i)).not.toBeInTheDocument();
  });

  it('không dùng banner có số hotline cũ (khác số hotline của hệ thống)', () => {
    const { container } = renderHero();
    const sources = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src') || '');
    expect(sources.some((src) => /banner/i.test(src))).toBe(false);
    expect(screen.queryByText(/038 6959342|097 5977222/)).not.toBeInTheDocument();
  });
});
