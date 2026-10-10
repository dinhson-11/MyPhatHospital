import { describe, it, expect } from 'vitest';
import { getTimeSlots, isSummer, getWorkingHours, hoursCompact } from '../services/hospitalHours';

describe('hospitalHours – giờ làm việc theo mùa', () => {
  it('mùa hè (01/04 – 31/10): sáng 07:00-11:00, chiều 13:00-17:30', () => {
    const slots = getTimeSlots(new Date(2026, 6, 15));
    expect(slots).toHaveLength(17);
    expect(slots[0]).toBe('07:00 - 07:30');
    expect(slots[7]).toBe('10:30 - 11:00');
    expect(slots[8]).toBe('13:00 - 13:30');
    expect(slots[16]).toBe('17:00 - 17:30');
  });

  it('mùa đông (01/11 – 31/03): lùi 30 phút, sáng 07:30-11:30, chiều 13:30-18:00', () => {
    const slots = getTimeSlots(new Date(2026, 11, 15));
    expect(slots).toHaveLength(17);
    expect(slots[0]).toBe('07:30 - 08:00');
    expect(slots[7]).toBe('11:00 - 11:30');
    expect(slots[8]).toBe('13:30 - 14:00');
    expect(slots[16]).toBe('17:30 - 18:00');
    expect(getWorkingHours(new Date(2026, 11, 15)).afternoon).toEqual(['13:30', '18:00']);
  });

  it('ranh giới mùa', () => {
    expect(isSummer(new Date(2026, 9, 31))).toBe(true);
    expect(isSummer(new Date(2026, 10, 1))).toBe(false);
    expect(isSummer(new Date(2027, 2, 31))).toBe(false);
    expect(isSummer(new Date(2027, 3, 1))).toBe(true);
  });

  it('chuỗi giờ gọn hiển thị trên thẻ bác sĩ', () => {
    expect(hoursCompact(new Date(2026, 6, 1))).toBe('07:00 - 11:00, 13:00 - 17:30');
    expect(hoursCompact(new Date(2026, 11, 1))).toBe('07:30 - 11:30, 13:30 - 18:00');
  });
});
