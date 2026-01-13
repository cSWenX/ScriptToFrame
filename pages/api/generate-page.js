/**
 * 绘本页面插图生成API
 * 代理请求到Python后端（火山引擎即梦SDK）
 * 拼接内容提示词 + 风格后缀
 * 按asset_refs顺序传递参考图片（图1, 图2, 图3...）
 * 支持语言气泡功能
 */

import { getStyleSuffix } from '../../config/styles';

// Python后端地址
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8081';

/**
 * 生成语言气泡提示词
 * @param {boolean} enableSpeechBubble - 是否启用气泡
 * @param {string} bubbleLanguage - 气泡语言 'zh' | 'en'
 * @param {Array} voiceScript - 语音脚本 [{role, text, emotion}]
 * @returns {string} 气泡提示词
 */
function generateBubblePrompt(enableSpeechBubble, bubbleLanguage, voiceScript) {
  if (!enableSpeechBubble || !voiceScript || voiceScript.length === 0) {
    return '，画面中不要包含任何文字、对话气泡或字幕';
  }

  // 过滤出角色对话（非旁白）
  const dialogues = voiceScript.filter(v => v.role !== '旁白');

  if (dialogues.length === 0) {
    return '，画面中不要包含任何文字、对话气泡或字幕';
  }

  // 构建气泡描述
  const bubbleDescriptions = dialogues.map(d => {
    const text = d.text;
    if (bubbleLanguage === 'zh') {
      return `一个白色圆角对话气泡从${d.role}嘴边冒出，气泡内用中文写着："${text}"`;
    } else {
      // 英文版本 - 这里只是标记，实际翻译在Python后端或前端完成
      return `a white rounded speech bubble coming from ${d.role}'s mouth, with English text inside: "${text}"`;
    }
  });

  if (bubbleLanguage === 'zh') {
    return '，' + bubbleDescriptions.join('，') + '，文字清晰可读';
  } else {
    return ', ' + bubbleDescriptions.join(', ') + ', text is clear and readable';
  }
}

export default async function handler(req, res) {
  const requestId = Date.now();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      pageIndex,
      jimengPrompt,      // 已替换为图1、图2、图3的提示词
      styleId,           // 风格ID
      refImages = [],    // 按asset_refs顺序的参考图片 [{index, id, name, type, image_url}]
      aspectRatio = '16:9',
      resolution = '2k',
      // 语言气泡设置
      enableSpeechBubble = false,
      bubbleLanguage = 'zh',
      voiceScript = null,
      project_id         // 项目ID，用于组织文件夹
    } = req.body;

    if (!jimengPrompt) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: jimengPrompt'
      });
    }

    console.log(`🖼️ [页面生成-${requestId}] 开始生成第 ${pageIndex} 页`);
    console.log(`🎨 风格: ${styleId}, 画幅: ${aspectRatio}, 分辨率: ${resolution}`);
    console.log(`🖼️ 参考图片数量: ${refImages.length}`);
    console.log(`💬 语言气泡: ${enableSpeechBubble ? `启用 (${bubbleLanguage})` : '关闭'}`);
    console.log(`📂 项目ID: ${project_id || 'default'}`);

    // 获取风格后缀
    const styleSuffix = getStyleSuffix(styleId);

    // 生成气泡提示词
    const bubblePrompt = generateBubblePrompt(enableSpeechBubble, bubbleLanguage, voiceScript);

    // 生成完整提示词（内容 + 气泡提示 + 风格后缀）
    // 注意：提示词中已经用图1、图2、图3替换了资产ID
    const fullPrompt = jimengPrompt + bubblePrompt + styleSuffix;
    console.log(`📝 完整提示词: ${fullPrompt.substring(0, 300)}...`);

    // 准备参考图片数据（按顺序）
    // 优先使用tos_url（即梦云存储，公网可访问），fallback到image_url
    const referenceImages = refImages.map(img => ({
      index: img.index,
      name: img.name,
      type: img.type,
      url: img.tos_url || img.image_url  // tos_url是公网可访问的，即梦API需要
    }));

    // 调用Python后端
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: fullPrompt,
        project_id: project_id || 'default',  // 添加项目ID
        referenceImages: referenceImages,  // 按顺序的参考图片
        save_to_storage: true,  // 启用自动推送远程存储
        frame: {
          type: 'page',
          pageIndex,
          styleId,
          aspectRatio,
          resolution,
          refImageCount: refImages.length,
          enableSpeechBubble,
          bubbleLanguage
        }
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '生成失败');
    }

    console.log(`✅ [页面生成-${requestId}] 第 ${pageIndex} 页生成成功`);
    console.log(`📦 [页面生成-${requestId}] 返回数据:`, {
      has_image_url: !!result.data.imageUrl,
      has_tos_url: !!result.data.tosUrl,
      has_remote_url: !!result.data.remote_url,
      has_remote_id: !!result.data.remote_id
    });

    // 决定最终使用的URL：优先使用远程URL，否则使用TOS URL，最后使用imageUrl
    const finalImageUrl = result.data.remote_url || result.data.tosUrl || result.data.imageUrl;

    res.status(200).json({
      success: true,
      data: {
        pageIndex,
        image_url: finalImageUrl,  // 优先使用远程URL
        tos_url: result.data.tosUrl,  // 即梦返回的原始TOS URL，用于修图
        remote_url: result.data.remote_url,  // 远程存储URL
        remote_id: result.data.remote_id  // 远程存储ID
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
