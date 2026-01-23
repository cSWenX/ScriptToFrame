/**
 * 音频生成API代理
 * 将请求转发到Python后端TTS服务
 */

// Python后端地址（通过环境变量配置，默认localhost）
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8081';

export default async function handler(req, res) {
  const requestId = Date.now();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

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

    // 转发请求到Python后端
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        page_index,
        project_id: project_id || 'default',  // 添加项目ID
        speaker_id: speaker_id || 'child',
        speed_factor: speed_factor || '1.0',
        pitch_factor: pitch_factor || '1.0',
        language: language || 'zh'
      })
    });

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
    console.error(`❌ [音频代理-${requestId}] 代理请求失败:`, error.message);
    res.status(500).json({
      success: false,
      error: `音频服务连接失败: ${error.message}`
    });
  }
}
