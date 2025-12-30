const ClaudeScriptParser = require('../../lib/claude-api');

/**
 * 剧本分析API接口 - 支持SSE流式进度推送
 * POST /api/analyze-script
 */
export default async function handler(req, res) {
  // 详细请求日志
  console.log(`[${new Date().toISOString()}] 收到剧本分析请求`);

  if (req.method !== 'POST') {
    console.log('❌ 请求方法错误:', req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { script, frameCount, style, genre, stream } = req.body;
    console.log('请求参数:', {
      scriptLength: script?.length || 0,
      frameCount,
      style,
      genre,
      stream: stream ? '启用SSE流' : '传统JSON'
    });

    if (!script || !frameCount) {
      console.log('❌ 参数验证失败: 缺少script或frameCount');
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: script, frameCount'
      });
    }

    // 如果启用流式模式，返回SSE
    if (stream === true) {
      console.log('🌊 启用SSE流式响应');
      return handleStreamingAnalysis(req, res, script, frameCount, style, genre);
    }

    // 传统JSON模式
    console.log('🚀 开始调用Claude API（传统模式）...');
    const claudeParser = new ClaudeScriptParser();
    const result = await claudeParser.parseScript(script, frameCount, style, genre);

    console.log('📊 Claude API调用结果:', {
      success: result.success,
      hasData: !!result.data,
      error: result.error
    });

    if (!result.success) {
      console.log('❌ Claude API调用失败:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    console.log('✅ 成功返回分析结果');
    res.status(200).json({
      success: true,
      data: {
        ...result.data,
        recommendedStyle: style,
        recommendedGenre: genre,
        estimatedScenes: result.data.script_analysis.scenes.length
      }
    });

  } catch (error) {
    console.error('❌ 剧本分析API错误:');
    console.error('错误类型:', error.name);
    console.error('错误消息:', error.message);

    let errorMessage = '服务器内部错误';
    if (error.message.includes('fetch failed')) {
      errorMessage = 'Claude API连接失败，请检查代理设置';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Claude API请求超时';
    } else if (error.message.includes('401')) {
      errorMessage = 'Claude API密钥无效';
    } else if (error.message.includes('403')) {
      errorMessage = 'Claude API访问被拒绝，请检查代理配置';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 处理SSE流式分析
 */
async function handleStreamingAnalysis(req, res, script, frameCount, style, genre) {
  // 设置SSE响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const requestId = Date.now();
  const steps = [
    { progress: 10, message: '初始化Claude API...' },
    { progress: 20, message: '发送剧本到Claude进行分析...' },
    { progress: 40, message: '等待Claude解析剧本内容...' },
    { progress: 60, message: '解析角色和场景信息...' },
    { progress: 80, message: '生成分镜规划...' },
    { progress: 90, message: '验证分析结果...' },
    { progress: 100, message: '分析完成' }
  ];

  try {
    // 推送初始进度
    for (let i = 0; i < steps.length - 1; i++) {
      const step = steps[i];

      console.log(`[分析进度-${requestId}] ${step.progress}% - ${step.message}`);
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        progress: step.progress,
        message: step.message,
        step: i + 1,
        totalSteps: steps.length
      })}\n\n`);
      res.flush && res.flush();

      // 在步骤之间延迟，模拟处理时间
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    }

    // 实际调用Claude API
    console.log(`[分析-${requestId}] 开始调用Claude API...`);
    const claudeParser = new ClaudeScriptParser();
    const result = await claudeParser.parseScript(script, frameCount, style, genre);

    if (!result.success) {
      console.error(`[分析-${requestId}] Claude API调用失败:`, result.error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: result.error
      })}\n\n`);
      res.end();
      return;
    }

    // 推送完成事件
    console.log(`[分析-${requestId}] 推送完成事件`);
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      progress: 100,
      message: '分析完成',
      data: {
        ...result.data,
        recommendedStyle: style,
        recommendedGenre: genre,
        estimatedScenes: result.data.script_analysis.scenes.length
      }
    })}\n\n`);
    res.end();

  } catch (error) {
    console.error(`[分析-${requestId}] 流式分析错误:`, error.message);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message || '分析失败'
    })}\n\n`);
    res.end();
  }
}