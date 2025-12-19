const VolcengineImageAPI = require('../../lib/volcengine-api');
const ClaudeScriptParser = require('../../lib/claude-api');
const ImageUtils = require('../../lib/image-utils');

/**
 * 批量生成所有分镜图API接口
 * POST /api/generate-all-images
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { frames, referenceImage, characters, config } = req.body;

    if (!frames || !referenceImage || !characters) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: frames, referenceImage, characters'
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

    const results = [];

    // 串行生成每个分镜图（避免并发过多）
    for (const frame of frames) {
      try {
        // 优化提示词
        const optimizedPrompt = await claudeParser.optimizeFramePrompt(
          frame,
          characters,
          config.style
        );

        // 使用参考图生成
        const generateResult = await volcengineAPI.generateImageWithReference(
          optimizedPrompt,
          referenceImage,
          {
            image_width: width,
            image_height: height,
            reference_image_weight: 0.7
          }
        );

        if (generateResult.success) {
          // 等待生成完成
          const finalResult = await volcengineAPI.pollTaskCompletion(generateResult.taskId);

          if (finalResult.success && finalResult.images && finalResult.images.length > 0) {
            results.push({
              sequence: frame.sequence,
              imageUrl: finalResult.images[0],
              prompt: optimizedPrompt,
              success: true
            });
          } else {
            results.push({
              sequence: frame.sequence,
              success: false,
              error: '图片生成完成但没有返回图片'
            });
          }
        } else {
          results.push({
            sequence: frame.sequence,
            success: false,
            error: generateResult.error
          });
        }

        // 短暂延迟，避免API调用过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`生成第${frame.sequence}帧失败:`, error);
        results.push({
          sequence: frame.sequence,
          success: false,
          error: error.message || '生成失败'
        });
      }
    }

    // 统计成功率
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    res.status(200).json({
      success: true,
      data: results,
      stats: {
        total: totalCount,
        success: successCount,
        failed: totalCount - successCount,
        successRate: Math.round((successCount / totalCount) * 100)
      }
    });

  } catch (error) {
    console.error('批量生成API错误:', error);
    res.status(500).json({
      success: false,
      error: '批量生成时发生错误'
    });
  }
}