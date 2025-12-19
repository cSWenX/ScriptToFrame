/**
 * 模拟图片重新生成API
 * 用于前端功能测试，当火山引擎API配置完成后可切换回真实API
 */

// 模拟动漫风格图片URL列表 - 重新生成时使用不同颜色区分
const mockAnimeImageUrls = [
  'https://via.placeholder.com/1024x576/8E44AD/FFFFFF?text=Regen+Frame+1+New',
  'https://via.placeholder.com/1024x576/E67E22/FFFFFF?text=Regen+Frame+2+New',
  'https://via.placeholder.com/1024x576/27AE60/FFFFFF?text=Regen+Frame+3+New',
  'https://via.placeholder.com/1024x576/E74C3C/FFFFFF?text=Regen+Frame+4+New',
  'https://via.placeholder.com/1024x576/3498DB/FFFFFF?text=Regen+Frame+5+New',
  'https://via.placeholder.com/1024x576/F39C12/FFFFFF?text=Regen+Frame+6+New',
  'https://via.placeholder.com/1024x576/9B59B6/FFFFFF?text=Regen+Frame+7+New',
  'https://via.placeholder.com/1024x576/1ABC9C/FFFFFF?text=Regen+Frame+8+New',
  'https://via.placeholder.com/1024x576/34495E/FFFFFF?text=Regen+Frame+9+New',
  'https://via.placeholder.com/1024x576/E91E63/FFFFFF?text=Regen+Frame+10+New',
  'https://via.placeholder.com/1024x576/795548/FFFFFF?text=Regen+Frame+11+New'
];

// 备用图片源（本地占位图片）
const fallbackImages = [
  '/images/mock-anime-regen-1.jpg',
  '/images/mock-anime-regen-2.jpg',
  '/images/mock-anime-regen-3.jpg',
  '/images/mock-anime-regen-4.jpg',
  '/images/mock-anime-regen-5.jpg',
  '/images/mock-anime-regen-6.jpg'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { frame, isFirstFrame, referenceImage, characters, config } = req.body;

    if (!frame) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: frame'
      });
    }

    console.log('🎨 模拟重新生成图片:', {
      frameSequence: frame.sequence,
      isFirstFrame: isFirstFrame,
      hasReference: !!referenceImage
    });

    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 1800));

    // 根据帧序列和是否首帧选择对应的重生成占位符
    const frameIndex = (frame.sequence - 1) % mockAnimeImageUrls.length;
    let imageUrl;

    if (isFirstFrame) {
      // 首帧使用特殊色彩标识
      imageUrl = `https://via.placeholder.com/1024x576/FF1744/FFFFFF?text=FIRST+FRAME+REGEN+${frame.sequence}`;
    } else {
      // 非首帧使用不同色彩区分
      imageUrl = mockAnimeImageUrls[frameIndex];
    }

    console.log('✅ 模拟图片重新生成完成');

    res.status(200).json({
      success: true,
      data: {
        imageUrl: imageUrl,
        localPath: `/tmp/mock_regenerated_frame_${frame.sequence}.jpg`,
        prompt: frame.prompt,
        taskId: `mock_regen_task_${Date.now()}`,
        frame: frame
      }
    });

  } catch (error) {
    console.error('模拟图片重新生成API错误:', error);
    res.status(500).json({
      success: false,
      error: '模拟图片重新生成失败'
    });
  }
}