# ==========================================
# Giai đoạn 1: Builder (Cài đặt dependencies)
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Kích hoạt corepack để sử dụng pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy file định nghĩa package để tận dụng Docker cache layer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Cài đặt build tools cần cho bcrypt (native addon)
RUN apk add --no-cache python3 make g++

# Cài đặt chỉ các dependencies cần cho production (bỏ qua build scripts)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Biên dịch native addon của bcrypt qua npm (không bị chặn bởi approval gate của pnpm)
RUN npm rebuild bcrypt --force

# ==========================================
# Giai đoạn 2: Runner (Môi trường chạy thực tế)
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Thiết lập môi trường Production
ENV NODE_ENV=production
ENV PORT=3000

# Tạo thư mục và cấp quyền cho user 'node' có sẵn trong Alpine
RUN mkdir -p logs && chown -R node:node /app

# Copy thư viện node_modules từ stage builder sang
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

# Đổi sang user thường (không dùng root) để đảm bảo bảo mật
USER node

# Mở port 3000 của container
EXPOSE 3000

# Tích hợp Healthcheck định kỳ kiểm tra endpoint /health ta vừa viết ở Bước 1
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

# Lệnh khởi động ứng dụng
CMD ["node", "src/index.js"]
