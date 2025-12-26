# 🐳 ScriptToFrame Docker 部署指南

## 📋 前提条件

只需要安装 **Docker Desktop**：
- Windows: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
- macOS: https://desktop.docker.com/mac/main/amd64/Docker.dmg
- Linux: https://docs.docker.com/engine/install/

## 🚀 一键启动（推荐）

### 1. 克隆项目
```bash
git clone https://github.com/cSWenX/ScriptToFrame.git
cd ScriptToFrame
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的API密钥
```

`.env` 文件示例：
```env
# 火山引擎即梦API (必需)
VOLCENGINE_ACCESS_KEY_ID=your_volcengine_access_key
VOLCENGINE_SECRET_ACCESS_KEY=your_volcengine_secret_key

# Claude API (必需)
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_BASE_URL=https://api.anthropic.com

# DeepSeek API (必需)
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# 应用配置
NEXT_PUBLIC_APP_NAME=ScriptToFrame
NEXT_PUBLIC_VERSION=1.0.0
```

### 3. 一键启动
```bash
docker-compose up -d
```

### 4. 访问应用
- **主应用**: http://localhost:3000
- **API文档**: http://localhost:8081/docs
- **健康检查**: http://localhost:8081/api/health

## 🛠️ Docker 常用命令

### 启动服务
```bash
# 后台启动
docker-compose up -d

# 前台启动（查看日志）
docker-compose up

# 重新构建并启动
docker-compose up --build -d
```

### 停止服务
```bash
# 停止服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v

# 停止并删除镜像
docker-compose down --rmi all
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f scripttoframe

# 查看实时日志
docker-compose logs --tail=100 -f scripttoframe
```

### 进入容器
```bash
# 进入运行中的容器
docker-compose exec scripttoframe /bin/sh

# 查看容器状态
docker-compose ps

# 重启服务
docker-compose restart scripttoframe
```

## 🔧 故障排除

### 1. 端口占用
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :8081

# macOS/Linux
lsof -i :3000
lsof -i :8081

# 修改端口（在docker-compose.yml中）
ports:
  - "3001:3000"  # 将本地端口改为3001
  - "8082:8081"  # 将本地端口改为8082
```

### 2. 环境变量问题
```bash
# 检查环境变量
docker-compose exec scripttoframe env | grep VOLCENGINE
docker-compose exec scripttoframe env | grep ANTHROPIC

# 重新加载环境变量
docker-compose down
docker-compose up -d
```

### 3. 构建失败
```bash
# 清理Docker缓存
docker system prune -a

# 强制重新构建
docker-compose build --no-cache
docker-compose up -d
```

### 4. 服务无法启动
```bash
# 查看详细日志
docker-compose logs scripttoframe

# 检查容器健康状态
docker-compose ps
docker inspect scripttoframe-app
```

## 📊 性能优化

### 1. 资源限制
在 `docker-compose.yml` 中添加：
```yaml
services:
  scripttoframe:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

### 2. 日志轮转
```yaml
services:
  scripttoframe:
    # ... 其他配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 🔄 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose down
docker-compose up --build -d
```

## 💾 数据备份

```bash
# 备份日志数据
docker cp scripttoframe-app:/app/logs ./backup/logs

# 备份整个数据卷
docker run --rm -v scripttoframe_app_data:/data -v $(pwd):/backup alpine tar czf /backup/app_data_backup.tar.gz -C /data .
```

## 🌐 生产部署

对于生产环境，建议：

1. **使用环境变量管理**：
   ```bash
   export VOLCENGINE_ACCESS_KEY_ID=xxx
   export VOLCENGINE_SECRET_ACCESS_KEY=xxx
   docker-compose up -d
   ```

2. **启用HTTPS**：
   ```yaml
   services:
     nginx:
       image: nginx:alpine
       ports:
         - "443:443"
         - "80:80"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf
         - ./ssl:/etc/ssl
   ```

3. **添加监控**：
   ```yaml
   services:
     monitoring:
       image: prom/prometheus
       ports:
         - "9090:9090"
   ```

现在你只需要安装Docker Desktop，就可以一键启动整个系统了！🎉