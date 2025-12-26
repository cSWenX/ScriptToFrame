# ScriptToFrame 开发指南

## 概述

本文档为新开发者提供详细的开发环境搭建、代码规范、调试方法和贡献指南，帮助快速上手ScriptToFrame项目开发。

## 技术栈概览

```
┌─────────────────────────────────────────────────────────────────┐
│                      技术栈架构                                   │
└─────────────────────────────────────────────────────────────────┘

前端技术栈:
┌─────────────────┐
│     React       │ ← UI组件库 (18.3.1)
├─────────────────┤
│     Next.js     │ ← 全栈框架 (14.2.0)
├─────────────────┤
│   TypeScript    │ ← 类型安全 (5.0.0)
├─────────────────┤
│  Tailwind CSS   │ ← 原子化CSS
├─────────────────┤
│     Axios       │ ← HTTP客户端
└─────────────────┘

后端技术栈:
┌─────────────────┐
│   Node.js API   │ ← API路由处理
├─────────────────┤
│   FastAPI       │ ← Python Web框架
├─────────────────┤
│ 火山引擎 SDK     │ ← 图片生成
├─────────────────┤
│  DeepSeek API   │ ← 剧本分析
└─────────────────┘

开发工具:
┌─────────────────┐
│      ESLint     │ ← 代码检查
├─────────────────┤
│    Prettier     │ ← 代码格式化
├─────────────────┤
│       Git       │ ← 版本控制
├─────────────────┤
│      VS Code    │ ← 推荐编辑器
└─────────────────┘
```

## 开发环境搭建

### 1. 系统要求

**操作系统**: Windows 10/11, macOS 12+, Ubuntu 20.04+

**必需软件**:
```bash
Node.js: 18.0.0+ (推荐18.19.0)
Python: 3.11.0+ (推荐3.11.7)
Git: 2.40.0+
npm: 9.0.0+ (或 yarn 1.22.0+)
```

**推荐软件**:
```bash
VS Code: 最新版本
Docker: 24.0.0+ (可选)
Postman: API测试工具
```

### 2. IDE配置

**VS Code推荐插件**:
```json
{
  "recommendations": [
    // JavaScript/TypeScript
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",

    // Python
    "ms-python.python",
    "ms-python.autopep8",
    "ms-python.pylint",

    // React/Next.js
    "ms-vscode.vscode-react-native",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",

    // 代码质量
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "streetsidesoftware.code-spell-checker",

    // 工具
    "ms-vscode.vscode-git-graph",
    "ms-vscode.hexdump",
    "ms-vscode.live-server"
  ]
}
```

**VS Code用户设置 (.vscode/settings.json)**:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  },
  "files.associations": {
    "*.jsx": "javascriptreact",
    "*.tsx": "typescriptreact"
  },
  "python.defaultInterpreterPath": "./python-backend/venv/bin/python",
  "python.formatting.provider": "autopep8",
  "python.linting.pylintEnabled": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[python]": {
    "editor.defaultFormatter": "ms-python.autopep8"
  }
}
```

### 3. 项目克隆和初始化

**克隆项目**:
```bash
# 克隆代码库
git clone <repository-url>
cd script-to-frame

# 查看项目结构
tree -I 'node_modules|venv|__pycache__' -L 3
```

**环境配置**:
```bash
# 1. 复制环境变量模板
cp .env .env.local

# 2. 编辑环境变量 (添加真实的API密钥)
nano .env.local  # 或使用VS Code: code .env.local
```

**前端依赖安装**:
```bash
# 安装Node.js依赖
npm install

# 验证安装
npm list --depth=0

# 检查安全漏洞
npm audit
```

**Python后端环境**:
```bash
cd python-backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate     # Windows

# 安装依赖
pip install -r requirements.txt

# 验证安装
pip list

# 返回项目根目录
cd ..
```

### 4. 开发服务器启动

**方式1: 手动启动 (推荐用于开发)**:
```bash
# 终端1 - 启动Python后端
cd python-backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8081 --reload

# 终端2 - 启动前端
npm run dev
```

**方式2: 使用启动脚本**:
```bash
# Linux/macOS
./start.sh

# Windows
start.bat
```

**验证服务**:
```bash
# 检查前端服务
curl http://localhost:3000

# 检查Python后端服务
curl http://localhost:8081/api/health

# 检查API集成
curl -X POST http://localhost:3000/api/intelligent-analyze-script \
  -H "Content-Type: application/json" \
  -d '{"script": "测试剧本", "sceneCount": 3, "style": "anime", "genre": "general"}'
```

## 代码结构和规范

### 1. 项目目录结构

```
script-to-frame/
├── components/                # React组件
│   ├── ScriptInput.jsx       # 剧本输入组件
│   ├── ControlPanel.jsx      # 控制面板组件
│   ├── StoryboardDisplay.jsx # 分镜显示组件
│   └── ProgressBar.js        # 进度条组件
├── pages/                    # Next.js页面和API路由
│   ├── index.js             # 主页面
│   ├── _app.js              # 应用配置
│   └── api/                 # API路由
│       ├── intelligent-analyze-script.js  # AI分析API
│       ├── generate-image-python.js       # 图片生成代理
│       └── generate-all-images.js         # 批量生成API
├── lib/                      # 工具库和API集成
│   ├── claude-api.js        # Claude API集成
│   ├── volcengine-api.js    # 火山引擎API集成
│   └── image-utils.js       # 图片处理工具
├── styles/                  # 样式文件
│   ├── globals.css          # 全局样式
│   └── components.css       # 组件样式
├── config/                  # 配置文件
│   └── api-config.js        # API配置
├── types/                   # TypeScript类型定义
│   └── index.ts             # 类型定义
├── python-backend/          # Python后端服务
│   ├── main.py             # FastAPI主入口
│   ├── requirements.txt    # Python依赖
│   └── venv/               # Python虚拟环境
├── docs/                    # 项目文档
├── logs/                    # 日志文件
├── scripts/                 # 工具脚本
├── .env                     # 环境变量模板
├── .env.local              # 本地环境变量 (不提交到Git)
├── package.json            # Node.js依赖和脚本
├── tailwind.config.js      # Tailwind CSS配置
├── next.config.js          # Next.js配置
└── README.md               # 项目说明
```

### 2. 编码规范

**JavaScript/TypeScript规范**:

```javascript
// ✅ 良好的组件结构
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * ScriptInput 组件 - 剧本输入功能
 * @param {Object} props - 组件属性
 * @param {string} props.value - 当前剧本内容
 * @param {Function} props.onChange - 内容变化回调
 * @param {Function} props.onValidate - 验证回调
 */
const ScriptInput = ({ value, onChange, onValidate }) => {
  const [wordCount, setWordCount] = useState(0);
  const [isValid, setIsValid] = useState(true);

  // 使用useEffect处理副作用
  useEffect(() => {
    const words = value.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [value]);

  // 事件处理函数命名规范
  const handleChange = (e) => {
    const newValue = e.target.value;

    // 验证逻辑
    const isValid = validateScript(newValue);
    setIsValid(isValid);

    // 触发回调
    onChange(newValue);
    onValidate?.(isValid);
  };

  // 辅助函数
  const validateScript = (script) => {
    return script.length >= 20;
  };

  return (
    <div className="script-input">
      {/* 组件内容 */}
    </div>
  );
};

// PropTypes定义
ScriptInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onValidate: PropTypes.func
};

export default ScriptInput;
```

**Python代码规范**:

```python
"""
ScriptToFrame Python后端 - 图片生成服务
"""

import os
import asyncio
import time
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# 常量定义 (大写)
REQ_KEY = "jimeng_t2i_v40"
MAX_POLL_TIMES = 150
POLL_INTERVAL = 2

# 类型定义
class ImageGenerationRequest(BaseModel):
    """图片生成请求模型"""
    prompt: str
    frame: Optional[Dict[str, Any]] = None

class ImageGenerationResponse(BaseModel):
    """图片生成响应模型"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# 工具函数
def validate_prompt(prompt: str) -> bool:
    """
    验证提示词格式

    Args:
        prompt: 输入的提示词

    Returns:
        bool: 验证结果
    """
    return len(prompt.strip()) > 0

async def generate_image_with_sdk(
    prompt: str,
    request_id: str = None
) -> str:
    """
    使用SDK生成图片

    Args:
        prompt: 图片生成提示词
        request_id: 请求ID，用于日志追踪

    Returns:
        str: 生成的图片URL或base64数据

    Raises:
        HTTPException: 当生成失败时抛出
    """
    if not request_id:
        request_id = f"img_{int(time.time())}"

    print(f"🎨 [Python后端-{request_id}] 开始生成图片")

    try:
        # 具体实现
        result = await _call_volcengine_api(prompt)
        return result

    except Exception as error:
        print(f"❌ [Python后端-{request_id}] 生成失败: {error}")
        raise HTTPException(
            status_code=500,
            detail=f"图片生成失败: {str(error)}"
        )

# 私有函数使用下划线前缀
async def _call_volcengine_api(prompt: str) -> str:
    """调用火山引擎API的私有函数"""
    # 实现细节
    pass
```

**命名约定**:

```javascript
// 文件命名 (kebab-case)
intelligent-analyze-script.js
generate-image-python.js
api-config.js

// 组件命名 (PascalCase)
ScriptInput
ControlPanel
StoryboardDisplay

// 变量和函数命名 (camelCase)
const analysisResult = {};
const handleAnalyzeScript = () => {};

// 常量命名 (SCREAMING_SNAKE_CASE)
const MAX_RETRY_ATTEMPTS = 3;
const API_TIMEOUT = 60000;

// CSS类命名 (kebab-case with BEM)
.cyber-button
.cyber-button--primary
.cyber-button__icon
```

### 3. 代码质量工具

**ESLint配置 (.eslintrc.json)**:
```json
{
  "extends": [
    "next/core-web-vitals",
    "eslint:recommended"
  ],
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off",
    "prefer-const": "error",
    "no-var": "error",
    "object-curly-spacing": ["error", "always"],
    "array-bracket-spacing": ["error", "never"],
    "comma-dangle": ["error", "never"],
    "quotes": ["error", "single"],
    "semi": ["error", "always"]
  },
  "env": {
    "browser": true,
    "node": true,
    "es6": true
  }
}
```

**Prettier配置 (.prettierrc)**:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

**Python代码格式化 (setup.cfg)**:
```ini
[flake8]
max-line-length = 88
extend-ignore = E203, W503
exclude = venv, __pycache__, .git

[autopep8]
max_line_length = 88
ignore = E203, W503
```

## 调试和测试

### 1. 前端调试

**React DevTools使用**:
```javascript
// 在组件中添加调试信息
const ScriptInput = ({ value, onChange }) => {
  // 添加调试props
  useEffect(() => {
    console.log('ScriptInput rendered with:', { value });
  }, [value]);

  return <div>{/* 组件内容 */}</div>;
};
```

**浏览器调试工具**:
```javascript
// 在代码中添加断点
const handleAnalyze = async () => {
  debugger; // 浏览器会在这里暂停

  const result = await analyzeScript(script);
  console.log('分析结果:', result);
};

// 使用console.table查看对象
console.table(frames);

// 使用console.time测量性能
console.time('API调用');
const result = await fetch('/api/analyze');
console.timeEnd('API调用');
```

**Next.js调试配置**:
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // 开发环境优化
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.devtool = 'cheap-module-source-map';
    }
    return config;
  },

  // API路由调试
  async rewrites() {
    return [
      {
        source: '/api/debug/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
```

### 2. Python后端调试

**FastAPI调试模式**:
```python
# main.py
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(debug=True)  # 开启调试模式

# 添加调试中间件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    # 记录请求
    print(f"🔍 [DEBUG] {request.method} {request.url}")

    response = await call_next(request)

    # 记录响应时间
    process_time = time.time() - start_time
    print(f"⏱️ [DEBUG] 响应时间: {process_time:.3f}s")

    return response
```

**使用pdb调试器**:
```python
import pdb

async def generate_image_with_sdk(prompt: str):
    # 设置断点
    pdb.set_trace()

    # 调试变量
    print(f"prompt: {prompt}")

    # 继续执行
    result = await call_api(prompt)
    return result
```

**VS Code调试配置 (.vscode/launch.json)**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Next.js",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "console": "integratedTerminal",
      "env": {
        "NODE_OPTIONS": "--inspect"
      }
    },
    {
      "name": "Debug Python Backend",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/python-backend/main.py",
      "cwd": "${workspaceFolder}/python-backend",
      "env": {
        "PYTHONPATH": "${workspaceFolder}/python-backend"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

### 3. API测试

**Postman集合示例**:
```json
{
  "info": {
    "name": "ScriptToFrame API",
    "version": "1.0.0"
  },
  "item": [
    {
      "name": "健康检查",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/health"
      }
    },
    {
      "name": "AI智能分析",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/intelligent-analyze-script",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"script\": \"张三站在山顶，凝视远方的夕阳...\",\n  \"sceneCount\": 3,\n  \"style\": \"anime\",\n  \"genre\": \"xuanhuan\"\n}"
        },
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ]
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    }
  ]
}
```

**curl测试命令**:
```bash
# 健康检查
curl -X GET http://localhost:3000/api/health

# AI分析接口测试
curl -X POST http://localhost:3000/api/intelligent-analyze-script \
  -H "Content-Type: application/json" \
  -d '{
    "script": "张三站在山顶，远处夕阳西下。他转身对小红说：我们回去吧。",
    "sceneCount": 2,
    "style": "anime",
    "genre": "romance"
  }' | jq .

# Python后端图片生成测试
curl -X POST http://localhost:8081/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Masterpiece, anime style, young man standing on mountain peak, sunset lighting --ar 16:9"
  }' | jq .
```

### 4. 单元测试 (可选扩展)

**Jest测试配置**:
```javascript
// __tests__/components/ScriptInput.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import ScriptInput from '../components/ScriptInput';

describe('ScriptInput', () => {
  test('renders input field', () => {
    render(
      <ScriptInput
        value=""
        onChange={() => {}}
        onValidate={() => {}}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  test('validates input length', () => {
    const mockValidate = jest.fn();

    render(
      <ScriptInput
        value=""
        onChange={() => {}}
        onValidate={mockValidate}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'short' } });

    expect(mockValidate).toHaveBeenCalledWith(false, expect.any(String));
  });
});
```

**Python测试示例**:
```python
# test_main.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    """测试健康检查接口"""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_generate_image():
    """测试图片生成接口"""
    test_data = {
        "prompt": "test prompt"
    }

    response = client.post("/api/generate-image", json=test_data)
    assert response.status_code == 200

    result = response.json()
    assert result["success"] is True
```

## Git工作流程

### 1. 分支策略

```
master/main     ← 生产分支 (只接受Release分支的合并)
    │
    ├─ release/v1.1.0    ← 发布分支
    │       │
    │       ├─ feature/ai-analysis-optimization    ← 功能分支
    │       ├─ feature/ui-improvements             ← 功能分支
    │       └─ hotfix/api-timeout-fix              ← 热修复分支
    │
    └─ develop      ← 开发分支 (集成分支)
            │
            ├─ feature/new-api-integration
            ├─ feature/performance-optimization
            └─ bugfix/memory-leak-fix
```

### 2. 提交规范

**Conventional Commits格式**:
```bash
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**提交类型**:
```bash
feat:     新功能
fix:      修复bug
docs:     文档修改
style:    代码格式修改
refactor: 代码重构
perf:     性能优化
test:     测试相关
build:    构建相关
ci:       CI/CD相关
chore:    其他修改
```

**提交示例**:
```bash
# 功能开发
git commit -m "feat(api): add intelligent script analysis endpoint

- Implement 4-step analysis workflow
- Add DeepSeek API integration
- Support multiple script formats

Closes #123"

# Bug修复
git commit -m "fix(frontend): resolve progress bar animation issue

The progress bar was not updating correctly during batch generation.
Fixed by updating the state management logic.

Fixes #456"

# 文档更新
git commit -m "docs: update API documentation with new endpoints"
```

### 3. 开发工作流

**创建新功能分支**:
```bash
# 从develop分支创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/new-feature-name

# 开发代码...
git add .
git commit -m "feat: implement new feature"

# 推送到远程
git push -u origin feature/new-feature-name
```

**合并代码**:
```bash
# 1. 更新本地develop分支
git checkout develop
git pull origin develop

# 2. 合并最新代码到功能分支
git checkout feature/new-feature-name
git merge develop

# 3. 解决冲突 (如果有)
# 编辑冲突文件...
git add .
git commit -m "resolve merge conflicts"

# 4. 推送更新
git push origin feature/new-feature-name

# 5. 创建Pull Request/Merge Request
```

**代码审查清单**:
```markdown
## 代码审查清单

### 功能性
- [ ] 功能按需求正确实现
- [ ] 边界情况处理完善
- [ ] 错误处理适当
- [ ] 性能表现良好

### 代码质量
- [ ] 代码结构清晰
- [ ] 命名规范一致
- [ ] 注释充分恰当
- [ ] 遵循项目编码规范

### 安全性
- [ ] 输入验证完整
- [ ] 敏感数据保护
- [ ] API密钥安全
- [ ] 无明显安全漏洞

### 测试
- [ ] 核心功能有测试覆盖
- [ ] 测试用例充分
- [ ] 测试通过
- [ ] 无回归问题
```

## 性能优化

### 1. 前端性能优化

**代码分割和懒加载**:
```javascript
// 使用动态导入进行代码分割
import dynamic from 'next/dynamic';

// 懒加载重型组件
const StoryboardDisplay = dynamic(
  () => import('../components/StoryboardDisplay'),
  {
    loading: () => <div className="cyber-spinner">Loading...</div>,
    ssr: false
  }
);

// 条件性加载
const AdminPanel = dynamic(
  () => import('../components/AdminPanel'),
  {
    loading: () => <p>Loading admin panel...</p>
  }
);
```

**图片优化**:
```javascript
// 使用Next.js Image组件
import Image from 'next/image';

const FrameDisplay = ({ imageUrl, alt }) => {
  return (
    <div className="relative aspect-video">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
        loading="lazy"
      />
    </div>
  );
};
```

**状态管理优化**:
```javascript
import { useMemo, useCallback } from 'react';

const StoryboardDisplay = ({ frames }) => {
  // 使用useMemo避免重复计算
  const frameStats = useMemo(() => {
    return {
      total: frames.length,
      completed: frames.filter(f => f.imageUrl).length,
      generating: frames.filter(f => f.isGenerating).length
    };
  }, [frames]);

  // 使用useCallback避免重复渲染
  const handleFrameRegenerate = useCallback((frameId) => {
    setFrames(prevFrames =>
      prevFrames.map(frame =>
        frame.id === frameId
          ? { ...frame, isGenerating: true }
          : frame
      )
    );
  }, []);

  return (
    <div>
      <div className="stats">
        总计: {frameStats.total},
        已完成: {frameStats.completed}
      </div>
      {/* 其他内容 */}
    </div>
  );
};
```

### 2. 后端性能优化

**异步处理优化**:
```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

# 使用线程池处理CPU密集型任务
executor = ThreadPoolExecutor(max_workers=4)

async def process_multiple_frames(frames: List[dict]):
    """并行处理多个帧"""
    tasks = []

    for frame in frames:
        # 创建异步任务
        task = asyncio.create_task(
            generate_single_frame(frame)
        )
        tasks.append(task)

    # 等待所有任务完成
    results = await asyncio.gather(*tasks, return_exceptions=True)

    return results

async def generate_single_frame(frame: dict):
    """生成单个帧"""
    # 使用线程池执行同步操作
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        executor,
        sync_image_processing,
        frame
    )
    return result
```

**内存管理**:
```python
import gc
import psutil
import logging

def monitor_memory_usage():
    """监控内存使用情况"""
    process = psutil.Process()
    memory_info = process.memory_info()

    logging.info(f"Memory usage: {memory_info.rss / 1024 / 1024:.2f} MB")

    # 当内存使用超过阈值时触发垃圾回收
    if memory_info.rss > 500 * 1024 * 1024:  # 500MB
        logging.warning("High memory usage detected, triggering GC")
        gc.collect()

# 在API处理完成后清理资源
@app.middleware("http")
async def cleanup_middleware(request: Request, call_next):
    response = await call_next(request)

    # 定期监控内存
    if request.url.path.startswith("/api/generate"):
        monitor_memory_usage()

    return response
```

**缓存策略**:
```python
from functools import lru_cache
import hashlib
import json

class ResultCache:
    def __init__(self, max_size=1000):
        self.cache = {}
        self.max_size = max_size

    def get_cache_key(self, data: dict) -> str:
        """生成缓存键"""
        json_str = json.dumps(data, sort_keys=True)
        return hashlib.md5(json_str.encode()).hexdigest()

    def get(self, key: str):
        """获取缓存值"""
        return self.cache.get(key)

    def set(self, key: str, value):
        """设置缓存值"""
        if len(self.cache) >= self.max_size:
            # 删除最老的缓存项
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]

        self.cache[key] = value

# 全局缓存实例
cache = ResultCache()

async def generate_image_with_cache(prompt: str):
    """带缓存的图片生成"""
    cache_key = cache.get_cache_key({"prompt": prompt})

    # 检查缓存
    cached_result = cache.get(cache_key)
    if cached_result:
        logging.info(f"Cache hit for prompt: {prompt[:50]}...")
        return cached_result

    # 生成图片
    result = await generate_image_without_cache(prompt)

    # 缓存结果
    cache.set(cache_key, result)

    return result
```

## 贡献指南

### 1. 贡献流程

**开始贡献**:
```bash
# 1. Fork项目到个人账户
# 2. 克隆Fork的仓库
git clone https://github.com/your-username/script-to-frame.git
cd script-to-frame

# 3. 添加上游仓库
git remote add upstream https://github.com/original/script-to-frame.git

# 4. 创建功能分支
git checkout -b feature/your-feature-name

# 5. 开发功能...
# 6. 提交代码
git add .
git commit -m "feat: add new feature"

# 7. 推送到个人仓库
git push origin feature/your-feature-name

# 8. 创建Pull Request
```

**Pull Request模板**:
```markdown
## 功能描述
简要描述本次PR的功能或修改内容。

## 变更类型
- [ ] 新功能 (feat)
- [ ] Bug修复 (fix)
- [ ] 文档更新 (docs)
- [ ] 样式修改 (style)
- [ ] 代码重构 (refactor)
- [ ] 性能优化 (perf)
- [ ] 测试相关 (test)
- [ ] 构建相关 (build)

## 测试清单
- [ ] 本地测试通过
- [ ] 单元测试通过 (如适用)
- [ ] 集成测试通过 (如适用)
- [ ] 手动测试通过

## 相关Issue
Closes #issue_number

## 截图 (如适用)
如果是UI相关的修改，请提供前后对比截图。

## 其他说明
任何需要特别说明的内容。
```

### 2. 代码审查标准

**自检清单**:
```markdown
## 提交前自检清单

### 代码质量
- [ ] 代码符合项目编码规范
- [ ] 删除了调试代码和console.log
- [ ] 变量和函数命名清晰有意义
- [ ] 复杂逻辑有适当注释

### 功能测试
- [ ] 核心功能正常工作
- [ ] 错误情况处理正确
- [ ] 边界条件考虑周全
- [ ] 性能表现可接受

### 兼容性
- [ ] 支持主要浏览器 (Chrome, Firefox, Safari)
- [ ] 响应式设计适配移动端
- [ ] 向后兼容现有API

### 文档
- [ ] 更新了相关文档
- [ ] API变更有说明
- [ ] 复杂算法有注释
```

### 3. 发布流程

**版本号规范 (Semantic Versioning)**:
```
MAJOR.MINOR.PATCH

MAJOR: 不兼容的API修改
MINOR: 向后兼容的功能新增
PATCH: 向后兼容的问题修正

示例:
1.0.0 → 1.0.1 (bug修复)
1.0.1 → 1.1.0 (新功能)
1.1.0 → 2.0.0 (破坏性变更)
```

**发布步骤**:
```bash
# 1. 更新版本号
npm version patch  # 或 minor, major

# 2. 更新CHANGELOG.md
echo "## [1.0.1] - 2025-12-24
### Fixed
- 修复图片生成超时问题
- 优化内存使用

### Added
- 新增批量下载功能" >> CHANGELOG.md

# 3. 创建发布分支
git checkout -b release/v1.0.1

# 4. 提交发布准备
git add .
git commit -m "chore: prepare release v1.0.1"

# 5. 合并到main分支
git checkout main
git merge release/v1.0.1

# 6. 创建标签
git tag -a v1.0.1 -m "Release v1.0.1"

# 7. 推送到远程
git push origin main --tags

# 8. 合并回develop分支
git checkout develop
git merge main
git push origin develop
```

---

**文档版本**: v1.0.0
**最后更新**: 2025-12-24
**维护者**: ScriptToFrame Team