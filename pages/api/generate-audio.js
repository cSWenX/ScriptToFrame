/**
 * 音频生成API代理
 * 将请求转发到Python后端TTS服务
 */

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    responseLimit: false,
    timeout: 120000, // 2分钟超时
  },
};

// Python后端地址（通过环境变量配置，默认localhost）
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8081';

export default async function handler(req, res) {
  const requestId = Date.now();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let response = null;

  try {
    const { text, page_index, speaker_id, speed_factor, pitch_factor, language, project_id } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: text'
      });
    }

    console.log(`🔊 [音频代理-${requestId}] 转发请求到Python后端`);
    console.log(`📝 文本: ${text.substring(0, 50)}...`);
    console.log(`🌍 语言: ${language || 'zh'}`);
    console.log(`📂 项目ID: ${project_id || 'default'}`);

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 100000); // 100秒超时

    try {
      // 转发请求到Python后端
      response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          page_index,
          project_id: project_id || 'default',
          speaker_id: speaker_id || 'child',
          speed_factor: speed_factor || '1.0',
          pitch_factor: pitch_factor || '1.0',
          language: language || 'zh'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error(`⏰ [音频代理-${requestId}] 请求超时`);
        return res.status(504).json({
          success: false,
          error: '音频生成超时，请稍后重试'
        });
      }
      throw fetchError;
    }

    // 检查响应状态
    if (!response.ok) {
      console.error(`❌ [音频代理-${requestId}] HTTP错误:`, response.status, response.statusText);
      const errorText = await response.text().catch(() => '无法读取错误信息');
      console.error(`错误详情:`, errorText);
      return res.status(response.status).json({
        success: false,
        error: `后端服务错误 (${response.status}): ${response.statusText}`
      });
    }

    // 检查响应内容类型
    const contentType = response.headers.get('content-type');
    console.log(`📄 [音频代理-${requestId}] 响应类型: ${contentType}`);

    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error(`❌ [音频代理-${requestId}] 非JSON响应:`, responseText.substring(0, 200));
      return res.status(502).json({
        success: false,
        error: '后端返回了非JSON格式的响应，请检查Python后端日志'
      });
    }

    const result = await response.json();

    if (!result.success) {
      console.error(`❌ [音频代理-${requestId}] Python后端返回错误:`, result.error);
      return res.status(500).json({
        success: false,
        error: result.error || '音频生成失败'
      });
    }

    console.log(`✅ [音频代理-${requestId}] 音频生成成功: ${result.data?.audioUrl}`);

    // 如果返回的是相对路径，则添加 SITE_URL 前缀
    let audioUrl = result.data.audioUrl;
    if (audioUrl && audioUrl.startsWith('/')) {
      audioUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}${audioUrl}`;
    }

    res.status(200).json({
      success: true,
      data: {
        ...result.data,
        audioUrl  // 返回完整URL
      }
    });

  } catch (error) {
    console.error(`❌ [音频代理-${requestId}] 代理请求失败:`, {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });

    res.status(500).json({
      success: false,
      error: `音频服务连接失败: ${error.message}`
    });
  }
}
