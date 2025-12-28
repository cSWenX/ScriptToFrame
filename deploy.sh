#!/bin/bash

# ScriptToFrame 跨平台智能部署脚本
# 支持 Windows (WSL/Git Bash)、macOS、Linux
# 自动检测系统类型和Docker版本，选择最佳部署方案

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 平台检测变量
OS_TYPE=""
OS_VERSION=""
DOCKER_VERSION=""
COMPOSE_VERSION=""
DEPLOYMENT_MODE=""

# 打印函数
print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              ScriptToFrame 智能部署脚本                      ║"
    echo "║              跨平台自适应 Docker 部署                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检测操作系统
detect_os() {
    print_status "检测操作系统类型..."

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS_TYPE="linux"
        if [ -f /etc/os-release ]; then
            OS_VERSION=$(grep "^NAME=" /etc/os-release | cut -d'"' -f2)
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS_TYPE="macos"
        OS_VERSION=$(sw_vers -productName) $(sw_vers -productVersion)
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        OS_TYPE="windows"
        OS_VERSION="Windows"
    else
        OS_TYPE="unknown"
        OS_VERSION="Unknown"
    fi

    print_success "检测到操作系统: $OS_TYPE ($OS_VERSION)"
}

# 检测Docker版本
detect_docker() {
    print_status "检测Docker环境..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装！请先安装Docker"
        echo "安装指南:"
        case $OS_TYPE in
            "linux")
                echo "  Linux: curl -fsSL https://get.docker.com | sh"
                ;;
            "macos")
                echo "  macOS: 下载 Docker Desktop for Mac"
                ;;
            "windows")
                echo "  Windows: 下载 Docker Desktop for Windows"
                ;;
        esac
        exit 1
    fi

    DOCKER_VERSION=$(docker --version | grep -o '[0-9]\+\.[0-9]\+' | head -1)
    print_success "Docker版本: $DOCKER_VERSION"

    # 检测Docker Compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | grep -o '[0-9]\+\.[0-9]\+' | head -1)
        print_success "Docker Compose版本: $COMPOSE_VERSION"
    elif docker compose version &> /dev/null 2>&1; then
        COMPOSE_VERSION="v2"
        print_success "使用Docker Compose V2"
    else
        print_error "Docker Compose未找到！"
        exit 1
    fi
}

# 选择部署模式
choose_deployment_mode() {
    print_status "根据系统环境选择最佳部署模式..."

    # 检查Docker版本决定部署模式
    if [[ $(echo "$DOCKER_VERSION" | cut -d. -f1) -lt 20 ]]; then
        DEPLOYMENT_MODE="legacy"
        print_warning "检测到较老的Docker版本，使用兼容模式部署"
    else
        # 根据操作系统选择
        case $OS_TYPE in
            "linux")
                if [[ "$OS_VERSION" == *"CentOS"* ]] || [[ "$OS_VERSION" == *"Red Hat"* ]]; then
                    DEPLOYMENT_MODE="legacy"
                    print_status "CentOS/RHEL系统，使用兼容模式确保稳定性"
                else
                    DEPLOYMENT_MODE="modern"
                    print_status "现代Linux系统，使用标准模式"
                fi
                ;;
            "macos")
                DEPLOYMENT_MODE="modern"
                print_status "macOS系统，使用标准模式"
                ;;
            "windows")
                DEPLOYMENT_MODE="modern"
                print_status "Windows系统，使用标准模式"
                ;;
            *)
                DEPLOYMENT_MODE="legacy"
                print_warning "未知系统，使用兼容模式保证兼容性"
                ;;
        esac
    fi

    print_success "选择部署模式: $DEPLOYMENT_MODE"
}

# 设置环境变量
setup_environment() {
    print_status "配置环境变量..."

    if [ ! -f ".env" ]; then
        if [ -f ".env.production" ]; then
            cp .env.production .env
            print_success "使用 .env.production 创建 .env 文件"
        elif [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "使用 .env.example 创建 .env 文件"
        else
            print_warning ".env 文件不存在，请手动创建并配置API密钥"
            cat > .env << 'EOF'
# ScriptToFrame 环境配置
VOLCENGINE_ACCESS_KEY_ID=your_volcengine_access_key_id
VOLCENGINE_SECRET_ACCESS_KEY=your_volcengine_secret_access_key
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_BASE_URL=https://api.anthropic.com
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
NODE_ENV=production
EOF
        fi
    fi

    # 检查关键环境变量
    source .env
    if [[ -z "$VOLCENGINE_ACCESS_KEY_ID" ]] || [[ "$VOLCENGINE_ACCESS_KEY_ID" == "your_"* ]]; then
        print_warning "请编辑 .env 文件，填入真实的API密钥"
        echo "需要配置的关键变量:"
        echo "  - VOLCENGINE_ACCESS_KEY_ID"
        echo "  - VOLCENGINE_SECRET_ACCESS_KEY"
        echo "  - ANTHROPIC_API_KEY"
        echo ""
        read -p "配置完成后按回车键继续..."
    fi
}

# 获取compose命令
get_compose_command() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

# 部署应用
deploy_application() {
    print_status "开始部署ScriptToFrame应用..."

    local compose_cmd=$(get_compose_command)
    local compose_file=""

    # 根据部署模式选择配置文件
    if [[ "$DEPLOYMENT_MODE" == "legacy" ]]; then
        compose_file="docker-compose.legacy.yml"
        print_status "使用兼容配置: $compose_file"
    else
        compose_file="docker-compose.yml"
        print_status "使用标准配置: $compose_file"
    fi

    # 检查配置文件是否存在
    if [ ! -f "$compose_file" ]; then
        print_error "配置文件 $compose_file 不存在！"
        exit 1
    fi

    # 停止现有容器
    print_status "停止现有容器..."
    $compose_cmd -f "$compose_file" down 2>/dev/null || true

    # 构建并启动
    print_status "构建并启动容器..."
    if [[ "$OS_TYPE" == "windows" ]]; then
        # Windows下可能需要额外的权限处理
        COMPOSE_CONVERT_WINDOWS_PATHS=1 $compose_cmd -f "$compose_file" up -d --build
    else
        $compose_cmd -f "$compose_file" up -d --build
    fi

    # 等待服务启动
    print_status "等待服务启动完成..."
    sleep 15

    # 检查服务状态
    check_service_health "$compose_cmd" "$compose_file"
}

# 检查服务健康状态
check_service_health() {
    local compose_cmd=$1
    local compose_file=$2

    print_status "检查服务健康状态..."

    # 检查容器状态
    if ! $compose_cmd -f "$compose_file" ps | grep -q "Up"; then
        print_error "容器启动失败！"
        print_status "查看详细日志:"
        $compose_cmd -f "$compose_file" logs
        exit 1
    fi

    # 检查端口可访问性
    local frontend_ok=false
    local backend_ok=false

    for i in {1..10}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            frontend_ok=true
            break
        fi
        sleep 2
    done

    for i in {1..10}; do
        if curl -s http://localhost:8081/api/health > /dev/null 2>&1; then
            backend_ok=true
            break
        fi
        sleep 2
    done

    if $frontend_ok && $backend_ok; then
        print_success "✅ 所有服务启动成功！"
    elif $frontend_ok; then
        print_warning "⚠️  前端启动成功，后端可能仍在启动中"
    elif $backend_ok; then
        print_warning "⚠️  后端启动成功，前端可能仍在启动中"
    else
        print_warning "⚠️  服务可能仍在启动中，请稍候检查"
    fi
}

# 显示访问信息
show_access_info() {
    echo ""
    print_success "🎉 ScriptToFrame 部署完成！"
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                        访问地址                               ║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC} 📱 前端应用: ${GREEN}http://localhost:3000${NC}                     ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC} 🔧 后端API:  ${GREEN}http://localhost:8081${NC}                     ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC} 📖 API文档:  ${GREEN}http://localhost:8081/docs${NC}                ${CYAN}║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║                      管理命令                                 ║${NC}"
    echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"

    local compose_cmd=$(get_compose_command)
    local compose_file=""
    if [[ "$DEPLOYMENT_MODE" == "legacy" ]]; then
        compose_file="docker-compose.legacy.yml"
    else
        compose_file="docker-compose.yml"
    fi

    echo -e "${CYAN}║${NC} 查看状态: ${YELLOW}$compose_cmd -f $compose_file ps${NC}"
    echo -e "${CYAN}║${NC} 查看日志: ${YELLOW}$compose_cmd -f $compose_file logs -f${NC}"
    echo -e "${CYAN}║${NC} 重启服务: ${YELLOW}$compose_cmd -f $compose_file restart${NC}"
    echo -e "${CYAN}║${NC} 停止服务: ${YELLOW}$compose_cmd -f $compose_file down${NC}"
    echo -e "${CYAN}║${NC} 更新代码: ${YELLOW}git pull && $compose_cmd -f $compose_file up -d --build${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # 平台特定提示
    case $OS_TYPE in
        "windows")
            echo -e "${YELLOW}Windows 提示:${NC}"
            echo "• 确保Docker Desktop正在运行"
            echo "• 如果访问有问题，检查Windows防火墙设置"
            ;;
        "macos")
            echo -e "${YELLOW}macOS 提示:${NC}"
            echo "• 确保Docker Desktop正在运行"
            echo "• 可能需要允许Docker访问网络"
            ;;
        "linux")
            echo -e "${YELLOW}Linux 提示:${NC}"
            echo "• 检查防火墙设置: sudo ufw allow 3000,8081/tcp"
            echo "• 确保Docker服务正在运行: sudo systemctl status docker"
            ;;
    esac
    echo ""
}

# 主函数
main() {
    print_header

    # 检查是否在项目根目录
    if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
        print_error "请在ScriptToFrame项目根目录下运行此脚本"
        exit 1
    fi

    # 执行部署流程
    detect_os
    detect_docker
    choose_deployment_mode
    setup_environment
    deploy_application
    show_access_info
}

# 运行主函数
main "$@"