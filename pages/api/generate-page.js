/**
 * 绘本页面插图生成API
 * 代理请求到Python后端（火山引擎即梦SDK）
 * 拼接内容提示词 + 风格后缀 + 角色引用
 */

import { generatePagePrompt } from '../../config/styles';

// Python后端地址
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8081';

export default async function handler(req, res) {
  const requestId = Date.now();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      pageIndex,
      jimengPrompt,      // 去风格化的内容提示词
      styleId,           // 风格ID
      characters = [],   // 角色列表 [{name, image_url}]
      aspectRatio = '16:9',
      resolution = '2k'
    } = req.body;

    if (!jimengPrompt) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: jimengPrompt'
      });
    }

    console.log(`🖼️ [页面生成-${requestId}] 开始生成第 ${pageIndex} 页`);
    console.log(`🎨 风格: ${styleId}, 画幅: ${aspectRatio}, 分辨率: ${resolution}`);
    console.log(`👥 参考角色数: ${characters.length}`);

    // 生成完整提示词（内容 + 风格后缀 + 角色引用）
    const fullPrompt = generatePagePrompt(styleId, jimengPrompt, characters);
    console.log(`📝 完整提示词: ${fullPrompt.substring(0, 150)}...`);

    // 调用Python后端
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: fullPrompt,
        frame: {
          type: 'page',
          pageIndex,
          styleId,
          aspectRatio,
          resolution,
          characterCount: characters.length
        }
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '生成失败');
    }

    console.log(`✅ [页面生成-${requestId}] 第 ${pageIndex} 页生成成功`);

    res.status(200).json({
      success: true,
      data: {
        pageIndex,
        image_url: result.data.imageUrl
      }
    });

  } catch (error) {
    console.error(`❌ [页面生成-${requestId}] 生成失败:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
