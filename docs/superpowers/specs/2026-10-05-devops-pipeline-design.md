# DevOps Pipeline & Dockerization Design

## 1. Overview

Thiết lập hệ thống DevOps chuẩn sản xuất cho dự án **Acquisitions** (Node.js/Express, Drizzle ORM, PostgreSQL/Neon, pnpm). Bao gồm Health Check nâng cao, tối ưu Dockerfile Multi-stage, Docker Compose cho môi trường local/production, và CI/CD Pipeline với GitHub Actions.

---

## 2. Components & Architecture

### Part 1: Observability & Health Checks

- **Liveness Check (`GET /health`)**:
  - Trả về JSON trạng thái: `status: "healthy"`, `uptime`, `timestamp`, `version`.
  - Dùng để Docker `HEALTHCHECK`, Kubernetes, hoặc PaaS load balancer kiểm tra server Node.js còn phản hồi hay không.
- **Readiness Check (`GET /ready`)**:
  - Kiểm tra các phụ thuộc hạ tầng (Database Neon / PostgreSQL qua query `SELECT 1`).
  - Trả về HTTP 200 nếu kết nối DB thành công, HTTP 503 nếu mất kết nối.

### Part 2: Dockerfile & Containerization

- **Multi-Stage Build (`node:22-alpine`)**:
  - `stage builder`: Cài đặt `corepack` + `pnpm`, copy lockfile và cài đặt production dependencies (`pnpm install --prod --frozen-lockfile`).
  - `stage runner`: Image tinh gọn, copy code và `node_modules` từ builder, phân quyền cho `USER node`.
- **`.dockerignore`**: Loại trừ `.git`, `node_modules`, `.env`, `logs`, `drizzle` migrations artifacts không cần thiết.
- **Docker Healthcheck**: Thêm chỉ thị `HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1`.

### Part 3: Docker Compose

- File `docker-compose.yml` định nghĩa service `api`:
  - `build: .`
  - `ports: ["3000:3000"]`
  - `env_file: .env`
  - `restart: unless-stopped`

### Part 4: CI/CD Pipeline (GitHub Actions)

- File `.github/workflows/ci.yml`:
  - **Job 1: Lint & Code Quality**: Chạy `pnpm lint`, `pnpm format:check`.
  - **Job 2: Build & Container Test**: Build Docker image, chạy thử container và ping test `/health`.

---

## 3. Implementation Order

1. **Health Check Endpoints** (`/health` & `/ready` trong Express).
2. **Dockerfile & .dockerignore**.
3. **Docker Compose (`docker-compose.yml`)** & kiểm thử chạy container local.
4. **GitHub Actions CI Workflow** (`.github/workflows/ci.yml`).
