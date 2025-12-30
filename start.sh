#!/bin/bash

# 1. 启动 Python 后端 (放在后台运行)
# 注意：请确保下面的路径指向你真实的 python 启动文件
# -u 参数表示"不缓存日志"，这样你能立刻在 docker logs 里看到 Python 的报错
echo "正在启动 Python 后端..."
python3 -u ./python-backend/main.py &
# 2. 等待几秒，确保 Python 先跑起来 (可选)
sleep 5

# 3. 启动 Node 前端 (放在前台运行)
# 必须有一个进程在前台跑，不然容器执行完脚本就会自动退出
echo "正在启动 Node 服务..."
npm start
