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

### 启动命令
```bash
npm install
npm run dev
```

## API集成说明

### 火山引擎即梦API
- 模型: jimeng_t2i_v40
- 输出比例: 16:9
- 支持参考图功能

### Claude API
- 模型: Claude-3-Sonnet
- 用途: 剧本解析和分镜规划