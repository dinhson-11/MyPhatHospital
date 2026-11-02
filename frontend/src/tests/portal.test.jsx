import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ToastProvider } from '../context/ToastContext';
import { Footer } from '../components/layout/Footer';
import HeroSection from '../components/home/HeroSection';
import AboutSection from '../components/home/AboutSection';
import FeaturesSection from '../components/home/FeaturesSection';
import DepartmentsSection from '../components/home/DepartmentsSection';
import DoctorsSection from '../components/home/DoctorsSection';
import AITriageSection from '../components/home/AITriageSection';
import HospitalMapSection from '../components/home/HospitalMapSection';

const noop = () => {};

const renderFooter = (overrides = {}) =>
  render(
    <Footer
      onOpenAbout={noop}
      onOpenContact={noop}
      onOpenAllDepts={noop}
      onOpenBooking={noop}
      onOpenMyAppointments={noop}
      onFilterDept={noop}
      {...overrides}
    />
  );

/** Mọi icon Material Symbols (nếu có) trong vùng render phải ẩn với trình đọc màn hình. */
const expectIconsHidden = (container) => {
  const icons = container.querySelectorAll('.material-symbols-outlined');
  icons.forEach((icon) => {
    const hidden = icon.closest('[aria-hidden="true"]');
    expect(hidden, `icon "${icon.textContent}" thiếu aria-hidden`).not.toBeNull();
  });
};

describe('Footer – liên kết thật, không có nút chết', () => {
  it('không còn liên kết "Chính sách bảo mật" dẫn sai sang trang Giới thiệu', () => {
    const onOpenAbout = vi.fn();
    renderFooter({ onOpenAbout });
    expect(screen.queryByText(/Chính sách bảo mật/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Giới thiệu bệnh viện' }));
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
  });

  it('Facebook là liên kết ngoài thật; không còn nút Zalo / YouTube / LinkedIn chỉ hiện thông báo', () => {
    renderFooter();
    const fb = screen.getByRole('link', { name: /Facebook/i });
    expect(fb).toHaveAttribute('href', 'https://www.facebook.com/MyPhatHospital');
    expect(fb).toHaveAttribute('target', '_blank');
    expect(fb).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(fb.getAttribute('rel')).toContain('noreferrer');
    expect(screen.queryByRole('button', { name: /Zalo|YouTube|LinkedIn/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Zalo|YouTube|LinkedIn/i })).not.toBeInTheDocument();
  });

  it('hiển thị hotline 0386 959 342 và số cấp cứu 115 dạng liên kết gọi điện', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: '0386 959 342' })).toHaveAttribute('href', 'tel:0386959342');
    expect(screen.getByRole('link', { name: '115' })).toHaveAttribute('href', 'tel:115');
  });

  it('liên kết nhanh "Liên hệ & Chỉ đường" mở hộp thoại liên hệ', () => {
    const onOpenContact = vi.fn();
    renderFooter({ onOpenContact });
    fireEvent.click(screen.getByRole('button', { name: /Liên hệ & Chỉ đường/i }));
    expect(onOpenContact).toHaveBeenCalledTimes(1);
  });

  it('chọn chuyên khoa trọng điểm gọi onFilterDept với đúng mã khoa', () => {
    const onFilterDept = vi.fn();
    renderFooter({ onFilterDept });
    fireEvent.click(screen.getByRole('button', { name: 'Tai Mũi Họng' }));
    expect(onFilterDept).toHaveBeenCalledWith(10);
  });
});

describe('HeroSection – khả năng truy cập & nội dung', () => {
  const renderHero = () =>
    render(<HeroSection onOpenBooking={noop} onScrollToAI={noop} onOpenMyAppointments={noop} />);

  it('ảnh mặt tiền có alt mô tả và chú thích nằm trong figure', () => {
    renderHero();
    const figure = screen.getByRole('figure');
    expect(within(figure).getByAltText(/Mặt tiền Phòng khám đa khoa Mỹ Phát/)).toBeInTheDocument();
    expect(within(figure).getByText(/Mặt tiền Mỹ Phát Hospital/)).toBeInTheDocument();
  });

  it('có địa chỉ, giờ khám và hotline ngay trên đầu trang', () => {
    renderHero();
    expect(screen.getByText(/1170 Quang Trung, Thị trấn Chũ, huyện Lục Ngạn/)).toBeInTheDocument();
    expect(screen.getByText(/Thứ 2 – Chủ nhật: \d{2}:\d{2} - \d{2}:\d{2}, \d{2}:\d{2} - \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /0386 959 342/ })[0]).toHaveAttribute('href', 'tel:0386959342');
  });

  it('nút Đặt lịch khám là button thật và gọi onOpenBooking', () => {
    const onOpenBooking = vi.fn();
    render(<HeroSection onOpenBooking={onOpenBooking} onScrollToAI={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /Đặt Lịch Khám/i }));
    expect(onOpenBooking).toHaveBeenCalledTimes(1);
  });

  it('không hiển thị số liệu thống kê chưa kiểm chứng hoặc mã nội bộ', () => {
    renderHero();
    expect(screen.queryByText(/100\.000\+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/HMS-AI/)).not.toBeInTheDocument();
  });

  it('mọi icon đều aria-hidden', () => {
    const { container } = renderHero();
    expectIconsHidden(container);
  });
});

describe('AboutSection – khẩu hiệu và ảnh trao bằng khen', () => {
  it('ảnh trao bằng khen có alt mô tả và chú thích nằm trong figure', () => {
    render(<AboutSection onOpenAbout={noop} />);
    const figure = screen.getByRole('figure');
    expect(within(figure).getByAltText(/Nguyên Chủ tịch nước .* trao bằng khen/)).toBeInTheDocument();
    expect(within(figure).getByText(/được Nguyên Chủ tịch nước trao bằng khen/)).toBeInTheDocument();
  });

  it('nút Giới thiệu bệnh viện gọi onOpenAbout; không hiện nút khi không có handler', () => {
    const onOpenAbout = vi.fn();
    const { unmount } = render(<AboutSection onOpenAbout={onOpenAbout} />);
    fireEvent.click(screen.getByRole('button', { name: 'Giới thiệu bệnh viện' }));
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
    unmount();
    render(<AboutSection />);
    expect(screen.queryByRole('button', { name: 'Giới thiệu bệnh viện' })).not.toBeInTheDocument();
  });
});

describe('Các section trang chủ – icon ẩn với trình đọc màn hình', () => {
  const cases = [
    ['FeaturesSection', () => <FeaturesSection onOpenAITriage={noop} onOpenBooking={noop} onOpenAllDepartments={noop} onOpenMyAppointments={noop} />],
    ['DepartmentsSection', () => <DepartmentsSection onOpenBooking={noop} onOpenAllDepartments={noop} />],
    ['DoctorsSection', () => <DoctorsSection onOpenBooking={noop} />],
    ['Footer', () => <Footer onOpenAbout={noop} onOpenContact={noop} onOpenAllDepts={noop} onOpenBooking={noop} onOpenMyAppointments={noop} onFilterDept={noop} />]
  ];

  it.each(cases)('%s', (_name, build) => {
    const { container } = render(build());
    expectIconsHidden(container);
  });

  it('AITriageSection & HospitalMapSection', () => {
    const { container } = render(
      <ToastProvider>
        <div data-testid="sections">
          <AITriageSection onOpenBooking={noop} />
          <HospitalMapSection />
        </div>
      </ToastProvider>
    );
    expectIconsHidden(container.querySelector('[data-testid="sections"]'));
  });
});

describe('Bộ lọc & nút hành động', () => {
  it('DepartmentsSection: nút lọc nhóm khoa dùng aria-pressed', () => {
    render(<DepartmentsSection onOpenBooking={noop} onOpenAllDepartments={noop} />);
    const all = screen.getByRole('button', { name: /Tất cả khoa phòng/i });
    const clinical = screen.getByRole('button', { name: /Chuyên khoa lâm sàng/i });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(clinical);
    expect(clinical).toHaveAttribute('aria-pressed', 'true');
    expect(all).toHaveAttribute('aria-pressed', 'false');
  });

  it('DepartmentsSection: nút chỉ có icon có aria-label tiếng Việt', () => {
    render(<DepartmentsSection onOpenBooking={noop} onOpenAllDepartments={noop} />);
    expect(screen.getAllByRole('button', { name: /^Xem chi tiết /i }).length).toBeGreaterThan(0);
  });

  it('DoctorsSection: nút lọc theo khoa dùng aria-pressed và không hiển thị lượt đánh giá tự đặt', () => {
    render(<DoctorsSection onOpenBooking={noop} />);
    expect(screen.getByRole('button', { name: 'Tất cả khoa phòng' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText(/đánh giá\)/i)).not.toBeInTheDocument();
  });

  it('FeaturesSection: thẻ tính năng gọi đúng hành động', () => {
    const onOpenAITriage = vi.fn();
    const onOpenBooking = vi.fn();
    render(
      <FeaturesSection
        onOpenAITriage={onOpenAITriage}
        onOpenBooking={onOpenBooking}
        onOpenAllDepartments={noop}
        onOpenMyAppointments={noop}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Thử sàng lọc triệu chứng/i }));
    fireEvent.click(screen.getByRole('button', { name: /Đặt lịch ngay/i }));
    expect(onOpenAITriage).toHaveBeenCalledTimes(1);
    expect(onOpenBooking).toHaveBeenCalledWith();
  });

  it('AITriageSection: kết quả khẩn cấp có hướng dẫn gọi 115, không hiển thị "độ tin cậy" giả', () => {
    render(
      <ToastProvider>
        <AITriageSection onOpenBooking={noop} />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Đau tức ngực, khó thở/i }));
    expect(screen.getByText('Kết Quả Đánh Giá Lâm Sàng')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '115' })).toHaveAttribute('href', 'tel:115');
    expect(screen.queryByText(/Độ tin cậy/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đặt Lịch Khám Theo Gợi Ý Này/i })).toBeInTheDocument();
  });

  it('DoctorsSection: không tải ảnh chân dung từ internet (hệ thống có thể chạy trong mạng LAN)', () => {
    const { container } = render(<DoctorsSection onOpenBooking={noop} />);
    const remote = [...container.querySelectorAll('img')].filter((img) => /^https?:/.test(img.getAttribute('src') || ''));
    expect(remote).toEqual([]);
  });

  it('HospitalMapSection: mở Google Maps bằng liên kết thật (tab mới, noopener)', () => {
    render(
      <ToastProvider>
        <HospitalMapSection />
      </ToastProvider>
    );
    const links = screen.getAllByRole('link', { name: /Google Maps|Chỉ đường/i });
    expect(links.length).toBeGreaterThanOrEqual(3);
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', 'https://maps.app.goo.gl/2vAWcXFcfgSGPS7H6');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    });
  });
});
