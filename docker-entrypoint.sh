#!/bin/bash

# Docker 容器启动脚本 - 兼容版
# 适用于老版本Docker环境

set -e

echo "🚀 Starting ScriptToFrame services..."

# 设置默认环境变量
export NODE_ENV=${NODE_ENV:-production}
export PYTHON_ENV=${PYTHON_ENV:-production}

# 检查关键环境变量
echo "🔍 Checking environment variables..."

if [ -n "$VOLCENGINE_ACCESS_KEY_ID" ]; then
    echo "✅ VOLCENGINE_ACCESS_KEY_ID is set"
else
    echo "⚠️  Warning: VOLCENGINE_ACCESS_KEY_ID is not set"
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "✅ ANTHROPIC_API_KEY is set"
else
    echo "⚠️  Warning: ANTHROPIC_API_KEY is not set"
fi

echo "✅ Environment check completed"

# 创建日志目录
mkdir -p /app/logs
cd /app

# 启动Python后端
echo "🐍 Starting Python backend on port 8081..."
cd /app/python-backend

# 创建后端环境变量文件
cat > .env << EOF
VOLCENGINE_ACCESS_KEY_ID=${VOLCENGINE_ACCESS_KEY_ID}
VOLCENGINE_SECRET_ACCESS_KEY=${VOLCENGINE_SECRET_ACCESS_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
ANTHROPIC_BASE_URL=${ANTHROPIC_BASE_URL:-https://api.anthropic.com}
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
DEEPSEEK_BASE_URL=${DEEPSEEK_BASE_URL:-https://api.deepseek.com/v1}
EOF

# 启动Python后端服务
echo "Starting uvicorn server..."
python3 -m uvicorn main:app --host 0.0.0.0 --port 8081 --log-level info > /app/logs/backend.log 2>&1 &
BACKEND_PID=$!

echo "⏳ Waiting for backend to start..."
sleep 10

# 检查后端是否启动成功
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start, checking logs..."
    cat /app/logs/backend.log
    exit 1
fi

echo "✅ Backend started successfully (PID: $BACKEND_PID)"

# 回到前端目录
cd /app

# 创建前端环境变量文件
cat > .env.local << EOF
VOLCENGINE_ACCESS_KEY_ID=${VOLCENGINE_ACCESS_KEY_ID}
VOLCENGINE_SECRET_ACCESS_KEY=${VOLCENGINE_SECRET_ACCESS_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
ANTHROPIC_BASE_URL=${ANTHROPIC_BASE_URL:-https://api.anthropic.com}
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
DEEPSEEK_BASE_URL=${DEEPSEEK_BASE_URL:-https://api.deepseek.com/v1}
PYTHON_BACKEND_URL=http://localhost:8081
NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME:-ScriptToFrame}
NEXT_PUBLIC_VERSION=${NEXT_PUBLIC_VERSION:-1.0.0}
EOF

# 启动Next.js前端
echo "🌐 Starting Next.js frontend on port 3000..."

# 启动前端服务
echo "Starting Next.js server..."
npm start > /app/logs/frontend.log 2>&1 &
FRONTEND_PID=$!

echo "⏳ Waiting for frontend to start..."
sleep 8

# 检查前端是否启动成功
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Frontend failed to start, checking logs..."
    cat /app/logs/frontend.log
    exit 1
fi

echo "✅ Frontend started successfully (PID: $FRONTEND_PID)"

# 显示服务状态
echo ""
echo "🎉 ScriptToFrame is running!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8081"
echo "📖 API Docs: http://localhost:8081/docs"
echo "📝 Logs directory: /app/logs/"
echo ""

# 等待2秒后进行健康检查
sleep 2

# 简单的健康检查
echo "🏥 Health checking services..."
if curl -f http://localhost:8081/api/health > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
else
    echo "⚠️  Backend health check failed, but continuing..."
fi

echo "🎯 ScriptToFrame deployment completed successfully!"

# 保持容器运行并处理信号
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo "✅ All services stopped"
    exit 0
}

trap cleanup TERM INT

# 等待进程结束
while kill -0 $BACKEND_PID 2>/dev/null && kill -0 $FRONTEND_PID 2>/dev/null; do
    sleep 5
done

echo "⚠️  One or more services stopped unexpectedly"
cleanup