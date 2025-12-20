/**
 * 生成第一张图API接口 - 火山引擎即梦 (使用官方SDK)
 * POST /api/generate-first-image
 */

// 引入火山引擎官方SDK
const { Service } = require('@volcengine/openapi');

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

    console.log('🎨 生成第一张图片:', {
      frameSequence: frame.sequence,
      hasPrompt: !!(prompt || frame.prompt || frame.jimengPrompt),
      chineseDesc: chineseDescription || frame.chineseDescription || frame.displayDescription,
      style: style
    });

    const actualPrompt = prompt || frame.prompt || frame.jimengPrompt;
    if (!actualPrompt) {
      return res.status(400).json({
        success: false,
        error: '缺少图片生成提示词'
      });
    }

    try {
      // 调用火山引擎API (使用官方SDK)
      const imageUrl = await callVolcengineAPI(actualPrompt);

      const result = {
        imageUrl: imageUrl,
        localPath: `/tmp/volcengine_first_frame_${frame.sequence}.jpg`,
        prompt: actualPrompt,
        chineseDescription: chineseDescription || frame.chineseDescription || frame.displayDescription,
        taskId: `volcengine_task_${Date.now()}`,
        frame: frame
      };

      console.log('✅ 第一张图片生成完成');

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('火山引擎API调用失败:', error);
      res.status(500).json({
        success: false,
        error: `火山引擎API错误: ${error.message}`
      });
    }

  } catch (error) {
    console.error('生成第一张图API错误:', error);
    res.status(500).json({
      success: false,
      error: '生成图片时发生错误'
    });
  }
}

/**
 * 调用火山引擎即梦API (使用官方SDK - 完整异步流程)
 */
async function callVolcengineAPI(prompt) {
  const accessKey = process.env.VOLCENGINE_ACCESS_KEY_ID;
  const secretKey = process.env.VOLCENGINE_SECRET_ACCESS_KEY;

  if (!accessKey || !secretKey) {
    throw new Error('火山引擎API密钥未配置');
  }

  console.log('🔥 开始调用火山引擎API (官方SDK)...', {
    accessKey: accessKey.substring(0, 8) + '***',
    secretKeyLength: secretKey.length
  });

  // 创建视觉服务实例
  const visualService = new Service({
    accessKeyId: accessKey,
    secretKey: secretKey,
    serviceName: 'cv',
    host: 'visual.volcengineapi.com',
    protocol: 'https:', // <--- 【建议添加】确保使用 HTTPS
    region: 'cn-north-1',
    pathname: '/', // <--- 关键！必须加上这个，否则会报 50402 URL Error
  });

  try {
    console.log('🚀 [即梦API] 正在提交任务...');

    // --- 第一步：提交任务 ---
    // 使用 CVSync2AsyncSubmitTask 接口
    const submitRes = await visualService.fetchOpenAPI({
      Action: 'CVSync2AsyncSubmitTask',
      Version: '2022-08-31',
      Method: 'POST', // <--- 【关键修复】必须显式指定 POST
      Query: {},
      Body: {
        req_json: JSON.stringify({
          req_key: "jimeng_t2i_v40",
          prompt: prompt,
          return_url: true,
          logo_info: { add_logo: false }
        })
      },
    });

    console.log('📦 提交响应:', JSON.stringify(submitRes, null, 2));

    const data = submitRes.data || {};

    // 情况A：虽然少见，但有时候会直接同步返回图片
    if (data.image_urls && data.image_urls.length > 0) {
      console.log('✅ [即梦API] 立即生成成功');
      return data.image_urls[0];
    }

    // 情况B：返回任务ID (这是最常见的情况)
    if (data.task_id) {
      const taskId = data.task_id;
      console.log(`⏳ [即梦API] 任务已提交，ID: ${taskId}，开始轮询...`);

      // --- 第二步：循环查询结果 ---
      // 最多查 30 次，每次间隔 2 秒 (共等待 60秒)
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒

        const queryRes = await visualService.fetchOpenAPI({
          Action: 'CVSync2AsyncGetResult', // 使用正确的查询接口
          Version: '2022-08-31',
          Method: 'POST', // <--- 【建议添加】保持一致性
          Query: {},
          Body: {
            req_json: JSON.stringify({
              req_key: "jimeng_t2i_v40",
              task_id: taskId
            })
          },
        });

        console.log(`📋 第${i+1}次查询响应:`, JSON.stringify(queryRes, null, 2));

        const qData = queryRes.data || {};
        const status = qData.status;
        // status定义: 0-处理中, 1-成功, -1-失败, 2-过期

        if (status === 1) {
          console.log(`✅ [即梦API] 第 ${i + 1} 次轮询：生成成功！`);

          // 解析图片地址：有时在 resp_data 字段里，需要二次解析
          let finalUrl = qData.image_url;

          if (!finalUrl && qData.resp_data) {
            try {
              // resp_data 可能是 JSON 字符串
              const parsed = typeof qData.resp_data === 'string'
                ? JSON.parse(qData.resp_data)
                : qData.resp_data;
              if (parsed.image_urls && parsed.image_urls.length > 0) {
                finalUrl = parsed.image_urls[0];
              }
            } catch (e) {
              console.warn("解析 resp_data 出错", e);
            }
          }

          if (finalUrl) {
            console.log('🎉 成功获取图片URL:', finalUrl);
            return finalUrl;
          }

          // 如果状态成功但没找到图，打印出来调试
          console.error("生成成功但未找到URL字段:", JSON.stringify(qData));
          throw new Error("生成成功但无法提取图片URL");

        } else if (status === -1 || status === 2) {
          throw new Error(`任务失败或过期 (Status: ${status})`);
        }

        console.log(`... 第 ${i + 1} 次检查: 处理中 (status: ${status})`);
      }
      throw new Error("生成超时 (60秒)");
    }

    // 如果既没 task_id 也没 image_urls
    console.error("异常响应:", JSON.stringify(submitRes));
    throw new Error("API响应格式异常");

  } catch (error) {
    console.error('❌ 火山引擎API调用失败:', error);
    throw error;
  }
}