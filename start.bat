@echo off
setlocal enabledelayedexpansion

REM Script to Frame - Windows 启动脚本
REM 可以同时启动前端和后端服务

echo.
echo === Script to Frame 启动脚本 ===
echo.

REM 检查依赖
echo [INFO] 检查依赖...

REM 检查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查 Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python 未安装，请先安装 Python
    pause
    exit /b 1
)

echo [SUCCESS] 依赖检查通过

REM 终止现有进程
echo [INFO] 终止现有进程...
taskkill /f /im "node.exe" >nul 2>&1
taskkill /f /im "python.exe" >nul 2>&1
timeout /t 2 /nobreak >nul

REM 启动 Python 后端
echo [INFO] 启动 Python 后端...
cd python-backend

REM 检查虚拟环境
if not exist "venv" (
    echo [WARNING] 虚拟环境不存在，正在创建...
    python -m venv venv
)

REM 激活虚拟环境
call venv\Scripts\activate

REM 安装依赖
echo [INFO] 检查 Python 依赖...
pip install -r requirements.txt >nul 2>&1

REM 检查环境变量
if not exist ".env" (
    echo [WARNING] .env 文件不存在，请确保配置了正确的 API 凭证
)

REM 启动后端服务
echo [INFO] 启动 FastAPI 服务 (端口 8081)...
start /b "Python Backend" uvicorn main:app --host 0.0.0.0 --port 8081 --reload

cd ..

REM 等待后端启动
timeout /t 5 /nobreak >nul

REM 启动 Next.js 前端
echo [INFO] 启动 Next.js 前端...

REM 检查 package.json
if not exist "package.json" (
    echo [ERROR] package.json 不存在
    pause
    exit /b 1
)

REM 安装依赖
echo [INFO] 检查 Node.js 依赖...
call npm install >nul 2>&1

REM 检查环境变量
if not exist ".env.local" (
    echo [WARNING] .env.local 文件不存在，请确保配置了正确的环境变量
)

REM 启动前端服务
echo [INFO] 启动 Next.js 开发服务器 (端口 3000)...
start /b "Next.js Frontend" npm run dev

REM 等待前端启动
timeout /t 8 /nobreak >nul

echo.
echo [INFO] === 服务状态 ===
echo.
echo [SUCCESS] ✅ Python 后端: http://localhost:8081 (运行中)
echo [INFO]    - API文档: http://localhost:8081/docs
echo [INFO]    - 健康检查: http://localhost:8081/api/health
echo.
echo [SUCCESS] ✅ Next.js 前端: http://localhost:3000 (运行中)
echo.
echo [INFO] === 使用说明 ===
echo.
echo [INFO] 1. 访问应用: http://localhost:3000
echo [INFO] 2. 查看API文档: http://localhost:8081/docs
echo [INFO] 3. 停止服务: 关闭此窗口或运行 stop.bat
echo.

REM 打开浏览器
echo [INFO] 正在打开浏览器...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo [INFO] 服务已启动，按任意键停止所有服务...
pause >nul

REM 停止所有服务
echo [INFO] 正在停止服务...
taskkill /f /im "node.exe" >nul 2>&1
taskkill /f /im "python.exe" >nul 2>&1

echo [SUCCESS] 所有服务已停止
pause