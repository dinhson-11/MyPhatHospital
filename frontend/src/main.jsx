import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { syncCatalogWithBackend } from './services/dataService'

// Đồng bộ mã bác sĩ thật từ backend trước khi hiển thị (tối đa 3.5s)
await Promise.race([syncCatalogWithBackend(), new Promise((resolve) => setTimeout(resolve, 3500))])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
