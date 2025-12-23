/**
 * Java后端代理API
 * 将请求代理到Java SpringBoot后端服务
 */

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { prompt, frame } = req.body;
    const actualPrompt = prompt || frame?.prompt || frame?.jimengPrompt;

    if (!actualPrompt) {
      return res.status(400).json({ success: false, error: '缺少必要参数: prompt' });
    }

    console.log(`🎨 [Java后端代理] 提示词: "${actualPrompt.substring(0, 50)}..."`);

    // 代理到Java后端
    const JAVA_BACKEND_URL = process.env.JAVA_BACKEND_URL || 'http://localhost:8080';

    const response = await fetch(`${JAVA_BACKEND_URL}/api/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: actualPrompt
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Java后端返回错误: ${response.status}`);
    }

    console.log(`✅ [Java后端代理] 成功获取结果`);

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ [Java后端代理] 失败:', error.message);
    res.status(500).json({
      success: false,
      error: `Java后端调用失败: ${error.message}`
    });
  }
}