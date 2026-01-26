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
    const { prompt, characterId, characterName, project_id } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: prompt'
      });
    }

    console.log(`🎭 [角色生成-${requestId}] 开始生成: ${characterName || characterId}`);
    console.log(`📝 提示词: ${prompt.substring(0, 100)}...`);
    console.log(`📂 项目ID: ${project_id || 'default'}`);

    // 调用Python后端
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        project_id: project_id || 'default',  // 添加项目ID
        save_to_storage: true,  // 启用自动推送远程存储
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
    console.log(`📦 [角色生成-${requestId}] 返回数据:`, {
      has_image_url: !!result.data.imageUrl,
      has_tos_url: !!result.data.tosUrl,
      has_remote_url: !!result.data.remote_url,
      has_remote_id: !!result.data.remote_id
    });

    // 决定最终使用的URL：优先使用远程URL，否则使用TOS URL，最后使用imageUrl
    const finalImageUrl = result.data.remote_url || result.data.tosUrl || result.data.imageUrl;

    // 生成代理URL（前端统一使用代理URL访问图片）
    const imageProxyUrl = `/api/proxy/image?characterId=${characterId}`;

    console.log(`🔗 [角色生成-${requestId}] 代理URL: ${imageProxyUrl}`);

    res.status(200).json({
      success: true,
      data: {
        characterId,
        characterName,
        image_url: imageProxyUrl,  // 使用代理URL（前端统一使用）
        original_image_url: finalImageUrl,  // 保留原始URL（如果需要）
        tos_url: result.data.tosUrl,  // 即梦返回的原始TOS URL，用于修图
        remote_url: result.data.remote_url,  // 远程存储URL
        remote_id: result.data.remote_id  // 远程存储ID
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
