# Frontend – HMS-AI

Thư mục này sẽ chứa ứng dụng React frontend.

## Setup (sẽ thực hiện khi bắt đầu phát triển UI)

```bash
npx -y create-vite@latest ./ -- --template react
npm install
npm install axios react-router-dom
npm run dev
```

## Lưu ý
- Base URL API: `http://localhost:8080/api/v1`
- Sử dụng Axios interceptor để gắn JWT token vào mọi request
- Routing: React Router v6
