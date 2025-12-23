/**
 * 批量生成分镜图API - 通过Python后端调用火山引擎即梦
 * 支持实时进度更新和详细日志记录
 */

export default async function handler(req, res) {
  const requestId = Date.now();

  console.log(`🎨 [批量生成-${requestId}] 收到批量生成请求:`, {
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent']?.substring(0, 50),
    contentLength: req.headers['content-length']
  });

  if (req.method !== 'POST') {
    console.error(`❌ [批量生成-${requestId}] 错误方法:`, req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log(`📋 [批量生成-${requestId}] 解析请求体:`, {
      bodyKeys: req.body ? Object.keys(req.body) : []
    });

    const { frames, referenceImage, config } = req.body;

    console.log(`📝 [批量生成-${requestId}] 提取的数据:`, {
      framesLength: frames ? frames.length : 0,
      hasReferenceImage: !!referenceImage,
      configKeys: config ? Object.keys(config) : [],
      framesWithPrompts: frames ? frames.filter(f => f.prompt || f.jimengPrompt).length : 0
    });

    if (!frames || !frames.length) {
      console.error(`❌ [批量生成-${requestId}] 缺少帧数据`);
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: frames'
      });
    }

    // 过滤出有有效提示词的帧
    const validFrames = frames.filter(frame => frame.prompt || frame.jimengPrompt);

    if (validFrames.length === 0) {
      console.error(`❌ [批量生成-${requestId}] 没有有效的提示词`);
      return res.status(400).json({
        success: false,
        error: '没有找到有效的提示词'
      });
    }

    console.log(`🎯 [批量生成-${requestId}] 开始批量生成:`, {
      totalFrames: frames.length,
      validFrames: validFrames.length,
      hasReference: !!referenceImage,
      configStyle: config?.style || 'default'
    });

    // Python后端地址
    const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8081';
    console.log(`🔗 [批量生成-${requestId}] Python后端地址:`, PYTHON_BACKEND_URL);

    // 逐个生成图片，并收集结果
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validFrames.length; i++) {
      const frame = validFrames[i];
      const frameProgress = Math.round(((i + 1) / validFrames.length) * 100);

      console.log(`🔄 [批量生成-${requestId}] 处理第${i + 1}/${validFrames.length}个帧 (进度: ${frameProgress}%):`, {
        sequence: frame.sequence,
        hasPrompt: !!(frame.prompt || frame.jimengPrompt),
        frameType: frame.frameType || 'unknown',
        currentProgress: frameProgress
      });

      try {
        // 调用Python后端生成单张图片
        const requestData = {
          prompt: frame.prompt || frame.jimengPrompt,
          frame: frame,
          config: config
        };

        console.log(`📤 [批量生成-${requestId}] 发送到Python后端 (第${i + 1}个):`, {
          url: `${PYTHON_BACKEND_URL}/api/generate-image`,
          method: 'POST',
          promptLength: requestData.prompt.length,
          frameSequence: frame.sequence
        });

        const startTime = Date.now();
        const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
          // 设置较长的超时时间
          timeout: 300000 // 5分钟
        });

        const responseTime = Date.now() - startTime;

        console.log(`📥 [批量生成-${requestId}] Python后端响应 (第${i + 1}个):`, {
          status: response.status,
          statusText: response.statusText,
          responseTime: `${responseTime}ms`,
          headers: {
            'content-type': response.headers.get('content-type'),
            'content-length': response.headers.get('content-length')
          }
        });

        const result = await response.json();

        console.log(`📊 [批量生成-${requestId}] Python后端响应数据 (第${i + 1}个):`, {
          success: result.success,
          hasError: !!result.error,
          hasData: !!result.data,
          dataKeys: result.data ? Object.keys(result.data) : [],
          responseSize: JSON.stringify(result).length
        });

        if (response.ok && result.success) {
          results.push({
            sequence: frame.sequence,
            imageUrl: result.data.imageUrl,
            prompt: frame.prompt || frame.jimengPrompt,
            chineseDescription: frame.chineseDescription || frame.displayDescription,
            frameType: frame.frameType,
            error: null,
            progress: frameProgress,
            generatedAt: new Date().toISOString(),
            responseTime: responseTime
          });
          successCount++;
          console.log(`✅ [批量生成-${requestId}] 第${i + 1}个帧生成成功: sequence=${frame.sequence}, time=${responseTime}ms`);
        } else {
          const errorMessage = result.error || `HTTP ${response.status}: ${response.statusText}`;
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
          console.error(`❌ [批量生成-${requestId}] 第${i + 1}个帧生成失败: sequence=${frame.sequence}, error=${errorMessage}, time=${responseTime}ms`);
        }

      } catch (error) {
        const errorMessage = error.message;
        results.push({
          sequence: frame.sequence,
          imageUrl: null,
          prompt: frame.prompt || frame.jimengPrompt,
          chineseDescription: frame.chineseDescription || frame.displayDescription,
          frameType: frame.frameType,
          error: errorMessage,
          progress: frameProgress,
          generatedAt: new Date().toISOString(),
          responseTime: 0
        });
        failedCount++;
        console.error(`💥 [批量生成-${requestId}] 第${i + 1}个帧处理异常: sequence=${frame.sequence}`, {
          message: error.message,
          name: error.name,
          stack: error.stack?.split('\n')[0]
        });
      }

      // 每个帧完成后添加小延迟，避免API过载
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

    console.log(`✅ [批量生成-${requestId}] 批量生成完成:`, finalStats);

    // 构造返回结果
    const responseData = {
      success: true,
      data: results,
      stats: finalStats,
      requestId: requestId,
      completedAt: new Date().toISOString()
    };

    console.log(`📤 [批量生成-${requestId}] 构造返回结果:`, {
      success: responseData.success,
      resultsLength: responseData.data.length,
      stats: responseData.stats,
      responseSize: JSON.stringify(responseData).length
    });

    console.log(`✅ [批量生成-${requestId}] 批量生成响应发送完成`);
    res.status(200).json(responseData);

  } catch (error) {
    console.error(`❌ [批量生成-${requestId}] 批量生成失败:`, {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n')[0],
      timestamp: new Date().toISOString()
    });

    const errorResponse = {
      success: false,
      error: `批量生成失败: ${error.message}`,
      requestId: requestId,
      failedAt: new Date().toISOString()
    };

    console.log(`📤 [批量生成-${requestId}] 错误响应发送:`, {
      success: errorResponse.success,
      errorLength: errorResponse.error.length,
      requestId: errorResponse.requestId
    });

    res.status(500).json(errorResponse);
  }
}