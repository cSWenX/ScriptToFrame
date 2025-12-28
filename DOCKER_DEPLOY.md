# ScriptToFrame - CentOS7 Docker 部署指南

## 快速部署

### 方法1: 一键部署 (推荐)

1. **上传项目到CentOS7服务器**
```bash
# 使用scp上传项目
scp -r ScriptToFrame/ root@your-server-ip:/opt/

# 或者使用git克隆
git clone https://github.com/your-repo/ScriptToFrame.git /opt/ScriptToFrame
```

2. **运行一键部署脚本**
```bash
cd /opt/ScriptToFrame
chmod +x deploy-centos7.sh
sudo ./deploy-centos7.sh
```

3. **配置API密钥**
```bash
# 编辑环境变量文件
nano .env.production

# 填入你的API密钥
VOLCENGINE_ACCESS_KEY_ID=your_volcengine_access_key_id
VOLCENGINE_SECRET_ACCESS_KEY=your_volcengine_secret_access_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

4. **访问应用**
- 前端: http://your-server-ip:3000
- API文档: http://your-server-ip:8081/docs

### 方法2: 手动部署

#### 1. 安装Docker和Docker Compose

```bash
# 更新系统
sudo yum update -y
sudo yum install -y epel-release

# 安装Docker
sudo yum install -y yum-utils device-mapper-persistent-data lvm2
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io

# 启动Docker
sudo systemctl start docker
sudo systemctl enable docker

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
```

#### 2. 配置防火墙

```bash
# 开放端口
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8081/tcp
sudo firewall-cmd --reload

# 或者关闭防火墙 (不推荐生产环境)
sudo systemctl stop firewalld
sudo systemctl disable firewalld
```

#### 3. 部署应用

```bash
# 进入项目目录
cd /opt/ScriptToFrame

# 配置环境变量
cp .env.production .env.production.backup
nano .env.production

# 构建并启动容器
docker-compose up -d --build

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## 管理命令

### 容器管理

```bash
# 查看容器状态
docker-compose ps

# 启动容器
docker-compose up -d

# 停止容器
docker-compose down

# 重启容器
docker-compose restart

# 重新构建并启动
docker-compose up -d --build
```

### 日志查看

```bash
# 查看所有日志
docker-compose logs

# 实时查看日志
docker-compose logs -f

# 查看指定服务日志
docker-compose logs scripttoframe

# 查看最近100行日志
docker-compose logs --tail=100
```

### 容器维护

```bash
# 进入容器
docker-compose exec scripttoframe bash

# 更新应用代码
git pull
docker-compose up -d --build

# 清理Docker资源
docker system prune -f
docker image prune -f
```

## 故障排除

### 常见问题

1. **端口被占用**
```bash
# 查看端口占用
netstat -tlnp | grep :3000
netstat -tlnp | grep :8081

# 杀死占用进程
sudo kill -9 <PID>
```

2. **容器无法启动**
```bash
# 查看详细错误日志
docker-compose logs scripttoframe

# 检查Docker服务状态
sudo systemctl status docker

# 重启Docker服务
sudo systemctl restart docker
```

3. **API密钥配置错误**
```bash
# 检查环境变量
docker-compose exec scripttoframe printenv | grep API

# 重新配置并重启
nano .env.production
docker-compose restart
```

4. **内存不足**
```bash
# 查看系统资源
free -h
df -h

# 增加swap空间 (如果需要)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 性能优化

1. **Docker配置优化**
```bash
# 编辑Docker守护进程配置
sudo nano /etc/docker/daemon.json

# 添加以下配置
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}

# 重启Docker
sudo systemctl restart docker
```

2. **系统资源监控**
```bash
# 安装监控工具
sudo yum install -y htop iotop

# 监控容器资源使用
docker stats
```

## 备份和恢复

### 数据备份

```bash
# 备份应用数据
sudo tar -czf scripttoframe-backup-$(date +%Y%m%d).tar.gz /opt/ScriptToFrame

# 备份Docker镜像
docker save -o scripttoframe-image.tar scripttoframe_scripttoframe:latest
```

### 数据恢复

```bash
# 恢复应用数据
sudo tar -xzf scripttoframe-backup-YYYYMMDD.tar.gz -C /

# 恢复Docker镜像
docker load -i scripttoframe-image.tar
```

## 安全配置

### SSL/TLS配置 (可选)

如需HTTPS访问，可以使用Nginx反向代理:

```bash
# 安装Nginx
sudo yum install -y nginx

# 配置Nginx (示例配置)
sudo nano /etc/nginx/conf.d/scripttoframe.conf
```

## 监控和日志

### 系统监控

建议安装监控工具监控应用状态：
- Prometheus + Grafana
- ELK Stack (日志分析)
- Zabbix (系统监控)

### 日志管理

```bash
# 设置日志轮转
sudo nano /etc/logrotate.d/docker-compose

/opt/ScriptToFrame/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 root root
}
```

## 联系支持

如遇到部署问题，请提供以下信息：
1. CentOS版本: `cat /etc/redhat-release`
2. Docker版本: `docker --version`
3. 错误日志: `docker-compose logs`
4. 系统资源: `free -h && df -h`