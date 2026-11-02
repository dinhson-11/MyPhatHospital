/** Kiểm tra biểu mẫu thêm thuốc (máy chủ vẫn kiểm tra lại). Trả về thông báo lỗi hoặc ''. */
export function validateNewDrug(form) {
  if (!form.code.trim()) return 'Vui lòng nhập mã thuốc.';
  if (!form.name.trim()) return 'Vui lòng nhập tên thuốc.';
  const price = Number(form.price);
  if (form.price === '' || !Number.isFinite(price) || price < 0) return 'Đơn giá phải là số không âm.';
  const stock = Number(form.stockQuantity);
  if (form.stockQuantity === '' || !Number.isInteger(stock) || stock < 0) return 'Tồn kho ban đầu phải là số nguyên không âm.';
  return '';
}
