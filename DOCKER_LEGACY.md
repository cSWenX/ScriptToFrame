# ScriptToFrame 老版本Docker部署指南

针对CentOS7等使用老版本Docker的系统，提供兼容性部署方案。

## 🚀 快速部署

### 1. 拉取最新代码

```bash
cd /opt/ScriptToFrame
git pull origin main
```

### 2. 配置环境变量

```bash
# 复制并编辑环境变量文件
cp .env.production .env
nano .env

# 确保填入真实的API密钥
VOLCENGINE_ACCESS_KEY_ID=你的火山引擎访问密钥ID
VOLCENGINE_SECRET_ACCESS_KEY=你的火山引擎密钥
ANTHROPIC_API_KEY=你的Claude_API密钥
```

### 3. 使用兼容版Docker配置部署

```bash
# 使用兼容版docker-compose配置
docker-compose -f docker-compose.legacy.yml up -d --build

# 查看部署状态
docker-compose -f docker-compose.legacy.yml ps

# 查看日志
docker-compose -f docker-compose.legacy.yml logs -f
```

## 🔧 兼容性改进

### 主要变更：

1. **Dockerfile.legacy**: 兼容老版本Docker的简化构建文件
2. **docker-entrypoint.sh**: 优化的启动脚本，使用python3命令，增强错误处理
3. **docker-compose.legacy.yml**: 简化的Docker Compose配置

### 技术特性：

- ✅ 移除了新版Docker特有的构建标志
- ✅ 使用标准的单阶段构建避免兼容性问题
- ✅ python3明确指定避免python命令问题
- ✅ 增强的启动脚本错误处理和日志记录
- ✅ 简化的健康检查避免复杂的依赖

## 📋 管理命令

```bash
# 查看服务状态
docker-compose -f docker-compose.legacy.yml ps

# 查看日志
docker-compose -f docker-compose.legacy.yml logs

# 重启服务
docker-compose -f docker-compose.legacy.yml restart

# 停止服务
docker-compose -f docker-compose.legacy.yml down

# 重新构建
docker-compose -f docker-compose.legacy.yml up -d --build
```

## 🎯 访问地址

部署成功后访问：
- **前端应用**: http://服务器IP:3000
- **后端API**: http://服务器IP:8081
- **API文档**: http://服务器IP:8081/docs

## ⚠️ 注意事项

1. **环境变量**: 确保.env文件包含有效的API密钥
2. **防火墙**: 确保开放3000和8081端口
3. **内存**: 建议至少2GB内存
4. **日志**: 容器日志保存在./logs目录