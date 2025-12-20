/**
 * 模拟第一张图片生成API
 * 用于前端功能测试，当火山引擎API配置完成后可切换回真实API
 */

// 模拟动漫风格图片URL列表 - 使用可靠的占位符服务
const mockAnimeImageUrls = [
  'https://via.placeholder.com/1024x576/FF6B6B/FFFFFF?text=Frame+1+Anime+Scene', // 红色主题 - 开场镜头
  'https://via.placeholder.com/1024x576/4ECDC4/FFFFFF?text=Frame+2+Character+Talk', // 青色主题 - 对话镜头
  'https://via.placeholder.com/1024x576/45B7D1/FFFFFF?text=Frame+3+Emotion+Close', // 蓝色主题 - 情感特写
  'https://via.placeholder.com/1024x576/96CEB4/FFFFFF?text=Frame+4+Action+Scene', // 绿色主题 - 动作场景
  'https://via.placeholder.com/1024x576/FFEAA7/FFFFFF?text=Frame+5+Romance+Mood', // 黄色主题 - 浪漫氛围
  'https://via.placeholder.com/1024x576/DDA0DD/FFFFFF?text=Frame+6+Final+Shot'  // 紫色主题 - 结尾镜头
];

// 备用彩色占位符（不同色调表示不同镜头类型）
const fallbackImages = [
  'https://via.placeholder.com/1024x576/E74C3C/FFFFFF?text=Anime+Scene+1',
  'https://via.placeholder.com/1024x576/3498DB/FFFFFF?text=Anime+Scene+2',
  'https://via.placeholder.com/1024x576/2ECC71/FFFFFF?text=Anime+Scene+3',
  'https://via.placeholder.com/1024x576/F39C12/FFFFFF?text=Anime+Scene+4',
  'https://via.placeholder.com/1024x576/9B59B6/FFFFFF?text=Anime+Scene+5',
  'https://via.placeholder.com/1024x576/1ABC9C/FFFFFF?text=Anime+Scene+6'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { frame, prompt, chineseDescription, characters, style, config } = req.body;

    // 兼容新旧数据结构
    if (!frame) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: frame'
      });
    }

    console.log('🎨 模拟生成第一张图片:', {
      frameSequence: frame.sequence,
      hasPrompt: !!(prompt || frame.prompt || frame.jimengPrompt),
      chineseDesc: chineseDescription || frame.chineseDescription || frame.displayDescription,
      style: style
    });

    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 根据风格和帧序列选择对应的占位符图片
    let imageUrl;
    const frameIndex = (frame.sequence - 1) % mockAnimeImageUrls.length;

    if (style && style.includes('dark')) {
      // 暗色主题的占位符
      const darkColors = ['2C3E50', '34495E', '7F8C8D', '95A5A6'];
      const color = darkColors[frameIndex % darkColors.length];
      imageUrl = `https://via.placeholder.com/1024x576/${color}/FFFFFF?text=Dark+Anime+Frame+${frame.sequence}`;
    } else {
      // 使用预定义的彩色占位符
      imageUrl = mockAnimeImageUrls[frameIndex];
    }

    // 使用实际的详细提示词或生成简单描述
    const actualPrompt = prompt || frame.prompt || frame.jimengPrompt;
    const description = chineseDescription || frame.chineseDescription || frame.displayDescription;

    const optimizedPrompt = actualPrompt || `${style} style anime illustration, ${description}, high quality, detailed, 16:9 aspect ratio`;

    console.log('✅ 模拟图片生成完成');

    res.status(200).json({
      success: true,
      data: {
        imageUrl: imageUrl,
        localPath: `/tmp/mock_first_frame_${frame.sequence}.jpg`,
        prompt: optimizedPrompt,
        chineseDescription: description,
        taskId: `mock_task_${Date.now()}`,
        frame: frame
      }
    });

  } catch (error) {
    console.error('模拟图片生成API错误:', error);
    res.status(500).json({
      success: false,
      error: '模拟图片生成失败'
    });
  }
}