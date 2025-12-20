/**
 * API配置文件
 * 控制使用真实API还是模拟API
 */

// 设置为true使用模拟API，设置为false使用真实API
export const API_CONFIG = {
  // Claude API设置
  USE_MOCK_CLAUDE: false, // 使用DeepSeek替代Claude

  // 智能分析API设置 (新功能)
  USE_MOCK_INTELLIGENT: false, // 使用DeepSeek替代Claude

  // 图片生成API设置
  USE_MOCK_IMAGE: false, // 使用真实火山引擎API

  // API端点映射
  ENDPOINTS: {
    // 智能分析API端点 (新)
    intelligentAnalyze: '/api/intelligent-analyze-script', // DeepSeek API

    // 传统分析API端点 (保留兼容性)
    analyzeScript: '/api/analyze-script', // DeepSeek API

    // 图片生成API端点
    generateFirstImage: '/api/generate-first-image', // 火山引擎API
    generateAllImages: '/api/generate-all-images', // 火山引擎API
    regenerateImage: '/api/regenerate-image', // 火山引擎API
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