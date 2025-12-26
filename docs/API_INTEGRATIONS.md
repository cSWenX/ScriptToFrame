# ScriptToFrame API集成文档

## 概述

ScriptToFrame集成了三个主要的第三方API：火山引擎即梦API (图片生成)、Claude API (剧本分析备选)、DeepSeek API (主要剧本分析)。本文档详细说明了这些API的集成方式、配置方法和使用指南。

## API集成架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      API集成架构                                 │
└─────────────────────────────────────────────────────────────────┘

ScriptToFrame 系统
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   剧本分析API    │  │   图片生成API    │  │   辅助服务API    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
    ┌────┴────┐               │               ┌────┴────┐
    ▼         ▼               ▼               ▼         ▼
┌────────┐ ┌────────┐  ┌──────────────┐ ┌────────┐ ┌────────┐
│DeepSeek│ │Claude  │  │火山引擎即梦API │ │健康检查│ │日志服务│
│   API  │ │  API   │  │   (主要)     │ │  API   │ │  API   │
└────────┘ └────────┘  └──────────────┘ └────────┘ └────────┘
    │         │               │
    ▼         ▼               ▼
聚合分析    备选分析      专业图片生成
4步工作流   智能分析      16:9分镜图
```

## 火山引擎即梦API集成

### API概述

**服务商**: 火山引擎 (字节跳动)
**服务**: 即梦AI绘画 V4.0
**用途**: 高质量分镜图片生成
**特点**:
- 支持中文提示词
- 16:9比例输出
- 专业级图片质量
- 官方Python SDK支持

### 认证配置

**认证方式**: AccessKey + SecretKey
**签名算法**: HMAC-SHA256 (由官方SDK处理)

**环境变量配置**:
```bash
# 火山引擎API密钥 (支持Base64编码)
VOLCENGINE_ACCESS_KEY_ID=your_access_key_here
VOLCENGINE_SECRET_ACCESS_KEY=your_secret_key_here

# 可选配置
VOLCENGINE_REGION=cn-north-1
VOLCENGINE_SERVICE=cv
```

**密钥解码逻辑**:
```python
def create_visual_service():
    """创建并配置火山引擎视觉服务实例"""
    access_key = os.getenv('VOLCENGINE_ACCESS_KEY_ID')
    secret_key = os.getenv('VOLCENGINE_SECRET_ACCESS_KEY')

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

### API调用流程

**1. 任务提交 (异步)**:
```python
submit_form = {
    "req_key": "jimeng_t2i_v40",  # 即梦V4模型
    "prompt": "Masterpiece, top quality, anime style, young man standing on mountain peak, wind blowing, sunset lighting, 16:9 aspect ratio",
    "return_url": True,  # 返回URL格式
    "logo_info": {
        "add_logo": False,    # 不添加水印
        "position": 0,
        "language": 0,
        "opacity": 1
    }
}

# 提交任务
submit_resp = visual_service.cv_sync2async_submit_task(submit_form)
print(f"提交响应: {submit_resp}")

# 检查响应状态
if submit_resp.get('code') != 10000:
    raise HTTPException(
        status_code=400,
        detail=f"任务提交失败: {submit_resp.get('message')}"
    )

# 获取任务ID
submit_data = submit_resp.get('data', {})
task_id = submit_data.get('task_id')
```

**2. 轮询结果**:
```python
# 轮询配置
MAX_POLL_TIMES = 150  # 最多150次
POLL_INTERVAL = 2     # 每2秒轮询一次

for i in range(MAX_POLL_TIMES):
    await asyncio.sleep(POLL_INTERVAL)

    query_form = {
        "req_key": "jimeng_t2i_v40",
        "task_id": task_id,
        "return_url": True,
        "logo_info": {
            "add_logo": False,
            "position": 0,
            "language": 0,
            "opacity": 1
        }
    }

    query_resp = visual_service.cv_sync2async_get_result(query_form)
    query_data = query_resp.get('data', {})

    # 检查是否有Base64数据 (常见情况)
    if query_data.get('binary_data_base64'):
        base64_data = query_data['binary_data_base64'][0]
        return f"data:image/png;base64,{base64_data}"

    # 检查是否有图片URL
    if query_data.get('image_urls'):
        image_url = query_data['image_urls'][0]
        return image_url

    # 检查任务状态
    status = query_data.get('status')
    if status == 2 or status == -1 or status == "failed":
        raise HTTPException(status_code=500, detail="任务执行失败")

# 超时处理
raise HTTPException(status_code=408, detail="图片生成超时")
```

### 提示词优化

**提示词结构**:
```
质量前缀 + 风格描述 + 主体内容 + 环境描述 + 技术参数

示例:
"Masterpiece, top quality, highly detailed, 8k resolution,
anime style,
young man with black hair wearing blue coat standing on mountain peak,
dramatic sunset lighting, cinematic composition,
--ar 16:9"
```

**质量修饰词库**:
```python
QUALITY_PREFIXES = [
    "Masterpiece, top quality, highly detailed",
    "Professional artwork, ultra-detailed",
    "High quality illustration, 8k resolution",
    "Premium digital art, photorealistic"
]

STYLE_MODIFIERS = {
    "anime": "anime style, manga illustration",
    "realistic": "photorealistic, hyperrealistic",
    "manga": "manga style, comic book illustration",
    "3d": "3D rendered, digital art"
}

LIGHTING_EFFECTS = [
    "cinematic lighting",
    "dramatic lighting",
    "soft natural lighting",
    "sunset lighting",
    "studio lighting"
]
```

**动态提示词生成**:
```python
def build_optimized_prompt(base_description: str, style: str = "anime", quality: str = "high"):
    """构建优化的即梦提示词"""

    # 质量前缀
    quality_prefix = QUALITY_PREFIXES[0] if quality == "high" else "Good quality"

    # 风格修饰
    style_modifier = STYLE_MODIFIERS.get(style, "anime style")

    # 技术参数
    technical_params = "16:9 aspect ratio, cinematic composition"

    # 组合提示词
    optimized_prompt = f"{quality_prefix}, {style_modifier}, {base_description}, {technical_params}"

    # 长度检查 (即梦API通常限制在1000字符以内)
    if len(optimized_prompt) > 1000:
        # 截断并保留重要部分
        optimized_prompt = optimized_prompt[:900] + "..."

    return optimized_prompt

# 使用示例
prompt = build_optimized_prompt(
    "young man standing on mountain peak with sword",
    style="anime",
    quality="high"
)
```

### 错误处理

**常见错误码和处理**:
```python
VOLCENGINE_ERROR_CODES = {
    10000: "成功",
    10001: "参数错误",
    10002: "鉴权失败",
    10003: "请求频率限制",
    10004: "余额不足",
    10005: "内容审核失败",
    20001: "服务内部错误",
    20002: "任务队列满",
    30001: "任务不存在",
    30002: "任务已过期"
}

def handle_volcengine_error(error_code: int, error_message: str):
    """处理火山引擎API错误"""
    error_description = VOLCENGINE_ERROR_CODES.get(error_code, "未知错误")

    if error_code == 10002:
        raise ConfigurationError(f"API密钥配置错误: {error_message}")
    elif error_code == 10003:
        raise APIRateLimitError(f"请求频率过高，请稍后重试: {error_message}")
    elif error_code == 10004:
        raise InsufficientBalanceError(f"账户余额不足: {error_message}")
    elif error_code == 10005:
        raise ContentModerationError(f"内容审核失败，请检查提示词: {error_message}")
    elif error_code in [20001, 20002]:
        raise ServiceUnavailableError(f"服务暂时不可用: {error_message}")
    elif error_code in [30001, 30002]:
        raise TaskExpiredError(f"任务已过期或不存在: {error_message}")
    else:
        raise VolcengineAPIError(f"API调用失败 ({error_code}): {error_message}")
```

## DeepSeek API集成

### API概述

**服务商**: DeepSeek
**服务**: DeepSeek Chat API
**用途**: 主要剧本分析服务
**模型**: deepseek-chat
**特点**:
- 中文理解能力强
- 成本相对较低
- 稳定性好
- 支持长文本处理

### 认证配置

**认证方式**: Bearer Token
**API格式**: OpenAI兼容格式

**环境变量配置**:
```bash
# DeepSeek API配置
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# 可选配置
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_MAX_TOKENS=4000
DEEPSEEK_TEMPERATURE=0.7
```

### API调用实现

**基础调用函数**:
```javascript
async function callDeepSeek(prompt, stepName, requestId) {
  const requestData = {
    model: 'deepseek-chat',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 4000,
    temperature: 0.7
  };

  console.log(`🤖 [智能分析-${requestId}] 执行${stepName}...`);

  // 创建AbortController用于超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`⏰ [智能分析-${requestId}] ${stepName}超时，中断请求 (60秒)`);
    controller.abort();
  }, 60000);

  try {
    const startTime = Date.now();
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
    const responseTime = Date.now() - startTime;

    console.log(`📥 [智能分析-${requestId}] DeepSeek响应:`, {
      status: response.status,
      responseTime: `${responseTime}ms`,
      stepName: stepName
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${stepName}失败: HTTP ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error(`${stepName}失败: API返回格式错误`);
    }

    const content = result.choices[0].message.content;
    console.log(`✅ [智能分析-${requestId}] ${stepName}成功，内容长度: ${content.length}`);

    return content;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`${stepName}失败: 请求超时（60秒）`);
    } else if (error.message.includes('fetch')) {
      throw new Error(`${stepName}失败: 网络连接错误`);
    } else {
      throw new Error(`${stepName}失败: ${error.message}`);
    }
  }
}
```

### 分步提示词模板

**Step1: 故事切分模板**:
```javascript
const STEP1_PROMPT_TEMPLATE = `# Role: 资深编辑与分镜师

# Task:
请阅读我提供的【故事文本】，并将其切分为【Target_Number】个部分。
切分后的每一部分将用于生成单张关键分镜，因此需要保证每一段的文字量适中，且包含明确的画面信息。

# Inputs:
1. 故事文本: {SCRIPT_CONTENT}
2. 切分份数 (Target_Number): {SCENE_COUNT}

# Important Rules:
1. 必须严格按照要求的份数进行切分，确保生成**准确的{SCENE_COUNT}份**内容
2. 保持故事原汁原味，不要删减细节，只是进行物理切分
3. 确保切分点落在情节转折或动作变换的自然停顿处
4. 每一份都必须包含完整的画面信息，适合生成分镜图
5. 如果故事较短，可以按照时间顺序、地点变化、人物动作等进行合理切分

# Output Format:
请严格按照以下格式输出每一份，确保输出{SCENE_COUNT}份：

---
## 第1份
**完整剧情原文**: [这里必须放入切分出来的原始故事文本，不要概括]
**核心视觉点**: [用一句话提炼这段文字最核心的画面内容]
---
## 第2份
**完整剧情原文**: [这里必须放入切分出来的原始故事文本，不要概括]
**核心视觉点**: [用一句话提炼这段文字最核心的画面内容]
---
[继续输出到第{SCENE_COUNT}份]

记住：必须输出准确的{SCENE_COUNT}份内容！`;
```

**Step2: 关键帧提取模板**:
```javascript
const STEP2_PROMPT_TEMPLATE = `# Role: 视觉导演

# Task:
基于上一步切分的每一份【完整剧情原文】，将其转化为具体的画面视觉描述。

# Logic Rules (关键):
1. 对于 **第1份 到 第{LAST_SCENE_INDEX}份**：
   - 只提炼 **1个"开始帧"**。这个画面代表该段剧情开始时的状态。
2. 对于 **最后一份 (第{SCENE_COUNT}份)**：
   - 提炼 **1个"开始帧"**。
   - 额外提炼 **1个"结束帧"**（作为整个故事的落幅/结局）。

# Requirement:
描述必须包含：
- **主体**: 角色是谁，在做什么动作。
- **环境**: 背景细节，天气，时间。
- **氛围**: 光影颜色，情绪基调。

# Input (上一步的切分结果):
{SEGMENTED_STORY}

# Output Format:
---
## 第X份
**帧类型**: [开始帧 / 结束帧]
**画面描述**: (例如：暴雨夜，林默站在霓虹闪烁的巷口，风衣被风吹起，右手按在刀柄上，眼神冷冽)
---`;
```

**Step3: 提示词生成模板**:
```javascript
const STEP3_PROMPT_TEMPLATE = `# Role: AI绘图提示词专家 (即梦/Jimeng 专项优化)

# Setup (角色一致性):
在生成提示词之前，请先帮我建立主要角色的【特征词库】。
对于故事中的主角，请固定以下格式：
- [角色名]: (具体的发型, 发色, 瞳色, 服装细节, 特殊配饰)
*请确保在每一条包含该角色的提示词中，都完整包含这些特征词。*

# Style & Quality (画风设置):
每一条提示词必须包含以下前缀：
(Masterpiece, top quality, highly detailed, 8k resolution, cinematic lighting, dynamic composition) + {STYLE_SETTING}

# Task:
将第二步得到的每一个"画面描述"转化为即梦可用的提示词。

# Input (上一步的关键帧结果):
{EXTRACTED_FRAMES}

# Output Format:
请严格按以下格式输出：

---
### [序号] 第X份-[帧类型]
**中文辅助描述**: [简短的中文画面说明，方便我确认]
**Jimeng Prompt**: [画风修饰词], [角色特征词], [动作与具体场景描述], [环境与光影], [镜头语言: 如 close-up, wide angle, depth of field] --ar 16:9
---`;
```

### 响应解析

**Step3结果解析函数**:
```javascript
function parseStep3Results(claudeResponse) {
  console.log('🔍 解析第3步结果，内容长度:', claudeResponse.length);

  const frames = [];
  const sections = claudeResponse.split('---').filter(section => section.trim());

  sections.forEach((section, index) => {
    const trimmedSection = section.trim();

    // 使用灵活的正则表达式匹配
    const chineseMatch = trimmedSection.match(/\*\*中文辅助描述\*\*[:：]\s*([^\n]+)/);
    const promptMatch = trimmedSection.match(/\*\*Jimeng Prompt\*\*[:：]\s*([^\n]+)/);
    const titleMatch = trimmedSection.match(/###\s*\[?\d*\]?\s*第(\d+)份[-—]?(开始帧|结束帧)/);

    if (chineseMatch && promptMatch) {
      const sceneIndex = titleMatch ? parseInt(titleMatch[1]) : index + 1;
      const frameType = titleMatch ? titleMatch[2] : '开始帧';

      const frame = {
        sequence: index + 1,
        sceneIndex: sceneIndex,
        frameType: frameType,
        chineseDescription: chineseMatch[1].trim(),
        jimengPrompt: promptMatch[1].trim(),
        imageUrl: null,
        isGenerating: false,
        error: null
      };

      frames.push(frame);

      console.log('✅ 成功解析帧:', {
        sequence: frame.sequence,
        frameType: frame.frameType,
        descLength: frame.chineseDescription.length,
        promptLength: frame.jimengPrompt.length
      });
    }
  });

  console.log(`🎯 最终解析结果: 共${frames.length}个有效帧`);
  return frames;
}
```

### 错误处理和重试

**DeepSeek API错误处理**:
```javascript
const DEEPSEEK_ERROR_CODES = {
  400: "请求参数错误",
  401: "API密钥无效",
  403: "访问被禁止",
  429: "请求频率过高",
  500: "服务器内部错误",
  502: "网关错误",
  503: "服务暂时不可用"
};

function handleDeepSeekError(response, stepName) {
  const errorCode = response.status;
  const errorDescription = DEEPSEEK_ERROR_CODES[errorCode] || "未知错误";

  let userFriendlyMessage;
  let shouldRetry = false;

  switch (errorCode) {
    case 401:
      userFriendlyMessage = "API密钥配置错误，请检查DEEPSEEK_API_KEY";
      break;
    case 429:
      userFriendlyMessage = "请求过于频繁，请稍后重试";
      shouldRetry = true;
      break;
    case 500:
    case 502:
    case 503:
      userFriendlyMessage = "DeepSeek服务暂时不可用，请稍后重试";
      shouldRetry = true;
      break;
    default:
      userFriendlyMessage = `${stepName}失败: ${errorDescription}`;
  }

  const error = new Error(userFriendlyMessage);
  error.shouldRetry = shouldRetry;
  error.originalStatus = errorCode;

  throw error;
}
```

## Claude API集成 (备选)

### API概述

**服务商**: Anthropic
**服务**: Claude API
**用途**: 备选剧本分析服务
**模型**: claude-3-sonnet-20240229
**特点**:
- 强大的推理能力
- 支持长文本
- 输出质量高
- 支持代理访问

### 认证配置

**环境变量配置**:
```bash
# Claude API配置
ANTHROPIC_API_KEY=your_claude_api_key_here
ANTHROPIC_BASE_URL=https://anyrouter.top/v1

# 可选配置
ANTHROPIC_MODEL=claude-3-sonnet-20240229
ANTHROPIC_MAX_TOKENS=4000
ANTHROPIC_TEMPERATURE=0.7
```

### 代理配置

**SSL证书忽略配置**:
```javascript
// lib/claude-api.js
const config = {
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 60000,
};

// 如果有代理地址，则使用代理
if (process.env.ANTHROPIC_BASE_URL) {
  let baseUrl = process.env.ANTHROPIC_BASE_URL;

  // 确保代理地址不以/v1结尾
  if (baseUrl.endsWith('/v1')) {
    baseUrl = baseUrl.slice(0, -3);
  }

  config.baseURL = baseUrl;

  // 添加自定义fetch以处理SSL问题
  config.fetch = async (url, options) => {
    console.log('📡 发起代理请求:', {
      url: url,
      method: options.method,
      hasAuth: !!options.headers?.Authorization
    });

    // 强制忽略SSL证书验证
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

    // 确保认证头正确设置
    const headers = {
      ...options.headers,
      'User-Agent': 'ScriptToFrame/1.0.0',
      'anthropic-version': '2023-06-01'
    };

    if (config.apiKey && !headers.Authorization) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const fetchOptions = {
      ...options,
      headers: headers,
      agent: false,
    };

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ 代理响应错误:', errorText.substring(0, 500));
    }

    return response;
  };
}

const anthropic = new Anthropic(config);
```

**API调用示例**:
```javascript
class ClaudeScriptParser {
  async parseScript(script, frameCount, style = 'default', genre = 'general') {
    const prompt = `
你是专业的漫剧分镜师，请智能解析以下剧本内容并规划分镜方案。

剧本内容：
${script}

要求：
1. 智能识别剧本格式
2. 自动提取角色、对话、动作、场景信息
3. 生成 ${frameCount} 个关键帧
4. 画风：${style}
5. 题材类型：${genre}
6. 输出比例：16:9

请按照以下JSON格式输出：
{
  "script_analysis": {
    "characters": [...],
    "scenes": [...],
    "genre_detected": "...",
    "total_frames": ${frameCount}
  },
  "storyboard_frames": [
    {
      "sequence": 1,
      "scene": "场景名称",
      "characters": ["角色"],
      "description": "详细画面描述",
      "prompt": "用于AI绘图的英文提示词",
      "emotion": "情绪氛围",
      "camera_angle": "镜头角度"
    }
  ]
}
`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0].text;

      // JSON解析
      let parsedResult;
      try {
        parsedResult = JSON.parse(content);
      } catch (jsonError) {
        // 如果解析失败，尝试提取JSON部分
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Claude返回的内容无法解析为JSON');
        }
      }

      return {
        success: true,
        data: parsedResult
      };

    } catch (error) {
      console.error('Claude API调用失败:', error);
      return {
        success: false,
        error: error.message || '剧本解析失败'
      };
    }
  }
}
```

## API安全和最佳实践

### 密钥管理

**环境变量最佳实践**:
```bash
# .env.example - 模板文件，不包含真实密钥
VOLCENGINE_ACCESS_KEY_ID=your_volcengine_access_key_here
VOLCENGINE_SECRET_ACCESS_KEY=your_volcengine_secret_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
ANTHROPIC_API_KEY=your_claude_api_key_here

# .env.local - 实际使用，应加入.gitignore
VOLCENGINE_ACCESS_KEY_ID=your_access_key_here
VOLCENGINE_SECRET_ACCESS_KEY=your_secret_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
ANTHROPIC_API_KEY=your_claude_api_key_here
```

**密钥验证函数**:
```javascript
function validateApiKeys() {
  const requiredKeys = [
    'VOLCENGINE_ACCESS_KEY_ID',
    'VOLCENGINE_SECRET_ACCESS_KEY',
    'DEEPSEEK_API_KEY'
  ];

  const missingKeys = requiredKeys.filter(key => !process.env[key]);

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
  }

  // 验证密钥格式
  if (!process.env.DEEPSEEK_API_KEY.startsWith('sk-')) {
    throw new Error('DEEPSEEK_API_KEY format is invalid');
  }

  console.log('✅ API密钥验证通过');
}

// 应用启动时验证
validateApiKeys();
```

### 请求频率限制

**频率控制实现**:
```javascript
class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = new Map();
  }

  async checkLimit(apiName) {
    const now = Date.now();
    const windowStart = now - this.timeWindow;

    // 获取当前时间窗口内的请求
    if (!this.requests.has(apiName)) {
      this.requests.set(apiName, []);
    }

    const apiRequests = this.requests.get(apiName);

    // 移除过期请求
    const validRequests = apiRequests.filter(time => time > windowStart);
    this.requests.set(apiName, validRequests);

    // 检查是否超过限制
    if (validRequests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...validRequests);
      const waitTime = oldestRequest + this.timeWindow - now;
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    // 记录当前请求
    validRequests.push(now);
  }
}

// 为不同API设置不同的限制
const rateLimiters = {
  deepseek: new RateLimiter(20, 60000),    // 20 requests per minute
  volcengine: new RateLimiter(10, 60000),  // 10 requests per minute
  claude: new RateLimiter(5, 60000)        // 5 requests per minute
};

// 使用示例
async function callAPIWithRateLimit(apiName, apiFunction) {
  await rateLimiters[apiName].checkLimit(apiName);
  return await apiFunction();
}
```

### 错误重试策略

**统一重试机制**:
```javascript
class RetryableError extends Error {
  constructor(message, isRetryable = true) {
    super(message);
    this.isRetryable = isRetryable;
  }
}

async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = (error) => error.isRetryable !== false
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 不重试的错误类型
      if (!retryCondition(error) || attempt === maxRetries) {
        break;
      }

      // 计算延迟时间 (指数退避)
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );

      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, {
        error: error.message,
        nextDelay: delay
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// 使用示例
const result = await withRetry(
  () => callDeepSeek(prompt, stepName, requestId),
  {
    maxRetries: 2,
    baseDelay: 2000,
    retryCondition: (error) => {
      // 只重试网络错误和5xx错误
      return error.message.includes('网络') ||
             error.message.includes('503') ||
             error.message.includes('502');
    }
  }
);
```

### 监控和日志

**API调用监控**:
```javascript
class APIMonitor {
  constructor() {
    this.metrics = {
      deepseek: { calls: 0, errors: 0, totalTime: 0 },
      volcengine: { calls: 0, errors: 0, totalTime: 0 },
      claude: { calls: 0, errors: 0, totalTime: 0 }
    };
  }

  async trackAPICall(apiName, fn) {
    const startTime = Date.now();
    this.metrics[apiName].calls++;

    try {
      const result = await fn();
      this.metrics[apiName].totalTime += Date.now() - startTime;
      return result;
    } catch (error) {
      this.metrics[apiName].errors++;
      this.metrics[apiName].totalTime += Date.now() - startTime;

      // 记录错误详情
      console.error(`API调用失败 [${apiName}]:`, {
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  getStats() {
    const stats = {};

    for (const [api, metrics] of Object.entries(this.metrics)) {
      const avgResponseTime = metrics.calls > 0
        ? Math.round(metrics.totalTime / metrics.calls)
        : 0;

      stats[api] = {
        totalCalls: metrics.calls,
        errors: metrics.errors,
        successRate: metrics.calls > 0
          ? Math.round(((metrics.calls - metrics.errors) / metrics.calls) * 100)
          : 0,
        avgResponseTime: avgResponseTime
      };
    }

    return stats;
  }
}

// 全局监控实例
const apiMonitor = new APIMonitor();

// 使用示例
const result = await apiMonitor.trackAPICall('deepseek', async () => {
  return await callDeepSeek(prompt, stepName, requestId);
});
```

### 成本优化

**提示词优化策略**:
```javascript
class CostOptimizer {
  constructor() {
    this.tokenCosts = {
      'deepseek-chat': { input: 0.001, output: 0.002 },  // 每1K tokens价格
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'jimeng_v4': 0.02  // 每张图片价格
    };
  }

  estimateTokens(text) {
    // 简单的token估算 (实际应使用tokenizer)
    return Math.ceil(text.length / 3);
  }

  estimateCost(apiName, inputText, outputTokens = 1000) {
    const inputTokens = this.estimateTokens(inputText);
    const cost = this.tokenCosts[apiName];

    if (typeof cost === 'number') {
      return cost; // 固定价格 (图片生成)
    }

    return (inputTokens / 1000 * cost.input) + (outputTokens / 1000 * cost.output);
  }

  optimizePrompt(prompt, maxTokens = 3000) {
    const currentTokens = this.estimateTokens(prompt);

    if (currentTokens <= maxTokens) {
      return prompt;
    }

    // 简单截断策略
    const ratio = maxTokens / currentTokens;
    const targetLength = Math.floor(prompt.length * ratio * 0.9); // 预留10%缓冲

    return prompt.substring(0, targetLength) + '...';
  }
}

const costOptimizer = new CostOptimizer();

// 使用示例
const optimizedPrompt = costOptimizer.optimizePrompt(originalPrompt, 2500);
const estimatedCost = costOptimizer.estimateCost('deepseek-chat', optimizedPrompt);
console.log(`预估成本: $${estimatedCost.toFixed(4)}`);
```

---

**文档版本**: v1.0.0
**最后更新**: 2025-12-24
**维护者**: ScriptToFrame Team