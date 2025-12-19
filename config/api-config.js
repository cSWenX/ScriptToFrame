/**
 * API配置文件
 * 控制使用真实API还是模拟API
 */

// 设置为true使用模拟API，设置为false使用真实API
export const API_CONFIG = {
  // Claude API设置
  USE_MOCK_CLAUDE: true, // 设为false切换到真实Claude API

  // 图片生成API设置
  USE_MOCK_IMAGE: true, // 设为false切换到真实火山引擎API

  // API端点映射
  ENDPOINTS: {
    // Claude API端点
    analyzeScript: '/api/mock-analyze-script', // 切换时改为 '/api/analyze-script'

    // 图片生成API端点
    generateFirstImage: '/api/mock-generate-first-image', // 切换时改为 '/api/generate-first-image'
    generateAllImages: '/api/mock-generate-all-images', // 切换时改为 '/api/generate-all-images'
    regenerateImage: '/api/mock-regenerate-image', // 切换时改为 '/api/regenerate-image'
  }
};

/**
 * 获取API端点
 * @param {string} type - API类型 ('analyzeScript', 'generateFirstImage', 'generateAllImages', 'regenerateImage')
 * @returns {string} - API端点URL
 */
export const getApiEndpoint = (type) => {
  return API_CONFIG.ENDPOINTS[type];
};