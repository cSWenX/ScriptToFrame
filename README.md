# ScriptToFrame 项目文档

## 项目概述

ScriptToFrame 是一个自动将漫剧剧本转换为分镜图的AI工具。

### 核心功能
- 剧本智能解析（基于Claude）
- 关键帧自动识别
- 分镜图生成（基于火山引擎即梦API）
- 参考图一致性控制
- 可视化分镜结果展示

### 技术栈
- **前端**: Next.js + React + TypeScript + Tailwind CSS
- **后端**: Node.js + Express
- **AI服务**:
  - Claude API (剧本解析)
  - 火山引擎即梦API (图片生成)
- **部署**: 本地开发

## 项目结构
```
script-to-frame/
├── components/          # React组件
├── lib/                 # 工具库和API集成
├── pages/               # Next.js页面路由
├── types/               # TypeScript类型定义
├── styles/              # 样式文件
├── docs/                # 项目文档
├── public/              # 静态资源
└── package.json         # 项目配置
```

## 开发指南

### 环境配置
创建 `.env.local` 文件：
```
VOLCENGINE_ACCESS_KEY_ID=你的火山引擎访问密钥ID
VOLCENGINE_SECRET_ACCESS_KEY=你的火山引擎密钥
ANTHROPIC_API_KEY=你的Claude API密钥
```

### 快速启动 🚀

我们提供了多种启动方式，推荐使用一键启动脚本：

#### 方法1: 一键启动 (推荐)
```bash
# Linux/macOS
./start.sh

# Windows
start.bat
```

#### 方法2: npm scripts
```bash
# 启动所有服务 (前端+后端)
npm run start:all

# 仅启动前端
npm run dev

# 仅启动后端
npm run backend
```

#### 方法3: 手动启动
```bash
# 安装依赖
npm install

# 启动前端 (端口3000)
npm run dev

# 在新终端启动后端 (端口8081)
cd python-backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8081 --reload
```

### 停止服务
```bash
# Linux/macOS
./stop.sh

# npm 方式
npm run stop:all
```

### 访问地址
- 前端应用: http://localhost:3000
- 后端API: http://localhost:8081
- API文档: http://localhost:8081/docs

详细说明请查看 [启动指南](STARTUP_GUIDE.md)

## API集成说明

### 火山引擎即梦API
- 模型: jimeng_t2i_v40
- 输出比例: 16:9
- 支持参考图功能

### Claude API
- 模型: Claude-3-Sonnet
- 用途: 剧本解析和分镜规划