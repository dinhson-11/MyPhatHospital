/** @type {import('tailwindcss').Config} */
// Tailwind chạy lúc BUILD (không còn CDN runtime) nên giao diện hoạt động cả khi không có Internet (mạng LAN bệnh viện).
// Giá trị màu / bóng / bo góc PHẢI trùng với biến CSS trong src/index.css (mục 1. TOKENS).
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],

    /* Chế độ tối đã được gỡ bỏ: lớp `dark` không bao giờ được gắn, các biến thể dark: không có hiệu lực */
    darkMode: "class",
    theme: {
      /* Khai báo đủ breakpoint để thêm `xs` (480px) đúng thứ tự từ nhỏ đến lớn */
      screens: {
        xs: "480px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px"
      },
      extend: {
        colors: {
          /* Thương hiệu – Xanh navy y khoa (#0B5394) là màu chính; xanh ngọc (#2BA89B) là màu nhấn phụ */
          "brand": {
            50: "#f0f7ff",
            100: "#e0effe",
            200: "#bae0fd",
            300: "#7cc7fb",
            400: "#36aaf5",
            500: "#0b8ee0",
            600: "#0b5394",
            700: "#0a457c",
            800: "#0c3b66",
            900: "#0f3254",
            950: "#0a2038"
          },
          "primary": "#0B5394",
          "primary-dark": "#083e70",
          "primary-active": "#062e54",
          "primary-container": "#1565a8",
          "primary-fixed": "#eef5fc",
          "primary-fixed-dim": "#d6e7f8",
          "teal": {
            50: "#f0fdfa",
            100: "#ccfbf1",
            200: "#99f6e4",
            300: "#5eead4",
            400: "#2dd4bf",
            500: "#2BA89B",
            600: "#22867c",
            700: "#1d6c64",
            800: "#1c5651",
            900: "#1b4743"
          },
          "secondary": "#2BA89B",
          "secondary-dark": "#22867c",
          "secondary-container": "#eaf7f5",
          "secondary-fixed": "#eaf7f5",
          "on-primary": "#ffffff",
          "on-primary-container": "#ffffff",
          "on-secondary": "#ffffff",
          "tertiary": "#2BA89B",
          "tertiary-fixed": "#eaf7f5",
          /* Nền & màu trung tính (slate) */
          "canvas": "#f6f8fa",
          "surface": "#ffffff",
          "surface-bright": "#ffffff",
          "surface-dim": "#f1f5f9",
          "surface-variant": "#94a3b8",
          "surface-container-lowest": "#ffffff",
          "surface-container-low": "#f8fafc",
          "surface-container": "#f1f5f9",
          "surface-container-high": "#e2e8f0",
          "surface-container-highest": "#cbd5e1",
          "on-surface": "#0f172a",
          "on-surface-variant": "#475569",
          "outline": "#94a3b8",
          "outline-variant": "#e2e8f0",
          /* Ngữ nghĩa: đỏ = lỗi/nguy hiểm, hổ phách = cảnh báo, ngọc lục bảo = thành công */
          "success": "#047857",
          "success-container": "#ecfdf5",
          "warning": "#b45309",
          "warning-container": "#fffbeb",
          "error": "#b91c1c",
          "error-container": "#fef2f2",
          "info": "#0369a1",
          "info-container": "#f0f9ff",
          "inverse-surface": "#0f172a",
          "inverse-on-surface": "#f8fafc"
        },
        fontFamily: {
          "headline": ["'Be Vietnam Pro'", "system-ui", "-apple-system", "'Segoe UI'", "sans-serif"],
          "body": ["'Be Vietnam Pro'", "system-ui", "-apple-system", "'Segoe UI'", "sans-serif"],
          "label": ["'Be Vietnam Pro'", "system-ui", "-apple-system", "'Segoe UI'", "sans-serif"],
          "sans": ["'Be Vietnam Pro'", "system-ui", "-apple-system", "'Segoe UI'", "Roboto", "sans-serif"],
          "mono": ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"]
        },
        boxShadow: {
          /* Tương thích tên lớp kiểu Tailwind v4 đang dùng trong mã nguồn */
          "2xs": "0 1px 0 0 rgb(15 23 42 / 0.05)",
          "xs": "0 1px 2px 0 rgb(15 23 42 / 0.05)",
          "card": "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
          "card-hover": "0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.05)",
          "pop": "0 12px 32px -8px rgb(15 23 42 / 0.18), 0 4px 8px -4px rgb(15 23 42 / 0.08)",
          "focus": "0 0 0 3px rgb(11 83 148 / 0.28)"
        },
        backdropBlur: {
          "xs": "2px"
        },
        blur: {
          "xs": "2px"
        },
        zIndex: {
          "60": "60",
          "70": "70"
        },
        spacing: {
          "17": "4.25rem",
          "18": "4.5rem"
        }
      }
    }
};
