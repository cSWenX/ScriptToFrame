#!/bin/bash

# 火山引擎图片生成 Python 后端启动脚本

echo "🚀 启动火山引擎图片生成Python后端服务..."

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 Python3，请先安装 Python 3.8+"
    exit 1
fi

# 进入后端目录
cd "$(dirname "$0")"

# 检查是否存在虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "🔄 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "📦 安装依赖..."
pip install -r requirements.txt

# 检查环境变量
if [ ! -f ".env" ]; then
    echo "❌ 未找到 .env 文件，请检查配置"
    exit 1
fi

# 启动服务
echo "🚀 启动服务 (端口: 8081)..."
python main.py