/**
 * Python后端代理API
 * 将请求代理到Python FastAPI后端服务
 */

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
    responseLimit: false,
    // 增加API超时时间到10分钟，因为图片生成可能需要较长时间
    timeout: 600000,
  },
};

export default async function handler(req, res) {
  const requestId = Date.now();

  console.log(`🔄 [API代理-${requestId}] 收到图片生成请求:`, {
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent']?.substring(0, 50),
    contentLength: req.headers['content-length']
  });

  if (req.method !== 'POST') {
    console.error(`❌ [API代理-${requestId}] 错误方法:`, req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log(`📋 [API代理-${requestId}] 解析请求体:`, {
      bodyKeys: req.body ? Object.keys(req.body) : [],
      hasPrompt: !!(req.body?.prompt),
      hasFrame: !!(req.body?.frame),
      frameKeys: req.body?.frame ? Object.keys(req.body.frame) : []
    });

    const { prompt, frame, chineseDescription, style, config } = req.body;
    const actualPrompt = prompt || frame?.prompt || frame?.jimengPrompt;

    console.log(`📝 [API代理-${requestId}] 提取的数据:`, {
      promptLength: actualPrompt ? actualPrompt.length : 0,
      hasChineseDescription: !!chineseDescription,
      style: style,
      configKeys: config ? Object.keys(config) : [],
      frameSequence: frame?.sequence
    });

    if (!actualPrompt) {
      console.error(`❌ [API代理-${requestId}] 缺少提示词`);
      return res.status(400).json({ success: false, error: '缺少必要参数: prompt' });
    }

    console.log(`🎨 [API代理-${requestId}] 提示词: "${actualPrompt.substring(0, 50)}..."`);

    // 代理到Python后端
    const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8081';
    console.log(`🔗 [API代理-${requestId}] Python后端地址:`, PYTHON_BACKEND_URL);

    // 创建超时控制器，设置10分钟超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`⏰ [API代理-${requestId}] 请求超时，中断连接 (10分钟)`);
      controller.abort();
    }, 600000); // 10分钟

    const requestData = {
      prompt: actualPrompt,
      frame: frame
    };

    console.log(`📤 [API代理-${requestId}] 发送到Python后端:`, {
      url: `${PYTHON_BACKEND_URL}/api/generate-image`,
      method: 'POST',
      promptLength: requestData.prompt.length,
      hasFrame: !!requestData.frame,
      frameSequence: requestData.frame?.sequence
    });

    const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log(`📥 [API代理-${requestId}] Python后端响应:`, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length')
      }
    });

    const result = await response.json();

    console.log(`📊 [API代理-${requestId}] Python后端响应数据:`, {
      success: result.success,
      hasError: !!result.error,
      hasData: !!result.data,
      dataKeys: result.data ? Object.keys(result.data) : [],
      responseSize: JSON.stringify(result).length
    });

    if (!response.ok) {
      console.error(`❌ [API代理-${requestId}] Python后端返回错误:`, {
        status: response.status,
        error: result.error || 'Unknown error'
      });
      throw new Error(result.error || `Python后端返回错误: ${response.status}`);
    }

    console.log(`✅ [API代理-${requestId}] 成功获取结果:`, {
      hasImageUrl: !!(result.data?.imageUrl),
      imageUrlLength: result.data?.imageUrl ? result.data.imageUrl.length : 0
    });

    res.status(200).json(result);

  } catch (error) {
    console.error(`💥 [API代理-${requestId}] 处理失败:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack?.split('\n')[0] // 只显示第一行堆栈
    });

    // 检查是否是连接错误
    if (error.code === 'ECONNREFUSED') {
      console.error(`🔌 [API代理-${requestId}] 连接被拒绝，Python后端可能未启动`);
      res.status(503).json({
        success: false,
        error: 'Python后端服务未启动，请先启动Python服务 (端口8081)'
      });
    } else if (error.name === 'AbortError') {
      // 超时错误
      console.error(`⏰ [API代理-${requestId}] 请求超时`);
      res.status(408).json({
        success: false,
        error: '图片生成超时，请稍后重试。生成过程可能需要较长时间，请耐心等待。'
      });
    } else if (error.message.includes('fetch')) {
      console.error(`🌐 [API代理-${requestId}] 网络错误`);
      res.status(502).json({
        success: false,
        error: `无法连接到Python后端: ${error.message}`
      });
    } else {
      console.error(`🔥 [API代理-${requestId}] 未知错误`);
      res.status(500).json({
        success: false,
        error: `Python后端调用失败: ${error.message}`
      });
    }
  }
}