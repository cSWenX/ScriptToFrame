/**
 * 模拟批量图片生成API
 * 用于前端功能测试，当火山引擎API配置完成后可切换回真实API
 */

// 模拟动漫风格图片URL列表 - 使用彩色占位符表示不同镜头
const mockAnimeImageUrls = [
  'https://via.placeholder.com/1024x576/FF6B6B/FFFFFF?text=Batch+Frame+1+Scene',
  'https://via.placeholder.com/1024x576/4ECDC4/FFFFFF?text=Batch+Frame+2+Talk',
  'https://via.placeholder.com/1024x576/45B7D1/FFFFFF?text=Batch+Frame+3+Close',
  'https://via.placeholder.com/1024x576/96CEB4/FFFFFF?text=Batch+Frame+4+Action',
  'https://via.placeholder.com/1024x576/FFEAA7/FFFFFF?text=Batch+Frame+5+Romance',
  'https://via.placeholder.com/1024x576/DDA0DD/FFFFFF?text=Batch+Frame+6+Final',
  'https://via.placeholder.com/1024x576/F8B500/FFFFFF?text=Batch+Frame+7+Cont',
  'https://via.placeholder.com/1024x576/E55B5B/FFFFFF?text=Batch+Frame+8+Cont',
  'https://via.placeholder.com/1024x576/6C7B95/FFFFFF?text=Batch+Frame+9+Cont',
  'https://via.placeholder.com/1024x576/A8E6CF/FFFFFF?text=Batch+Frame+10+End',
  'https://via.placeholder.com/1024x576/FFB6C1/FFFFFF?text=Batch+Frame+11+End'
];

// 备用图片源（本地占位图片）
const fallbackImages = [
  '/images/mock-anime-batch-1.jpg',
  '/images/mock-anime-batch-2.jpg',
  '/images/mock-anime-batch-3.jpg',
  '/images/mock-anime-batch-4.jpg',
  '/images/mock-anime-batch-5.jpg',
  '/images/mock-anime-batch-6.jpg'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { frames, referenceImage, characters, config } = req.body;

    if (!frames || !frames.length) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: frames'
      });
    }

    console.log('🎨 模拟批量生成图片:', {
      frameCount: frames.length,
      hasReference: !!referenceImage,
      hasPrompts: frames.some(f => f.prompt || f.jimengPrompt)
    });

    // 模拟批量处理时间
    await new Promise(resolve => setTimeout(resolve, 2000));

    const results = frames.map((frame, index) => {
      // 根据帧序列选择对应的彩色占位符图片
      const frameIndex = (frame.sequence - 1) % mockAnimeImageUrls.length;
      const imageUrl = mockAnimeImageUrls[frameIndex];

      return {
        sequence: frame.sequence,
        imageUrl: imageUrl,
        prompt: frame.prompt || frame.jimengPrompt,
        chineseDescription: frame.chineseDescription || frame.displayDescription,
        error: null // 模拟成功生成
      };
    });

    console.log('✅ 模拟批量图片生成完成');

    res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('模拟批量图片生成API错误:', error);
    res.status(500).json({
      success: false,
      error: '模拟批量图片生成失败'
    });
  }
}