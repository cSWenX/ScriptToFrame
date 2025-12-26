# 三项需求实现技术总结

## 概述

本次实现包含三项前端功能优化，使用 Server-Sent Events (SSE) 实现真实的流式进度展示。

### 实现架构

```
前端 (React)
  ├─ handleAnalyzeScript()
  │  └─ fetch() + ReadableStream
  │     └─ SSE 事件解析
  │        └─ setAnalysisProgress() 更新进度条
  │
  ├─ handleGenerateFirstFrame()
  │  └─ 线性进度 (0→30→50→75→100)
  │
  └─ handleGenerateAllFrames()
     └─ fetch() + ReadableStream
        └─ frame_complete 事件处理
           └─ setFrames() 逐帧更新 UI

后端 (Next.js)
  ├─ /api/intelligent-analyze-script
  │  ├─ ?stream=true → handleStreamingAnalysis() [SSE]
  │  └─ 无参数 → handleTraditionalAnalysis() [JSON]
  │
  └─ /api/generate-all-images
     ├─ ?stream=true → handleStreamingGeneration() [SSE]
     └─ 无参数 → handleTraditionalGeneration() [JSON]
```

---

## 需求1: 框架数量上限提升 (3 → 40)

### 文件: `components/ControlPanel.jsx`

#### 改动位置: 行 118-127

**之前**:
```jsx
<input
  type="range"
  min="3"
  max="12"          // ❌ 旧值
  value={frameCount}
  onChange={(e) => setFrameCount(parseInt(e.target.value))}
  className="cyber-slider w-full"
/>
<div className="flex justify-between text-xs text-cyan-400/60 mt-2">
  <span>3</span>
  <span>12</span>   // ❌ 旧值
</div>
```

**之后**:
```jsx
<input
  type="range"
  min="3"
  max="40"          // ✅ 新值
  value={frameCount}
  onChange={(e) => setFrameCount(parseInt(e.target.value))}
  className="cyber-slider w-full"
/>
<div className="flex justify-between text-xs text-cyan-400/60 mt-2">
  <span>3</span>
  <span>40</span>   // ✅ 新值
</div>
```

### 影响范围
- 用户可以设置 3-40 个场景
- AI 分析会生成 (sceneCount + 1) 个关键帧
  - 3 场景 → 4 帧 (3个开始帧 + 1个结束帧)
  - 40 场景 → 41 帧 (40个开始帧 + 1个结束帧)

---

## 需求2: AI分析进度条优化 (4步真实进度)

### 架构变更: 模拟进度 → SSE 流式进度

#### 之前 (模拟进度)
```javascript
const updateProgress = (step, progress) => {
  const totalSteps = 4;
  const stepProgress = ((step - 1) / totalSteps) * 100 + (progress / totalSteps);
  setAnalysisProgress(Math.min(100, stepProgress));
};
```

**问题**:
- 进度条仅在开始和结束时更新
- 不反映真实的 4 步进度
- 用户看不到实际的工作流程

#### 之后 (SSE 流式进度)
后端每完成一步就推送一个进度事件，前端立即更新进度条。

### 后端改造: `pages/api/intelligent-analyze-script.js`

#### 新增函数: `handleStreamingAnalysis()`

```javascript
async function handleStreamingAnalysis(req, res, requestId, script, sceneCount, style, genre) {
  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Step 1: 故事切分 (0-25%)
    res.write(`data: ${JSON.stringify({
      type: 'progress',
      step: 1,
      progress: 0,
      message: '开始故事切分...'
    })}\n\n`);

    const segmentedStory = await callDeepSeek(step1Prompt, '第1步: 故事切分', requestId);

    res.write(`data: ${JSON.stringify({
      type: 'progress',
      step: 1,
      progress: 25,
      message: '故事切分完成'
    })}\n\n`);

    // Step 2, 3, 4 ... 类似逻辑

    // 发送最终结果
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      data: { storyboard_frames: frames }
    })}\n\n`);

    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message
    })}\n\n`);
    res.end();
  }
}
```

#### 路由逻辑: 根据查询参数选择处理模式

```javascript
export default async function handler(req, res) {
  const { stream } = req.query;

  if (stream === 'true') {
    // SSE 流式响应模式
    return await handleStreamingAnalysis(req, res, requestId, script, sceneCount, style, genre);
  } else {
    // 传统 JSON 响应模式 (向后兼容)
    return await handleTraditionalAnalysis(req, res, requestId, script, sceneCount, style, genre);
  }
}
```

### 前端改造: `pages/index.js - handleAnalyzeScript()`

#### 核心变更: EventSource → fetch + ReadableStream

**为什么不用 EventSource?**
- EventSource 只支持 GET 请求
- 长脚本可能超过 URL 长度限制
- POST 请求体无法通过 EventSource 传递

**解决方案: fetch + ReadableStream**

```javascript
const handleAnalyzeScript = async (config) => {
  // ... 初始化代码 ...

  try {
    const params = new URLSearchParams({
      stream: 'true'  // ✅ 关键: 启用流式响应
    });

    const response = await fetch(`/api/intelligent-analyze-script?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script,
        sceneCount: config.frameCount,
        style: config.style,
        genre: config.genre
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // ✅ 使用 ReadableStream 处理 SSE 流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log(`✅ [前端] SSE流读取完成，共收到${eventCount}个事件`);
        break;
      }

      // 解码数据
      buffer += decoder.decode(value, { stream: true });

      // 按行分割 SSE 事件
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      // 处理完整的行
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          eventCount++;
          console.log(`📨 [前端] 收到SSE事件 #${eventCount}`);

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'progress') {
              // ✅ 实时更新进度条
              setAnalysisProgress(data.progress);
              console.log(`📊 [前端] Step${data.step}: ${data.message} (${data.progress}%)`);
            }
            else if (data.type === 'complete') {
              // 处理完成事件
              setAnalysisResult(data.data);
              const frameStructure = data.data.storyboard_frames.map(frame => ({
                ...frame,
                id: `frame_${frame.sequence}`,
                displayDescription: frame.chineseDescription,
                prompt: frame.jimengPrompt,
                isGenerating: false,
                imageUrl: null,
                error: null
              }));
              setFrames(frameStructure);

              // 2秒后隐藏进度条
              setTimeout(() => {
                setProgressVisible(prev => ({ ...prev, analysis: false }));
              }, 2000);
            }
            else if (data.type === 'error') {
              alert(`智能分析失败: ${data.error}`);
              setProgressVisible(prev => ({ ...prev, analysis: false }));
            }
          } catch (e) {
            console.error('❌ [前端] 解析SSE数据失败:', e.message);
          }
        }
      }
    }
  } catch (error) {
    // 错误处理
    if (error.name === 'AbortError') {
      console.log('⏹️ [前端] 智能分析被用户停止');
      return;
    }
    alert('智能分析失败，请检查网络连接');
    setProgressVisible(prev => ({ ...prev, analysis: false }));
  } finally {
    setIsAnalyzing(false);
    setAnalysisController(null);
  }
};
```

#### SSE 数据格式解析

SSE 标准格式:
```
data: {"type":"progress","step":1,"progress":25,"message":"..."}

data: {"type":"complete","data":{...}}
```

关键点:
- 以 `data: ` 开头 (含空格)
- JSON 在冒号后面
- 每个事件后跟两个换行符 (`\n\n`)
- 需要逐行缓冲处理 (因为可能分多次到达)

---

## 需求3: 批量生成逐帧显示

### 架构: 全部完成后显示 → 逐帧实时显示

#### 后端改造: `pages/api/generate-all-images.js`

##### 新增函数: `handleStreamingGeneration()`

```javascript
async function handleStreamingGeneration(req, res, requestId, frames, referenceImage, config) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8081';
  const validFrames = frames.filter(frame => frame.prompt || frame.jimengPrompt);

  let successCount = 0;
  let failedCount = 0;

  try {
    // 遍历所有帧
    for (let i = 0; i < validFrames.length; i++) {
      const frame = validFrames[i];
      const progress = Math.round(((i + 1) / validFrames.length) * 100);

      // 推送开始生成事件
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        current: i + 1,
        total: validFrames.length,
        progress: progress,
        message: `正在生成第${i + 1}/${validFrames.length}帧...`,
        sequence: frame.sequence
      })}\n\n`);

      try {
        // 调用 Python 后端生成单张图片
        const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: frame.prompt || frame.jimengPrompt,
            frame: frame,
            config: config
          }),
          timeout: 300000
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // ✅ 推送帧完成事件 (立即在前端显示)
          res.write(`data: ${JSON.stringify({
            type: 'frame_complete',
            sequence: frame.sequence,
            imageUrl: result.data.imageUrl,
            progress: progress
          })}\n\n`);

          successCount++;
        } else {
          // 推送帧错误事件
          res.write(`data: ${JSON.stringify({
            type: 'frame_error',
            sequence: frame.sequence,
            error: result.error || `HTTP ${response.status}`,
            progress: progress
          })}\n\n`);

          failedCount++;
        }
      } catch (error) {
        // 单帧处理异常
        res.write(`data: ${JSON.stringify({
          type: 'frame_error',
          sequence: frame.sequence,
          error: error.message,
          progress: progress
        })}\n\n`);

        failedCount++;
      }

      // 延迟 100ms 避免 API 过载
      if (i < validFrames.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 推送完成事件
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      message: '所有帧生成完成',
      stats: {
        total: validFrames.length,
        success: successCount,
        failed: failedCount
      }
    })}\n\n`);

    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message
    })}\n\n`);
    res.end();
  }
}
```

#### 前端改造: `pages/index.js - handleGenerateAllFrames()`

```javascript
const handleGenerateAllFrames = async (config) => {
  // ... 初始化代码 ...

  try {
    const response = await fetch('/api/generate-all-images?stream=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frames: frames,
        referenceImage: firstFrameData?.imageUrl || null,
        config: config
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value);
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'progress') {
              // 更新进度条
              setBatchProgress(data.progress);
              console.log(`📊 [前端] ${data.message}`);
            }
            else if (data.type === 'frame_complete') {
              // ✅ 关键: 单帧完成事件 → 立即更新 UI
              setFrames(prevFrames =>
                prevFrames.map(frame =>
                  frame.sequence === data.sequence
                    ? {
                        ...frame,
                        imageUrl: data.imageUrl,
                        isGenerating: false,
                        error: null
                      }
                    : frame
                )
              );
              console.log(`✅ [前端] 第${data.sequence}帧生成完成，立即显示`);
            }
            else if (data.type === 'frame_error') {
              // 标记错误帧
              setFrames(prevFrames =>
                prevFrames.map(frame =>
                  frame.sequence === data.sequence
                    ? {
                        ...frame,
                        error: data.error,
                        isGenerating: false
                      }
                    : frame
                )
              );
              console.error(`❌ [前端] 第${data.sequence}帧生成失败`);
            }
            else if (data.type === 'complete') {
              console.log('✅ [前端] 所有分镜图生成完成');
              setTimeout(() => {
                setProgressVisible(prev => ({ ...prev, batch: false }));
              }, 2000);
            }
          } catch (e) {
            console.error('❌ [前端] 解析SSE数据失败:', e.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('💥 [前端] 批量生成错误:', error);

    if (error.name !== 'AbortError') {
      alert('生成失败，请检查网络连接');
    }

    setProgressVisible(prev => ({ ...prev, batch: false }));
  } finally {
    setIsGeneratingAll(false);
    setAllFramesController(null);
    setFrames(prevFrames =>
      prevFrames.map(frame => ({ ...frame, isGenerating: false }))
    );
  }
};
```

#### 关键实现: 逐帧立即更新 UI

**核心代码**:
```javascript
setFrames(prevFrames =>
  prevFrames.map(frame =>
    frame.sequence === data.sequence  // ✅ 找到对应的帧
      ? {
          ...frame,
          imageUrl: data.imageUrl,    // ✅ 立即更新图片 URL
          isGenerating: false,
          error: null
        }
      : frame
  )
);
```

**工作流程**:
1. 后端生成第 1 帧 → 推送 `frame_complete` 事件
2. 前端收到事件 → 立即更新 frames 状态
3. React 重新渲染 → 第 1 帧图片显示在页面上
4. 同时后端继续生成第 2 帧
5. ...重复直到所有帧完成

**优势**:
- ✅ 用户看到实时进度
- ✅ 快速反馈 (第一张图很快出现)
- ✅ 更好的用户体验

---

## 性能优化

### 1. 缓冲处理 (Buffer Handling)
```javascript
let buffer = '';
buffer += decoder.decode(value, { stream: true });
const lines = buffer.split('\n');
buffer = lines.pop() || ''; // 保留未完成的行
```

**原因**: SSE 数据可能分多个 TCP 包到达，需要缓冲

### 2. 延迟控制 (Throttling)
```javascript
// 避免 API 过载
if (i < validFrames.length - 1) {
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

### 3. 流式解码 (Streaming Decode)
```javascript
decoder.decode(value, { stream: true }) // ✅ stream: true
```

**原因**: UTF-8 多字节字符可能跨越数据包边界

---

## 错误处理策略

### 前端错误处理
1. **网络错误**: AbortError 和网络超时
2. **解析错误**: JSON.parse() 失败
3. **API 错误**: type: 'error' 事件

### 后端错误处理
1. **步骤失败**: 推送 error 类型事件
2. **单帧失败**: 推送 frame_error 事件，继续处理其他帧
3. **连接断开**: try-catch 捕获并推送错误

---

## 向后兼容性

所有 API 端点都支持两种模式:

### SSE 流式模式 (新)
```javascript
fetch('/api/intelligent-analyze-script?stream=true', {
  method: 'POST',
  body: JSON.stringify({...})
})
```

### 传统 JSON 模式 (旧)
```javascript
fetch('/api/intelligent-analyze-script', {
  method: 'POST',
  body: JSON.stringify({...})
})
```

**好处**: 可以渐进式升级，不破坏现有集成

---

## 调试工具

### 后端日志格式
```
🎭 [智能分析-1766627775432] 检查流式模式: { stream: 'true', isTrue: true }
🎭 [智能分析-1766627775432] ✅ 使用SSE流式响应模式
✅ [智能分析-1766627775432] 流式分析完成
```

### 前端日志格式
```
📊 [前端] 开始读取SSE流...
📨 [前端] 收到SSE事件 #1: {"type":"progress"...
📨 [前端] 收到SSE事件 #2: {"type":"progress"...
✅ [前端] SSE流读取完成，共收到4个事件
```

### 浏览器 Network 标签
- Request Headers: 包含 `?stream=true`
- Response Headers: `Content-Type: text/event-stream`
- Response: 以 `data: ` 开头的多个事件

---

## 已知限制

1. **IE 不支持**: ReadableStream API 在 IE 中不可用
   - 解决: 使用 polyfill 或降级到 JSON 响应

2. **代理兼容性**: 某些企业代理可能缓冲 SSE 流
   - 解决: 实现心跳机制 (定期发送 `: ping\n\n`)

3. **移动网络**: 长连接可能被中断
   - 解决: 实现自动重连逻辑

---

**最后更新**: 2025-12-25
**实现版本**: v1.0
**状态**: ✅ 完成并验证
