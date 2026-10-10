import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { syncCatalogWithBackend } from './services/dataService'

// Chế độ tối đã được gỡ bỏ: xóa lớp `dark` / tùy chọn cũ còn lưu từ phiên bản trước
// để giao diện không bị trộn sáng – tối.
document.documentElement.classList.remove('dark')
document.body.classList.remove('dark')
try {
  localStorage.removeItem('hms_theme')
} catch {
  // localStorage có thể bị chặn (chế độ riêng tư) – bỏ qua
}

// Đồng bộ mã bác sĩ thật từ backend chạy nền – KHÔNG chặn lần vẽ đầu tiên.
// Màn hình đặt lịch chờ đồng bộ xong (tối đa ~3 giây) trước khi cho chọn bác sĩ (xem App.jsx).
syncCatalogWithBackend()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
