# ScriptToFrame 后端服务文档

## 概述

ScriptToFrame采用双后端架构：Node.js API服务负责路由处理和API编排，Python FastAPI服务专注于图片生成和SDK集成。这种设计确保了系统的模块化和可扩展性。

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      后端服务架构                                 │
└─────────────────────────────────────────────────────────────────┘

前端请求 (localhost:3000)
    │
    ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Node.js API   │────▶│  Python FastAPI │────▶│   第三方API      │
│   服务层         │     │   服务层         │     │                 │
│                 │     │                 │     │  - 火山引擎API   │
│ - 路由处理       │     │ - 图片生成       │     │  - Claude API   │
│ - 请求代理       │     │ - SDK集成       │     │  - DeepSeek API │
│ - Claude集成     │     │ - 结果处理       │     │                 │
│ - 错误处理       │     │ - 健康检查       │     └─────────────────┘
│                 │     │                 │
└─────────────────┘     └─────────────────┘
  localhost:3000          localhost:8081
```

## Node.js API服务层

### 服务职责
- **API路由**: 处理所有前端请求的入口
- **请求代理**: 将图片生成请求转发到Python服务
- **Claude集成**: 直接集成Claude和DeepSeek API进行剧本分析
- **错误处理**: 统一的错误处理和用户友好的错误信息
- **日志记录**: 详细的请求/响应日志

### 核心API端点

#### 1. AI智能分析接口

**端点**: `POST /api/intelligent-analyze-script`

**功能**: 4步骤AI分析工作流，将剧本转换为分镜帧数据

**实现文件**: `pages/api/intelligent-analyze-script.js`

**核心代码结构**:
```javascript
export default async function handler(req, res) {
  const requestId = Date.now();

  try {
    const { script, sceneCount, style, genre } = req.body;

    // 参数验证
    if (!script || !sceneCount) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: script, sceneCount'
      });
    }

    // Step 1: 故事切分
    const segmentedStory = await callDeepSeek(
      STEP1_PROMPT_TEMPLATE.replace('{SCRIPT_CONTENT}', script),
      '第1步: 故事切分',
      requestId
    );

    // Step 2: 关键帧提取
    const extractedFrames = await callDeepSeek(
      STEP2_PROMPT_TEMPLATE.replace('{SEGMENTED_STORY}', segmentedStory),
      '第2步: 关键帧提取',
      requestId
    );

    // Step 3: 提示词生成
    const promptResults = await callDeepSeek(
      STEP3_PROMPT_TEMPLATE.replace('{EXTRACTED_FRAMES}', extractedFrames),
      '第3步: 提示词生成',
      requestId
    );

    // Step 4: 结果解析
    const frames = parseStep3Results(promptResults);

    // 返回结构化数据
    const result = {
      success: true,
      data: {
        script_analysis: {
          sceneCount,
          frameCount: frames.length,
          genre_detected: genre
        },
        storyboard_frames: frames
      }
    };

    res.status(200).json(result);

  } catch (error) {
    console.error(`❌ [智能分析-${requestId}] 失败:`, error);
    res.status(500).json({
      success: false,
      error: `智能分析失败: ${error.message}`
    });
  }
}
```

**DeepSeek API调用函数**:
```javascript
async function callDeepSeek(prompt, stepName, requestId) {
  const requestData = {
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4000,
    temperature: 0.7
  };

  // 创建超时控制器
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`⏰ [智能分析-${requestId}] ${stepName}超时，中断请求 (60秒)`);
    controller.abort();
  }, 60000);

  try {
    const response = await fetch(process.env.DEEPSEEK_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`${stepName}失败: HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`${stepName}失败: 请求超时（60秒）`);
    }
    throw new Error(`${stepName}失败: ${error.message}`);
  }
}
```

#### 2. 图片生成代理接口

**端点**: `POST /api/generate-image-python`

**功能**: 将图片生成请求代理到Python后端

**实现文件**: `pages/api/generate-image-python.js`

**核心代码**:
```javascript
export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
    responseLimit: false,
    timeout: 600000, // 10分钟超时
  },
};

export default async function handler(req, res) {
  const requestId = Date.now();

  try {
    const { prompt, frame } = req.body;
    const actualPrompt = prompt || frame?.prompt || frame?.jimengPrompt;

    if (!actualPrompt) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: prompt'
      });
    }

    // 代理到Python后端
    const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8081';

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`⏰ [API代理-${requestId}] 请求超时，中断连接 (10分钟)`);
      controller.abort();
    }, 600000);

    const requestData = { prompt: actualPrompt, frame };

    console.log(`📤 [API代理-${requestId}] 发送到Python后端:`, {
      url: `${PYTHON_BACKEND_URL}/api/generate-image`,
      promptLength: requestData.prompt.length
    });

    const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Python后端返回错误: ${response.status}`);
    }

    res.status(200).json(result);

  } catch (error) {
    console.error(`💥 [API代理-${requestId}] 处理失败:`, error);

    // 错误类型分类处理
    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({
        success: false,
        error: 'Python后端服务未启动，请先启动Python服务 (端口8081)'
      });
    } else if (error.name === 'AbortError') {
      res.status(408).json({
        success: false,
        error: '图片生成超时，请稍后重试'
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Python后端调用失败: ${error.message}`
      });
    }
  }
}
```

#### 3. 批量生成接口

**端点**: `POST /api/generate-all-images`

**功能**: 批量生成所有分镜图片

**实现文件**: `pages/api/generate-all-images.js`

**核心逻辑**:
```javascript
export default async function handler(req, res) {
  try {
    const { frames, config } = req.body;

    // 过滤有效帧
    const validFrames = frames.filter(frame => frame.prompt || frame.jimengPrompt);

    // 逐个生成图片
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validFrames.length; i++) {
      const frame = validFrames[i];

      try {
        // 调用Python后端
        const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: frame.prompt || frame.jimengPrompt,
            frame,
            config
          }),
          timeout: 300000 // 5分钟超时
        });

        const result = await response.json();

        if (response.ok && result.success) {
          results.push({
            sequence: frame.sequence,
            imageUrl: result.data.imageUrl,
            error: null
          });
          successCount++;
        } else {
          results.push({
            sequence: frame.sequence,
            imageUrl: null,
            error: result.error
          });
          failedCount++;
        }

      } catch (error) {
        results.push({
          sequence: frame.sequence,
          imageUrl: null,
          error: error.message
        });
        failedCount++;
      }

      // 添加延迟避免API过载
      if (i < validFrames.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 返回统计结果
    const finalStats = {
      total: validFrames.length,
      success: successCount,
      failed: failedCount,
      successRate: Math.round((successCount / validFrames.length) * 100)
    };

    res.status(200).json({
      success: true,
      data: results,
      stats: finalStats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: `批量生成失败: ${error.message}`
    });
  }
}
```

### 环境变量配置

**Node.js服务所需环境变量**:
```bash
# Claude API配置
ANTHROPIC_API_KEY=your_claude_api_key_here
ANTHROPIC_BASE_URL=https://anyrouter.top/v1

# DeepSeek API配置
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# Python后端地址
PYTHON_BACKEND_URL=http://localhost:8081

# 应用配置
NEXT_PUBLIC_APP_NAME=ScriptToFrame
NEXT_PUBLIC_VERSION=1.0.0
```

## Python FastAPI服务层

### 服务职责
- **图片生成**: 使用火山引擎官方SDK生成图片
- **SDK集成**: 封装火山引擎API调用逻辑
- **结果处理**: 处理Base64和URL格式的图片数据
- **健康检查**: 提供服务状态检查接口

### 核心实现

**主入口文件**: `python-backend/main.py`

**服务初始化**:
```python
"""
火山引擎即梦API - Python后端服务
使用官方SDK避免签名问题，提供RESTful API给前端调用
"""

import os
import json
import asyncio
import time
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 尝试导入火山引擎SDK
try:
    from volcengine.visual.VisualService import VisualService
    SDK_AVAILABLE = True
    print("✅ 火山引擎SDK导入成功")
except ImportError as e:
    SDK_AVAILABLE = False
    print(f"⚠️ 火山引擎SDK导入失败: {e}")
    print("📦 暂时以演示模式启动，请稍后安装SDK: pip install volcengine")

app = FastAPI(
    title="ScriptToFrame Image Generation API",
    description="火山引擎即梦图片生成服务",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**数据模型定义**:
```python
# 请求模型
class ImageGenerationRequest(BaseModel):
    prompt: str
    frame: Optional[dict] = None

class ImageGenerationResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None

# 常量配置
REQ_KEY = "jimeng_t2i_v40"  # 即梦V4模型
MAX_POLL_TIMES = 150  # 最大轮询次数
POLL_INTERVAL = 2  # 轮询间隔(秒)
```

**火山引擎服务创建**:
```python
def create_visual_service():
    """创建并配置火山引擎视觉服务实例"""
    if not SDK_AVAILABLE:
        raise HTTPException(status_code=500, detail="火山引擎SDK未安装")

    # 获取环境变量
    access_key = os.getenv('VOLCENGINE_ACCESS_KEY_ID')
    secret_key = os.getenv('VOLCENGINE_SECRET_ACCESS_KEY')

    if not access_key or not secret_key:
        raise HTTPException(
            status_code=500,
            detail="未配置VOLCENGINE_ACCESS_KEY_ID或VOLCENGINE_SECRET_ACCESS_KEY"
        )

    # 检查密钥是否是Base64编码
    import base64
    try:
        decoded_access_key = base64.b64decode(access_key).decode('utf-8')
        decoded_secret_key = base64.b64decode(secret_key).decode('utf-8')
        print(f"🔑 [密钥解码] 使用解码后的密钥")
        access_key = decoded_access_key
        secret_key = decoded_secret_key
    except:
        print(f"🔑 [密钥直接] 使用原始密钥")

    # 创建服务实例
    visual_service = VisualService()
    visual_service.set_ak(access_key.strip())
    visual_service.set_sk(secret_key.strip())

    return visual_service
```

**图片生成核心逻辑**:
```python
async def generate_image_with_sdk(prompt: str, request_id: str = None) -> str:
    """使用官方SDK生成图片"""

    if not request_id:
        request_id = f"img_{int(time.time())}"

    print(f"\n🎨 [Python后端-{request_id}] API启动")
    print(f"📝 [Python后端-{request_id}] 生成参数:", {
        "prompt": f"{prompt[:50]}..." if len(prompt) > 50 else prompt,
        "prompt_length": len(prompt),
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
    })

    if not SDK_AVAILABLE:
        # 演示模式 - 返回模拟URL
        print(f"⚠️ [Python后端-{request_id}] 演示模式: SDK未安装")
        await asyncio.sleep(2)  # 模拟处理时间
        demo_url = f"https://example.com/demo-image-{int(time.time())}.jpg"
        return demo_url

    # 创建服务实例
    visual_service = create_visual_service()

    # Step 1: 提交任务
    submit_form = {
        "req_key": REQ_KEY,
        "prompt": prompt,
        "return_url": True,
        "logo_info": {
            "add_logo": False,
            "position": 0,
            "language": 0,
            "opacity": 1
        }
    }

    try:
        submit_resp = visual_service.cv_sync2async_submit_task(submit_form)

        # 检查响应错误
        if submit_resp.get('code') != 10000:
            raise HTTPException(
                status_code=400,
                detail=f"任务提交失败: {submit_resp.get('message')}"
            )

        submit_data = submit_resp.get('data', {})

        # 检查是否直接返回base64数据（即梦V4常见情况）
        if submit_data.get('binary_data_base64'):
            base64_data = submit_data['binary_data_base64'][0]
            print(f"📷 [Python后端-{request_id}] 同步成功 - 获得base64图片数据")
            return f"data:image/png;base64,{base64_data}"

        task_id = submit_data.get('task_id')
        if not task_id:
            raise HTTPException(status_code=500, detail="未获得task_id")

        # Step 2: 轮询结果
        for i in range(MAX_POLL_TIMES):
            await asyncio.sleep(POLL_INTERVAL)

            query_form = {
                "req_key": REQ_KEY,
                "task_id": task_id,
                "return_url": True,
                "logo_info": {...}
            }

            query_resp = visual_service.cv_sync2async_get_result(query_form)
            query_data = query_resp.get('data', {})

            # 检查是否有 binary_data_base64
            if query_data.get('binary_data_base64'):
                base64_data = query_data['binary_data_base64'][0]
                print(f"📷 [Python后端-{request_id}] 获得base64图片数据")
                return f"data:image/png;base64,{base64_data}"

            # 检查是否有 image_urls
            if query_data.get('image_urls'):
                image_url = query_data['image_urls'][0]
                print(f"🎉 [Python后端-{request_id}] 获得图片URL: {image_url}")
                return image_url

            status = query_data.get('status')
            if status == 2 or status == -1 or status == "failed":
                raise HTTPException(status_code=500, detail=f"任务执行失败")

        # 超时
        raise HTTPException(status_code=408, detail="图片生成超时")

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [Python后端-{request_id}] SDK调用错误: {e}")
        raise HTTPException(status_code=500, detail=f"SDK调用失败: {str(e)}")
```

**API端点定义**:
```python
@app.get("/")
async def root():
    """根路径 - API信息"""
    return {
        "service": "ScriptToFrame Image Generation API",
        "version": "1.0.0",
        "sdk_available": SDK_AVAILABLE,
        "endpoints": [
            "POST /api/generate-image - 生成图片",
            "GET /api/health - 健康检查"
        ]
    }

@app.get("/api/health")
async def health_check():
    """健康检查接口"""
    return {
        "status": "healthy",
        "service": "Image Generation Backend",
        "sdk_available": SDK_AVAILABLE,
        "timestamp": int(time.time())
    }

@app.post("/api/generate-image", response_model=ImageGenerationResponse)
async def generate_image(request: ImageGenerationRequest):
    """生成图片接口"""
    request_id = f"api_{int(time.time())}"

    try:
        # 提取提示词
        prompt = request.prompt
        if request.frame and request.frame.get('prompt'):
            prompt = request.frame['prompt']
        elif request.frame and request.frame.get('jimengPrompt'):
            prompt = request.frame['jimengPrompt']

        if not prompt or not prompt.strip():
            raise HTTPException(status_code=400, detail="缺少必要参数: prompt")

        # 生成图片
        image_url = await generate_image_with_sdk(prompt.strip(), request_id)

        # 返回结果
        response_data = {
            "imageUrl": image_url,
            "taskId": f"jimeng_v4_{request_id}",
            "prompt": prompt,
            "frame": request.frame
        }

        return ImageGenerationResponse(success=True, data=response_data)

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [Python后端-{request_id}] 生成失败: {e}")
        return ImageGenerationResponse(
            success=False,
            error=f"图片生成失败: {str(e)}"
        )
```

### 依赖管理

**requirements.txt**:
```
# 火山引擎Python后端依赖
fastapi==0.104.1
uvicorn==0.24.0
python-dotenv==1.0.0
requests==2.31.0

# 火山引擎官方SDK
volcengine

# 跨域支持
python-multipart==0.0.6
```

**虚拟环境设置**:
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
```

### 启动和配置

**手动启动**:
```bash
cd python-backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8081 --reload
```

**环境变量配置**:
```bash
# python-backend/.env
VOLCENGINE_ACCESS_KEY_ID=your_access_key_here
VOLCENGINE_SECRET_ACCESS_KEY=your_secret_key_here
PORT=8081
DEBUG=True
```

**服务启动日志**:
```
🚀 启动图片生成服务
📍 端口: 8081
🔧 调试模式: True
📦 SDK状态: 可用

INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8081 (Press CTRL+C to quit)
```

## 服务间通信

### 通信协议

**HTTP REST API**:
- Node.js → Python: HTTP POST请求
- Python → 火山引擎: 官方SDK调用
- Node.js → DeepSeek: HTTP POST请求

**数据格式**: JSON

**认证方式**: Bearer Token (API密钥)

### 请求/响应格式

**Node.js → Python请求**:
```json
{
  "prompt": "Masterpiece, anime style, young man standing...",
  "frame": {
    "sequence": 1,
    "chineseDescription": "张三站在山顶",
    "jimengPrompt": "Masterpiece, anime style..."
  }
}
```

**Python → Node.js响应**:
```json
{
  "success": true,
  "data": {
    "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...",
    "taskId": "jimeng_v4_1703456789",
    "prompt": "Masterpiece, anime style...",
    "frame": {...}
  }
}
```

**错误响应格式**:
```json
{
  "success": false,
  "error": "图片生成失败: 连接超时",
  "errorCode": "GENERATION_TIMEOUT",
  "timestamp": "2025-12-24T10:00:00.000Z"
}
```

### 负载均衡和容错

**连接池管理**:
```javascript
// Node.js中的HTTP连接复用
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  timeout: 600000
});

const fetchWithAgent = (url, options) => {
  return fetch(url, {
    ...options,
    agent: agent
  });
};
```

**重试机制**:
```python
# Python中的重试逻辑
import asyncio
from functools import wraps

def retry_on_failure(max_retries=3, delay=1):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        await asyncio.sleep(delay * (2 ** attempt))  # 指数退避
                        continue
                    break

            raise last_exception
        return wrapper
    return decorator

@retry_on_failure(max_retries=2)
async def call_volcengine_api(...):
    # API调用逻辑
    pass
```

## 健康检查和监控

### 健康检查端点

**Node.js服务健康检查**:
```javascript
// pages/api/health.js
export default function handler(req, res) {
  const healthStatus = {
    service: "ScriptToFrame API",
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_VERSION || "1.0.0",
    dependencies: {
      deepseek: checkDeepSeekHealth(),
      python_backend: checkPythonBackendHealth()
    }
  };

  const allHealthy = Object.values(healthStatus.dependencies)
    .every(dep => dep.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json(healthStatus);
}

async function checkPythonBackendHealth() {
  try {
    const response = await fetch('http://localhost:8081/api/health', {
      timeout: 5000
    });
    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      responseTime: response.headers.get('x-response-time')
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}
```

**Python服务健康检查**:
```python
@app.get("/api/health")
async def health_check():
    """详细的健康检查"""
    health_status = {
        "status": "healthy",
        "service": "Image Generation Backend",
        "timestamp": int(time.time()),
        "sdk_available": SDK_AVAILABLE,
        "dependencies": {
            "volcengine_api": check_volcengine_health(),
            "disk_space": check_disk_space(),
            "memory_usage": check_memory_usage()
        }
    }

    # 检查整体健康状态
    all_healthy = all(
        dep.get('status') == 'healthy'
        for dep in health_status['dependencies'].values()
    )

    status_code = 200 if all_healthy else 503
    health_status['status'] = 'healthy' if all_healthy else 'degraded'

    return JSONResponse(content=health_status, status_code=status_code)

def check_volcengine_health():
    """检查火山引擎API连通性"""
    if not SDK_AVAILABLE:
        return {"status": "unhealthy", "error": "SDK not available"}

    try:
        # 简单的API连通性测试
        visual_service = create_visual_service()
        return {"status": "healthy", "sdk_version": "latest"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

### 性能监控

**日志格式标准**:
```python
import logging
import json

# 结构化日志配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def log_request(request_id: str, event: str, data: dict):
    """统一的请求日志格式"""
    log_entry = {
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
        "request_id": request_id,
        "event": event,
        "service": "python-backend",
        "data": data
    }
    logging.info(json.dumps(log_entry, ensure_ascii=False))

# 使用示例
log_request(request_id, "image_generation_start", {
    "prompt_length": len(prompt),
    "model": "jimeng_t2i_v40"
})
```

**性能指标收集**:
```python
import time
import psutil
from collections import defaultdict

# 简单的性能指标收集器
class MetricsCollector:
    def __init__(self):
        self.metrics = defaultdict(list)

    def record_request_time(self, endpoint: str, duration: float):
        self.metrics[f"{endpoint}_response_time"].append(duration)

    def record_api_call(self, api: str, success: bool):
        key = f"{api}_{'success' if success else 'failure'}_count"
        self.metrics[key].append(1)

    def get_stats(self):
        stats = {}
        for key, values in self.metrics.items():
            if 'response_time' in key:
                stats[key] = {
                    "avg": sum(values) / len(values),
                    "min": min(values),
                    "max": max(values),
                    "count": len(values)
                }
            else:
                stats[key] = sum(values)

        # 系统指标
        stats["system"] = {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent
        }

        return stats

# 全局指标收集器
metrics = MetricsCollector()

# 装饰器用于自动收集性能指标
def collect_metrics(api_name: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            success = False
            try:
                result = await func(*args, **kwargs)
                success = True
                return result
            except Exception as e:
                raise e
            finally:
                duration = time.time() - start_time
                metrics.record_request_time(api_name, duration)
                metrics.record_api_call(api_name, success)
        return wrapper
    return decorator
```

### 错误追踪

**错误分类和处理**:
```python
class ScriptToFrameError(Exception):
    """基础异常类"""
    def __init__(self, message: str, error_code: str = None):
        self.message = message
        self.error_code = error_code
        super().__init__(message)

class VolcengineAPIError(ScriptToFrameError):
    """火山引擎API错误"""
    pass

class ImageGenerationError(ScriptToFrameError):
    """图片生成错误"""
    pass

class ConfigurationError(ScriptToFrameError):
    """配置错误"""
    pass

# 全局异常处理器
@app.exception_handler(ScriptToFrameError)
async def custom_exception_handler(request: Request, exc: ScriptToFrameError):
    error_response = {
        "success": false,
        "error": exc.message,
        "error_code": exc.error_code,
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
        "path": str(request.url)
    }

    # 记录错误日志
    logging.error(f"业务错误: {exc.error_code} - {exc.message}")

    return JSONResponse(
        status_code=400,
        content=error_response
    )
```

## 部署配置

### Docker化部署

**Python后端Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8081

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8081"]
```

**Docker Compose配置**:
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - PYTHON_BACKEND_URL=http://python-backend:8081
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - DEEPSEEK_BASE_URL=${DEEPSEEK_BASE_URL}
    depends_on:
      - python-backend

  python-backend:
    build:
      context: ./python-backend
      dockerfile: Dockerfile
    ports:
      - "8081:8081"
    environment:
      - VOLCENGINE_ACCESS_KEY_ID=${VOLCENGINE_ACCESS_KEY_ID}
      - VOLCENGINE_SECRET_ACCESS_KEY=${VOLCENGINE_SECRET_ACCESS_KEY}
    volumes:
      - ./logs:/app/logs
```

### 环境变量管理

**生产环境配置**:
```bash
# .env.production
NODE_ENV=production
PYTHON_BACKEND_URL=http://python-backend:8081

# API配置 (从外部注入)
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
VOLCENGINE_ACCESS_KEY_ID=${VOLCENGINE_ACCESS_KEY_ID}
VOLCENGINE_SECRET_ACCESS_KEY=${VOLCENGINE_SECRET_ACCESS_KEY}

# 日志配置
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
```

---

**文档版本**: v1.0.0
**最后更新**: 2025-12-24
**维护者**: ScriptToFrame Team