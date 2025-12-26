/**
 * 角色三视图生成API
 * 代理请求到Python后端（火山引擎即梦SDK）
 */

// Python后端地址
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8081';

export default async function handler(req, res) {
  const requestId = Date.now();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { prompt, characterId, characterName } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: prompt'
      });
    }

    console.log(`🎭 [角色生成-${requestId}] 开始生成: ${characterName || characterId}`);
    console.log(`📝 提示词: ${prompt.substring(0, 100)}...`);

    // 调用Python后端
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        frame: {
          type: 'character',
          characterId,
          characterName
        }
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '生成失败');
    }

    console.log(`✅ [角色生成-${requestId}] 生成成功: ${characterName || characterId}`);

    res.status(200).json({
      success: true,
      data: {
        characterId,
        characterName,
        image_url: result.data.imageUrl
      }
    });

  } catch (error) {
    console.error(`❌ [角色生成-${requestId}] 生成失败:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
