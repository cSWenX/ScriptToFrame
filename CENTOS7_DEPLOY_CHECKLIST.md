# CentOS 7 Docker 部署配置清单

## 📋 部署前检查清单

### 1. 服务器环境要求
- [ ] CentOS 7.x 操作系统
- [ ] 至少 2GB 内存
- [ ] 至少 10GB 磁盘空间
- [ ] Docker 已安装
- [ ] Docker Compose 已安装

### 2. 网络端口要求
- [ ] 3000 端口开放（前端）
- [ ] 8081 端口开放（后端 API）

---

## 🔧 配置步骤

### 步骤 1: 上传项目到服务器

```bash
# 方式1: 使用 scp 上传
scp -r ScriptToFrame/ root@your-server-ip:/opt/

# 方式2: 使用 git 克隆
git clone https://github.com/cSWenX/ScriptToFrame.git /opt/ScriptToFrame
cd /opt/ScriptToFrame
```

### 步骤 2: 配置环境变量

```bash
# 复制环境变量模板
cp .env.production .env

# 编辑环境变量文件
vi .env
```

**必须配置的环境变量：**

```env
# 火山引擎即梦API（必需）
VOLCENGINE_ACCESS_KEY_ID=你的火山引擎AccessKey_ID
VOLCENGINE_SECRET_ACCESS_KEY=你的火山引擎Secret_Key

# AI API密钥（必需 - DeepSeek 或 Claude）
DEEPSEEK_API_KEY=你的DeepSeek_API密钥
# 或者使用 Claude
# ANTHROPIC_API_KEY=你的Claude_API密钥

# 可选配置
ANTHROPIC_BASE_URL=https://api.anthropic.com
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
NODE_ENV=production
```

### 步骤 3: 创建必要的目录

```bash
# 创建日志目录
mkdir -p logs

# 创建生成图片存储目录（如果使用本地存储）
mkdir -p /data/tobyai/generated
chmod -R 755 /data/tobyai/generated
```

### 步骤 4: 检查 Docker 配置文件

确保以下文件存在：
- `docker-compose.legacy.yml` ✓
- `Dockerfile.legacy` ✓
- `docker-entrypoint.sh` ✓

### 步骤 5: 启动服务

```bash
# 使用兼容版 docker-compose 启动
docker-compose -f docker-compose.legacy.yml up -d --build

# 查看启动日志
docker-compose -f docker-compose.legacy.yml logs -f

# 查看容器状态
docker-compose -f docker-compose.legacy.yml ps
```

### 步骤 6: 验证部署

```bash
# 检查前端
curl http://localhost:3000

# 检查后端健康状态
curl http://localhost:8081/api/health

# 检查后端 API 文档
curl http://localhost:8081/docs
```

---

## 📊 服务管理命令

### 查看日志
```bash
# 实时查看所有日志
docker-compose -f docker-compose.legacy.yml logs -f

# 查看前端日志
docker-compose -f docker-compose.legacy.yml logs scripttoframe | grep frontend

# 查看后端日志
docker-compose -f docker-compose.legacy.yml logs scripttoframe | grep backend

# 或查看容器内日志文件
docker exec scripttoframe-app tail -f /app/logs/backend.log
docker exec scripttoframe-app tail -f /app/logs/frontend.log
```

### 重启服务
```bash
# 重启所有服务
docker-compose -f docker-compose.legacy.yml restart

# 重启单个服务
docker restart scripttoframe-app
```

### 停止服务
```bash
# 停止所有服务
docker-compose -f docker-compose.legacy.yml down

# 停止并删除数据卷
docker-compose -f docker-compose.legacy.yml down -v
```

### 更新代码后重新部署
```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose -f docker-compose.legacy.yml up -d --build
```

---

## 🔍 故障排查

### 1. 容器启动失败

```bash
# 查看详细错误日志
docker-compose -f docker-compose.legacy.yml logs --tail=100

# 检查容器状态
docker ps -a
```

### 2. 端口被占用

```bash
# 检查端口占用
netstat -tlnp | grep :3000
netstat -tlnp | grep :8081

# 停止占用进程
sudo kill -9 <PID>
```

### 3. 权限问题

```bash
# 设置正确的权限
sudo chown -R $(whoami) /opt/ScriptToFrame/logs
sudo chmod -R 755 /data/tobyai/generated
```

### 4. 网络诊断

```bash
# 运行网络诊断脚本
chmod +x debug_docker_network.sh
./debug_docker_network.sh
```

### 5. 查看容器资源使用

```bash
# 查看容器资源状态
docker stats scripttoframe-app
```

---

## 🌐 访问地址

部署成功后，可以通过以下地址访问：

- **前端应用**: http://your-server-ip:3000
- **后端 API**: http://your-server-ip:8081
- **API 文档**: http://your-server-ip:8081/docs
- **健康检查**: http://your-server-ip:8081/api/health

---

## ⚠️ 常见问题

### Q1: 构建失败，提示网络错误
**A**: 使用国内镜像源，已在 Dockerfile.legacy 中配置阿里云镜像

### Q2: 容器启动但无法访问
**A**: 检查防火墙规则
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8081/tcp
sudo firewall-cmd --reload
```

### Q3: 图片生成失败
**A**: 检查火山引擎 API 密钥是否正确配置
```bash
docker exec scripttoframe-app cat /app/python-backend/.env
```

### Q4: AI 分析失败
**A**: 确保 DeepSeek API 密钥已配置
```bash
docker exec scripttoframe-app env | grep DEEPSEEK
```

---

## 📞 技术支持

如遇问题，请提供以下信息：
1. CentOS 版本: `cat /etc/centos-release`
2. Docker 版本: `docker --version`
3. Docker Compose 版本: `docker-compose --version`
4. 容器日志: `docker-compose -f docker-compose.legacy.yml logs --tail=100`
5. 错误截图

---

## 🔒 安全建议

1. **修改默认端口**（可选）
2. **配置防火墙白名单**
3. **使用 HTTPS**（建议使用 Nginx 反向代理）
4. **定期更新依赖**
5. **备份重要数据**
