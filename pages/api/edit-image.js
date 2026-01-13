/**
 * 图片编辑API代理
 * 将请求转发到Python后端图生图服务
 */

// Python后端地址
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8082';

export default async function handler(req, res) {
  const requestId = Date.now();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { image_url, prompt, page_index, strength, project_id } = req.body;

    if (!image_url || !prompt) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: image_url, prompt'
      });
    }

    console.log(`🖌️ [图片编辑代理-${requestId}] 转发请求到Python后端`);
    console.log(`📝 提示词: ${prompt.substring(0, 50)}...`);
    console.log(`📂 项目ID: ${project_id || 'default'}`);

    // 转发请求到Python后端
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/edit-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url,
        prompt,
        page_index,
        strength: strength || 0.65,
        project_id: project_id || 'default'  // 添加项目ID
      })
    });

    const result = await response.json();

    if (!result.success) {
      console.error(`❌ [图片编辑代理-${requestId}] Python后端返回错误:`, result.error);
      return res.status(500).json({
        success: false,
        error: result.error || '图片编辑失败'
      });
    }

    console.log(`✅ [图片编辑代理-${requestId}] 编辑成功: ${result.data?.imageUrl}`);

    res.status(200).json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error(`❌ [图片编辑代理-${requestId}] 代理请求失败:`, error.message);
    res.status(500).json({
      success: false,
      error: `图片编辑服务连接失败: ${error.message}`
    });
  }
}
