/**
 * 火山引擎即梦 (Jimeng V4) - 最终修正版
 * 使用官方 SDK 托管签名，彻底解决 InvalidCredential 问题
 */
const { Service } = require('@volcengine/openapi');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { frame, prompt } = req.body;
    const actualPrompt = prompt || frame?.prompt || frame?.jimengPrompt;

    if (!actualPrompt) {
      return res.status(400).json({ success: false, error: '缺少必要参数: prompt' });
    }

    console.log(`\n🎨 [API启动] 提示词: "${actualPrompt.substring(0, 30)}..."`);

    // 调用生成函数
    const imageUrl = await generateImageV4(actualPrompt);

    res.status(200).json({
      success: true,
      data: {
        imageUrl: imageUrl,
        taskId: `jimeng_v4_${Date.now()}`,
        prompt: actualPrompt,
        frame: frame
      }
    });

  } catch (error) {
    console.error('❌ [流程终止]:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 核心逻辑：即梦 V4 生成 (提交 -> 轮询)
 */
async function generateImageV4(prompt) {
  
  // 1. 初始化服务 (带密钥清洗)
  const visualService = createVisualService();
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // --- Step 1: 提交任务 ---
  console.log('\n🚀 [Step 1] 提交任务 (CVProcess)...');
  
  const submitResult = await visualService.fetchOpenAPI({
    Action: 'CVProcess', // 使用通用接口，SDK会自动路由
    Version: '2022-08-31',
    Method: 'POST',
    Body: {
      req_key: 'jimeng_t2i_v40', // V4 模型 Key
      prompt: prompt,
      // V4 部分参数可能需要直接放在这里
      logo_info: { add_logo: false } 
    }
  });

  const submitData = submitResult.data || {};

  // 错误检查
  if (submitResult.code !== 10000) {
      throw new Error(`提交失败: ${submitResult.message} (Code: ${submitResult.code})`);
  }

  // 极少情况：同步直接出图
  if (submitData.image_urls?.length > 0) {
    return submitData.image_urls[0];
  }

  const taskId = submitData.task_id;
  if (!taskId) {
    throw new Error(`任务提交响应异常 (无TaskID): ${JSON.stringify(submitData)}`);
  }

  console.log(`⏳ [Step 2] 获得 TaskID: ${taskId}，开始轮询...`);

  // --- Step 2: 轮询结果 ---
  // V4 比较慢，建议轮询次数多一点
  for (let i = 0; i < 60; i++) {
    await sleep(2000); // 间隔 2s

    // 构造 V4 必须的查询参数
    // 注意：即梦V4查询必须传 req_json 字符串来指定 return_url
    const queryReqJson = JSON.stringify({
        return_url: true, 
        logo_info: { add_logo: false }
    });

    const queryResult = await visualService.fetchOpenAPI({
      Action: 'CVSync2AsyncGetResult', // 必须使用这个异步查询接口
      Version: '2022-08-31',
      Method: 'POST',
      Body: {
        req_key: 'jimeng_t2i_v40',
        task_id: taskId,
        req_json: queryReqJson // <--- 关键！没有这个查不到 URL
      }
    });

    const qData = queryResult.data || {};
    const status = qData.status; // V4 返回可能是字符串 'done' 或数字

    // 成功判断 (兼容 done 和 1)
    if (status === 'done' || status === 1) {
      console.log(`\n✅ [轮询成功] 第 ${i+1} 次查询完成`);
      
      // 解析图片 URL
      let finalUrl = qData.image_url; // 尝试直接获取

      // 如果外层没有，解析 resp_data (V4 常见情况)
      if (!finalUrl && qData.resp_data) {
        try {
          const parsed = typeof qData.resp_data === 'string' 
            ? JSON.parse(qData.resp_data) 
            : qData.resp_data;
          
          if (parsed.image_urls?.length > 0) {
            finalUrl = parsed.image_urls[0];
          }
        } catch (e) {
          console.warn('解析 resp_data 出错', e);
        }
      }

      if (finalUrl) return finalUrl;
      
      // 如果还没 URL，可能是 Base64
      if (qData.binary_data_base64?.length > 0) {
          console.warn('⚠️ 仅返回了 Base64 数据 (请检查 return_url 是否生效)');
          return `data:image/png;base64,${qData.binary_data_base64[0]}`;
      }
      
      throw new Error('任务显示成功但未找到图片链接');

    } else if (status === 'failed' || status === -1 || status === 2) {
      throw new Error(`任务执行失败 (Status: ${status})`);
    }

    console.log(`... 轮询中 (状态: ${status})`);
  }

  throw new Error('生成超时 (120秒)');
}

/**
 * 🔧 工具：创建配置正确的 Service 实例
 */
function createVisualService() {
  // 1. 清洗密钥：去除可能存在的引号、空格、换行
  const rawAK = process.env.VOLCENGINE_ACCESS_KEY_ID || '';
  const rawSK = process.env.VOLCENGINE_SECRET_ACCESS_KEY || '';

  const accessKey = rawAK.trim().replace(/['"]/g, '');
  const secretKey = rawSK.trim().replace(/['"]/g, '');

  if (!accessKey || !secretKey) {
    throw new Error('未配置 VOLCENGINE_ACCESS_KEY_ID 或 VOLCENGINE_SECRET_ACCESS_KEY');
  }

  // 2. 初始化 SDK
  return new Service({
    accessKeyId: accessKey,
    secretKey: secretKey,
    serviceName: 'cv',
    host: 'visual.volcengineapi.com',
    region: 'cn-north-1',
    protocol: 'https:', 
    pathname: '/', // 修复 URL 错误的关键
  });
}