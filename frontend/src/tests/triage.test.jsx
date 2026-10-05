import { describe, it, expect } from 'vitest';
import { triageService } from '../services/triageService';

describe('AI Clinical Triage & Specialty Routing Suite (Enterprise Grade)', () => {
  it('should accurately triage emergency / cardiopulmonary conditions to Khoa Khám bệnh / Cấp cứu ban đầu', () => {
    const input = 'Bệnh nhân có triệu chứng đau tức ngực, đánh trống ngực và khó thở';
    const result = triageService.triageSymptoms(input);

    expect(result).toBeDefined();
    expect(result.deptId).toBe(1);
    expect(result.deptName).toBe('Khoa Khám bệnh / Cấp cứu ban đầu');
    expect(result.doctorName).toContain('Vi Mai Anh');
    expect(result.urgency).toBe('HIGH');
  });

  it('should triage musculoskeletal symptoms to Khoa YHCT – Phục hồi chức năng', () => {
    const input = 'Bệnh nhân bị đau khớp gối, đau cổ vai gáy và thoát vị đĩa đệm';
    const result = triageService.triageSymptoms(input);

    expect(result.deptId).toBe(13);
    expect(result.deptName).toBe('Khoa Y học cổ truyền – Phục hồi chức năng');
    expect(result.doctorName).toContain('Nguyễn Văn Sỹ');
  });

  it('should triage ENT (Tai Mũi Họng) symptoms accurately', () => {
    const input = 'Bị ngạt mũi, chảy mũi, đau rát họng và nuốt đau 3 ngày nay';
    const result = triageService.triageSymptoms(input);

    expect(result.deptId).toBe(10);
    expect(result.deptName).toBe('Tai Mũi Họng');
    expect(result.doctorName).toContain('Hoàng Thị Dung');
  });

  it('should triage pregnancy and obstetrics symptoms to Sản - Phụ khoa', () => {
    const input = 'Khám thai định kỳ, tư vấn quản lý thai kỳ và khám phụ khoa';
    const result = triageService.triageSymptoms(input);

    expect(result.deptId).toBe(3);
    expect(result.deptName).toBe('Sản - Phụ khoa');
    expect(result.doctorName).toContain('Phạm Lan Vy');
  });

  it('should triage surgical and minor procedure symptoms to Ngoại khoa & Phẫu thuật / Tiểu phẫu', () => {
    const input = 'Cần tiểu phẫu điều trị hội chứng ống cổ tay và xử lý vết thương nông';
    const result = triageService.triageSymptoms(input);

    expect(result.deptId).toBe(2);
    expect(result.deptName).toBe('Ngoại khoa & Phẫu thuật / Tiểu phẫu');
    expect(result.doctorName).toContain('Lê Thị Nga');
  });

  it('should triage aesthetic and skin reconstruction symptoms to Dịch vụ Thẩm mỹ / Tạo hình', () => {
    const testCases = [
      'dịch vụ nâng mũi',
      'tư vấn thẩm mỹ tái tạo da',
      'nâng mũi thẩm mỹ tạo hình'
    ];

    testCases.forEach(input => {
      const result = triageService.triageSymptoms(input);
      expect(result).toBeDefined();
      expect(result.deptId).toBe(14);
      expect(result.deptName).toBe('Dịch vụ Thẩm mỹ / Tạo hình');
      expect(result.doctorName).toContain('Lê Tuấn Hiệp');
    });
  });

  it('should route unclassified symptoms safely to Khoa Khám bệnh / Cấp cứu ban đầu fallback', () => {
    const input = 'Tôi muốn kiểm tra sức khỏe tổng quát định kỳ';
    const result = triageService.triageSymptoms(input);

    expect(result.deptId).toBe(1);
    expect(result.deptName).toBe('Khoa Khám bệnh / Cấp cứu ban đầu');
    expect(result.confidence).toBeDefined();
    expect(result.advice).toBeDefined();
  });

  it('should return null on null or non-string input safely', () => {
    expect(triageService.triageSymptoms(null)).toBeNull();
    expect(triageService.triageSymptoms(undefined)).toBeNull();
    expect(triageService.triageSymptoms('')).toBeNull();
  });
});
