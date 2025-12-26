# ScriptToFrame Docker 多服务容器
# 包含Next.js前端和Python后端

FROM node:18-alpine AS base

# 安装Python和必要工具
RUN apk add --no-cache \
    python3 \
    py3-pip \
    curl \
    bash \
    && ln -sf python3 /usr/bin/python

WORKDIR /app

# ================================
# 前端依赖安装
# ================================
FROM base AS deps

# 复制package文件
COPY package*.json ./
RUN npm ci --only=production

# ================================
# 前端构建
# ================================
FROM base AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# 构建Next.js应用
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ================================
# Python后端依赖
# ================================
FROM base AS python-deps

WORKDIR /app/python-backend

# 复制Python依赖
COPY python-backend/requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# ================================
# 生产镜像
# ================================
FROM base AS runner

WORKDIR /app

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 复制Python后端
COPY --from=python-deps --chown=nextjs:nodejs /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-deps --chown=nextjs:nodejs /usr/local/bin /usr/local/bin
COPY --chown=nextjs:nodejs python-backend/ ./python-backend/

# 复制启动脚本
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# 创建必要目录
RUN mkdir -p logs && chown -R nextjs:nodejs logs

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000 8081

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# 启动命令
CMD ["./docker-entrypoint.sh"]