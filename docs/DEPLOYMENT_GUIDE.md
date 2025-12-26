# ScriptToFrame 部署运维文档

## 概述

ScriptToFrame采用前后端分离的双服务架构，本文档详细说明了本地开发、Docker容器化部署、生产环境部署和运维监控的完整方案。

## 系统要求

### 最低硬件要求

```
CPU: 2核心 2.0GHz+
内存: 4GB RAM
存储: 10GB 可用空间
网络: 100Mbps 带宽
```

### 推荐硬件配置

```
CPU: 4核心 3.0GHz+
内存: 8GB RAM+
存储: 50GB SSD
网络: 1Gbps 带宽
```

### 软件依赖

**基础环境**:
```
Node.js: 18.0.0+
Python: 3.11.0+
npm: 9.0.0+
pip: 23.0.0+
```

**可选工具**:
```
Docker: 24.0.0+
Docker Compose: 2.0.0+
Git: 2.40.0+
PM2: 5.0.0+ (生产环境)
Nginx: 1.24.0+ (反向代理)
```

## 部署架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      部署架构                                     │
└─────────────────────────────────────────────────────────────────┘

生产环境:
┌─────────────────┐
│     Nginx       │ ← 反向代理 + 负载均衡 (80/443端口)
│   (前端代理)     │
└─────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐
│Next.js  │ │Python   │
│ :3000   │ │FastAPI  │ ← PM2管理进程
│         │ │ :8081   │
└─────────┘ └─────────┘
    │         │
    ▼         ▼
┌─────────────────┐
│   外部API服务    │
│ - Claude API   │
│ - DeepSeek API │
│ - 火山引擎API   │
└─────────────────┘

开发环境:
localhost:3000 ← Next.js 开发服务器
localhost:8081 ← Python FastAPI 开发服务器
```

## 本地开发部署

### 1. 环境准备

**克隆项目**:
```bash
git clone <repository-url>
cd script-to-frame
```

**环境变量配置**:
```bash
# 复制环境变量模板
cp .env .env.local

# 编辑环境变量
nano .env.local
```

**必需的环境变量**:
```bash
# 火山引擎API配置
VOLCENGINE_ACCESS_KEY_ID=your_volcengine_access_key
VOLCENGINE_SECRET_ACCESS_KEY=your_volcengine_secret_key

# DeepSeek API配置
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# Claude API配置 (可选)
ANTHROPIC_API_KEY=your_claude_api_key
ANTHROPIC_BASE_URL=your_proxy_url

# Python后端地址
PYTHON_BACKEND_URL=http://localhost:8081

# 应用配置
NEXT_PUBLIC_APP_NAME=ScriptToFrame
NEXT_PUBLIC_VERSION=1.0.0
```

### 2. 前端服务部署

**安装依赖**:
```bash
# 安装Node.js依赖
npm install

# 检查依赖完整性
npm audit
```

**启动开发服务器**:
```bash
# 开发模式启动
npm run dev

# 或者使用构建模式
npm run build
npm run start
```

**前端服务验证**:
```bash
# 检查服务状态
curl http://localhost:3000

# 检查健康状态
curl http://localhost:3000/api/health
```

### 3. Python后端部署

**创建虚拟环境**:
```bash
cd python-backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate     # Windows
```

**安装Python依赖**:
```bash
# 安装依赖
pip install -r requirements.txt

# 验证火山引擎SDK
python -c "from volcengine.visual.VisualService import VisualService; print('SDK imported successfully')"
```

**启动Python服务**:
```bash
# 开发模式启动
uvicorn main:app --host 0.0.0.0 --port 8081 --reload

# 生产模式启动
uvicorn main:app --host 0.0.0.0 --port 8081 --workers 4
```

**后端服务验证**:
```bash
# 检查服务状态
curl http://localhost:8081

# 检查健康状态
curl http://localhost:8081/api/health

# 测试图片生成接口
curl -X POST http://localhost:8081/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test prompt"}'
```

### 4. 一键启动脚本

**Linux/macOS启动脚本 (start.sh)**:
```bash
#!/bin/bash

# ScriptToFrame 一键启动脚本

echo "🚀 启动 ScriptToFrame 服务..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

# 检查Python
if ! command -v python &> /dev/null; then
    echo "❌ Python 未安装，请先安装 Python 3.11+"
    exit 1
fi

# 检查环境变量
if [ ! -f .env.local ]; then
    echo "❌ .env.local 文件不存在，请先配置环境变量"
    echo "参考 .env 文件创建 .env.local"
    exit 1
fi

# 创建日志目录
mkdir -p logs

# 启动Python后端
echo "📦 启动Python后端服务 (端口8081)..."
cd python-backend

# 检查并创建虚拟环境
if [ ! -d "venv" ]; then
    echo "🔧 创建Python虚拟环境..."
    python -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "📥 安装Python依赖..."
pip install -q -r requirements.txt

# 启动后端服务
nohup uvicorn main:app --host 0.0.0.0 --port 8081 --reload > ../logs/backend.log 2>&1 &
PYTHON_PID=$!
echo $PYTHON_PID > ../logs/backend.pid

echo "✅ Python后端已启动 (PID: $PYTHON_PID)"

# 返回项目根目录
cd ..

# 安装前端依赖
echo "📥 安装前端依赖..."
npm install

# 启动前端服务
echo "🌐 启动前端服务 (端口3000)..."
nohup npm run dev > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > logs/frontend.pid

echo "✅ 前端服务已启动 (PID: $FRONTEND_PID)"

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."

# 检查后端
if curl -f http://localhost:8081/api/health > /dev/null 2>&1; then
    echo "✅ Python后端服务正常"
else
    echo "❌ Python后端服务启动失败"
    cat logs/backend.log
fi

# 检查前端
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 前端服务正常"
else
    echo "❌ 前端服务启动失败"
    cat logs/frontend.log
fi

echo ""
echo "🎉 ScriptToFrame 启动完成!"
echo "📱 前端地址: http://localhost:3000"
echo "🔧 后端地址: http://localhost:8081"
echo "📋 查看日志: ./logs.sh"
echo "🛑 停止服务: ./stop.sh"
```

**Windows启动脚本 (start.bat)**:
```batch
@echo off
echo 🚀 启动 ScriptToFrame 服务...

REM 检查Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装 Node.js 18+
    pause
    exit /b 1
)

REM 检查Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python 未安装，请先安装 Python 3.11+
    pause
    exit /b 1
)

REM 检查环境变量文件
if not exist .env.local (
    echo ❌ .env.local 文件不存在，请先配置环境变量
    echo 参考 .env 文件创建 .env.local
    pause
    exit /b 1
)

REM 创建日志目录
if not exist logs mkdir logs

REM 启动Python后端
echo 📦 启动Python后端服务 (端口8081)...
cd python-backend

REM 创建虚拟环境
if not exist venv (
    echo 🔧 创建Python虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境并启动服务
call venv\Scripts\activate
echo 📥 安装Python依赖...
pip install -q -r requirements.txt

echo 🔧 启动Python后端...
start /b uvicorn main:app --host 0.0.0.0 --port 8081 --reload

cd ..

REM 安装前端依赖
echo 📥 安装前端依赖...
npm install

REM 启动前端服务
echo 🌐 启动前端服务 (端口3000)...
start /b npm run dev

echo ⏳ 等待服务启动...
timeout /t 10 /nobreak >nul

echo 🎉 ScriptToFrame 启动完成!
echo 📱 前端地址: http://localhost:3000
echo 🔧 后端地址: http://localhost:8081
echo 🛑 停止服务: stop.bat
pause
```

**停止服务脚本 (stop.sh)**:
```bash
#!/bin/bash

echo "🛑 停止 ScriptToFrame 服务..."

# 停止前端服务
if [ -f logs/frontend.pid ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "🌐 停止前端服务 (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID
        rm logs/frontend.pid
    fi
fi

# 停止Python后端服务
if [ -f logs/backend.pid ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "📦 停止Python后端服务 (PID: $BACKEND_PID)"
        kill $BACKEND_PID
        rm logs/backend.pid
    fi
fi

# 强制停止残留进程
pkill -f "uvicorn main:app"
pkill -f "next dev"

echo "✅ 所有服务已停止"
```

## Docker部署

### 1. Docker镜像构建

**前端Dockerfile**:
```dockerfile
# 多阶段构建
FROM node:18-alpine AS base

# 安装依赖阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建应用
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 创建用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建结果
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

**Python后端Dockerfile**:
```dockerfile
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建非root用户
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

# 健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8081/api/health || exit 1

# 暴露端口
EXPOSE 8081

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8081"]
```

### 2. Docker Compose配置

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  # 前端服务
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    container_name: scripttoframe-frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PYTHON_BACKEND_URL=http://python-backend:8081
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - DEEPSEEK_BASE_URL=${DEEPSEEK_BASE_URL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - ANTHROPIC_BASE_URL=${ANTHROPIC_BASE_URL}
    depends_on:
      python-backend:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

  # Python后端服务
  python-backend:
    build:
      context: ./python-backend
      dockerfile: Dockerfile
    container_name: scripttoframe-backend
    ports:
      - "8081:8081"
    environment:
      - VOLCENGINE_ACCESS_KEY_ID=${VOLCENGINE_ACCESS_KEY_ID}
      - VOLCENGINE_SECRET_ACCESS_KEY=${VOLCENGINE_SECRET_ACCESS_KEY}
      - PORT=8081
      - DEBUG=false
    volumes:
      - ./logs:/app/logs
      - backend-data:/app/data
    restart: unless-stopped
    networks:
      - app-network

  # Nginx反向代理 (生产环境)
  nginx:
    image: nginx:alpine
    container_name: scripttoframe-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - frontend
    restart: unless-stopped
    networks:
      - app-network

volumes:
  backend-data:
    driver: local

networks:
  app-network:
    driver: bridge
```

**生产环境配置 (docker-compose.prod.yml)**:
```yaml
version: '3.8'

services:
  frontend:
    environment:
      - NODE_ENV=production
      - NEXT_TELEMETRY_DISABLED=1
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  python-backend:
    command: uvicorn main:app --host 0.0.0.0 --port 8081 --workers 4
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G

  # Redis缓存 (可选)
  redis:
    image: redis:7-alpine
    container_name: scripttoframe-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - app-network

volumes:
  redis-data:
    driver: local
```

### 3. Docker部署命令

**开发环境部署**:
```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重新构建特定服务
docker-compose build frontend
docker-compose up -d frontend
```

**生产环境部署**:
```bash
# 使用生产配置
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 扩展服务实例
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale frontend=3 --scale python-backend=2

# 滚动更新
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps frontend
```

**Docker健康检查**:
```bash
# 检查服务状态
docker-compose ps

# 检查容器健康状态
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 查看资源使用情况
docker stats

# 进入容器调试
docker exec -it scripttoframe-backend bash
```

## 生产环境部署

### 1. Nginx反向代理配置

**nginx.conf**:
```nginx
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for" '
                   'rt=$request_time uct="$upstream_connect_time" '
                   'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # 基础设置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 上游服务器定义
    upstream frontend {
        least_conn;
        server frontend:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    upstream backend {
        least_conn;
        server python-backend:8081 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # HTTPS重定向
    server {
        listen 80;
        server_name scripttoframe.com www.scripttoframe.com;
        return 301 https://$server_name$request_uri;
    }

    # 主站点配置
    server {
        listen 443 ssl http2;
        server_name scripttoframe.com www.scripttoframe.com;

        # SSL配置
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;

        # SSL安全配置
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # 安全头
        add_header Strict-Transport-Security "max-age=63072000" always;
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # 前端代理
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # 超时设置
            proxy_connect_timeout 30s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # API代理
        location /api/ {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # API超时设置 (更长)
            proxy_connect_timeout 30s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            proxy_pass http://frontend;
            expires 1M;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # 健康检查
        location /nginx-health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### 2. PM2进程管理

**PM2配置文件 (ecosystem.config.js)**:
```javascript
module.exports = {
  apps: [
    {
      name: 'scripttoframe-frontend',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        PYTHON_BACKEND_URL: 'http://localhost:8081'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    },
    {
      name: 'scripttoframe-backend',
      script: 'python-backend/venv/bin/uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8081 --workers 4',
      cwd: './python-backend',
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'none',
      env: {
        VOLCENGINE_ACCESS_KEY_ID: process.env.VOLCENGINE_ACCESS_KEY_ID,
        VOLCENGINE_SECRET_ACCESS_KEY: process.env.VOLCENGINE_SECRET_ACCESS_KEY
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      max_memory_restart: '2G'
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: ['server1.scripttoframe.com', 'server2.scripttoframe.com'],
      ref: 'origin/main',
      repo: 'https://github.com/scripttoframe/scripttoframe.git',
      path: '/var/www/scripttoframe',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
```

**PM2部署命令**:
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 监控
pm2 monit

# 重启应用
pm2 restart all

# 优雅关闭
pm2 gracefulReload all

# 设置开机自启
pm2 startup
pm2 save

# 部署到生产服务器
pm2 deploy production setup
pm2 deploy production
```

### 3. SSL证书配置

**Let's Encrypt证书配置**:
```bash
# 安装Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d scripttoframe.com -d www.scripttoframe.com

# 自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

**手动证书配置**:
```bash
# 创建SSL目录
mkdir -p nginx/ssl

# 复制证书文件
cp /path/to/cert.pem nginx/ssl/
cp /path/to/key.pem nginx/ssl/

# 设置权限
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```

### 4. 系统服务配置

**Systemd服务配置 (scripttoframe.service)**:
```ini
[Unit]
Description=ScriptToFrame Application
After=network.target

[Service]
Type=forking
User=deploy
WorkingDirectory=/var/www/scripttoframe
Environment=NODE_ENV=production
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload ecosystem.config.js --env production
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**启用系统服务**:
```bash
# 复制服务文件
sudo cp scripttoframe.service /etc/systemd/system/

# 重载systemd
sudo systemctl daemon-reload

# 启用服务
sudo systemctl enable scripttoframe

# 启动服务
sudo systemctl start scripttoframe

# 查看状态
sudo systemctl status scripttoframe
```

## 监控和日志

### 1. 日志管理

**日志轮转配置 (logrotate)**:
```bash
# 创建logrotate配置
sudo nano /etc/logrotate.d/scripttoframe
```

```
/var/www/scripttoframe/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 deploy deploy
    postrotate
        pm2 reopen
    endscript
}
```

**结构化日志配置**:
```javascript
// lib/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'scripttoframe' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### 2. 性能监控

**系统监控脚本**:
```bash
#!/bin/bash
# scripts/monitor.sh

LOG_FILE="/var/log/scripttoframe-monitor.log"
ALERT_EMAIL="admin@scripttoframe.com"

# 检查服务状态
check_service() {
    local service_name=$1
    local port=$2

    if ! curl -f http://localhost:$port/api/health >/dev/null 2>&1; then
        echo "[$(date)] ERROR: $service_name service is down" >> $LOG_FILE

        # 重启服务
        systemctl restart scripttoframe

        # 发送警报邮件
        echo "Service $service_name is down and has been restarted" | \
            mail -s "ScriptToFrame Service Alert" $ALERT_EMAIL
    else
        echo "[$(date)] INFO: $service_name service is healthy" >> $LOG_FILE
    fi
}

# 检查磁盘空间
check_disk_space() {
    local threshold=80
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ $usage -gt $threshold ]; then
        echo "[$(date)] WARNING: Disk usage is ${usage}%" >> $LOG_FILE
        echo "Disk usage is ${usage}% on ScriptToFrame server" | \
            mail -s "Disk Space Warning" $ALERT_EMAIL
    fi
}

# 检查内存使用
check_memory() {
    local threshold=80
    local usage=$(free | awk '/Mem/ {printf("%.0f", $3/$2 * 100.0)}')

    if [ $usage -gt $threshold ]; then
        echo "[$(date)] WARNING: Memory usage is ${usage}%" >> $LOG_FILE
    fi
}

# 执行检查
check_service "Frontend" 3000
check_service "Backend" 8081
check_disk_space
check_memory

# 清理旧日志
find /var/www/scripttoframe/logs -name "*.log" -mtime +7 -delete
```

**添加到crontab**:
```bash
# 每5分钟检查一次
*/5 * * * * /var/www/scripttoframe/scripts/monitor.sh
```

### 3. 应用性能监控 (APM)

**性能监控中间件**:
```javascript
// middleware/performance.js
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();

    const metrics = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: duration,
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed
      },
      userAgent: req.get('User-Agent')
    };

    // 慢查询警报
    if (duration > 10000) { // 10秒
      console.warn('Slow request detected:', metrics);
    }

    // 发送到监控系统 (可选)
    // sendToMonitoringSystem(metrics);
  });

  next();
};

module.exports = performanceMonitor;
```

## 备份和恢复

### 1. 数据备份策略

**自动备份脚本**:
```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/var/backups/scripttoframe"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/scripttoframe"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份应用代码
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=python-backend/venv \
    --exclude=logs \
    $APP_DIR

# 备份配置文件
cp $APP_DIR/.env.local $BACKUP_DIR/env_$DATE.backup

# 备份日志 (最近7天)
find $APP_DIR/logs -name "*.log" -mtime -7 | \
    tar -czf $BACKUP_DIR/logs_$DATE.tar.gz -T -

# 清理旧备份 (保留30天)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.backup" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/*_$DATE.*"
```

**定期备份计划**:
```bash
# 每日凌晨2点备份
0 2 * * * /var/www/scripttoframe/scripts/backup.sh
```

### 2. 灾难恢复

**恢复脚本**:
```bash
#!/bin/bash
# scripts/restore.sh

BACKUP_DIR="/var/backups/scripttoframe"
APP_DIR="/var/www/scripttoframe"
BACKUP_DATE=$1

if [ -z "$BACKUP_DATE" ]; then
    echo "Usage: $0 <backup_date>"
    echo "Available backups:"
    ls -la $BACKUP_DIR/app_*.tar.gz
    exit 1
fi

echo "Restoring from backup: $BACKUP_DATE"

# 停止服务
systemctl stop scripttoframe

# 备份当前状态
mv $APP_DIR $APP_DIR.backup.$(date +%Y%m%d_%H%M%S)

# 恢复应用代码
mkdir -p $APP_DIR
tar -xzf $BACKUP_DIR/app_$BACKUP_DATE.tar.gz -C /

# 恢复环境变量
if [ -f $BACKUP_DIR/env_$BACKUP_DATE.backup ]; then
    cp $BACKUP_DIR/env_$BACKUP_DATE.backup $APP_DIR/.env.local
fi

# 重新安装依赖
cd $APP_DIR
npm install
cd python-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 启动服务
systemctl start scripttoframe

echo "Restore completed"
```

## 故障排除

### 1. 常见问题诊断

**服务启动失败**:
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :8081

# 检查进程
ps aux | grep node
ps aux | grep python

# 检查日志
tail -f logs/frontend.log
tail -f logs/backend.log

# 检查权限
ls -la .env.local
ls -la python-backend/venv
```

**API调用失败**:
```bash
# 测试内部连接
curl -v http://localhost:3000/api/health
curl -v http://localhost:8081/api/health

# 检查环境变量
env | grep -E "(VOLCENGINE|DEEPSEEK|ANTHROPIC)"

# 检查DNS解析
nslookup api.deepseek.com
nslookup visual.volcengineapi.com
```

**内存泄漏诊断**:
```bash
# 监控内存使用
watch -n 5 'ps aux --sort=-%mem | head -20'

# Node.js内存分析
node --expose-gc --inspect server.js

# Python内存分析
pip install memory-profiler
python -m memory_profiler main.py
```

### 2. 性能调优

**Node.js调优**:
```bash
# 增加内存限制
node --max-old-space-size=4096 server.js

# 启用集群模式
PM2_INSTANCES=4 pm2 start ecosystem.config.js
```

**Python调优**:
```bash
# 调整worker数量
uvicorn main:app --workers 8 --worker-class uvicorn.workers.UvicornWorker

# 优化内存
export PYTHONMALLOC=malloc
export MALLOC_ARENA_MAX=2
```

---

**文档版本**: v1.0.0
**最后更新**: 2025-12-24
**维护者**: ScriptToFrame Team