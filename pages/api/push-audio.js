/**
 * 音频推送API
 * 将音频文件推送到远程存储
 * 支持本地URL或base64数据
 */

const REMOTE_FILE_API = 'http://61.155.227.20:19092/chatAI/book/api/file/save';

/**
 * 将本地音频URL转换为base64
 * @param {string} url - 本地音频URL
 * @returns {Promise<string>} base64 data URL
 */
async function fetchAudioAsBase64(url) {
  // 如果已经是base64格式，直接返回
  if (url.startsWith('data:')) {
    return url;
  }

  // 如果是远程URL，不需要处理
  if (url.startsWith('http://61.155.227.20')) {
    return url;
  }

  // 如果已经是完整URL，直接使用
  if (url.startsWith('http')) {
    return await fetchAndConvertToBase64(url);
  }

  // 本地相对路径，尝试多个可能的端口
  const ports = ['3000', '3001', '3002'];
  let lastError = null;

  for (const port of ports) {
    const fullUrl = `http://localhost:${port}${url}`;
    try {
      console.log(`📥 [音频推送] 尝试端口 ${port}:`, fullUrl);
      return await fetchAndConvertToBase64(fullUrl);
    } catch (error) {
      console.log(`⚠️ [音频推送] 端口 ${port} 失败:`, error.message);
      lastError = error;
    }
  }

  throw lastError || new Error(`无法获取音频: ${url}`);
}

async function fetchAndConvertToBase64(fullUrl) {
  const response = await fetch(fullUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.statusText} (${fullUrl})`);
  }

  // 获取ArrayBuffer并转换为base64
  const arrayBuffer = await response.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString('base64');

  // 添加音频base64前缀
  const dataUrl = `data:audio/wav;base64,${base64Data}`;

  console.log(`✅ [音频推送] 转换成功，大小: ${dataUrl.length} 字符`);

  return dataUrl;
}

export default async function handler(req, res) {
  const requestId = Date.now();

  console.log(`🎵 [音频推送-${requestId}] 收到请求:`, {
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { audioUrls } = req.body; // 音频URL数组

    if (!audioUrls || !Array.isArray(audioUrls) || audioUrls.length === 0) {
      console.error(`❌ [音频推送-${requestId}] 参数错误, req.body:`, req.body);
      return res.status(400).json({
        success: false,
        error: '缺少 audioUrls 参数或格式不正确'
      });
    }

    console.log(`🎵 [音频推送-${requestId}] 开始推送 ${audioUrls.length} 个音频文件`);

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < audioUrls.length; i++) {
      const audioUrl = audioUrls[i];

      try {
        console.log(`📤 [音频推送-${requestId}] 处理第 ${i + 1}/${audioUrls.length} 个音频:`, audioUrl.substring(0, 80));

        // 获取音频base64数据
        let base64Data;
        if (audioUrl.startsWith('data:')) {
          base64Data = audioUrl;
        } else if (audioUrl.startsWith('http://61.155.227.20')) {
          // 已经是远程URL，跳过
          console.log(`⏭️ [音频推送-${requestId}] 第 ${i + 1} 个音频已是远程URL，跳过`);
          results.push({
            index: i,
            originalUrl: audioUrl,
            alreadyRemote: true,
            remote_url: audioUrl,
            remote_id: null  // 远程URL无法获取ID
          });
          successCount++;
          continue;
        } else {
          base64Data = await fetchAudioAsBase64(audioUrl);
        }

        // 推送到远程存储
        console.log(`📤 [音频推送-${requestId}] 正在上传第 ${i + 1} 个音频到远程...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

        const response = await fetch(REMOTE_FILE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pictureUrl: '',
            pictureBase64: '',
            audioBase64: base64Data,
            type: '1'  // 1表示音频
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log(`📥 [音频推送-${requestId}] 远程响应状态:`, response.status);

        const result = await response.json();
        console.log(`📥 [音频推送-${requestId}] 远程响应数据:`, result);

        if (response.ok && result.code === 10000 && result.data) {
          console.log(`✅ [音频推送-${requestId}] 第 ${i + 1} 个音频推送成功:`, result.data.url);
          results.push({
            index: i,
            originalUrl: audioUrl,
            remote_url: result.data.url,
            remote_id: result.data.id
          });
          successCount++;
        } else {
          console.error(`❌ [音频推送-${requestId}] 第 ${i + 1} 个音频推送失败:`, result.msg || '未知错误');
          results.push({
            index: i,
            originalUrl: audioUrl,
            error: result.msg || '推送失败'
          });
          failedCount++;
        }

      } catch (error) {
        console.error(`❌ [音频推送-${requestId}] 第 ${i + 1} 个音频处理异常:`, {
          message: error.message,
          name: error.name
        });
        results.push({
          index: i,
          originalUrl: audioUrl,
          error: error.message
        });
        failedCount++;
      }

      // 延迟100ms避免API过载
      if (i < audioUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const finalStats = {
      total: audioUrls.length,
      success: successCount,
      failed: failedCount,
      successRate: audioUrls.length > 0 ? Math.round((successCount / audioUrls.length) * 100) : 0
    };

    console.log(`✅ [音频推送-${requestId}] 批量推送完成:`, finalStats);

    return res.status(200).json({
      success: true,
      data: {
        results,
        stats: finalStats
      }
    });

  } catch (error) {
    console.error(`❌ [音频推送-${requestId}] 请求处理失败:`, {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: error.message || '音频推送失败'
    });
  }
}
