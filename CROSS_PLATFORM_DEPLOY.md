# ScriptToFrame 跨平台部署指南

## 🌍 支持的平台

ScriptToFrame 支持在以下平台上一键部署：

- **Windows** 10/11 (Docker Desktop)
- **macOS** (Intel/Apple Silicon + Docker Desktop)
- **Linux** (Ubuntu, CentOS, Debian, RHEL等)

## 🚀 一键部署

### Linux / macOS / Windows (WSL/Git Bash)

```bash
# 下载代码
git clone https://github.com/cSWenX/ScriptToFrame.git
cd ScriptToFrame

# 运行智能部署脚本
chmod +x deploy.sh
./deploy.sh
```

### Windows (CMD/PowerShell)

```cmd
# 下载代码
git clone https://github.com/cSWenX/ScriptToFrame.git
cd ScriptToFrame

# 运行Windows部署脚本
deploy.bat
```

## 🧠 智能部署特性

### 自动平台检测

部署脚本会自动检测：
- 操作系统类型 (Linux/macOS/Windows)
- Docker版本和兼容性
- 系统特定配置需求

### 智能部署模式选择

| 平台 | Docker版本 | 部署模式 | 配置文件 |
|------|------------|----------|----------|
| **Windows** | 任意版本 | 标准模式 | `docker-compose.yml` |
| **macOS** | 任意版本 | 标准模式 | `docker-compose.yml` |
| **Ubuntu/Debian** | ≥20.0 | 标准模式 | `docker-compose.yml` |
| **CentOS/RHEL** | 任意版本 | 兼容模式 | `docker-compose.legacy.yml` |
| **其他Linux** | <20.0 | 兼容模式 | `docker-compose.legacy.yml` |

### 自动环境配置

- 自动创建 `.env` 文件
- 检测并提示配置API密钥
- 设置平台特定的Docker环境变量

## 📋 部署前准备

### 1. 安装Docker

#### Windows
```bash
# 下载 Docker Desktop for Windows
https://www.docker.com/products/docker-desktop/
```

#### macOS
```bash
# 下载 Docker Desktop for Mac
https://www.docker.com/products/docker-desktop/

# 或使用 Homebrew
brew install --cask docker
```

#### Ubuntu/Debian
```bash
# 官方安装脚本
curl -fsSL https://get.docker.com | sh

# 或手动安装
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

#### CentOS/RHEL
```bash
# CentOS 7/8
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 配置API密钥

创建 `.env` 文件并配置以下密钥：

```env
# 火山引擎即梦API
VOLCENGINE_ACCESS_KEY_ID=your_volcengine_access_key_id
VOLCENGINE_SECRET_ACCESS_KEY=your_volcengine_secret_access_key

# Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_BASE_URL=https://api.anthropic.com

# 可选：DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# 应用配置
NODE_ENV=production
```

## 🔧 手动部署

如果自动部署脚本有问题，可以手动部署：

### 标准模式 (Windows/macOS/现代Linux)

```bash
# 配置环境变量
cp .env.production .env
nano .env  # 编辑API密钥

# 部署
docker-compose up -d --build

# 查看状态
docker-compose ps
docker-compose logs -f
```

### 兼容模式 (CentOS/老版本Docker)

```bash
# 配置环境变量
cp .env.production .env
nano .env  # 编辑API密钥

# 使用兼容配置部署
docker-compose -f docker-compose.legacy.yml up -d --build

# 查看状态
docker-compose -f docker-compose.legacy.yml ps
docker-compose -f docker-compose.legacy.yml logs -f
```

## 🌐 访问地址

部署成功后访问：

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:8081
- **API文档**: http://localhost:8081/docs

## 📊 管理命令

### 通用命令

```bash
# 查看容器状态
docker ps

# 查看应用日志
docker logs scripttoframe-app

# 重启应用
docker restart scripttoframe-app

# 停止应用
docker stop scripttoframe-app
```

### Docker Compose命令

#### 标准模式
```bash
# 启动
docker-compose up -d

# 停止
docker-compose down

# 查看日志
docker-compose logs -f

# 重启
docker-compose restart

# 更新代码后重新部署
git pull
docker-compose up -d --build
```

#### 兼容模式
```bash
# 启动
docker-compose -f docker-compose.legacy.yml up -d

# 停止
docker-compose -f docker-compose.legacy.yml down

# 查看日志
docker-compose -f docker-compose.legacy.yml logs -f

# 重启
docker-compose -f docker-compose.legacy.yml restart

# 更新代码后重新部署
git pull
docker-compose -f docker-compose.legacy.yml up -d --build
```

## 🔍 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 检查端口占用
netstat -tlnp | grep :3000
netstat -tlnp | grep :8081

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :8081

# 停止占用进程
sudo kill -9 <PID>
```

#### 2. Docker权限问题 (Linux)
```bash
# 添加用户到docker组
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker
```

#### 3. 构建失败
```bash
# 清理Docker缓存
docker system prune -f
docker builder prune -f

# 重新构建
docker-compose up -d --build --force-recreate
```

#### 4. 内存不足
```bash
# 检查系统资源
free -h  # Linux
vm_stat  # macOS

# 增加虚拟内存 (Linux)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 平台特定问题

#### Windows
- 确保Docker Desktop正在运行
- 检查Windows防火墙设置
- 确保启用了WSL 2 (Windows 10/11)

#### macOS
- 确保Docker Desktop正在运行
- 检查是否允许Docker访问网络
- Apple Silicon需要设置 `DOCKER_DEFAULT_PLATFORM=linux/amd64`

#### Linux
- 检查防火墙: `sudo ufw allow 3000,8081/tcp`
- 确保Docker服务运行: `sudo systemctl status docker`
- SELinux可能需要配置: `setsebool -P docker_connect_any 1`

## 📈 性能优化

### 生产环境建议

```bash
# 设置Docker日志限制
echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' | sudo tee /etc/docker/daemon.json

# 重启Docker
sudo systemctl restart docker

# 使用生产模式
NODE_ENV=production docker-compose up -d
```

### 监控与日志

```bash
# 实时监控容器资源
docker stats

# 日志管理
docker logs --tail=100 scripttoframe-app
docker-compose logs --tail=100 -f
```

## 🔄 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新部署 (保留数据)
docker-compose down
docker-compose up -d --build

# 或使用一键更新脚本
./deploy.sh
```

## 📞 支持与帮助

如果遇到部署问题：

1. 检查 [故障排除](#故障排除) 部分
2. 查看应用日志: `docker-compose logs`
3. 提交Issue: https://github.com/cSWenX/ScriptToFrame/issues

请提供以下信息：
- 操作系统版本
- Docker版本
- 错误日志
- 部署模式 (标准/兼容)