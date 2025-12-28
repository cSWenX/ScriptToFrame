# ScriptToFrame Node.js 16 兼容性指南

## 🟡 Node.js 16 兼容性状态

**当前状态**: 需要调整依赖版本，但可以兼容运行

### 主要问题
- Next.js 14+ 要求 Node.js ≥18.17.0
- 某些依赖包针对Node.js 18+优化

### 解决方案
提供Node.js 16兼容版本配置文件

## 🚀 Node.js 16 部署方式

### 方法1: 使用兼容版本Docker部署 (推荐)

```bash
# 克隆项目
git clone https://github.com/cSWenX/ScriptToFrame.git
cd ScriptToFrame

# 使用Node.js 16兼容配置
docker-compose -f docker-compose.node16.yml up -d --build
```

### 方法2: 本地Node.js 16环境

```bash
# 1. 使用兼容的package.json
cp package.node16.json package.json
cp next.config.node16.js next.config.js

# 2. 安装依赖 (使用兼容版本)
npm install

# 3. 启动开发
npm run dev

# 4. 或构建生产版本
npm run build
npm start
```

## 📋 兼容性调整说明

### 降级的依赖包

| 包名 | 原版本 | Node.js 16兼容版本 |
|------|--------|-------------------|
| **Next.js** | ^14.2.0 | ^13.5.0 |
| **@anthropic-ai/sdk** | ^0.24.0 | ^0.20.0 |
| **@types/node** | ^20.0.0 | ^18.0.0 |
| **axios** | ^1.13.2 | ^1.4.0 |

### 配置调整

1. **移除** `output: 'standalone'` (Next.js 13兼容)
2. **移除** `experimental.outputFileTracing`
3. **保留** `swcMinify: false` (使用Babel代替SWC)

## ⚠️ 注意事项

### 功能差异
- 构建速度可能稍慢 (使用Babel而非SWC)
- 某些新特性可能不可用
- 但核心功能完全兼容

### 推荐升级
建议升级到 Node.js 18+ 以获得最佳性能和完整功能

## 🔧 Node.js 16 管理命令

```bash
# Node.js 16 Docker版本管理
docker-compose -f docker-compose.node16.yml ps
docker-compose -f docker-compose.node16.yml logs -f
docker-compose -f docker-compose.node16.yml restart
docker-compose -f docker-compose.node16.yml down

# 更新Node.js 16版本
git pull origin main
docker-compose -f docker-compose.node16.yml up -d --build
```

## 🎯 验证兼容性

```bash
# 检查Node.js版本
node --version  # 应显示 v16.x.x

# 验证应用启动
npm run dev

# 检查访问
curl http://localhost:3000
curl http://localhost:8081/api/health
```

## ⬆️ 升级建议

虽然提供Node.js 16兼容版本，但强烈推荐升级到Node.js 18+：

```bash
# 使用nvm管理Node.js版本
nvm install 18
nvm use 18

# 然后使用标准版本部署
docker-compose up -d --build
```