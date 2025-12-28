/** @type {import('next').NextConfig} */
const nextConfig = {
  // Node.js 16 兼容配置

  images: {
    domains: ['localhost'],
    unoptimized: true
  },

  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },

  swcMinify: false, // 禁用SWC编译器，使用Babel

  // 压缩配置
  compress: true,

  // 环境变量
  env: {
    VOLCENGINE_ACCESS_KEY_ID: process.env.VOLCENGINE_ACCESS_KEY_ID,
    VOLCENGINE_SECRET_ACCESS_KEY: process.env.VOLCENGINE_SECRET_ACCESS_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL,
    PYTHON_BACKEND_URL: process.env.PYTHON_BACKEND_URL,
  }
};

module.exports = nextConfig;