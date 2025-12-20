/**
 * 批量生成分镜图API - 火山引擎即梦
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { frames, referenceImage, config } = req.body;

    if (!frames || !frames.length) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: frames'
      });
    }

    console.log('🎨 开始批量生成图片:', {
      frameCount: frames.length,
      hasReference: !!referenceImage,
      hasPrompts: frames.some(f => f.prompt || f.jimengPrompt)
    });

    // 并发调用火山引擎API
    const results = await Promise.allSettled(
      frames.map(async (frame) => {
        try {
          const prompt = frame.prompt || frame.jimengPrompt || '';
          if (!prompt) {
            throw new Error('缺少提示词');
          }

          // 调用火山引擎API
          const imageUrl = await callVolcengineAPI(prompt, referenceImage);

          return {
            sequence: frame.sequence,
            imageUrl: imageUrl,
            prompt: prompt,
            chineseDescription: frame.chineseDescription || frame.displayDescription,
            error: null
          };
        } catch (error) {
          return {
            sequence: frame.sequence,
            imageUrl: null,
            prompt: frame.prompt || frame.jimengPrompt,
            chineseDescription: frame.chineseDescription || frame.displayDescription,
            error: error.message
          };
        }
      })
    );

    // 处理结果
    const finalResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          sequence: frames[index].sequence,
          imageUrl: null,
          error: result.reason?.message || '生成失败'
        };
      }
    });

    const successCount = finalResults.filter(r => r.imageUrl).length;

    console.log(`✅ 批量生成完成: ${successCount}/${frames.length} 成功`);

    res.status(200).json({
      success: true,
      data: finalResults,
      stats: {
        total: frames.length,
        success: successCount,
        failed: frames.length - successCount,
        successRate: successCount / frames.length
      }
    });

  } catch (error) {
    console.error('批量生成失败:', error);
    res.status(500).json({
      success: false,
      error: '批量生成失败: ' + error.message
    });
  }
}

/**
 * 调用火山引擎即梦API
 */
async function callVolcengineAPI(prompt, referenceImage = null) {
  const accessKey = process.env.VOLCENGINE_ACCESS_KEY_ID;
  const secretKey = process.env.VOLCENGINE_SECRET_ACCESS_KEY;

  if (!accessKey || !secretKey) {
    throw new Error('火山引擎API密钥未配置');
  }

  // 构造请求参数
  const params = {
    req_key: 'jimeng_t2i_v40',
    prompt: prompt,
    model_version: 'general_v2.0',
    image_num: 1,
    image_width: 1024,
    image_height: 576,
    use_sr: false
  };

  // 如果有参考图，添加参考图参数
  if (referenceImage) {
    params.reference_image = referenceImage;
    params.reference_image_weight = 0.5;
  }

  try {
    // 第一步：提交生成任务
    const timestamp = Math.floor(Date.now() / 1000);
    const auth = generateVolcengineAuth(accessKey, secretKey, params);

    const submitResponse = await fetch('https://visual.volcengineapi.com/api/v1/cv/text2image/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
        'X-Date': timestamp.toString()
      },
      body: JSON.stringify(params)
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`提交任务失败: ${submitResponse.status} - ${errorText}`);
    }

    const submitData = await submitResponse.json();
    if (submitData.code !== 0) {
      throw new Error(`API错误: ${submitData.message} (code: ${submitData.code})`);
    }

    const taskId = submitData.data.task_id;
    console.log('🔥 火山引擎批量任务提交成功:', taskId);

    // 第二步：轮询等待结果
    let retries = 0;
    const maxRetries = 30;

    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒

      const queryAuth = generateVolcengineAuth(accessKey, secretKey, { task_id: taskId });
      const queryResponse = await fetch(`https://visual.volcengineapi.com/api/v1/cv/text2image/query?task_id=${taskId}`, {
        headers: {
          'Authorization': queryAuth,
          'X-Date': Math.floor(Date.now() / 1000).toString()
        }
      });

      if (!queryResponse.ok) {
        const errorText = await queryResponse.text();
        throw new Error(`查询任务失败: ${queryResponse.status} - ${errorText}`);
      }

      const queryData = await queryResponse.json();
      if (queryData.code !== 0) {
        throw new Error(`查询错误: ${queryData.message} (code: ${queryData.code})`);
      }

      const status = queryData.data.status;

      if (status === 'success') {
        const images = queryData.data.images;
        if (images && images.length > 0) {
          return images[0];
        }
        throw new Error('生成成功但未返回图片');
      } else if (status === 'failed') {
        throw new Error(`生成失败: ${queryData.data.reason || '未知原因'}`);
      }

      retries++;
    }

    throw new Error('生成超时');
  } catch (error) {
    console.error('火山引擎API调用失败:', error);
    throw error;
  }
}

/**
 * 生成火山引擎API认证头（简化版本）
 */
function generateVolcengineAuth(accessKey, secretKey, params) {
  const crypto = require('crypto');
  const timestamp = Math.floor(Date.now() / 1000);

  // 创建简单的HMAC签名
  const stringToSign = `${timestamp}${JSON.stringify(params)}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(stringToSign)
    .digest('hex');

  return `HMAC-SHA256 Credential=${accessKey}, Signature=${signature}`;
}