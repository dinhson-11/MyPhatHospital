# Rule: Git & Workflow

## Branch Strategy
```
main           ← production-ready code
├── develop    ← integration branch
├── feature/<module>/<description>   ← feature branches
├── bugfix/<description>             ← bug fix branches
└── hotfix/<description>             ← urgent fixes
```

## Commit Messages
Format: `<type>(<scope>): <mô tả ngắn>`

### Types
- `feat` – tính năng mới
- `fix` – sửa lỗi
- `refactor` – tái cấu trúc (không thay đổi behavior)
- `docs` – cập nhật tài liệu
- `test` – thêm/sửa test
- `chore` – config, build, dependencies
- `style` – format code (không thay đổi logic)

### Scopes
`auth`, `patient`, `appointment`, `clinical`, `pharmacy`, `billing`, `hr`, `reporting`, `ai`, `config`, `db`

### Ví dụ
```
feat(auth): implement JWT login and register endpoints
feat(patient): add CRUD operations for patient records
feat(ai): add drug interaction checker endpoint
fix(appointment): resolve duplicate booking issue
test(auth): add unit tests for AuthService
chore(db): add V3 migration for patients table
docs: update API documentation
```

## Quy trình
1. Tạo branch từ `develop`
2. Code + test
3. Commit với message đúng format
4. Push + tạo Pull Request
5. Review → merge vào `develop`

## .gitignore essentials
```
# IDE
.idea/
.vscode/
*.iml

# Build
target/
build/
dist/
node_modules/

# Environment
.env
*.env.local
application-prod.yml

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db
```

## KHÔNG commit
- Credentials, API keys, JWT secrets
- File `.env`
- `application-prod.yml` với thông tin thật
- Node modules, build artifacts
- IDE-specific files
