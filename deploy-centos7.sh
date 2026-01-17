#!/bin/bash

# CentOS 7 一键部署脚本

set -e

echo "🚀 ScriptToFrame CentOS 7 Docker 部署脚本"
echo "======================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "ℹ️  $1"; }

# 1. 检查系统环境
echo "📋 步骤 1/7: 检查系统环境..."

# 检查 CentOS 版本
if [ -f /etc/redhat-release ]; then
    VERSION=$(cat /etc/redhat-release)
    print_success "系统版本: $VERSION"
else
    print_error "不是 CentOS/RHEL 系统"
    exit 1
fi

# 检查内存
MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
if [ $MEMORY_GB -lt 2 ]; then
    print_warning "内存不足 2GB，当前: ${MEMORY_GB}GB"
else
    print_success "内存: ${MEMORY_GB}GB"
fi

# 检查磁盘空间
DISK_GB=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ $DISK_GB -lt 10 ]; then
    print_warning "磁盘空间不足 10GB，当前: ${DISK_GB}GB"
else
    print_success "磁盘可用空间: ${DISK_GB}GB"
fi

# 2. 检查 Docker
echo ""
echo "📋 步骤 2/7: 检查 Docker..."

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
    print_success "Docker 已安装: $DOCKER_VERSION"
    
    # 检查 Docker 服务状态
    if systemctl is-active --quiet docker; then
        print_success "Docker 服务运行中"
    else
        print_warning "Docker 服务未运行，正在启动..."
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
else
    print_error "Docker 未安装"
    print_info "请先安装 Docker: https://docs.docker.com/engine/install/centos/"
    exit 1
fi

# 检查 Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | awk '{print $4}' | sed 's/,//')
    print_success "Docker Compose 已安装: $COMPOSE_VERSION"
else
    print_error "Docker Compose 未安装"
    print_info "正在安装 Docker Compose..."
    
    sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose 安装完成"
fi

# 3. 配置环境变量
echo ""
echo "📋 步骤 3/7: 配置环境变量..."

if [ ! -f .env ]; then
    print_warning ".env 文件不存在"
    
    if [ -f .env.production ]; then
        print_info "从 .env.production 创建 .env 文件"
        cp .env.production .env
    else
        print_error ".env.production 文件也不存在"
        print_info "创建默认 .env 文件..."
        cat > .env << 'ENVEOF'
# 火山引擎API
VOLCENGINE_ACCESS_KEY_ID=your_key_here
VOLCENGINE_SECRET_ACCESS_KEY=your_secret_here

# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_key_here

# Claude API (可选)
# ANTHROPIC_API_KEY=your_anthropic_key_here
ENVEOF
    fi
    
    print_warning "请编辑 .env 文件填入真实的 API 密钥"
    print_info "编辑命令: vi .env"
    echo ""
    read -p "按回车继续编辑 .env 文件，或按 Ctrl+C 退出..."
    vi .env
else
    print_success ".env 文件已存在"
fi

# 4. 创建必要的目录
echo ""
echo "📋 步骤 4/7: 创建必要的目录..."

mkdir -p logs
print_success "创建 logs 目录"

mkdir -p /data/tobyai/generated
chmod -R 755 /data/tobyai/generated
print_success "创建图片存储目录 /data/tobyai/generated"

# 5. 配置防火墙
echo ""
echo "📋 步骤 5/7: 配置防火墙..."

if command -v firewall-cmd &> /dev/null; then
    if systemctl is-active --quiet firewalld; then
        print_info "配置防火墙规则..."
        sudo firewall-cmd --permanent --add-port=3000/tcp 2>/dev/null || true
        sudo firewall-cmd --permanent --add-port=8081/tcp 2>/dev/null || true
        sudo firewall-cmd --reload 2>/dev/null || true
        print_success "防火墙规则已配置"
    else
        print_warning "firewalld 未运行"
    fi
else
    print_warning "未找到 firewalld 命令"
fi

# 6. 停止旧容器
echo ""
echo "📋 步骤 6/7: 清理旧容器..."

if docker ps -a | grep -q scripttoframe-app; then
    print_info "停止并删除旧容器..."
    docker-compose -f docker-compose.legacy.yml down 2>/dev/null || true
    print_success "旧容器已清理"
else
    print_success "没有旧容器需要清理"
fi

# 7. 启动服务
echo ""
echo "📋 步骤 7/7: 启动 Docker 服务..."

print_info "构建并启动容器（这可能需要几分钟）..."
docker-compose -f docker-compose.legacy.yml up -d --build

# 等待容器启动
echo ""
print_info "等待服务启动..."
sleep 15

# 检查容器状态
if docker ps | grep -q scripttoframe-app; then
    print_success "容器启动成功"
else
    print_error "容器启动失败"
    echo ""
    echo "查看日志:"
    docker-compose -f docker-compose.legacy.yml logs --tail=50
    exit 1
fi

# 健康检查
echo ""
echo "🏥 健康检查..."

sleep 5

# 检查后端
if curl -f http://localhost:8081/api/health > /dev/null 2>&1; then
    print_success "后端服务正常"
else
    print_warning "后端健康检查失败，但服务可能仍在启动中"
fi

# 检查前端
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "前端服务正常"
else
    print_warning "前端健康检查失败，但服务可能仍在启动中"
fi

# 完成
echo ""
echo "======================================="
print_success "部署完成！"
echo ""
echo "🌐 访问地址:"
echo "   前端: http://$(hostname -I | awk '{print $1}'):3000"
echo "   后端API: http://$(hostname -I | awk '{print $1}'):8081"
echo "   API文档: http://$(hostname -I | awk '{print $1}'):8081/docs"
echo ""
echo "📊 管理命令:"
echo "   查看日志: docker-compose -f docker-compose.legacy.yml logs -f"
echo "   停止服务: docker-compose -f docker-compose.legacy.yml down"
echo "   重启服务: docker-compose -f docker-compose.legacy.yml restart"
echo ""
echo "📝 详细部署文档: CENTOS7_DEPLOY_CHECKLIST.md"
echo ""
