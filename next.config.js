/**
 * Next.js 配置
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // 关闭严格模式，允许 JSX
  features: {
    // 启用 JSX Namespace 支持
    jsxRuntime: 'automatic',  // 使用自动 JSX Runtime
  },

  // Docker支持的输出模式
  output: 'standalone',

  images: {
    unoptimized: true,
  },

  env: {
    CUSTOM_KEY: process.env.CSWncKey || process.env.CUSTOM_KEY,
  },

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },

  swcMinify: false,

  // 实验性功能
  experimental: {
    // 构建时的输出模式
    outputFileTracing: true,
  },
};
