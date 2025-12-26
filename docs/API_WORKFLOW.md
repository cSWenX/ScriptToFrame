# ScriptToFrame API工作流程文档

## 概述

ScriptToFrame的核心业务流程包括AI智能分析和图片生成两大部分。本文档详细描述了API的调用链路、数据传递和错误处理机制。

## API端点映射表

### 前端API端点
```
POST /api/intelligent-analyze-script   # AI智能分析 (4步工作流)
POST /api/generate-image-python        # 单张图片生成代理
POST /api/generate-all-images         # 批量图片生成
POST /api/regenerate-image            # 重新生成单张图片
```

### Python后端API端点
```
GET  /                                # 服务信息
GET  /api/health                     # 健康检查
POST /api/generate-image             # 图片生成核心接口
```

### 外部API端点
```
DeepSeek API: POST /chat/completions          # AI分析服务
火山引擎API: POST /cv/sync2async_submit_task  # 提交生成任务
火山引擎API: GET  /cv/sync2async_get_result   # 查询任务结果
```

## AI智能分析工作流 (4步骤)

### 流程概览
```
用户输入剧本
    │
    ▼ 前端验证
┌─────────────────┐
│ 剧本内容验证     │ ← 长度检查、格式检查
└─────────────────┘
    │
    ▼ API调用
┌─────────────────┐
│ Step1: 故事切分  │ ← DeepSeek API
│ 输入: 原始剧本   │
│ 输出: N个故事段  │
│ 耗时: ~10-15秒   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Step2: 关键帧提取│ ← DeepSeek API
│ 输入: 故事分段   │
│ 输出: 画面描述   │
│ 耗时: ~15-20秒   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Step3: 提示词生成│ ← DeepSeek API
│ 输入: 画面描述   │
│ 输出: 即梦提示词 │
│ 耗时: ~20-25秒   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Step4: 结果解析  │ ← 本地处理
│ 输入: 提示词文本 │
│ 输出: 结构化数据 │
│ 耗时: <1秒      │
└─────────────────┘
    │
    ▼
返回分镜帧数据
```

### Step1: 故事切分详细流程

**API**: `POST /api/intelligent-analyze-script`

**请求参数**:
```javascript
{
  "script": "剧本内容...",
  "sceneCount": 5,
  "style": "anime",
  "genre": "xuanhuan"
}
```

**提示词模板**:
```javascript
const STEP1_PROMPT_TEMPLATE = `# Role: 资深编辑与分镜师

# Task:
请阅读我提供的【故事文本】，并将其切分为【Target_Number】个部分。

# Inputs:
1. 故事文本: {SCRIPT_CONTENT}
2. 切分份数 (Target_Number): {SCENE_COUNT}

# Important Rules:
1. 必须严格按照要求的份数进行切分，确保生成**准确的{SCENE_COUNT}份**内容
2. 保持故事原汁原味，不要删减细节
3. 确保切分点落在情节转折或动作变换的自然停顿处

# Output Format:
---
## 第1份
**完整剧情原文**: [切分出来的原始故事文本]
**核心视觉点**: [一句话提炼画面内容]
---`;
```

**DeepSeek API调用**:
```javascript
async function callDeepSeek(prompt, stepName, requestId) {
  const requestData = {
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4000,
    temperature: 0.7
  };

  const response = await fetch(process.env.DEEPSEEK_BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify(requestData),
    signal: controller.signal // 60秒超时
  });

  return response.choices[0].message.content;
}
```

### Step2: 关键帧提取详细流程

**提示词模板**:
```javascript
const STEP2_PROMPT_TEMPLATE = `# Role: 视觉导演

# Logic Rules:
1. 对于 **第1份 到 第{LAST_SCENE_INDEX}份**：
   - 只提炼 **1个"开始帧"**
2. 对于 **最后一份 (第{SCENE_COUNT}份)**：
   - 提炼 **1个"开始帧"** + **1个"结束帧"**

# Requirement:
- **主体**: 角色是谁，在做什么动作
- **环境**: 背景细节，天气，时间
- **氛围**: 光影颜色，情绪基调

# Output Format:
---
## 第X份
**帧类型**: [开始帧 / 结束帧]
**画面描述**: (详细的视觉描述)
---`;
```

### Step3: 提示词生成详细流程

**提示词模板**:
```javascript
const STEP3_PROMPT_TEMPLATE = `# Role: AI绘图提示词专家 (即梦/Jimeng 专项优化)

# Style & Quality:
每一条提示词必须包含：
(Masterpiece, top quality, highly detailed, 8k resolution, cinematic lighting, dynamic composition) + {STYLE_SETTING}

# Output Format:
---
### [序号] 第X份-[帧类型]
**中文辅助描述**: [简短的中文画面说明]
**Jimeng Prompt**: [画风修饰词], [角色特征词], [动作与具体场景描述], [环境与光影], [镜头语言] --ar 16:9
---`;
```

### Step4: 结果解析详细流程

**解析函数**:
```javascript
function parseStep3Results(claudeResponse) {
  const frames = [];
  const sections = claudeResponse.split('---').filter(section => section.trim());

  sections.forEach((section, index) => {
    const chineseMatch = section.match(/\*\*中文辅助描述\*\*[:：]\s*([^\n]+)/);
    const promptMatch = section.match(/\*\*Jimeng Prompt\*\*[:：]\s*([^\n]+)/);
    const titleMatch = section.match(/###\s*\[?\d*\]?\s*第(\d+)份[-—]?(开始帧|结束帧)/);

    if (chineseMatch && promptMatch) {
      const frame = {
        sequence: index + 1,
        sceneIndex: titleMatch ? parseInt(titleMatch[1]) : index + 1,
        frameType: titleMatch ? titleMatch[2] : '开始帧',
        chineseDescription: chineseMatch[1].trim(),
        jimengPrompt: promptMatch[1].trim(),
        imageUrl: null,
        isGenerating: false,
        error: null
      };
      frames.push(frame);
    }
  });

  return frames;
}
```

**返回数据结构**:
```javascript
{
  "success": true,
  "data": {
    "script_analysis": {
      "sceneCount": 5,
      "frameCount": 6,
      "genre_detected": "xuanhuan",
      "segmented_story": "切分后的故事...",
      "extracted_frames": "提取的帧描述..."
    },
    "storyboard_frames": [
      {
        "sequence": 1,
        "sceneIndex": 1,
        "frameType": "开始帧",
        "chineseDescription": "张三站在山顶，凝视远方",
        "jimengPrompt": "Masterpiece, anime style, a young man standing on mountain peak...",
        "imageUrl": null,
        "isGenerating": false,
        "error": null
      }
    ]
  }
}
```

## 图片生成工作流

### 单张图片生成流程

```
前端发起生成请求
    │
    ▼
┌─────────────────┐
│ generate-image-python API  │ ← Next.js API路由
└─────────────────┘
    │
    ▼ HTTP代理转发
┌─────────────────┐
│ Python后端      │ ← 端口8081
│ /api/generate-image        │
└─────────────────┘
    │
    ▼ 官方SDK调用
┌─────────────────┐
│ 火山引擎即梦API  │
│ cv_sync2async_submit_task  │
└─────────────────┘
    │ 返回TaskID
    ▼
┌─────────────────┐
│ 轮询任务状态     │ ← 最多150次，每2秒一次
│ cv_sync2async_get_result   │
└─────────────────┘
    │
    ▼ 成功获取结果
┌─────────────────┐
│ 返回图片数据     │ ← Base64或URL格式
└─────────────────┘
```

### 火山引擎API调用详解

**1. 提交生成任务**:
```python
async def generate_image_with_sdk(prompt: str, request_id: str = None) -> str:
    # 创建服务实例
    visual_service = create_visual_service()

    # 提交任务参数
    submit_form = {
        "req_key": "jimeng_t2i_v40",  # 即梦V4模型
        "prompt": prompt,
        "return_url": True,
        "logo_info": {
            "add_logo": False,
            "position": 0,
            "language": 0,
            "opacity": 1
        }
    }

    # 提交任务
    submit_resp = visual_service.cv_sync2async_submit_task(submit_form)
    task_id = submit_resp.get('data', {}).get('task_id')
```

**2. 轮询任务状态**:
```python
# 查询任务状态
for i in range(MAX_POLL_TIMES):  # 最多150次
    await asyncio.sleep(POLL_INTERVAL)  # 等待2秒

    query_form = {
        "req_key": "jimeng_t2i_v40",
        "task_id": task_id,
        "return_url": True,
        "logo_info": {...}
    }

    query_resp = visual_service.cv_sync2async_get_result(query_form)
    query_data = query_resp.get('data', {})

    # 检查是否完成
    if query_data.get('binary_data_base64'):
        base64_data = query_data['binary_data_base64'][0]
        return f"data:image/png;base64,{base64_data}"
```

### 批量生成工作流

**API**: `POST /api/generate-all-images`

```
接收批量请求
    │ frames: [frame1, frame2, ...]
    ▼
┌─────────────────┐
│ 验证帧数据       │ ← 检查提示词完整性
└─────────────────┘
    │
    ▼ 串行处理
┌─────────────────┐
│ for循环逐个生成  │
│ ├─ 调用Python后端 │ ← /api/generate-image
│ ├─ 收集结果      │
│ ├─ 更新进度      │
│ └─ 延迟100ms     │ ← 避免API过载
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 汇总统计信息     │
│ ├─ 成功数量      │
│ ├─ 失败数量      │
│ ├─ 成功率       │
│ └─ 平均耗时      │
└─────────────────┘
```

**批量生成代码实现**:
```javascript
// 逐个生成图片
for (let i = 0; i < validFrames.length; i++) {
  const frame = validFrames[i];

  try {
    // 调用Python后端
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: frame.prompt || frame.jimengPrompt,
        frame: frame,
        config: config
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
```

## 错误处理机制

### 错误类型分类

```
1. 网络错误 (NetworkError)
   ├─ 连接超时 (Timeout)
   ├─ 连接被拒绝 (ECONNREFUSED)
   └─ DNS解析失败 (ENOTFOUND)

2. API错误 (APIError)
   ├─ 认证失败 (401)
   ├─ 请求限制 (429)
   ├─ 服务错误 (5xx)
   └─ 参数错误 (400)

3. 业务错误 (BusinessError)
   ├─ 剧本格式错误
   ├─ 提示词解析失败
   └─ 图片生成失败

4. 系统错误 (SystemError)
   ├─ 内存不足
   ├─ 磁盘空间不足
   └─ 服务不可用
```

### 超时和重试策略

**超时配置**:
```javascript
const timeoutConfig = {
  // AI分析阶段
  intelligentAnalysis: {
    totalTimeout: 120000,    // 总超时2分钟
    stepTimeout: 60000,      // 单步超时60秒
    retryAttempts: 0         // 不重试
  },

  // 图片生成阶段
  imageGeneration: {
    submitTimeout: 30000,    // 提交超时30秒
    pollTimeout: 600000,     // 轮询超时10分钟
    pollInterval: 2000,      // 轮询间隔2秒
    maxPollAttempts: 150,    // 最大轮询150次
    retryAttempts: 1         // 重试1次
  },

  // 批量生成阶段
  batchGeneration: {
    singleFrameTimeout: 300000,  // 单张图片5分钟
    batchDelay: 100,            // 批量间隔100ms
    retryAttempts: 0            // 不重试
  }
};
```

**重试机制**:
```javascript
async function retryWithExponentialBackoff(fn, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 不重试的错误类型
      if (error.name === 'AbortError' ||
          error.status === 400 ||
          error.status === 401) {
        throw error;
      }

      // 计算退避时间
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);

      console.warn(`重试第 ${attempt}/${maxRetries} 次，${delay}ms 后重试`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

### 错误响应格式

**标准错误响应**:
```javascript
{
  "success": false,
  "error": "具体错误描述",
  "errorCode": "ERROR_CODE",
  "failedStep": "失败的步骤",
  "timestamp": "2025-12-24T10:00:00.000Z",
  "requestId": "1234567890",
  "suggestions": [
    "检查网络连接",
    "检查API密钥配置",
    "稍后重试"
  ]
}
```

**前端错误处理**:
```javascript
try {
  const response = await fetch('/api/intelligent-analyze-script', {...});
  const result = await response.json();

  if (!result.success) {
    // 显示用户友好的错误信息
    alert(`分析失败: ${result.error}`);

    // 根据错误类型执行不同操作
    switch(result.errorCode) {
      case 'NETWORK_TIMEOUT':
        // 建议用户检查网络
        break;
      case 'API_RATE_LIMIT':
        // 建议用户稍后重试
        break;
      case 'INVALID_SCRIPT':
        // 建议用户检查剧本格式
        break;
    }
  }
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('用户主动取消操作');
  } else {
    console.error('网络错误:', error);
    alert('网络连接失败，请检查网络状态');
  }
}
```

## 监控和日志

### 日志格式规范

**前端日志**:
```javascript
console.log(`🎭 [智能分析-${requestId}] 开始AI智能分析:`, {
  scriptLength: script.length,
  sceneCount,
  style,
  genre,
  timestamp: new Date().toISOString()
});
```

**后端日志**:
```python
print(f"🎨 [Python后端-{request_id}] API启动")
print(f"📝 [Python后端-{request_id}] 生成参数:", {
  "prompt": f"{prompt[:50]}...",
  "prompt_length": len(prompt),
  "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
})
```

### 关键性能指标

**API响应时间**:
```
- AI分析总时间: 60-120秒
- 单张图片生成: 30-300秒
- 批量生成平均: 180秒/张
- 系统健康检查: <1秒
```

**成功率监控**:
```
- AI分析成功率: >95%
- 图片生成成功率: >90%
- 系统可用性: >99%
```

---

**文档版本**: v1.0.0
**最后更新**: 2025-12-24
**维护者**: ScriptToFrame Team