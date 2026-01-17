# CentOS 7 快速部署指南

## 🚀 三步快速部署

### 第一步：配置环境变量

```bash
cd /opt/ScriptToFrame

# 编辑 .env 文件
vi .env
```

填入你的 API 密钥：

```env
# 必需配置
VOLCENGINE_ACCESS_KEY_ID=AKLT...你的火山引擎AccessKey
VOLCENGINE_SECRET_ACCESS_KEY=your_secret_key
DEEPSEEK_API_KEY=sk-...你的DeepSeek密钥

# 可选配置（如果使用 Claude）
# ANTHROPIC_API_KEY=sk-ant-...你的Claude密钥
```

### 第二步：启动服务

```bash
# 方式1: 使用一键部署脚本（推荐）
chmod +x deploy-centos7.sh
./deploy-centos7.sh

# 方式2: 手动启动
docker-compose -f docker-compose.legacy.yml up -d --build
```

### 第三步：验证部署

```bash
# 检查服务状态
docker-compose -f docker-compose.legacy.yml ps

# 查看日志
docker-compose -f docker-compose.legacy.yml logs -f

# 访问测试
curl http://localhost:3000      # 前端
curl http://localhost:8081/api/health  # 后端健康检查
```

---

## 📍 访问地址

替换 `YOUR_SERVER_IP` 为你的服务器 IP 地址：

- **前端**: http://YOUR_SERVER_IP:3000
- **后端 API**: http://YOUR_SERVER_IP:8081
- **API 文档**: http://YOUR_SERVER_IP:8081/docs

---

## 🔧 常用命令

### 查看日志

```bash
# 查看所有日志
docker-compose -f docker-compose.legacy.yml logs -f

# 查看后端日志
docker exec scripttoframe-app tail -f /app/logs/backend.log

# 查看前端日志
docker exec scripttoframe-app tail -f /app/logs/frontend.log
```

### 重启服务

```bash
# 重启所有服务
docker-compose -f docker-compose.legacy.yml restart

# 重启容器
docker restart scripttoframe-app
```

### 停止服务

```bash
# 停止服务
docker-compose -f docker-compose.legacy.yml down

# 停止并删除数据
docker-compose -f docker-compose.legacy.yml down -v
```

### 更新代码

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose -f docker-compose.legacy.yml up -d --build
```

---

## 🔍 故障排查

### 端口被占用

```bash
# 查看占用进程
netstat -tlnp | grep :3000
netstat -tlnp | grep :8081

# 停止占用进程
kill -9 <PID>
```

### 容器启动失败

```bash
# 查看错误日志
docker-compose -f docker-compose.legacy.yml logs --tail=100

# 进入容器检查
docker exec -it scripttoframe-app bash
```

### 防火墙问题

```bash
# 开放端口
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8081/tcp
sudo firewall-cmd --reload

# 查看防火墙状态
sudo firewall-cmd --list-all
```

### 网络诊断

```bash
# 运行网络诊断
chmod +x debug_docker_network.sh
./debug_docker_network.sh
```

---

## 📊 监控命令

```bash
# 查看容器资源使用
docker stats scripttoframe-app

# 查看容器详细信息
docker inspect scripttoframe-app

# 查看容器进程
docker exec scripttoframe-app ps aux
```

---

## 💡 提示

1. **首次启动**需要构建镜像，可能需要 5-10 分钟
2. **确保 API 密钥**正确配置，否则服务无法正常工作
3. **日志文件**会保存在 `./logs` 目录
4. **生成的图片**默认保存在 `/data/tobyai/generated`
5. 建议定期**备份** `.env` 和 `./logs` 目录

---

## 📞 获取帮助

遇到问题时，请提供：

1. CentOS 版本：`cat /etc/redhat-release`
2. Docker 版本：`docker --version`
3. 容器日志：`docker-compose -f docker-compose.legacy.yml logs --tail=100`
4. 错误截图

---

## 🔒 安全建议

1. 修改默认端口
2. 配置防火墙白名单
3. 使用 Nginx 配置 HTTPS
4. 定期更新系统

详细文档请参考：`CENTOS7_DEPLOY_CHECKLIST.md`
