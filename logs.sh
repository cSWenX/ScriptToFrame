#!/bin/bash

# 日志查看工具脚本

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 检查日志文件是否存在
check_logs() {
    if [ ! -d "logs" ]; then
        print_warning "logs 目录不存在，请先启动服务"
        exit 1
    fi

    if [ ! -f "logs/backend.log" ] && [ ! -f "logs/frontend.log" ]; then
        print_warning "没有找到日志文件，请先启动服务"
        exit 1
    fi
}

# 显示日志选项菜单
show_menu() {
    echo ""
    print_info "=== Script to Frame 日志查看工具 ==="
    echo ""
    echo "选择要查看的日志:"
    echo "1) 实时查看后端日志 (Python/FastAPI)"
    echo "2) 实时查看前端日志 (Next.js)"
    echo "3) 实时查看综合日志 (所有操作)"
    echo "4) 同时查看前端和后端日志"
    echo "5) 查看后端最近50行"
    echo "6) 查看前端最近50行"
    echo "7) 搜索日志内容"
    echo "8) 显示日志文件信息"
    echo "9) 清理日志文件"
    echo "0) 退出"
    echo ""
}

# 搜索日志内容
search_logs() {
    echo ""
    read -p "请输入搜索关键词: " keyword
    if [ -z "$keyword" ]; then
        print_warning "关键词不能为空"
        return
    fi

    print_info "在日志中搜索: $keyword"
    echo ""

    if [ -f "logs/backend.log" ]; then
        echo "=== 后端日志搜索结果 ==="
        grep -n --color=always "$keyword" logs/backend.log || echo "未找到匹配项"
        echo ""
    fi

    if [ -f "logs/frontend.log" ]; then
        echo "=== 前端日志搜索结果 ==="
        grep -n --color=always "$keyword" logs/frontend.log || echo "未找到匹配项"
        echo ""
    fi

    if [ -f "logs/combined.log" ]; then
        echo "=== 综合日志搜索结果 ==="
        grep -n --color=always "$keyword" logs/combined.log || echo "未找到匹配项"
        echo ""
    fi
}

# 显示日志文件信息
show_log_info() {
    echo ""
    print_info "=== 日志文件信息 ==="
    echo ""

    if [ -f "logs/backend.log" ]; then
        local size=$(wc -l < logs/backend.log 2>/dev/null || echo "0")
        local modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" logs/backend.log 2>/dev/null || echo "未知")
        echo "📄 后端日志: logs/backend.log"
        echo "   行数: $size"
        echo "   修改时间: $modified"
        echo ""
    fi

    if [ -f "logs/frontend.log" ]; then
        local size=$(wc -l < logs/frontend.log 2>/dev/null || echo "0")
        local modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" logs/frontend.log 2>/dev/null || echo "未知")
        echo "📄 前端日志: logs/frontend.log"
        echo "   行数: $size"
        echo "   修改时间: $modified"
        echo ""
    fi

    if [ -f "logs/combined.log" ]; then
        local size=$(wc -l < logs/combined.log 2>/dev/null || echo "0")
        local modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" logs/combined.log 2>/dev/null || echo "未知")
        echo "📄 综合日志: logs/combined.log"
        echo "   行数: $size"
        echo "   修改时间: $modified"
        echo ""
    fi
}

# 清理日志文件
cleanup_logs() {
    echo ""
    print_info "=== 日志清理选项 ==="
    echo ""
    echo "选择清理方式:"
    echo "1) 取消"
    echo "2) 清理所有日志文件"
    echo "3) 仅清理今天之前的日志"
    echo ""
    read -p "请输入选择 (1-3): " choice

    case $choice in
        2)
            print_info "清理所有日志文件..."
            rm -f logs/*.log 2>/dev/null || true
            print_success "所有日志文件已清理"
            ;;
        3)
            print_info "清理今天之前的日志..."
            find logs/ -name "*.log" -type f ! -newermt "$(date +%Y-%m-%d)" -delete 2>/dev/null || true
            print_success "旧日志文件已清理"
            ;;
        1|*)
            print_info "取消清理"
            ;;
    esac
}

# 主循环
main() {
    check_logs

    while true; do
        show_menu
        read -p "请选择 (0-9): " choice

        case $choice in
            1)
                if [ -f "logs/backend.log" ]; then
                    print_info "开始实时显示后端日志 (按 Ctrl+C 退出)..."
                    tail -f logs/backend.log
                else
                    print_warning "后端日志文件不存在"
                fi
                ;;
            2)
                if [ -f "logs/frontend.log" ]; then
                    print_info "开始实时显示前端日志 (按 Ctrl+C 退出)..."
                    tail -f logs/frontend.log
                else
                    print_warning "前端日志文件不存在"
                fi
                ;;
            3)
                if [ -f "logs/combined.log" ]; then
                    print_info "开始实时显示综合日志 (按 Ctrl+C 退出)..."
                    tail -f logs/combined.log
                else
                    print_warning "综合日志文件不存在"
                fi
                ;;
            4)
                if [ -f "logs/backend.log" ] && [ -f "logs/frontend.log" ]; then
                    print_info "开始同时显示前端和后端日志 (按 Ctrl+C 退出)..."
                    print_info "前端日志将以 [FRONTEND] 前缀显示"
                    print_info "后端日志将以 [BACKEND] 前缀显示"
                    (tail -f logs/frontend.log | sed 's/^/[FRONTEND] /' &
                     tail -f logs/backend.log | sed 's/^/[BACKEND] /' &
                     wait)
                else
                    print_warning "前端或后端日志文件不存在"
                fi
                ;;
            5)
                if [ -f "logs/backend.log" ]; then
                    print_info "后端最近50行日志:"
                    echo ""
                    tail -n 50 logs/backend.log
                else
                    print_warning "后端日志文件不存在"
                fi
                ;;
            6)
                if [ -f "logs/frontend.log" ]; then
                    print_info "前端最近50行日志:"
                    echo ""
                    tail -n 50 logs/frontend.log
                else
                    print_warning "前端日志文件不存在"
                fi
                ;;
            7)
                search_logs
                ;;
            8)
                show_log_info
                ;;
            9)
                cleanup_logs
                ;;
            0)
                print_info "退出日志查看工具"
                exit 0
                ;;
            *)
                print_warning "无效选择，请重新输入"
                ;;
        esac

        # 除了实时日志查看，其他操作后暂停一下
        if [[ $choice != "1" && $choice != "2" && $choice != "3" && $choice != "4" ]]; then
            echo ""
            read -p "按回车键继续..."
        fi
    done
}

# 运行主函数
main "$@"