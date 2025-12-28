#!/bin/bash

# ScriptToFrame - Docker容器启动脚本

# 等待网络就绪
sleep 5

# 启动后端API服务
cd /app/backend
uvicorn main:app --host 0.0.0.0 --port 8081 &

# 等待后端启动
sleep 10

# 启动前端服务
cd /app
npm start &

# 保持容器运行
wait