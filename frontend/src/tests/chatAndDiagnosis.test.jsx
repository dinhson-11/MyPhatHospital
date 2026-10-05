import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatWidget from '../components/chat/ChatWidget';
import DiagnosisSuggestBox from '../components/clinical/DiagnosisSuggestBox';

describe('AI Chatbot & Diagnosis Suggestion Suite', () => {

  describe('ChatWidget Component', () => {
    it('should render floating button with AI badge', () => {
      render(<ChatWidget onOpenBooking={() => {}} />);
      const fab = screen.getByRole('button', { name: /Mở Trợ lý AI Y tế/i });
      expect(fab).toBeInTheDocument();
      expect(screen.getByText(/Hỏi AI Y tế 24\/7/i)).toBeInTheDocument();
    });

    it('should open chat window when clicking FAB and display greeting message with NFR-8 disclaimer', () => {
      render(<ChatWidget onOpenBooking={() => {}} />);
      const fab = screen.getByRole('button', { name: /Mở Trợ lý AI Y tế/i });
      fireEvent.click(fab);

      expect(screen.getByTestId('ai-chat-window')).toBeInTheDocument();
      expect(screen.getByText(/Trợ Lý Y Tế AI 24\/7/i)).toBeInTheDocument();
      expect(screen.getByText(/Tôi là Trợ lý AI Mỹ Phát Hospital/i)).toBeInTheDocument();
      expect(screen.getByText(/Trường hợp khẩn cấp gọi/i)).toBeInTheDocument();
    });

    it('should send a user message and receive AI response with department recommendation', async () => {
      render(<ChatWidget onOpenBooking={() => {}} />);
      const fab = screen.getByRole('button', { name: /Mở Trợ lý AI Y tế/i });
      fireEvent.click(fab);

      const input = screen.getByPlaceholderText(/Nhập triệu chứng hoặc câu hỏi y tế/i);
      const submitBtn = screen.getByRole('button', { name: /Gửi tin nhắn/i });

      fireEvent.change(input, { target: { value: 'Tôi bị đau ngực trái và khó thở' } });
      fireEvent.click(submitBtn);

      expect(screen.getByText('Tôi bị đau ngực trái và khó thở')).toBeInTheDocument();

      // Wait for AI reply
      await waitFor(() => {
        expect(screen.getByText(/Chuyên khoa khuyến nghị:/i)).toBeInTheDocument();
        expect(screen.getByText(/Đặt khám khoa này ngay/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('DiagnosisSuggestBox Component', () => {
    it('should not render anything when symptoms text is empty', () => {
      const { container } = render(
        <DiagnosisSuggestBox symptomsText="" onSelectDiagnosis={() => {}} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should display diagnosis suggestions for cardiovascular symptoms and allow selection', () => {
      let selectedCode = null;
      let selectedName = null;

      render(
        <DiagnosisSuggestBox
          symptomsText="Bệnh nhân đau tức ngực, huyết áp tăng cao, hoa mắt"
          onSelectDiagnosis={(code, name) => {
            selectedCode = code;
            selectedName = name;
          }}
        />
      );

      expect(screen.getByText(/AI Gợi ý Chẩn đoán ICD-10/i)).toBeInTheDocument();

      // Click "Xem gợi ý"
      const toggleBtn = screen.getByText('Xem gợi ý');
      fireEvent.click(toggleBtn);

      expect(screen.getByText('I10')).toBeInTheDocument();
      expect(screen.getByText(/Tăng huyết áp vô căn/i)).toBeInTheDocument();

      // Click on suggestion card
      const suggestionCard = screen.getByText('I10').closest('div');
      fireEvent.click(suggestionCard);

      expect(selectedCode).toBe('I10');
      expect(selectedName).toContain('Tăng huyết áp vô căn');
    });

    it('should show respiratory suggestions for cough and fever symptoms', () => {
      render(
        <DiagnosisSuggestBox
          symptomsText="Ho khan 3 ngày, sốt nhẹ, rát họng"
          onSelectDiagnosis={() => {}}
        />
      );

      const toggleBtn = screen.getByText('Xem gợi ý');
      fireEvent.click(toggleBtn);

      expect(screen.getByText('J00')).toBeInTheDocument();
      expect(screen.getByText(/Viêm mũi họng cấp/i)).toBeInTheDocument();
    });

    it('should show gastrointestinal suggestions for stomach pain', () => {
      render(
        <DiagnosisSuggestBox
          symptomsText="Đau bụng vùng thượng vị, ợ chua sau ăn"
          onSelectDiagnosis={() => {}}
        />
      );

      const toggleBtn = screen.getByText('Xem gợi ý');
      fireEvent.click(toggleBtn);

      expect(screen.getByText('K29.7')).toBeInTheDocument();
      expect(screen.getByText(/Viêm dạ dày/i)).toBeInTheDocument();
    });

    it('should show default R69 when symptoms do not match any specific group', () => {
      render(
        <DiagnosisSuggestBox
          symptomsText="Cảm thấy không khỏe lắm gần đây"
          onSelectDiagnosis={() => {}}
        />
      );

      const toggleBtn = screen.getByText('Xem gợi ý');
      fireEvent.click(toggleBtn);

      expect(screen.getByText('R69')).toBeInTheDocument();
      expect(screen.getByText(/Nguyên nhân gây bệnh chưa xác định/i)).toBeInTheDocument();
    });

    it('should display NFR-8 disclaimer text when suggestions panel is open', () => {
      render(
        <DiagnosisSuggestBox
          symptomsText="Bệnh nhân đau bụng dạ dày"
          onSelectDiagnosis={() => {}}
        />
      );

      const toggleBtn = screen.getByText('Xem gợi ý');
      fireEvent.click(toggleBtn);

      expect(screen.getByText(/chỉ mang tính tham khảo/i)).toBeInTheDocument();
      expect(screen.getByText(/Bác sĩ bấm vào thẻ để chọn nhanh chẩn đoán/i)).toBeInTheDocument();
    });

    it('should show "Phân tích AI" button when panel is open', () => {
      render(
        <DiagnosisSuggestBox
          symptomsText="Bệnh nhân bị sốt, ho đờm"
          onSelectDiagnosis={() => {}}
        />
      );

      const toggleBtn = screen.getByText('Xem gợi ý');
      fireEvent.click(toggleBtn);

      expect(screen.getByText('Phân tích AI')).toBeInTheDocument();
    });

    it('should show confidence percentage badge for each suggestion', () => {
      render(
        <DiagnosisSuggestBox
          symptomsText="Đau tức ngực, huyết áp cao"
          onSelectDiagnosis={() => {}}
        />
      );

      const toggleBtn = screen.getByText('Xem gợi ý');
      fireEvent.click(toggleBtn);

      expect(screen.getByText('94%')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should toggle panel visibility when clicking Xem gợi ý / Thu gọn', () => {
      render(
        <DiagnosisSuggestBox
          symptomsText="Bệnh nhân đau ngực"
          onSelectDiagnosis={() => {}}
        />
      );

      // Initially collapsed
      expect(screen.getByText('Xem gợi ý')).toBeInTheDocument();
      expect(screen.queryByText('I10')).not.toBeInTheDocument();

      // Open
      fireEvent.click(screen.getByText('Xem gợi ý'));
      expect(screen.getByText('I10')).toBeInTheDocument();
      expect(screen.getByText('Thu gọn')).toBeInTheDocument();

      // Close
      fireEvent.click(screen.getByText('Thu gọn'));
      expect(screen.queryByText('I10')).not.toBeInTheDocument();
    });
  });

});
