/** Kiểm tra phía giao diện (máy chủ vẫn kiểm tra lại). Trả về thông báo lỗi hoặc ''. */
export function validateUserForm(form, isEdit) {
  if (!isEdit) {
    if (form.username.trim().length < 3) return 'Tên đăng nhập phải từ 3 ký tự.';
    if (form.password.length < 8 || !/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) {
      return 'Mật khẩu phải từ 8 ký tự, gồm chữ hoa, chữ thường và chữ số.';
    }
  }
  if (!form.fullName.trim()) return 'Vui lòng nhập họ và tên.';
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Email không hợp lệ.';
  if (form.phone.trim() && !/^0[0-9]{9,10}$/.test(form.phone.trim())) return 'Số điện thoại phải bắt đầu bằng 0 và có 10–11 chữ số.';
  if (form.roleCodes.length === 0) return 'Phải chọn ít nhất một vai trò.';
  return '';
}
