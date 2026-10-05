# 📘 TỔNG HỢP KIẾN THỨC DEVOPS THỰC CHIẾN (DỰ ÁN ACQUISITIONS)

Tài liệu này ghi chép chi tiết các khái niệm, bản chất kỹ thuật và cách thức hoạt động của các phần DevOps đã thực hiện.

---

## 📑 MỤC LỤC

1. [Phần 1: Observability & Health Checks (Liveness vs Readiness)](#phần-1-observability--health-checks)
2. [Phần 2: Dockerize Ứng Dụng với Multi-Stage Build](#phần-2-dockerize-ứng-dụng-với-multi-stage-build)
3. [Phần 3: Điều Phối Container với Docker Compose](#phần-3-điều-phối-container-với-docker-compose)
4. [Phần 4: Tự Động Hóa CI/CD với GitHub Actions](#phần-4-tự-động-hóa-cicd-với-github-actions)
5. [Các Lỗi Thường Gặp & Cách Xử Lý (Troubleshooting)](#các-lỗi-thường-gặp--cách-xử-lý)

---

## 🩺 PHẦN 1: OBSERVABILITY & HEALTH CHECKS

### 1. Bản chất và Mục đích

Trong môi trường Production (Docker, Kubernetes, AWS, Render), hệ thống cần cơ chế tự động giám sát để biết khi nào ứng dụng gặp sự cố để tự khởi động lại hoặc điều hướng lưu lượng truy cập.

```
                    ┌─────────────────────────┐
                    │  Docker / Load Balancer │
                    └────────────┬────────────┘
                                 │ Ping định kỳ
                    ┌────────────┴────────────┐
                    ▼                         ▼
            GET /health               GET /ready
       (Tiến trình sống?)        (Sẵn sàng nhận việc?)
```

- **Liveness Check (`GET /health`)**:
  - **Mục đích**: Kiểm tra tiến trình Node.js có còn sống và phản hồi không (tránh tình trạng deadlock, loop vô tận làm treo server).
  - **Dữ liệu trả về**: `status: "healthy"`, `uptime` (thời gian server đã chạy liên tục), `timestamp`, `service name`.
  - **Hành vi hệ thống**: Nếu endpoint này không phản hồi hoặc trả về mã lỗi, Docker / Kubernetes sẽ **kill container và bật container mới**.

- **Readiness Check (`GET /ready`)**:
  - **Mục đích**: Kiểm tra xem ứng dụng đã sẵn sàng phục vụ khách hàng chưa (Database, Redis hoặc dịch vụ phụ thuộc đã kết nối được chưa).
  - **Cách làm**: Thực hiện câu truy vấn nhẹ nhất có thể tới database (`SELECT 1`).
  - **Hành vi hệ thống**: Nếu Database rớt mạng hoặc chưa khởi động xong, trả về `503 Service Unavailable` để Load Balancer **không chuyển request của người dùng vào container này**, tránh gây lỗi 500 cho khách hàng.

---

### 2. Kiến Thức JavaScript/Node.js Bổ Trợ

#### a. `async / await` trong Backend:

- **Bản chất**: Node.js chạy trên **Single Thread** (1 luồng duy nhất).
- **Cơ chế**: Khi gặp `await sql`SELECT 1``, hàm `ready` tạm dừng chờ Database phản hồi qua mạng, nhưng luồng chính của Node.js **không bị đơ** mà lập tức quay sang phục vụ các request của những người dùng khác (_Non-blocking I/O_).
- **Quy tắc**:
  - Mọi thao tác I/O ra bên ngoài (Database, Network API, Đọc/Ghi file, Băm mật khẩu `bcrypt`) đều trả về `Promise` và cần `await`.
  - Hàm chứa `await` bắt buộc phải có từ khóa `async`.

#### b. Default Export vs Named Export trong ES Modules:

- **Default Export (`export default router;`)**: Mỗi file chỉ có 1 đại diện mặc định. Khi import sang file khác (`src/app.js`), bạn có quyền đặt tên tùy ý mà không cần ngoặc nhọn:
  ```javascript
  import healthRoutes from '#routes/health.routes.js';
  ```
- **Named Export (`export { sql, db };`)**: Xuất nhiều biến cụ thể. Khi import bắt buộc dùng ngoặc nhọn `{}` và đúng tên:
  ```javascript
  import { sql } from '#config/database.js';
  ```

#### c. `app.use(healthRoutes)` hoạt động thế nào?

- `app.use()` là hàm đăng ký danh sách các tuyến đường (Router/Middleware) vào Express.
- Khi người dùng gửi `GET /health`, Express duyệt qua các middleware, khớp đường dẫn trong `healthRoutes` và thực thi hàm callback chứa `res.status(200).json(...)` để đóng gói dữ liệu JSON gửi về cho client.

---

## 🐳 PHẦN 2: DOCKERIZE ỨNG DỤNG VỚI MULTI-STAGE BUILD

### 1. Phân biệt các khái niệm cốt lõi:

- **Docker Image**: Một bản đóng gói bất biến (Template) chứa đầy đủ: Hệ điều hành tối giản (Alpine Linux), Node.js runtime, mã nguồn code và các thư viện `node_modules`.
- **Docker Container**: Một thực thể đang chạy (Running Instance) được tạo ra từ Docker Image.

---

### 2. File `.dockerignore`

- Hoạt động tương tự `.gitignore`.
- **Tác dụng**: Ngăn không cho Docker copy các thư mục nặng hoặc nhạy cảm (`node_modules`, `.env`, `.git`, `logs`) vào Image, giúp giảm kích thước Image và bảo mật không để lộ credentials.

---

### 3. Cấu trúc `Dockerfile` Multi-Stage:

Multi-stage build chia quá trình đóng gói thành 2 giai đoạn:

```
[ Stage 1: Builder ]                     [ Stage 2: Runner ]
- node:22-alpine                         - node:22-alpine (Sạch, nhẹ)
- Cài đặt build tools (python, make, g++) - Chỉ copy node_modules đã build
- Cài pnpm qua corepack                   - Chỉ copy code src/
- Chạy pnpm install                      - Chạy với USER node (bảo mật)
                                         👉 Kích thước Image chỉ ~150MB
```

#### Giải thích từng câu lệnh quan trọng:

1. `FROM node:22-alpine AS builder`: Chọn image hệ điều hành Alpine siêu nhẹ (chỉ khoảng 5MB).
2. `corepack enable && corepack prepare pnpm@latest --activate`: Bật công cụ quản lý package manager có sẵn trong Node.js để kích hoạt `pnpm` mà không cần cài `npm install -g pnpm`.
3. `COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./`: Tận dụng cơ chế **Docker Layer Caching**. Nếu `package.json` không đổi, Docker sẽ lấy cache các dependencies mà không tải lại từ đầu.
4. **Phân biệt `RUN` vs `CMD`**:
   - **`RUN`**: Chạy **trong lúc build image** (cài đặt phần mềm, tải thư viện). Ví dụ: `RUN pnpm install`.
   - **`CMD`**: Lệnh chính để **bật server khi container khởi động**. Mỗi Dockerfile chỉ có 1 lệnh `CMD` ở cuối: `CMD ["node", "src/index.js"]`.
5. `USER node`: Đổi quyền từ `root` sang user `node` thường để ngăn chặn hacker chiếm quyền điều khiển server nếu ứng dụng bị tấn công.
6. `HEALTHCHECK`: Khai báo cơ chế tự kiểm tra sức khỏe của container thông qua HTTP request.

---

## 📦 PHẦN 3: ĐIỀU PHỐI CONTAINER VỚI DOCKER COMPOSE

### 1. Tại sao dùng Docker Compose?

Thay vì phải nhớ và gõ câu lệnh `docker run` cực kỳ dài dòng, Docker Compose cho phép cấu hình toàn bộ thông số trong file `docker-compose.yaml` và quản lý bằng 1 lệnh duy nhất.

---

### 2. Chi tiết cấu hình `docker-compose.yaml`:

```yaml
services:
  api: # Tên định danh của service
    container_name: 'acquisitions-api' # Tên container hiển thị
    image: acquisitions-api:1.0 # Tên và tag của image sau khi build
    build:
      context: . # Thư mục chứa mã nguồn (thư mục hiện tại)
      dockerfile: Dockerfile # File Dockerfile sử dụng
    ports:
      - '3000:3000' # Ánh xạ: <Port Máy Thật>:<Port Trong Container>
    env_file:
      - .env # Tự động nạp các biến môi trường từ .env
    restart: unless-stopped # Tự khởi động lại nếu app bị crash
    healthcheck: # Bác sĩ khám sức khỏe định kỳ cho container
      test: ['CMD-SHELL', 'wget -qO- http://localhost:3000/health || exit 1']
      interval: 30s # Cứ mỗi 30 giây kiểm tra 1 lần
      timeout: 3s # Quá 3 giây không phản hồi coi như lỗi
      start_period: 5s # Đợi 5 giây sau khi bật container mới bắt đầu test
      retries: 3 # Bị lỗi 3 lần liên tiếp thì đánh dấu UNHEALTHY
```

#### Giải thích câu lệnh test Healthcheck:

`test: ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"]`

- `CMD-SHELL`: Chạy lệnh qua terminal Linux `/bin/sh`.
- `wget`: Công cụ gửi HTTP request tải dữ liệu.
- `-q`: Quiet (chạy ngầm không in log tiến trình download).
- `-O-`: Output kết quả ra màn hình thay vì lưu file.
- `|| exit 1`: Nếu gọi endpoint thất bại (server chết/lỗi), lập tức thoát ra với mã lỗi 1 để Docker phát hiện trạng thái `unhealthy`.

---

### 3. Bảng tra cứu các lệnh Docker Compose thường dùng:

| Lệnh                           | Ý nghĩa                                                               |
| :----------------------------- | :-------------------------------------------------------------------- |
| `docker compose up -d --build` | Build lại image mới nhất và khởi chạy container ngầm.                 |
| `docker compose ps`            | Kiểm tra danh sách container và trạng thái (`healthy` / `unhealthy`). |
| `docker compose logs -f`       | Xem log theo thời gian thực (nhấn `Ctrl + C` để thoát).               |
| `docker compose stop`          | Tạm dừng container mà không xóa.                                      |
| `docker compose down`          | Dừng và dọn dẹp xóa container an toàn.                                |

---

## ⚙️ PHẦN 4: TỰ ĐỘNG HÓA CI/CD VỚI GITHUB ACTIONS

### 1. Bản chất của CI/CD

- **CI (Continuous Integration - Tích hợp liên tục)**: Tự động kiểm tra chất lượng mã nguồn (`lint`, `format`) và thử nghiệm build container mỗi khi có code mới được đẩy lên GitHub (`push` hoặc `pull_request`).
- **CD (Continuous Delivery / Deployment - Triển khai liên tục)**: Tự động đóng gói và cập nhật ứng dụng lên môi trường Production (VPS, AWS, Render) sau khi CI vượt qua tất cả các bài kiểm tra.

---

### 2. Kiến trúc & Vòng đời máy ảo (Ephemeral Runners):

- Mỗi **Job** trong GitHub Actions chạy trên một **máy ảo Ubuntu độc lập (Runner)**.
- **Tính chất Ephemeral (Tạm thời)**:
  - Khi Job bắt đầu: GitHub tự động cấp phát máy ảo mới tinh.
  - Khi Job kết thúc (thành công hoặc thất bại): **GitHub tự động tiêu hủy hoàn toàn máy ảo đó**, đảm bảo môi trường luôn sạch và bảo mật tuyệt đối mà không cần người dùng phải viết code dọn dẹp.
- Do các Job chạy trên các máy ảo tách biệt, **mỗi Job đều cần bước `uses: actions/checkout@v4`** ở đầu để clone mã nguồn về máy ảo của riêng nó.

---

### 3. Phân tích chi tiết cú pháp file `.github/workflows/ci.yaml`:

```yaml
name: CI Pipeline

# 1. Sự kiện kích hoạt (Trigger)
on:
  push:
    branches: ['main', 'master']
  pull_request:
    branches: ['main', 'master']

jobs:
  # Job 1: Kiểm tra chất lượng code
  quality-check:
    runs-on: ubuntu-latest # Hệ điều hành của máy ảo GitHub cấp
    steps:
      # Lấy mã nguồn về máy ảo
      - name: Checkout repository
        uses: actions/checkout@v4

      # Thiết lập môi trường pnpm
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest

      # Cài đặt Node.js 22 và bật cache cho pnpm (tăng tốc build)
      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: pnpm

      # Cài đặt dependencies chuẩn xác theo lockfile
      - name: Install dependencies
        run: pnpm i --frozen-lockfile

      # Kiểm tra cú pháp JavaScript
      - name: Run linter
        run: pnpm lint

      # Kiểm tra định dạng code
      - name: Check code formatting
        run: pnpm format:check

  # Job 2: Kiểm tra đóng gói Docker
  docker-build-test:
    name: Docker Build & Verify
    needs: quality-check # Chỉ chạy sau khi Job 1 đã PASS thành công
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      # Chuẩn bị môi trường Docker Buildx
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      # Thử nghiệm build Docker Image
      - name: Build Docker Image
        run: |
          docker build -t acquisitions-api:test .
```

#### Giải thích các từ khóa quan trọng:

1. `uses: actions/checkout@v4`:
   - `uses`: Lệnh gọi một Action có sẵn.
   - `actions`: Tổ chức chính thức của GitHub.
   - `checkout`: Tên kho công cụ tự động clone Git.
   - `@v4`: Phiên bản số 4 (mới và ổn định nhất).
2. `needs: quality-check`: Thiết lập luồng tuần tự. Nếu Job 1 bị lỗi cú pháp (`lint`) thì Job 2 **sẽ tự động dừng lại ngay**, tiết kiệm tài nguyên và thời gian.
3. `run: |`: Cho phép thực thi một khối gồm nhiều dòng lệnh Shell liên tiếp trong terminal của máy ảo.

---

## 🚀 PHẦN 5: CONTINUOUS DEPLOYMENT (CD) VỚI DOCKER HUB

### 1. Luồng hoạt động chuẩn công nghiệp (Industry Standard CD Workflow):

```
┌─────────────────────────────────────────────────────────────┐
│                 GITHUB ACTIONS RUNNER (Cloud)               │
│                                                             │
│   Job 1: quality-check (CI)                                 │
│   └─ [PASS ✔] Lint & Format hợp lệ                         │
│                                                             │
│   Job 2: docker-build-push (CD)                             │
│   ├─ 1. actions/checkout@v4                                 │
│   ├─ 2. setup-qemu-action (Hỗ trợ đa kiến trúc CPU)         │
│   ├─ 3. setup-buildx-action (Build engine thế hệ mới)       │
│   ├─ 4. login-action (Đăng nhập bí mật qua GitHub Secrets)  │
│   └─ 5. build-push-action (Build & Push Image lên Cloud)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Upload Image qua Internet
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 DOCKER HUB REGISTRY (xacee)                 │
│                                                             │
│   Repository: xacee/acquisitions-api                        │
│   ├─ Tag 1: `latest` (Bản phát hành mới nhất)               │
│   └─ Tag 2: `<commit-sha>` (Mã băm commit Git để Rollback)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Pull Image về chạy
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          MÁY CHỦ THỰC TẾ (Production Server / Cloud)        │
│   `docker compose pull && docker compose up -d`             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Quản trị Bí mật An toàn với GitHub Secrets:

- **Nguyên tắc an ninh mạng (Zero Trust)**: 
  - Tuyệt đối không bao giờ ghi trực tiếp mật khẩu, token hay private key vào mã nguồn (file `.yaml`, `.js`) hoặc đẩy lên Git.
  - Sử dụng **Personal Access Token (PAT)** có thời hạn và quyền hạn giới hạn (`Repo Read & Write`) thay vì dùng mật khẩu tài khoản chính.
- **Cơ chế hoạt động**:
  - Dữ liệu secret được lưu trữ dưới dạng mã hóa bất đối xứng trên máy chủ bảo mật của GitHub.
  - Khi workflow chạy, GitHub Runner tự động giải mã và nạp vào biến môi trường thông qua cú pháp:
    ```yaml
    ${{ secrets.DOCKERHUB_USERNAME }} # Tài khoản Docker Hub (xacee)
    ${{ secrets.DOCKERHUB_TOKEN }}    # Access Token bí mật
    ```
  - Trên màn hình log công khai, GitHub sẽ tự động che phủ các giá trị này thành `***` để tránh bị lộ.

---

### 3. Giải thích chi tiết từng Action trong Job CD:

1. **`docker/setup-qemu-action@v3` (QEMU Emulator)**:
   - **Tác dụng**: Giả lập phần cứng đa kiến trúc CPU.
   - **Ý nghĩa**: Cho phép build Docker Image trên máy ảo x86_64 của GitHub nhưng vẫn có thể chạy mượt mà trên server ARM64 (như chip Apple M1/M2/M3, AWS Graviton hay Raspberry Pi).

2. **`docker/setup-buildx-action@v3` (Docker Buildx)**:
   - **Tác dụng**: Khởi tạo BuildKit — công cụ build thế hệ mới của Docker Inc.
   - **Ưu điểm**: Hỗ trợ cache nhiều tầng (layer caching) siêu nhanh và cho phép build xong đẩy thẳng lên Registry chỉ với 1 bước cấu hình.

3. **`docker/login-action@v3`**:
   - **Tác dụng**: Tự động thực hiện bắt tay xác thực với Docker Hub (`docker login`).

4. **`docker/build-push-action@v5`**:
   - **Cấu hình quan trọng**:
     - `context: .`: Thư mục gốc chứa mã nguồn.
     - `file: ./Dockerfile`: File Dockerfile chỉ định dùng để build.
     - `push: true`: Tự động đẩy image lên Registry sau khi build hoàn tất.
     - `tags`: Chiến lược gắn đa tag (**Dual-tagging Strategy**):
       - `latest`: Giúp Production Server luôn luôn trỏ đến phiên bản mới nhất.
       - `${{ github.sha }}`: Gắn mã commit Git (ví dụ: `2514b60...`). Nếu bản `latest` gặp sự cố ngoài thực tế, DevOps chỉ cần đổi cấu hình sang mã tag commit cũ để **Rollback hệ thống ngay lập tức trong 5 giây**!

5. **`if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'`**:
   - **Tác dụng**: Bộ lọc nhánh an toàn.
   - **Ý nghĩa**: Đảm bảo chỉ khi code được merge chính thức vào nhánh `main`, image mới được đẩy lên Docker Hub. Nếu ai đó tạo nhánh phụ hoặc Pull Request thử nghiệm, hệ thống chỉ chạy CI để kiểm tra chứ **không ghi đè image lên Docker Hub**.

---

## 🛠️ CÁC LỖI THƯỜNG GẶP & CÁCH XỬ LÝ (TROUBLESHOOTING)

### 1. Lỗi: `port is already allocated` (Port 3000 đã bị chiếm dụng)
- **Nguyên nhân**: Bạn đang chạy lệnh `pnpm dev` hoặc có 1 ứng dụng khác đang chiếm cổng `3000` ở máy thật.
- **Cách khắc phục**:
  - **Cách 1**: Tắt tiến trình `pnpm dev` ở terminal đang chạy (nhấn `Ctrl + C`).
  - **Cách 2**: Đổi port ở máy thật trong `docker-compose.yaml`, ví dụ:
    ```yaml
    ports:
      - '8080:3000' # Truy cập qua http://localhost:8080
    ```

### 2. Lỗi: `failed to connect to the docker API...`
- **Nguyên nhân**: Docker Desktop trên Windows chưa được bật hoặc chưa khởi động xong.
- **Cách khắc phục**: Mở ứng dụng Docker Desktop và đợi icon chuyển sang màu xanh (Engine running) trước khi chạy lệnh.

### 3. Lỗi: GitHub Actions không tự chạy khi push code
- **Nguyên nhân**: Tên thư mục chứa workflow bị sai chính tả (ví dụ `.github/workflow` thiếu chữ `s`).
- **Cách khắc phục**: Đổi tên thư mục thành chuẩn chính xác: `.github/workflows/` (có chữ `s`).

### 4. Lỗi: `ERR_PNPM_IGNORED_BUILDS` trong pnpm v12
- **Nguyên nhân**: `pnpm v12` áp dụng cơ chế bảo mật mới, chặn các gói phụ thuộc chạy build scripts (như `bcrypt`, `esbuild`) trừ khi được khai báo cho phép.
- **Cách khắc phục**: Khai báo danh sách các gói được phép build trong `pnpm-workspace.yaml`:
  ```yaml
  onlyBuiltDependencies:
    - bcrypt
    - esbuild
  ```
  Hoặc sử dụng cờ `--ignore-scripts` trong CI nếu chỉ chạy Lint/Format.

### 5. Lỗi: Linter & Prettier thất bại trên CI (`13 problems (13 errors)...`)
- **Nguyên nhân**: Mã nguồn chứa các sai lệch về chuẩn format code (dấu nháy kép `"` thay vì nháy đơn `'`, thiếu dấu chấm phẩy `;`, thụt lề hoặc xuống dòng không đúng chuẩn Prettier).
- **Cách khắc phục**: Chạy các lệnh tự động sửa format và lint trước khi commit code:
  ```bash
  # 1. Tự động format toàn bộ dự án bằng Prettier
  pnpm format

  # 2. Tự động sửa các lỗi cú pháp bằng ESLint
  pnpm lint:fix

  # 3. Kiểm tra lại lần cuối để chắc chắn sạch 100%
  pnpm lint && pnpm format:check
  ```

### 6. Lỗi: Prettier báo lỗi format trên chính file `.github/workflows/ci.yaml`
- **Nguyên nhân**: Trong file YAML có các khoảng trắng thừa hoặc thụt lề chưa đúng 2 spaces theo chuẩn Prettier.
- **Cách khắc phục**: Chạy `pnpm format` (tức là `prettier --write .`) trước khi `git push`. Prettier sẽ tự động căn chỉnh lại cả các file cấu hình YAML, JSON và Markdown một cách hoàn hảo.
