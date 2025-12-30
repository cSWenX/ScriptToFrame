#!/bin/bash

# Script to Frame - 停止脚本 (支持PID文件)
# 停止所有前端和后端服务

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志目录
LOG_DIR="logs"
COMBINED_LOG="$LOG_DIR/combined.log"

# 打印带颜色的消息
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
    if [ -f "$COMBINED_LOG" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" >> "$COMBINED_LOG"
    fi
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    if [ -f "$COMBINED_LOG" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" >> "$COMBINED_LOG"
    fi
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    if [ -f "$COMBINED_LOG" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1" >> "$COMBINED_LOG"
    fi
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    if [ -f "$COMBINED_LOG" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> "$COMBINED_LOG"
    fi
}

# 通过PID文件停止进程
kill_by_pid_file() {
    local pid_file="$1"
    local service_name="$2"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            print_status "停止 $service_name (PID: $pid)..."
            kill "$pid" 2>/dev/null

            # 等待进程停止，如果需要强制终止
            local count=0
            while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done

            if kill -0 "$pid" 2>/dev/null; then
                print_warning "$service_name 未响应，强制终止..."
                kill -9 "$pid" 2>/dev/null
            fi

            print_success "$service_name 已停止"
        else
            print_warning "$service_name PID 文件存在但进程不存在"
        fi

        # 删除PID文件
        rm -f "$pid_file"
    else
        print_status "未找到 $service_name 的 PID 文件"
    fi
}

# 停止所有相关进程
stop_all_services() {
    print_status "正在停止所有服务..."

    # 通过PID文件停止服务
    kill_by_pid_file "logs/backend.pid" "Python 后端"
    kill_by_pid_file "logs/frontend.pid" "Next.js 前端"

    # 额外的进程清理 (防止有遗漏)
    print_status "清理可能的残留进程..."

    # 停止 Next.js 进程
    if pkill -f "next dev" 2>/dev/null; then
        print_success "清理了额外的 Next.js 进程"
    fi
    pkill -f "node.*next" 2>/dev/null

    # 停止 Python backend 进程
    if pkill -f "uvicorn.*main:app" 2>/dev/null; then
        print_success "清理了额外的 Python 后端进程"
    fi
    pkill -f "python.*main.py" 2>/dev/null

    # 停止其他可能的进程
    pkill -f "python.*uvicorn" 2>/dev/null
    pkill -f "fastapi" 2>/dev/null

    # 等待进程完全终止
    sleep 2

    # 检查端口占用
    print_status "检查端口占用..."

    # 检查 3000 端口
    if lsof -i :3000 > /dev/null 2>&1; then
        print_warning "端口 3000 仍被占用，强制终止..."
        lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    else
        print_success "端口 3000 已释放"
    fi

    # 检查 8081 端口
    if lsof -i :8081 > /dev/null 2>&1; then
        print_warning "端口 8081 仍被占用，强制终止..."
        lsof -ti :8081 | xargs kill -9 2>/dev/null || true
    else
        print_success "端口 8081 已释放"
    fi

    print_success "所有服务已停止"
}

# 显示停止后状态
show_status() {
    echo ""
    print_status "=== 服务状态 ==="
    echo ""

    # 检查前端状态
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_warning "⚠️ Next.js 前端仍在运行: http://localhost:3000"
    else
        print_success "✅ Next.js 前端已停止"
    fi

    # 检查后端状态
    if curl -s http://localhost:8081 > /dev/null 2>&1; then
        print_warning "⚠️ Python 后端仍在运行: http://localhost:8081"
    else
        print_success "✅ Python 后端已停止"
    fi

    # 检查PID文件
    echo ""
    print_status "=== PID文件状态 ==="
    echo ""

    if [ -f "logs/backend.pid" ]; then
        print_warning "⚠️ 后端 PID 文件仍存在: logs/backend.pid"
    else
        print_success "✅ 后端 PID 文件已清理"
    fi

    if [ -f "logs/frontend.pid" ]; then
        print_warning "⚠️ 前端 PID 文件仍存在: logs/frontend.pid"
    else
        print_success "✅ 前端 PID 文件已清理"
    fi

    echo ""
    print_status "=== 日志文件 ==="
    echo ""

    if [ -f "logs/backend.log" ]; then
        local backend_size=$(wc -l < logs/backend.log 2>/dev/null || echo "0")
        print_status "📄 后端日志: logs/backend.log ($backend_size 行)"
    fi

    if [ -f "logs/frontend.log" ]; then
        local frontend_size=$(wc -l < logs/frontend.log 2>/dev/null || echo "0")
        print_status "📄 前端日志: logs/frontend.log ($frontend_size 行)"
    fi

    if [ -f "logs/combined.log" ]; then
        local combined_size=$(wc -l < logs/combined.log 2>/dev/null || echo "0")
        print_status "📄 综合日志: logs/combined.log ($combined_size 行)"
    fi

    echo ""
}

# 清理日志文件选项
cleanup_logs() {
    echo ""
    print_status "=== 日志清理选项 ==="
    echo ""
    echo "是否要清理日志文件?"
    echo "1) 保留所有日志文件"
    echo "2) 清理所有日志文件"
    echo "3) 仅清理今天之前的日志"
    echo ""
    read -p "请输入选择 (1-3, 默认为1): " choice
    choice=${choice:-1}

    case $choice in
        2)
            print_status "清理所有日志文件..."
            rm -f logs/*.log 2>/dev/null || true
            print_success "所有日志文件已清理"
            ;;
        3)
            print_status "清理今天之前的日志..."
            find logs/ -name "*.log" -type f ! -newermt "$(date +%Y-%m-%d)" -delete 2>/dev/null || true
            print_success "旧日志文件已清理"
            ;;
        1|*)
            print_status "保留所有日志文件"
            ;;
    esac
}

# 主函数
main() {
    echo ""
    print_status "=== Script to Frame 停止脚本 ==="
    echo ""

    # 停止所有服务
    stop_all_services

    # 显示状态
    show_status

    # 日志清理选项
    cleanup_logs

    echo ""
    print_status "所有服务已成功停止"

    if [ -f "$COMBINED_LOG" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] === Script to Frame 停止脚本完成 ===" >> "$COMBINED_LOG"
    fi

    echo ""
}

# 运行主函数
main "$@"