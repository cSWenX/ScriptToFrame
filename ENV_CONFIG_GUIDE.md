# 环境变量配置指南

## 📋 配置文件说明

项目使用 `.env` 文件统一管理所有 IP、端口和 API 密钥配置。

---

## 🔧 本地开发环境配置

### 文件位置
```
项目根目录/.env
```

### 完整配置示例

```bash
# ==================== API 密钥配置 ====================

# 火山引擎即梦API（图片生成）
VOLCENGINE_ACCESS_KEY_ID=AKLT...your_key_here
VOLCENGINE_SECRET_ACCESS_KEY=your_secret_here

# DeepSeek API（AI分析）
DEEPSEEK_API_KEY=sk-...your_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# Claude API（可选，替代 DeepSeek）
# ANTHROPIC_API_KEY=sk-ant-...your_key_here
# ANTHROPIC_BASE_URL=https://api.anthropic.com

# ==================== 服务地址配置 ====================

# Python 后端地址
PYTHON_BACKEND_URL=http://localhost:8081

# 前端访问地址（用于获取本地图片）
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ==================== 应用配置 ====================

NEXT_PUBLIC_APP_NAME=ScriptToFrame
NEXT_PUBLIC_VERSION=1.0.0
```

---

## 🐳 Docker 部署配置

### 单机 Docker 部署

```bash
# .env 文件配置
PYTHON_BACKEND_URL=http://localhost:8081
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Docker Compose 部署

```bash
# .env 文件配置
PYTHON_BACKEND_URL=http://scripttoframe-app:8081
NEXT_PUBLIC_SITE_URL=http://scripttoframe-app:3000
```

---

## 🌐 生产环境配置

### 域名部署

如果使用域名（例如：`https://story.example.com`）：

```bash
# .env 文件配置
PYTHON_BACKEND_URL=https://story.example.com/api
NEXT_PUBLIC_SITE_URL=https://story.example.com
```

### Nginx 反向代理

如果使用 Nginx：

```nginx
# Nginx 配置
server {
    listen 443 ssl;
    server_name story.example.com;

    # 前端
    location / {
        proxy_pass http://localhost:3000;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://localhost:8081/api/;
    }
}
```

```bash
# .env 文件配置
PYTHON_BACKEND_URL=http://localhost:8081
NEXT_PUBLIC_SITE_URL=https://story.example.com
```

---

## 📦 环境变量说明

### 前端变量（以 NEXT_PUBLIC_ 开头）

这些变量会在浏览器中可用：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NEXT_PUBLIC_SITE_URL` | 前端访问地址 | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | 应用名称 | `ScriptToFrame` |
| `NEXT_PUBLIC_VERSION` | 应用版本 | `1.0.0` |

### 后端变量（仅服务端可用）

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `PYTHON_BACKEND_URL` | Python后端地址 | `http://localhost:8081` |
| `DEEPSEEK_BASE_URL` | DeepSeek API | `https://api.deepseek.com/v1` |
| `ANTHROPIC_BASE_URL` | Claude API | `https://api.anthropic.com` |

### API 密钥（敏感信息）

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `VOLCENGINE_ACCESS_KEY_ID` | 火山引擎 Key | ✅ |
| `VOLCENGINE_SECRET_ACCESS_KEY` | 火山引擎 Secret | ✅ |
| `DEEPSEEK_API_KEY` | DeepSeek 密钥 | ✅ |
| `ANTHROPIC_API_KEY` | Claude 密钥 | ❌ (可选) |

---

## 🚀 部署场景示例

### 场景 1: 本地开发

```bash
# .env
PYTHON_BACKEND_URL=http://localhost:8081
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

启动：
```bash
npm run dev
```

### 场景 2: Docker 本地部署

```bash
# .env
PYTHON_BACKEND_URL=http://localhost:8081
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

启动：
```bash
docker-compose up
```

### 场景 3: CentOS 7 服务器部署

```bash
# .env
PYTHON_BACKEND_URL=http://your-server-ip:8081
NEXT_PUBLIC_SITE_URL=http://your-server-ip:3000
```

启动：
```bash
./deploy-centos7.sh
```

### 场景 4: 生产环境域名部署

```bash
# .env
PYTHON_BACKEND_URL=https://your-domain.com/api
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

启动：
```bash
npm run build
npm start
```

---

## ⚠️ 重要提示

1. **环境变量修改后需要重启服务**
   ```bash
   # 前端
   pkill -f "npm.*dev"
   npm run dev
   
   # 后端
   kill $(cat logs/backend.pid)
   python3 python-backend/main.py &
   ```

2. **不要提交 .env 文件到 Git**
   ```bash
   # .gitignore 已包含
   .env
   ```

3. **生产环境使用真实域名和 HTTPS**
   ```bash
   NEXT_PUBLIC_SITE_URL=https://your-domain.com
   ```

---

## 🔍 故障排查

### 问题 1: 图片推送远程失败

**检查**:
```bash
# 查看当前配置
cat .env | grep SITE_URL

# 应该看到
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**解决**: 确保 `NEXT_PUBLIC_SITE_URL` 与前端运行地址一致。

### 问题 2: API 调用失败

**检查**:
```bash
# 查看后端配置
cat .env | grep PYTHON_BACKEND_URL

# 应该看到
PYTHON_BACKEND_URL=http://localhost:8081
```

**解决**: 确保后端地址正确。

### 问题 3: 环境变量未生效

**检查**:
```bash
# 清除缓存重启
rm -rf .next
npm run dev
```

---

## 📞 获取帮助

如有问题，检查：
1. `.env` 文件是否存在
2. 环境变量格式是否正确
3. 服务是否已重启
4. 日志文件：`logs/frontend.log` 和 `logs/backend.log`
