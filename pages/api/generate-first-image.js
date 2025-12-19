const VolcengineImageAPI = require('../../lib/volcengine-api');
const ClaudeScriptParser = require('../../lib/claude-api');
const ImageUtils = require('../../lib/image-utils');

/**
 * 生成第一张图API接口
 * POST /api/generate-first-image
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { frame, characters, style, config } = req.body;

    if (!frame || !characters) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: frame, characters'
      });
    }

    const claudeParser = new ClaudeScriptParser();
    const volcengineAPI = new VolcengineImageAPI();
    const imageUtils = new ImageUtils();

    // 生成详细的第一帧提示词
    const optimizedPrompt = await claudeParser.generateFirstFramePrompt(
      frame,
      characters,
      style
    );

    // 计算图片尺寸
    let width = 1024, height = 576; // 默认16:9
    if (config.resolution === '2k') {
      width = 2048; height = 1152;
    } else if (config.resolution === '4k') {
      width = 4096; height = 2304;
    }

    if (config.aspectRatio === '1:1') {
      height = width;
    } else if (config.aspectRatio === '9:16') {
      [width, height] = [height, width];
    }

    // 调用火山引擎API生成图片
    const generateResult = await volcengineAPI.generateImage(optimizedPrompt, {
      image_width: width,
      image_height: height
    });

    if (!generateResult.success) {
      return res.status(500).json({
        success: false,
        error: `图片生成失败: ${generateResult.error}`
      });
    }

    // 轮询获取生成结果
    const finalResult = await volcengineAPI.pollTaskCompletion(generateResult.taskId);

    if (!finalResult.success || !finalResult.images || finalResult.images.length === 0) {
      return res.status(500).json({
        success: false,
        error: '图片生成完成但没有返回图片URL'
      });
    }

    const imageUrl = finalResult.images[0];

    // 下载图片到本地作为参考图
    const filename = imageUtils.generateTempFilename('first_frame', 'jpg');
    const localPath = await imageUtils.downloadImage(imageUrl, filename);

    res.status(200).json({
      success: true,
      data: {
        imageUrl: imageUrl,
        localPath: localPath,
        prompt: optimizedPrompt,
        taskId: generateResult.taskId,
        frame: frame
      }
    });

  } catch (error) {
    console.error('生成第一张图API错误:', error);
    res.status(500).json({
      success: false,
      error: '生成图片时发生错误'
    });
  }
}