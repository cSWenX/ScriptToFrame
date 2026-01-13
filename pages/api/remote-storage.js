/**
 * 远程存储 API
 * 对接 61.155.227.20:19092 的文件存储和产品保存接口
 */

const REMOTE_BASE_URL = 'http://61.155.227.20:19092/chatAI/book';

/**
 * 保存文件到远程服务器
 * @param {string} base64Data - base64编码的数据（带前缀，如 data:image/png;base64,xxx）
 * @param {string} type - '0' 图片, '1' 音频
 * @returns {Promise<{id: string, url: string}>}
 */
export async function saveFileToRemote(base64Data, type = '0') {
  try {
    const response = await fetch(`${REMOTE_BASE_URL}/api/file/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pictureUrl: '',
        pictureBase64: type === '0' ? base64Data : '',
        audioBase64: type === '1' ? base64Data : '',
        type
      })
    });

    const result = await response.json();

    if (result.code === 10000 && result.data) {
      return {
        id: result.data.id,
        url: result.data.url
      };
    } else {
      throw new Error(result.msg || '远程存储失败');
    }
  } catch (error) {
    console.error('保存文件到远程失败:', error);
    throw error;
  }
}

/**
 * 保存产品到远程服务器
 * @param {Object} productData
 * @param {string} productData.prodName - 产品名称
 * @param {string} productData.prodCode - 产品代码
 * @param {string} productData.faceId - 封面图片ID
 * @param {Array} productData.contentList - 内容列表
 * @param {string} productData.categoryCode - 分类代码
 * @param {string} productData.des - 描述
 * @returns {Promise<boolean>}
 */
export async function saveProductToRemote(productData) {
  try {
    const response = await fetch(`${REMOTE_BASE_URL}/api/product/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    const result = await response.json();

    if (result.code === 10000) {
      return true;
    } else {
      throw new Error(result.msg || '产品保存失败');
    }
  } catch (error) {
    console.error('保存产品到远程失败:', error);
    throw error;
  }
}

/**
 * Next.js API 路由处理器
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { action, data } = req.body;

  try {
    if (action === 'saveFile') {
      const { base64Data, type } = data;
      const result = await saveFileToRemote(base64Data, type);
      return res.status(200).json({ success: true, data: result });
    } else if (action === 'saveProduct') {
      const result = await saveProductToRemote(data);
      return res.status(200).json({ success: true, data: result });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    console.error('远程存储API错误:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
