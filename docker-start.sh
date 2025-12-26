#!/bin/bash

# ScriptToFrame Docker 快速启动脚本
# 用于快速部署和测试

set -e

echo "🐳 ScriptToFrame Docker 快速启动"
echo "=================================="

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker Desktop"
    echo "下载地址: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose未安装，请先安装docker-compose"
    exit 1
fi

echo "✅ Docker环境检查通过"

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env文件不存在，正在创建..."

    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ 已创建.env文件（从.env.example复制）"
        echo ""
        echo "🔑 请编辑.env文件，填入你的API密钥："
        echo "   - VOLCENGINE_ACCESS_KEY_ID=你的火山引擎密钥ID"
        echo "   - VOLCENGINE_SECRET_ACCESS_KEY=你的火山引擎密钥"
        echo "   - ANTHROPIC_API_KEY=你的Claude_API密钥"
        echo "   - DEEPSEEK_API_KEY=你的DeepSeek_API密钥"
        echo ""
        echo "编辑完成后，重新运行此脚本。"
        echo ""
        echo "可以使用以下命令编辑:"
        echo "   nano .env    (或 vim .env)"
        exit 0
    else
        echo "❌ .env.example文件不存在，无法创建.env"
        exit 1
    fi
fi

echo "✅ .env文件存在"

# 检查关键环境变量
source .env

required_vars=("VOLCENGINE_ACCESS_KEY_ID" "VOLCENGINE_SECRET_ACCESS_KEY" "ANTHROPIC_API_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ 以下环境变量未设置:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "请编辑.env文件，填入正确的API密钥"
    exit 1
fi

echo "✅ 环境变量检查通过"

# 停止现有容器（如果存在）
echo "🛑 停止现有容器..."
docker-compose down 2>/dev/null || true

# 构建并启动
echo "🏗️  构建Docker镜像..."
docker-compose build

echo "🚀 启动服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动（约30秒）..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."

# 等待前端启动
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ 前端服务已启动"
        break
    fi
    sleep 2
    counter=$((counter + 2))
    echo "   等待前端启动... ($counter/$timeout秒)"
done

if [ $counter -ge $timeout ]; then
    echo "❌ 前端服务启动超时"
    echo "查看日志: docker-compose logs"
    exit 1
fi

# 等待后端启动
counter=0
while [ $counter -lt $timeout ]; do
    if curl -s http://localhost:8081/api/health > /dev/null 2>&1; then
        echo "✅ 后端服务已启动"
        break
    fi
    sleep 2
    counter=$((counter + 2))
    echo "   等待后端启动... ($counter/$timeout秒)"
done

if [ $counter -ge $timeout ]; then
    echo "❌ 后端服务启动超时"
    echo "查看日志: docker-compose logs"
    exit 1
fi

echo ""
echo "🎉 ScriptToFrame 启动成功！"
echo "=================================="
echo ""
echo "📱 访问地址："
echo "   主应用: http://localhost:3000"
echo "   API文档: http://localhost:8081/docs"
echo "   健康检查: http://localhost:8081/api/health"
echo ""
echo "📋 常用命令："
echo "   查看日志: docker-compose logs -f"
echo "   停止服务: docker-compose down"
echo "   重启服务: docker-compose restart"
echo "   进入容器: docker-compose exec scripttoframe /bin/bash"
echo ""
echo "🔧 故障排除："
echo "   如果遇到问题，请查看日志:"
echo "   docker-compose logs scripttoframe"
echo ""

# 自动打开浏览器（可选）
if command -v open &> /dev/null; then
    echo "🌐 正在打开浏览器..."
    sleep 2
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    echo "🌐 正在打开浏览器..."
    sleep 2
    xdg-open http://localhost:3000
fi

echo "✅ 部署完成！"