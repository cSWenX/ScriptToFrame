const crypto = require('crypto');
const axios = require('axios');

/**
 * 火山引擎即梦API集成模块
 * 功能: 图片生成、参考图支持、错误处理
 */
class VolcengineImageAPI {
  constructor() {
    this.accessKeyId = process.env.VOLCENGINE_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.VOLCENGINE_SECRET_ACCESS_KEY;
    this.baseURL = 'https://visual.volcengineapi.com';
    this.service = 'cv';
    this.region = 'cn-north-1';
  }

  /**
   * 生成API签名
   * @param {Object} params - 请求参数
   * @param {string} method - HTTP方法
   * @param {string} path - 请求路径
   * @returns {string} 签名
   */
  generateSignature(params, method, path) {
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().substr(0, 10).replace(/-/g, '');

    // 构建签名字符串
    const canonicalQueryString = Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const canonicalHeaders = [
      `host:${this.baseURL.replace('https://', '')}`,
      `x-date:${timestamp}`
    ].join('\n');

    const signedHeaders = 'host;x-date';
    const hashedPayload = crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex');

    const canonicalRequest = [
      method,
      path,
      canonicalQueryString,
      canonicalHeaders,
      '',
      signedHeaders,
      hashedPayload
    ].join('\n');

    const algorithm = 'HMAC-SHA256';
    const credentialScope = `${date}/${this.region}/${this.service}/request`;
    const stringToSign = [
      algorithm,
      timestamp,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const signingKey = this.getSigningKey(date);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    return `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }

  /**
   * 获取签名密钥
   * @param {string} date - 日期字符串
   * @returns {Buffer} 签名密钥
   */
  getSigningKey(date) {
    const kDate = crypto.createHmac('sha256', `AWS4${this.secretAccessKey}`).update(date).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(this.region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(this.service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('request').digest();
    return kSigning;
  }

  /**
   * 生成图片 (不使用参考图)
   * @param {string} prompt - 图片描述
   * @param {Object} options - 可选参数
   * @returns {Promise} 生成结果
   */
  async generateImage(prompt, options = {}) {
    const params = {
      req_key: 'jimeng_t2i_v40',
      prompt: prompt,
      model_version: 'general_v2.0',
      image_num: 1,
      image_width: 1024,
      image_height: 576, // 16:9比例
      use_sr: false,
      ...options
    };

    return await this.makeRequest('POST', '/api/v1/cv/text2image/submit', params);
  }

  /**
   * 生成图片 (使用参考图)
   * @param {string} prompt - 图片描述
   * @param {string} referenceImageUrl - 参考图URL
   * @param {Object} options - 可选参数
   * @returns {Promise} 生成结果
   */
  async generateImageWithReference(prompt, referenceImageUrl, options = {}) {
    const params = {
      req_key: 'jimeng_t2i_v40',
      prompt: prompt,
      model_version: 'general_v2.0',
      image_num: 1,
      image_width: 1024,
      image_height: 576,
      reference_image: referenceImageUrl,
      reference_image_weight: 0.7, // 参考图权重
      use_sr: false,
      ...options
    };

    return await this.makeRequest('POST', '/api/v1/cv/text2image/submit', params);
  }

  /**
   * 查询生成任务状态
   * @param {string} taskId - 任务ID
   * @returns {Promise} 任务状态
   */
  async queryTask(taskId) {
    const params = {
      task_id: taskId
    };

    return await this.makeRequest('GET', '/api/v1/cv/text2image/query', params);
  }

  /**
   * 发送API请求
   * @param {string} method - HTTP方法
   * @param {string} path - 请求路径
   * @param {Object} params - 请求参数
   * @returns {Promise} 响应结果
   */
  async makeRequest(method, path, params) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const authorization = this.generateSignature(params, method, path);

      const config = {
        method: method,
        url: `${this.baseURL}${path}`,
        headers: {
          'Authorization': authorization,
          'X-Date': timestamp,
          'Content-Type': 'application/json'
        }
      };

      if (method === 'GET') {
        config.params = params;
      } else {
        config.data = params;
      }

      const response = await axios(config);

      if (response.data.code !== 0) {
        throw new Error(`API错误: ${response.data.message || '未知错误'}`);
      }

      return {
        success: true,
        data: response.data.data,
        taskId: response.data.data?.task_id
      };
    } catch (error) {
      console.error('火山引擎API调用失败:', error);
      return {
        success: false,
        error: error.message || '图片生成失败',
        code: error.response?.status
      };
    }
  }

  /**
   * 轮询任务完成状态
   * @param {string} taskId - 任务ID
   * @param {number} maxRetries - 最大重试次数
   * @returns {Promise} 最终结果
   */
  async pollTaskCompletion(taskId, maxRetries = 30) {
    let retries = 0;

    while (retries < maxRetries) {
      const result = await this.queryTask(taskId);

      if (!result.success) {
        throw new Error(`查询任务失败: ${result.error}`);
      }

      const status = result.data.status;

      if (status === 'success') {
        return {
          success: true,
          data: result.data,
          images: result.data.images || []
        };
      } else if (status === 'failed') {
        throw new Error(`图片生成失败: ${result.data.reason || '未知原因'}`);
      }

      // 等待3秒后重试
      await new Promise(resolve => setTimeout(resolve, 3000));
      retries++;
    }

    throw new Error('图片生成超时，请稍后重试');
  }
}

module.exports = VolcengineImageAPI;