# CentOS 7 Docker 部署配置总结

## 📦 已为您准备的配置文件

### 核心配置文件
```
✅ docker-compose.legacy.yml   - CentOS 7 兼容的 Docker Compose 配置
✅ Dockerfile.legacy            - CentOS 7 兼容的 Dockerfile
✅ docker-entrypoint.sh         - 容器启动脚本（自动启动前后端）
✅ .env.production              - 环境变量模板
```

### 部署脚本
```
✅ deploy-centos7.sh            - 一键部署脚本（推荐）
✅ check-config.sh              - 配置检查脚本
✅ debug_docker_network.sh      - 网络诊断脚本
```

### 文档
```
✅ CENTOS7_DEPLOY_CHECKLIST.md  - 完整部署检查清单
✅ QUICK_START_CENTOS7.md       - 快速启动指南
✅ DEPLOYMENT_SUMMARY.md        - 本文件
```

---

## 🚀 快速部署步骤

### 1️⃣ 上传项目到服务器

```bash
# 方式1: scp 上传
scp -r ScriptToFrame/ root@your-server-ip:/opt/

# 方式2: git 克隆
git clone https://github.com/cSWenX/ScriptToFrame.git /opt/ScriptToFrame
```

### 2️⃣ 配置环境变量

```bash
cd /opt/ScriptToFrame

# 编辑 .env 文件
vi .env
```

**必需配置项：**
```env
VOLCENGINE_ACCESS_KEY_ID=你的火山引擎AccessKey
VOLCENGINE_SECRET_ACCESS_KEY=你的火山引擎SecretKey
DEEPSEEK_API_KEY=你的DeepSeek密钥
```

### 3️⃣ 检查配置（可选）

```bash
chmod +x check-config.sh
./check-config.sh
```

### 4️⃣ 启动服务

```bash
# 方式1: 一键部署（推荐）
chmod +x deploy-centos7.sh
./deploy-centos7.sh

# 方式2: 手动启动
docker-compose -f docker-compose.legacy.yml up -d --build
```

### 5️⃣ 验证部署

```bash
# 检查服务状态
docker-compose -f docker-compose.legacy.yml ps

# 查看日志
docker-compose -f docker-compose.legacy.yml logs -f

# 测试访问
curl http://localhost:3000
curl http://localhost:8081/api/health
```

---

## 🎯 部署架构

```
┌─────────────────────────────────────────┐
│         Docker Container                │
│  ┌──────────────────────────────────┐   │
│  │   Next.js Frontend (Port 3000)   │   │
│  │   - npm start                    │   │
│  └────────────┬─────────────────────┘   │
│               │                          │
│               ▼                          │
│  ┌──────────────────────────────────┐   │
│  │  Python Backend (Port 8081)      │   │
│  │  - FastAPI + Uvicorn             │   │
│  │  - Volcengine SDK                │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         CentOS 7 Host                   │
│  Port 3000 → Frontend                   │
│  Port 8081 → Backend API                │
└─────────────────────────────────────────┘
```

---

## 📊 服务说明

### 前端服务 (Port 3000)
- **框架**: Next.js
- **启动命令**: `npm start`
- **环境**: production
- **访问**: http://server-ip:3000

### 后端服务 (Port 8081)
- **框架**: FastAPI
- **启动命令**: `uvicorn main:app`
- **功能**: 
  - 图片生成（火山引擎即梦 API）
  - AI 分析（DeepSeek/Claude API）
  - 音频合成
- **API 文档**: http://server-ip:8081/docs

---

## 🔧 管理命令速查

```bash
# 启动服务
docker-compose -f docker-compose.legacy.yml up -d

# 停止服务
docker-compose -f docker-compose.legacy.yml down

# 重启服务
docker-compose -f docker-compose.legacy.yml restart

# 查看日志
docker-compose -f docker-compose.legacy.yml logs -f

# 查看容器状态
docker-compose -f docker-compose.legacy.yml ps

# 进入容器
docker exec -it scripttoframe-app bash

# 更新并重启
git pull origin main
docker-compose -f docker-compose.legacy.yml up -d --build
```

---

## 📁 目录结构

```
/opt/ScriptToFrame/
├── docker-compose.legacy.yml    # Docker Compose 配置
├── Dockerfile.legacy            # Docker 镜像构建文件
├── docker-entrypoint.sh         # 容器启动脚本
├── .env                         # 环境变量配置（需要创建）
├── .env.production              # 环境变量模板
├── deploy-centos7.sh            # 一键部署脚本
├── check-config.sh              # 配置检查脚本
├── python-backend/              # Python 后端
│   ├── main.py                  # FastAPI 主应用
│   ├── requirements.txt         # Python 依赖
│   └── image_storage.py         # 图片存储服务
├── components/                  # Next.js 组件
├── pages/                       # Next.js 页面
├── public/                      # 静态资源
└── logs/                        # 日志目录（自动创建）
```

---

## 🔍 故障排查流程

### 服务无法启动
```bash
1. 检查配置: ./check-config.sh
2. 查看日志: docker-compose -f docker-compose.legacy.yml logs --tail=100
3. 检查端口: netstat -tlnp | grep -E ':(3000|8081)'
4. 网络诊断: ./debug_docker_network.sh
```

### API 调用失败
```bash
1. 检查环境变量: docker exec scripttoframe-app env | grep -E '(VOLCENGINE|DEEPSEEK)'
2. 检查后端日志: docker exec scripttoframe-app tail -f /app/logs/backend.log
3. 测试后端健康: curl http://localhost:8081/api/health
4. 查看 API 文档: http://server-ip:8081/docs
```

### 图片生成失败
```bash
1. 检查火山引擎密钥配置
2. 查看后端日志中的错误信息
3. 确认存储目录权限: ls -la /data/tobyai/generated
```

---

## 🔒 安全建议

### 1. 修改默认端口
```yaml
# docker-compose.legacy.yml
ports:
  - "3001:3000"   # 修改前端端口
  - "8082:8081"   # 修改后端端口
```

### 2. 配置防火墙
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8081/tcp
sudo firewall-cmd --reload
```

### 3. 使用 Nginx 反向代理 + HTTPS
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
    }
    
    location /api/ {
        proxy_pass http://localhost:8081;
    }
}
```

---

## 📞 获取帮助

### 检查环境信息
```bash
cat /etc/redhat-release        # CentOS 版本
docker --version               # Docker 版本
docker-compose --version       # Docker Compose 版本
docker ps -a                   # 容器状态
```

### 常用诊断命令
```bash
./check-config.sh              # 配置检查
./debug_docker_network.sh      # 网络诊断
docker logs scripttoframe-app  # 查看容器日志
docker stats scripttoframe-app # 资源使用
```

---

## 📝 重要提示

1. **首次部署**需要构建镜像，大约需要 5-10 分钟
2. **确保 API 密钥**正确配置在 `.env` 文件中
3. **日志文件**会保存在 `./logs` 目录
4. **生成的图片**默认保存在 `/data/tobyai/generated`
5. 建议定期**备份**重要数据

---

## ✅ 部署清单

部署前请确认：

- [ ] CentOS 7 系统
- [ ] Docker 已安装
- [ ] Docker Compose 已安装
- [ ] 端口 3000 和 8081 未被占用
- [ ] 防火墙已开放端口 3000 和 8081
- [ ] 已配置 .env 文件
- [ ] 已配置火山引擎 API 密钥
- [ ] 已配置 DeepSeek/Claude API 密钥
- [ ] 至少 2GB 可用内存
- [ ] 至少 10GB 可用磁盘空间

全部确认后，运行：
```bash
./deploy-centos7.sh
```

祝部署顺利！🎉
