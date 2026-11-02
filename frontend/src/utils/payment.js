/** Các mệnh giá gợi ý làm tròn lên (VD: phải thu 136.000 → 140.000, 150.000, 200.000, 500.000). */
export function suggestCashAmounts(due) {
  if (!due || due <= 0) return [];
  const steps = [10000, 50000, 100000, 200000, 500000];
  const values = new Set();
  steps.forEach((s) => {
    const v = Math.ceil(due / s) * s;
    if (v > due) values.add(v);
  });
  return [...values].sort((a, b) => a - b).slice(0, 4);
}
