/**
 * 批量生成分镜图API - 通过Python后端调用火山引擎即梦
 * 支持实时进度更新和详细日志记录
 */

/**
 * SSE流式批量生成处理函数 - 逐帧推送结果
 */
async function handleStreamingGeneration(req, res, requestId, frames, referenceImage, config) {
  // 设置SSE响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8082';
  const validFrames = frames.filter(frame => frame.prompt || frame.jimengPrompt);

  console.log(`🎨 [批量生成-${requestId}] 开始SSE流式批量生成，共${validFrames.length}帧`);

  let successCount = 0;
  let failedCount = 0;

  try {
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
      res.flush && res.flush(); // 立即发送

      try {
        // 调用Python后端生成单张图片
        const requestData = {
          prompt: frame.prompt || frame.jimengPrompt,
          frame: frame,
          config: config
        };

        console.log(`📤 [批量生成-${requestId}] 发送到Python后端 (第${i + 1}/${validFrames.length}):`, {
          sequence: frame.sequence
        });

        const startTime = Date.now();
        const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
          timeout: 300000 // 5分钟
        });

        const responseTime = Date.now() - startTime;
        const result = await response.json();

        if (response.ok && result.success) {
          // 推送单帧完成事件
          res.write(`data: ${JSON.stringify({
            type: 'frame_complete',
            sequence: frame.sequence,
            imageUrl: result.data.imageUrl,
            tosUrl: result.data.tosUrl,  // 即梦返回的原始TOS URL，用于修图
            progress: progress,
            responseTime: responseTime
          })}\n\n`);
          res.flush && res.flush(); // 立即发送

          successCount++;
          console.log(`✅ [批量生成-${requestId}] 第${i + 1}帧生成成功: sequence=${frame.sequence}, time=${responseTime}ms`);
        } else {
          // 推送单帧错误事件
          const errorMessage = result.error || `HTTP ${response.status}`;
          res.write(`data: ${JSON.stringify({
            type: 'frame_error',
            sequence: frame.sequence,
            error: errorMessage,
            progress: progress
          })}\n\n`);
          res.flush && res.flush(); // 立即发送

          failedCount++;
          console.error(`❌ [批量生成-${requestId}] 第${i + 1}帧生成失败: sequence=${frame.sequence}, error=${errorMessage}`);
        }

      } catch (error) {
        console.error(`💥 [批量生成-${requestId}] 第${i + 1}帧处理异常:`, error.message);
        res.write(`data: ${JSON.stringify({
          type: 'frame_error',
          sequence: frame.sequence,
          error: error.message,
          progress: progress
        })}\n\n`);
        res.flush && res.flush(); // 立即发送

        failedCount++;
      }

      // 延迟100ms避免API过载
      if (i < validFrames.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 推送完成事件
    const finalStats = {
      total: validFrames.length,
      success: successCount,
      failed: failedCount,
      successRate: validFrames.length > 0 ? Math.round((successCount / validFrames.length) * 100) : 0
    };

    res.write(`data: ${JSON.stringify({
      type: 'complete',
      message: '所有帧生成完成',
      stats: finalStats
    })}\n\n`);
    res.flush && res.flush(); // 立即发送

    console.log(`✅ [批量生成-${requestId}] 流式批量生成完成:`, finalStats);
    res.end();

  } catch (error) {
    console.error('❌ [批量生成] 流式批量生成失败:', error.message);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message
    })}\n\n`);
    res.flush && res.flush(); // 立即发送
    res.end();
  }
}

/**
 * 传统JSON响应处理函数（保留原有逻辑）
 */
async function handleTraditionalGeneration(req, res, requestId, frames, referenceImage, config) {
  const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8082';
  const validFrames = frames.filter(frame => frame.prompt || frame.jimengPrompt);

  if (validFrames.length === 0) {
    console.error(`❌ [批量生成-${requestId}] 没有有效的提示词`);
    return res.status(400).json({
      success: false,
      error: '没有找到有效的提示词'
    });
  }

  console.log(`🎯 [批量生成-${requestId}] 开始传统JSON批量生成:`, {
    totalFrames: frames.length,
    validFrames: validFrames.length
  });

  // 逐个生成图片，并收集结果
  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < validFrames.length; i++) {
    const frame = validFrames[i];
    const frameProgress = Math.round(((i + 1) / validFrames.length) * 100);

    console.log(`🔄 [批量生成-${requestId}] 处理第${i + 1}/${validFrames.length}个帧 (进度: ${frameProgress}%):`, {
      sequence: frame.sequence
    });

    try {
      const requestData = {
        prompt: frame.prompt || frame.jimengPrompt,
        frame: frame,
        config: config
      };

      const startTime = Date.now();
      const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        timeout: 300000
      });

      const responseTime = Date.now() - startTime;
      const result = await response.json();

      if (response.ok && result.success) {
        results.push({
          sequence: frame.sequence,
          imageUrl: result.data.imageUrl,
          tosUrl: result.data.tosUrl,  // 即梦返回的原始TOS URL，用于修图
          prompt: frame.prompt || frame.jimengPrompt,
          chineseDescription: frame.chineseDescription || frame.displayDescription,
          frameType: frame.frameType,
          error: null,
          progress: frameProgress,
          generatedAt: new Date().toISOString(),
          responseTime: responseTime
        });
        successCount++;
        console.log(`✅ [批量生成-${requestId}] 第${i + 1}个帧生成成功: sequence=${frame.sequence}`);
      } else {
        const errorMessage = result.error || `HTTP ${response.status}`;
        results.push({
          sequence: frame.sequence,
          imageUrl: null,
          prompt: frame.prompt || frame.jimengPrompt,
          chineseDescription: frame.chineseDescription || frame.displayDescription,
          frameType: frame.frameType,
          error: errorMessage,
          progress: frameProgress,
          generatedAt: new Date().toISOString(),
          responseTime: responseTime
        });
        failedCount++;
        console.error(`❌ [批量生成-${requestId}] 第${i + 1}个帧生成失败`);
      }

    } catch (error) {
      results.push({
        sequence: frame.sequence,
        imageUrl: null,
        prompt: frame.prompt || frame.jimengPrompt,
        chineseDescription: frame.chineseDescription || frame.displayDescription,
        frameType: frame.frameType,
        error: error.message,
        progress: frameProgress,
        generatedAt: new Date().toISOString(),
        responseTime: 0
      });
      failedCount++;
      console.error(`💥 [批量生成-${requestId}] 第${i + 1}个帧处理异常:`, error.message);
    }

    if (i < validFrames.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const finalStats = {
    total: validFrames.length,
    success: successCount,
    failed: failedCount,
    successRate: validFrames.length > 0 ? Math.round((successCount / validFrames.length) * 100) : 0,
    averageTime: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length) : 0
  };

  console.log(`✅ [批量生成-${requestId}] 传统JSON批量生成完成:`, finalStats);

  const responseData = {
    success: true,
    data: results,
    stats: finalStats,
    requestId: requestId,
    completedAt: new Date().toISOString()
  };

  res.status(200).json(responseData);
}

export default async function handler(req, res) {
  const requestId = Date.now();

  console.log(`🎨 [批量生成-${requestId}] 收到批量生成请求:`, {
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (req.method !== 'POST') {
    console.error(`❌ [批量生成-${requestId}] 错误方法:`, req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { frames, referenceImage, config } = req.body;

    if (!frames || !frames.length) {
      console.error(`❌ [批量生成-${requestId}] 缺少帧数据`);
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: frames'
      });
    }

    // 检查是否启用流式响应
    const { stream } = req.query;
    if (stream === 'true') {
      console.log(`🎨 [批量生成-${requestId}] 使用SSE流式响应模式`);
      return await handleStreamingGeneration(req, res, requestId, frames, referenceImage, config);
    } else {
      console.log(`🎨 [批量生成-${requestId}] 使用传统JSON响应模式`);
      return await handleTraditionalGeneration(req, res, requestId, frames, referenceImage, config);
    }

  } catch (error) {
    console.error(`❌ [批量生成-${requestId}] 请求处理失败:`, error.message);
    res.status(500).json({
      success: false,
      error: `请求处理失败: ${error.message}`,
      requestId: requestId
    });
  }
}