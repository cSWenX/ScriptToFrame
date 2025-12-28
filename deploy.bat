@echo off
REM ScriptToFrame Windows 部署脚本
REM 自动检测环境并部署应用

setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              ScriptToFrame Windows 部署脚本                  ║
echo ║                自动检测并部署应用                             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM 检查是否在正确目录
if not exist "package.json" (
    echo [ERROR] 请在ScriptToFrame项目根目录下运行此脚本
    pause
    exit /b 1
)

echo [INFO] 检测环境...

REM 检查Docker是否安装
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker未安装！请先安装Docker Desktop for Windows
    echo 下载地址: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

for /f "tokens=3" %%v in ('docker --version') do (
    set DOCKER_VERSION=%%v
    goto :docker_version_done
)
:docker_version_done

echo [SUCCESS] Docker版本: %DOCKER_VERSION%

REM 检查Docker Compose
docker compose version >nul 2>&1
if %errorlevel% equ 0 (
    set COMPOSE_CMD=docker compose
    echo [SUCCESS] 使用Docker Compose V2
) else (
    docker-compose --version >nul 2>&1
    if !errorlevel! equ 0 (
        set COMPOSE_CMD=docker-compose
        echo [SUCCESS] 使用Docker Compose V1
    ) else (
        echo [ERROR] Docker Compose未找到！
        pause
        exit /b 1
    )
)

REM 选择部署模式
echo [INFO] 选择部署模式...
set DEPLOYMENT_MODE=modern
set COMPOSE_FILE=docker-compose.yml

REM 为Windows设置适当的环境
set COMPOSE_CONVERT_WINDOWS_PATHS=1
set DOCKER_DEFAULT_PLATFORM=linux/amd64

echo [INFO] Windows系统，使用标准模式: %COMPOSE_FILE%

REM 设置环境变量
echo [INFO] 配置环境变量...
if not exist ".env" (
    if exist ".env.production" (
        copy ".env.production" ".env" >nul
        echo [SUCCESS] 使用 .env.production 创建 .env 文件
    ) else if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [SUCCESS] 使用 .env.example 创建 .env 文件
    ) else (
        echo [WARNING] .env 文件不存在，正在创建模板...
        echo # ScriptToFrame 环境配置 > .env
        echo VOLCENGINE_ACCESS_KEY_ID=your_volcengine_access_key_id >> .env
        echo VOLCENGINE_SECRET_ACCESS_KEY=your_volcengine_secret_access_key >> .env
        echo ANTHROPIC_API_KEY=your_anthropic_api_key >> .env
        echo NODE_ENV=production >> .env
    )
)

REM 检查环境变量
findstr /R "^VOLCENGINE_ACCESS_KEY_ID=your_" .env >nul
if %errorlevel% equ 0 (
    echo [WARNING] 请编辑 .env 文件，填入真实的API密钥
    echo 需要配置：
    echo   - VOLCENGINE_ACCESS_KEY_ID
    echo   - VOLCENGINE_SECRET_ACCESS_KEY
    echo   - ANTHROPIC_API_KEY
    echo.
    pause
)

REM 部署应用
echo [INFO] 开始部署ScriptToFrame应用...

echo [INFO] 停止现有容器...
%COMPOSE_CMD% -f "%COMPOSE_FILE%" down >nul 2>&1

echo [INFO] 构建并启动容器...
%COMPOSE_CMD% -f "%COMPOSE_FILE%" up -d --build

if %errorlevel% neq 0 (
    echo [ERROR] 部署失败！请检查错误信息
    pause
    exit /b 1
)

echo [INFO] 等待服务启动完成...
timeout /t 15 /nobreak >nul

REM 检查服务状态
echo [INFO] 检查服务健康状态...

curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    set FRONTEND_OK=1
) else (
    set FRONTEND_OK=0
)

curl -s http://localhost:8081/api/health >nul 2>&1
if %errorlevel% equ 0 (
    set BACKEND_OK=1
) else (
    set BACKEND_OK=0
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    🎉 部署完成！                              ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                      访问地址                                 ║
echo ╠══════════════════════════════════════════════════════════════╣
if %FRONTEND_OK% equ 1 (
    echo ║ ✅ 前端应用: http://localhost:3000                           ║
) else (
    echo ║ ⚠️  前端应用: http://localhost:3000 ^(启动中^)                  ║
)
if %BACKEND_OK% equ 1 (
    echo ║ ✅ 后端API:  http://localhost:8081                           ║
    echo ║ ✅ API文档:  http://localhost:8081/docs                      ║
) else (
    echo ║ ⚠️  后端API:  http://localhost:8081 ^(启动中^)                  ║
    echo ║ ⚠️  API文档:  http://localhost:8081/docs ^(启动中^)             ║
)
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                      管理命令                                 ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║ 查看状态: %COMPOSE_CMD% -f %COMPOSE_FILE% ps                  ║
echo ║ 查看日志: %COMPOSE_CMD% -f %COMPOSE_FILE% logs -f            ║
echo ║ 重启服务: %COMPOSE_CMD% -f %COMPOSE_FILE% restart            ║
echo ║ 停止服务: %COMPOSE_CMD% -f %COMPOSE_FILE% down               ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                    Windows 提示                               ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║ • 确保Docker Desktop正在运行                                   ║
echo ║ • 如果访问有问题，检查Windows防火墙设置                          ║
echo ║ • 可以使用 localhost 或 127.0.0.1 访问                         ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo 按任意键退出...
pause >nul