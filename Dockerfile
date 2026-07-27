# ==========================================
# Stage 1: Cài đặt toàn bộ dependencies (deps)
# ==========================================
FROM node:20-alpine AS deps
WORKDIR /app

# Chỉ copy package.json và package-lock.json để tận dụng Docker cache
COPY package*.json ./

# Cài đặt sạch sẽ toàn bộ dependencies (bao gồm cả devDependencies để build code)
RUN npm ci

# ==========================================
# Stage 2: Biên dịch source code (builder)
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy thư mục node_modules đã cài đặt từ Stage 1 sang
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Biên dịch Nest.js sang mã Javascript (sẽ được lưu ở thư mục /dist)
RUN npm run build

# Loại bỏ các thư viện phát triển (devDependencies) chỉ giữ lại libraries chạy production
RUN npm prune --production

# ==========================================
# Stage 3: Môi trường chạy production (runner)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Chỉ copy các phần thực sự cần thiết để chạy ứng dụng từ builder sang
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Port mặc định của Back-end (dựa vào cấu hình hiện tại là 3001)
EXPOSE 3001

CMD ["npm", "run", "start:prod"]
