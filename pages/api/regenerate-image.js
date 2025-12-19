const VolcengineImageAPI = require('../../lib/volcengine-api');
const ClaudeScriptParser = require('../../lib/claude-api');
const ImageUtils = require('../../lib/image-utils');

/**
 * 重新生成单个分镜图API接口
 * POST /api/regenerate-image
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { frame, isFirstFrame, referenceImage, characters, config } = req.body;

    if (!frame || !characters) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: frame, characters'
      });
    }

    const claudeParser = new ClaudeScriptParser();
    const volcengineAPI = new VolcengineImageAPI();
    const imageUtils = new ImageUtils();

    // 计算图片尺寸
    let width = 1024, height = 576;
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

    let optimizedPrompt;
    let generateResult;

    if (isFirstFrame) {
      // 重新生成第一帧（不使用参考图）
      optimizedPrompt = await claudeParser.generateFirstFramePrompt(
        frame,
        characters,
        config.style
      );

      generateResult = await volcengineAPI.generateImage(optimizedPrompt, {
        image_width: width,
        image_height: height
      });
    } else {
      // 重新生成其他帧（使用参考图）
      if (!referenceImage) {
        return res.status(400).json({
          success: false,
          error: '非第一帧需要提供参考图'
        });
      }

      optimizedPrompt = await claudeParser.optimizeFramePrompt(
        frame,
        characters,
        config.style
      );

      generateResult = await volcengineAPI.generateImageWithReference(
        optimizedPrompt,
        referenceImage,
        {
          image_width: width,
          image_height: height,
          reference_image_weight: 0.7
        }
      );
    }

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
    let localPath = null;

    // 如果是第一帧，下载到本地作为新的参考图
    if (isFirstFrame) {
      const filename = imageUtils.generateTempFilename('first_frame', 'jpg');
      localPath = await imageUtils.downloadImage(imageUrl, filename);
    }

    res.status(200).json({
      success: true,
      data: {
        imageUrl: imageUrl,
        localPath: localPath,
        prompt: optimizedPrompt,
        taskId: generateResult.taskId,
        frame: frame,
        isFirstFrame: isFirstFrame
      }
    });

  } catch (error) {
    console.error('重新生成图片API错误:', error);
    res.status(500).json({
      success: false,
      error: '重新生成图片时发生错误'
    });
  }
}