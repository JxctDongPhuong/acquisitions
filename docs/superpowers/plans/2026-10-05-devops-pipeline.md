# DevOps Pipeline & Dockerization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai hoàn chỉnh hệ sinh thái DevOps cho ứng dụng Acquisitions: Healthcheck, Docker Multi-stage, Docker Compose, và CI/CD GitHub Actions.

**Architecture:** Express 5 REST API được container hóa với Docker Multi-Stage (`node:22-alpine` + `pnpm`), cấu hình giám sát liveness/readiness qua HTTP health endpoints, điều phối container qua Docker Compose, và tự động hóa kiểm thử/build qua GitHub Actions CI.

**Tech Stack:** Node.js 22, Express 5, pnpm, Docker, Docker Compose, GitHub Actions.

## Global Constraints
- Sử dụng `pnpm` làm package manager.
- Node.js version 22-alpine cho Docker.
- Non-root user `node` cho security trong container.

---

### Task 1: Observability & Enhanced Healthcheck

**Files:**
- Create: `src/routes/health.routes.js`
- Modify: `src/app.js`

- [ ] **Step 1: Tạo file route `src/routes/health.routes.js`**
  - Implement `/health` (Liveness) trả về `uptime`, `timestamp`, `status: "healthy"`, `version`.
  - Implement `/ready` (Readiness) kiểm tra kết nối DB.

- [ ] **Step 2: Mount health route vào `src/app.js`**
  - Thay thế `app.get('/health')` cũ bằng router mới.

- [ ] **Step 3: Test endpoint `/health` và `/ready`**
  - Kiểm tra bằng `curl` hoặc gửi GET request.

---

### Task 2: Multi-Stage Dockerfile & .dockerignore

**Files:**
- Create: `.dockerignore`
- Create: `Dockerfile`

- [ ] **Step 1: Tạo `.dockerignore`**
- [ ] **Step 2: Tạo `Dockerfile` chuẩn multi-stage với `node:22-alpine` và `pnpm`**
- [ ] **Step 3: Kiểm tra cú pháp và build thử image**

---

### Task 3: Docker Compose Setup

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Tạo `docker-compose.yml` với service `api` và healthcheck configuration**
- [ ] **Step 2: Chạy và kiểm tra container bằng docker compose**

---

### Task 4: GitHub Actions CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Tạo workflow GitHub Actions tự động hóa `lint`, `format:check`, và `docker build`**
