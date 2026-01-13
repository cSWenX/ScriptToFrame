/**
 * 推送图片到远程存储 API
 * 支持本地 URL 或 base64 数据
 */

import { saveFileToRemote } from './remote-storage';

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
    responseLimit: false,
  },
};

/**
 * 将 ArrayBuffer 转换为 base64 data URL
 * @param {ArrayBuffer} buffer - 图片数据
 * @param {string} mimeType - MIME 类型
 * @returns {string} base64 data URL
 */
function arrayBufferToBase64(buffer, mimeType = 'image/png') {
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

/**
 * 从 response 中检测 MIME 类型
 * @param {Response} response - Fetch response 对象
 * @returns {string} MIME 类型
 */
function getMimeTypeFromResponse(response) {
  const contentType = response.headers.get('content-type');
  if (contentType) {
    // 提取主 MIME 类型（如 "image/png" 从 "image/png; charset=utf-8"）
    return contentType.split(';')[0].trim();
  }
  return 'image/png'; // 默认
}

/**
 * 将本地图片 URL 转换为 base64（Node.js 兼容版本）
 * @param {string} url - 本地图片 URL (如 /generated/pages/page_1.png)
 * @returns {Promise<string>} base64 data URL
 */
async function fetchImageAsBase64(url) {
  // 如果已经是 base64 格式，直接返回
  if (url.startsWith('data:')) {
    return url;
  }

  // 本地路径，通过 Next.js 的 public 目录访问
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  console.log(`📥 [fetchImageAsBase64] 正在获取图片:`, fullUrl.substring(0, 100));

  const response = await fetch(fullUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  // 获取 MIME 类型
  const mimeType = getMimeTypeFromResponse(response);

  // 获取 ArrayBuffer 并转换为 base64
  const arrayBuffer = await response.arrayBuffer();
  const base64DataUrl = arrayBufferToBase64(arrayBuffer, mimeType);

  console.log(`✅ [fetchImageAsBase64] 转换成功，大小: ${base64DataUrl.length} 字符`);

  return base64DataUrl;
}

export default async function handler(req, res) {
  const requestId = Date.now();

  console.log(`🔄 [推送远程-${requestId}] 收到请求:`, {
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { imageUrl, pageIndex } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ success: false, error: '缺少 imageUrl 参数' });
    }

    console.log(`📤 [推送远程-${requestId}] 开始推送图片:`, {
      pageIndex,
      imageUrl: imageUrl.substring(0, 100)
    });

    // 获取图片 base64 数据
    let base64Data;
    if (imageUrl.startsWith('data:')) {
      base64Data = imageUrl;
      console.log(`✅ [推送远程-${requestId}] 已是 base64 格式`);
    } else {
      console.log(`📥 [推送远程-${requestId}] 正在获取图片数据...`);
      base64Data = await fetchImageAsBase64(imageUrl);
      console.log(`✅ [推送远程-${requestId}] 图片获取成功，大小: ${base64Data.length} 字符`);
    }

    // 推送到远程存储
    console.log(`☁️ [推送远程-${requestId}] 正在推送到远程存储...`);
    const result = await saveFileToRemote(base64Data, '0');

    console.log(`✅ [推送远程-${requestId}] 推送成功:`, {
      remoteId: result.id,
      remoteUrl: result.url
    });

    return res.status(200).json({
      success: true,
      data: {
        remoteId: result.id,
        remoteUrl: result.url
      }
    });

  } catch (error) {
    console.error(`❌ [推送远程-${requestId}] 推送失败:`, {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: error.message || '推送远程失败'
    });
  }
}
