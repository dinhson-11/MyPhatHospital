import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeroSection from '../components/home/HeroSection';

describe('HeroSection – bộ ảnh bên phải', () => {
  const renderHero = () => render(<HeroSection onOpenBooking={() => {}} onScrollToAI={() => {}} />);

  it('không còn tab "Bác Sĩ & AI"', () => {
    renderHero();
    expect(screen.queryByText(/Bác Sĩ & AI/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hội chẩn số AI/i)).not.toBeInTheDocument();
  });

  it('chú thích ảnh Chủ tịch nước là "Nguyên Chủ tịch nước trao bằng khen"', () => {
    renderHero();
    expect(screen.getAllByText(/Nguyên Chủ tịch nước trao bằng khen/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Diện kiến/i)).not.toBeInTheDocument();
  });

  it('chuyển sang tab Cơ sở Bệnh viện hiển thị ảnh banner', () => {
    renderHero();
    fireEvent.click(screen.getByText('Cơ sở Bệnh viện'));
    expect(screen.getByAltText('Mỹ Phát Hospital')).toBeInTheDocument();
  });
});
