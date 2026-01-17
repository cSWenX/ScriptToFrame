#!/bin/bash

# CentOS 7 部署前配置检查脚本

echo "🔍 ScriptToFrame CentOS 7 配置检查工具"
echo "======================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_pass() { echo -e "${GREEN}✅ $1${NC}"; }
check_fail() { echo -e "${RED}❌ $1${NC}"; }
check_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
check_info() { echo "ℹ️  $1"; }

ERRORS=0
WARNINGS=0

# 1. 检查必需文件
echo "📄 检查必需文件..."

FILES=(
    "docker-compose.legacy.yml"
    "Dockerfile.legacy"
    "docker-entrypoint.sh"
    ".env"
    "package.json"
    "python-backend/main.py"
    "python-backend/requirements.txt"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "文件存在: $file"
    else
        check_fail "文件缺失: $file"
        ERRORS=$((ERRORS + 1))
    fi
done

# 2. 检查环境变量配置
echo ""
echo "🔐 检查环境变量配置..."

if [ -f .env ]; then
    source .env 2>/dev/null || true
    
    if [ -n "$VOLCENGINE_ACCESS_KEY_ID" ] && [ "$VOLCENGINE_ACCESS_KEY_ID" != "your_key_here" ]; then
        check_pass "VOLCENGINE_ACCESS_KEY_ID 已配置"
    else
        check_fail "VOLCENGINE_ACCESS_KEY_ID 未配置或使用默认值"
        ERRORS=$((ERRORS + 1))
    fi
    
    if [ -n "$VOLCENGINE_SECRET_ACCESS_KEY" ] && [ "$VOLCENGINE_SECRET_ACCESS_KEY" != "your_secret_here" ]; then
        check_pass "VOLCENGINE_SECRET_ACCESS_KEY 已配置"
    else
        check_fail "VOLCENGINE_SECRET_ACCESS_KEY 未配置或使用默认值"
        ERRORS=$((ERRORS + 1))
    fi
    
    if [ -n "$DEEPSEEK_API_KEY" ] && [ "$DEEPSEEK_API_KEY" != "your_deepseek_key_here" ]; then
        check_pass "DEEPSEEK_API_KEY 已配置"
    else
        check_warn "DEEPSEEK_API_KEY 未配置（可以改用 ANTHROPIC_API_KEY）"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    check_fail ".env 文件不存在"
    ERRORS=$((ERRORS + 1))
fi

# 3. 检查目录结构
echo ""
echo "📁 检查目录结构..."

DIRS=(
    "python-backend"
    "components"
    "pages"
    "public"
)

for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        check_pass "目录存在: $dir"
    else
        check_fail "目录缺失: $dir"
        ERRORS=$((ERRORS + 1))
    fi
done

# 4. 检查 Docker 环境
echo ""
echo "🐳 检查 Docker 环境..."

if command -v docker &> /dev/null; then
    check_pass "Docker 已安装: $(docker --version | awk '{print $3}' | sed 's/,//')"
    
    if systemctl is-active --quiet docker 2>/dev/null; then
        check_pass "Docker 服务运行中"
    else
        check_warn "Docker 服务未运行"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    check_fail "Docker 未安装"
    ERRORS=$((ERRORS + 1))
fi

if command -v docker-compose &> /dev/null; then
    check_pass "Docker Compose 已安装: $(docker-compose --version | awk '{print $4}' | sed 's/,//')"
else
    check_fail "Docker Compose 未安装"
    ERRORS=$((ERRORS + 1))
fi

# 5. 检查网络端口
echo ""
echo "🌐 检查网络端口..."

if command -v netstat &> /dev/null; then
    if netstat -tlnp 2>/dev/null | grep -q :3000; then
        check_warn "端口 3000 已被占用"
        WARNINGS=$((WARNINGS + 1))
    else
        check_pass "端口 3000 可用"
    fi
    
    if netstat -tlnp 2>/dev/null | grep -q :8081; then
        check_warn "端口 8081 已被占用"
        WARNINGS=$((WARNINGS + 1))
    else
        check_pass "端口 8081 可用"
    fi
else
    check_warn "无法检查端口（netstat 命令不可用）"
fi

# 6. 检查磁盘空间
echo ""
echo "💾 检查磁盘空间..."

DISK_AVAILABLE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ $DISK_AVAILABLE -ge 10 ]; then
    check_pass "磁盘可用空间: ${DISK_AVAILABLE}GB"
else
    check_warn "磁盘可用空间不足 10GB: ${DISK_AVAILABLE}GB"
    WARNINGS=$((WARNINGS + 1))
fi

# 7. 检查内存
echo ""
echo "🧠 检查内存..."

MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
if [ $MEMORY_GB -ge 2 ]; then
    check_pass "可用内存: ${MEMORY_GB}GB"
else
    check_warn "内存不足 2GB: ${MEMORY_GB}GB"
    WARNINGS=$((WARNINGS + 1))
fi

# 8. 检查日志目录
echo ""
echo "📝 检查日志目录..."

if [ -d logs ]; then
    check_pass "logs 目录存在"
else
    check_warn "logs 目录不存在，部署时会自动创建"
    WARNINGS=$((WARNINGS + 1))
fi

# 9. 检查防火墙
echo ""
echo "🔥 检查防火墙..."

if command -v firewall-cmd &> /dev/null; then
    if systemctl is-active --quiet firewalld; then
        if firewall-cmd --list-ports 2>/dev/null | grep -q "3000/tcp"; then
            check_pass "防火墙已开放端口 3000"
        else
            check_warn "防火墙未开放端口 3000"
            WARNINGS=$((WARNINGS + 1))
        fi
        
        if firewall-cmd --list-ports 2>/dev/null | grep -q "8081/tcp"; then
            check_pass "防火墙已开放端口 8081"
        else
            check_warn "防火墙未开放端口 8081"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        check_warn "firewalld 未运行"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    check_warn "未找到 firewalld 命令"
fi

# 总结
echo ""
echo "======================================="
echo "📊 检查结果总结:"
echo "======================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    check_pass "所有检查通过！可以开始部署"
    echo ""
    echo "运行部署命令:"
    echo "  ./deploy-centos7.sh"
    echo "  或"
    echo "  docker-compose -f docker-compose.legacy.yml up -d --build"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    check_warn "有 $WARNINGS 个警告，建议修复后部署"
    echo ""
    echo "可以继续部署，或先修复警告:"
    echo "  ./deploy-centos7.sh"
    exit 0
else
    check_fail "有 $ERRORS 个错误和 $WARNINGS 个警告，必须修复后才能部署"
    echo ""
    echo "请修复上述错误后再试"
    exit 1
fi
