import { describe, it, expect } from 'vitest';
import { triageService } from '../services/triageService';

describe('AI Clinical Triage & Specialty Routing Suite (Enterprise Grade)', () => {
  it('should accurately triage cardiology conditions and trigger high urgency', () => {
    const input = 'Bệnh nhân có triệu chứng đau tức ngực, đánh trống ngực và khó thở';
    const result = triageService.triageSymptoms(input);

    expect(result).toBeDefined();
    expect(result.deptId).toBe(5);
    expect(result.deptName).toBe('Khoa Tim mạch');
    expect(result.doctorName).toContain('Nguyễn Văn Hùng');
    expect(result.urgency).toBe('HIGH');
  });

  it('should triage pediatric symptoms to Khoa Nhi with specialist assigned', () => {
    const input = 'Bé 2 tuổi bị sốt cao quấy khóc không chịu ăn';
    const result = triageService.triageSymptoms(input);

    expect(result.deptId).toBe(4);
    expect(result.deptName).toBe('Khoa Nhi');
    expect(result.doctorName).toContain('Lê Hoàng Nam');
  });

  it('should triage ENT (Tai Mũi Họng) symptoms accurately', () => {
    const input = 'Bị ngạt mũi, chảy mũi, đau rát họng và nuốt đau 3 ngày nay';
    const result = triageService.triageSymptoms(input);

    expect(result.deptId).toBe(10);
    expect(result.deptName).toBe('Khoa Tai mũi họng');
    expect(result.doctorName).toContain('Vũ Đình Trọng');
  });

  it('should triage gastroenterology symptoms accurately', () => {
    const input = 'Đau vùng thượng vị dạ dày, ợ chua và đầy hơi khó tiêu';
    const result = triageService.triageSymptoms(input);

    expect(result.deptId).toBe(6);
    expect(result.deptName).toBe('Khoa Tiêu hóa');
    expect(result.doctorName).toContain('Phạm Thu Hương');
  });

  it('should triage dermatology symptoms accurately', () => {
    const input = 'Da bị ngứa mẩn đỏ dị ứng và nổi mề đay';
    const result = triageService.triageSymptoms(input);

    expect(result.deptId).toBe(8);
    expect(result.deptName).toBe('Khoa Da liễu');
    expect(result.doctorName).toContain('Lê Thị Lan Anh');
  });

  it('should route unclassified symptoms safely to General Internal Medicine fallback', () => {
    const input = 'Tôi muốn kiểm tra sức khỏe tổng quát định kỳ';
    const result = triageService.triageSymptoms(input);

    expect(result.deptId).toBe(1);
    expect(result.deptName).toBe('Khoa Nội tổng quát');
    expect(result.confidence).toBeDefined();
    expect(result.advice).toBeDefined();
  });

  it('should return null on null or non-string input safely', () => {
    expect(triageService.triageSymptoms(null)).toBeNull();
    expect(triageService.triageSymptoms(undefined)).toBeNull();
    expect(triageService.triageSymptoms('')).toBeNull();
  });
});
