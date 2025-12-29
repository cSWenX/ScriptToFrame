#!/bin/bash

# Docker容器网络诊断脚本

echo "=== Docker容器网络诊断 ==="

# 检查容器状态
echo "1. 检查容器状态..."
docker-compose -f docker-compose.legacy.yml ps

echo -e "\n2. 检查环境变量..."
docker-compose -f docker-compose.legacy.yml exec scripttoframe bash -c "printenv | grep -E '(VOLCENGINE|ANTHROPIC|DEEPSEEK)'"

echo -e "\n3. 测试容器内网络连接..."
echo "测试DNS解析..."
docker-compose -f docker-compose.legacy.yml exec scripttoframe bash -c "nslookup api.volcengine.com" || echo "DNS解析失败"

echo -e "\n测试HTTPS连接..."
docker-compose -f docker-compose.legacy.yml exec scripttoframe bash -c "curl -I --connect-timeout 10 https://api.volcengine.com" || echo "HTTPS连接失败"

echo -e "\n测试火山引擎API..."
docker-compose -f docker-compose.legacy.yml exec scripttoframe bash -c "curl -I --connect-timeout 10 https://visual.volcengineapi.com" || echo "火山引擎API连接失败"

echo -e "\n4. 检查容器网络配置..."
docker-compose -f docker-compose.legacy.yml exec scripttoframe bash -c "cat /etc/resolv.conf"

echo -e "\n5. 查看最近的错误日志..."
docker-compose -f docker-compose.legacy.yml logs scripttoframe | grep -i "error\|failed\|timeout" | tail -10

echo -e "\n=== 诊断完成 ==="