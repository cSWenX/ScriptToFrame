#!/bin/bash

# Script to Frame - 简化启动脚本 (演示版)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
print_status "=== Script to Frame 启动脚本演示 ==="
echo ""

# 检查依赖
print_status "检查依赖..."
node --version > /dev/null 2>&1 && print_success "✅ Node.js 已安装" || print_error "❌ Node.js 未安装"
python3 --version > /dev/null 2>&1 && print_success "✅ Python3 已安装" || print_error "❌ Python3 未安装"

# 检查项目文件
print_status "检查项目文件..."
[ -f "package.json" ] && print_success "✅ package.json 存在" || print_error "❌ package.json 不存在"
[ -d "python-backend" ] && print_success "✅ python-backend 目录存在" || print_error "❌ python-backend 目录不存在"
[ -f ".env.local" ] && print_success "✅ .env.local 存在" || print_error "❌ .env.local 不存在"
[ -f "python-backend/.env" ] && print_success "✅ python-backend/.env 存在" || print_error "❌ python-backend/.env 不存在"

echo ""
print_status "=== 脚本功能预览 ==="
echo ""
print_status "🚀 完整启动脚本将执行以下操作："
echo "   1. 终止现有的 Node.js 和 Python 进程"
echo "   2. 启动 Python 后端 (FastAPI, 端口 8081)"
echo "   3. 启动 Next.js 前端 (端口 3000)"
echo "   4. 进行健康检查验证服务状态"
echo "   5. 显示访问链接和使用说明"
echo "   6. 等待用户按 Ctrl+C 停止服务"
echo ""
print_success "所有启动脚本已创建完成！"
echo ""
print_status "=== 使用方法 ==="
echo ""
echo "1. 完整启动: ./start.sh"
echo "2. 停止服务: ./stop.sh"
echo "3. Windows: 双击 start.bat"
echo "4. npm 方式: npm run start:all"
echo ""
print_status "详细说明请查看 STARTUP_GUIDE.md"
echo ""