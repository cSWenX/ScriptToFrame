#!/bin/bash

# Script to Frame - 启动脚本 (后台运行版本)
# 可以同时启动前端和后端服务，并将日志输出到文件

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志目录
LOG_DIR="logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
COMBINED_LOG="$LOG_DIR/combined.log"

# 确保日志目录存在
mkdir -p "$LOG_DIR"

# 打印带颜色的消息
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" >> "$COMBINED_LOG"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" >> "$COMBINED_LOG"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1" >> "$COMBINED_LOG"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> "$COMBINED_LOG"
}

# 检查是否安装了必要的依赖
check_dependencies() {
    print_status "检查依赖..."

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi

    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python3 未安装，请先安装 Python3"
        exit 1
    fi

    print_success "依赖检查通过"
}

# 终止现有进程
kill_existing_processes() {
    print_status "终止现有进程..."

    # 终止 Next.js 进程
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "node.*next" 2>/dev/null || true

    # 终止 Python backend 进程
    pkill -f "uvicorn.*main:app" 2>/dev/null || true
    pkill -f "python.*main.py" 2>/dev/null || true

    # 等待进程完全终止
    sleep 2

    print_success "现有进程已终止"
}

# 启动 Python 后端
start_backend() {
    print_status "启动 Python 后端..."

    cd python-backend || {
        print_error "无法进入 python-backend 目录"
        exit 1
    }

    # 检查虚拟环境
    if [ ! -d "venv" ]; then
        print_warning "虚拟环境不存在，正在创建..."
        python3 -m venv venv
    fi

    # 激活虚拟环境
    source venv/bin/activate

    # 安装依赖
    print_status "检查 Python 依赖..."
    pip install -r requirements.txt >> "../$BACKEND_LOG" 2>&1

    # 检查环境变量
    if [ ! -f ".env" ]; then
        print_warning ".env 文件不存在，请确保配置了正确的 API 凭证"
    fi

    # 清空之前的后端日志
    > "../$BACKEND_LOG"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Python Backend..." >> "../$BACKEND_LOG"

    # 启动后端服务 (后台运行，输出到日志文件)
    print_status "启动 FastAPI 服务 (端口 8081)..."
    nohup uvicorn main:app --host 0.0.0.0 --port 8081 --reload >> "../$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    echo "$BACKEND_PID" > "../logs/backend.pid"

    cd ..

    # 等待后端启动
    sleep 3

    # 检查后端是否正常运行
    if curl -s http://localhost:8081/api/health > /dev/null 2>&1; then
        print_success "Python 后端启动成功 (PID: $BACKEND_PID)"
    else
        print_warning "Python 后端可能启动失败，请检查日志: $BACKEND_LOG"
    fi
}

# 启动 Next.js 前端
start_frontend() {
    print_status "启动 Next.js 前端..."

    # 检查 package.json
    if [ ! -f "package.json" ]; then
        print_error "package.json 不存在"
        exit 1
    fi

    # 安装依赖
    print_status "检查 Node.js 依赖..."
    npm install >> "$FRONTEND_LOG" 2>&1

    # 检查环境变量
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local 文件不存在，请确保配置了正确的环境变量"
    fi

    # 清空之前的前端日志
    > "$FRONTEND_LOG"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Next.js Frontend..." >> "$FRONTEND_LOG"

    # 启动前端服务 (后台运行，输出到日志文件)
    print_status "启动 Next.js 开发服务器 (端口 3000)..."
    nohup npm run dev >> "$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > "logs/frontend.pid"

    # 等待前端启动
    sleep 5

    # 检查前端是否正常运行
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "Next.js 前端启动成功 (PID: $FRONTEND_PID)"
    else
        print_warning "Next.js 前端可能启动失败，请检查日志: $FRONTEND_LOG"
    fi
}

# 显示服务状态
show_status() {
    echo ""
    print_status "=== 服务状态 ==="
    echo ""

    # 检查后端状态
    if curl -s http://localhost:8081/api/health > /dev/null 2>&1; then
        print_success "✅ Python 后端: http://localhost:8081 (运行中)"
        print_status "   - API文档: http://localhost:8081/docs"
        print_status "   - 健康检查: http://localhost:8081/api/health"
        print_status "   - 后端日志: $BACKEND_LOG"
    else
        print_error "❌ Python 后端: 无响应"
    fi

    # 检查前端状态
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "✅ Next.js 前端: http://localhost:3000 (运行中)"
        print_status "   - 前端日志: $FRONTEND_LOG"
    else
        print_error "❌ Next.js 前端: 无响应"
    fi

    echo ""
    print_status "=== 日志文件 ==="
    echo ""
    print_status "📄 后端日志: $BACKEND_LOG"
    print_status "📄 前端日志: $FRONTEND_LOG"
    print_status "📄 综合日志: $COMBINED_LOG"
    echo ""
    print_status "=== 日志查看命令 ==="
    echo ""
    print_status "实时查看后端日志: tail -f $BACKEND_LOG"
    print_status "实时查看前端日志: tail -f $FRONTEND_LOG"
    print_status "实时查看所有日志: tail -f $COMBINED_LOG"
    print_status "查看最近50行: tail -n 50 $BACKEND_LOG"
    echo ""
    print_status "=== 使用说明 ==="
    echo ""
    print_status "1. 访问应用: http://localhost:3000"
    print_status "2. 查看API文档: http://localhost:8081/docs"
    print_status "3. 停止服务: ./stop.sh"
    print_status "4. 查看日志: tail -f logs/backend.log 或 tail -f logs/frontend.log"
    echo ""
}

# 显示实时日志选项
show_log_options() {
    echo ""
    print_status "=== 实时日志查看选项 ==="
    echo ""
    echo "选择要查看的日志:"
    echo "1) 后端日志 (Python/FastAPI)"
    echo "2) 前端日志 (Next.js)"
    echo "3) 综合日志 (所有操作)"
    echo "4) 同时显示前端和后端日志"
    echo "5) 跳过，手动查看日志"
    echo ""
    read -p "请输入选择 (1-5): " choice

    case $choice in
        1)
            print_status "开始实时显示后端日志 (按 Ctrl+C 退出)..."
            tail -f "$BACKEND_LOG"
            ;;
        2)
            print_status "开始实时显示前端日志 (按 Ctrl+C 退出)..."
            tail -f "$FRONTEND_LOG"
            ;;
        3)
            print_status "开始实时显示综合日志 (按 Ctrl+C 退出)..."
            tail -f "$COMBINED_LOG"
            ;;
        4)
            print_status "开始同时显示前端和后端日志 (按 Ctrl+C 退出)..."
            # 使用 multitail 如果可用，否则使用 tail
            if command -v multitail &> /dev/null; then
                multitail "$BACKEND_LOG" "$FRONTEND_LOG"
            else
                print_status "同时显示两个日志文件:"
                print_status "前端日志将以 [FRONTEND] 前缀显示"
                print_status "后端日志将以 [BACKEND] 前缀显示"
                (tail -f "$FRONTEND_LOG" | sed 's/^/[FRONTEND] /' &
                 tail -f "$BACKEND_LOG" | sed 's/^/[BACKEND] /' &
                 wait)
            fi
            ;;
        5)
            print_status "您可以手动使用以下命令查看日志:"
            print_status "tail -f $BACKEND_LOG"
            print_status "tail -f $FRONTEND_LOG"
            print_status "tail -f $COMBINED_LOG"
            ;;
        *)
            print_warning "无效选择，跳过日志查看"
            ;;
    esac
}

# 主函数
main() {
    # 清空综合日志文件
    > "$COMBINED_LOG"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] === Script to Frame 启动脚本开始运行 ===" >> "$COMBINED_LOG"

    echo ""
    print_status "=== Script to Frame 启动脚本 (后台运行版) ==="
    echo ""

    # 检查依赖
    check_dependencies

    # 终止现有进程
    kill_existing_processes

    # 启动后端
    start_backend

    # 启动前端
    start_frontend

    # 显示状态
    show_status

    # 显示日志查看选项
    show_log_options
}

# 运行主函数
main "$@"