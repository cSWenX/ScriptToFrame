/**
 * 通用进度条组件 - 儿童绘本风格
 * 支持多种样式和动画效果
 */
import { useState, useEffect } from 'react';

const ProgressBar = ({
  progress = 0,
  isVisible = false,
  title = '',
  subtitle = '',
  showPercentage = true,
  animated = true,
  variant = 'primary', // 'primary', 'success', 'warning', 'info'
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    if (animated && isVisible) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedProgress(progress);
    }
  }, [progress, animated, isVisible]);

  if (!isVisible) return null;

  // 儿童绘本风格配色
  const variants = {
    primary: 'from-orange-400 to-orange-500',
    success: 'from-green-400 to-emerald-500',
    warning: 'from-yellow-400 to-amber-500',
    info: 'from-blue-400 to-indigo-500'
  };

  const variantColors = {
    primary: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-600', accent: 'text-orange-500' },
    success: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-600', accent: 'text-green-500' },
    warning: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-600', accent: 'text-yellow-500' },
    info: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-600', accent: 'text-blue-500' }
  };

  const sizes = {
    small: 'h-3',
    medium: 'h-4',
    large: 'h-5'
  };

  const textSizes = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  const colors = variantColors[variant];

  return (
    <div className="storybook-panel p-5 mb-4 animate-pop">
      {/* 标题和副标题 */}
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className={`font-bold ${colors.text} ${textSizes[size]} flex items-center gap-2`} style={{ fontFamily: "'Fredoka', sans-serif" }}>
              <span className="text-xl">✨</span>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className={`text-warm-gray ${textSizes[size]} mt-1`} style={{ fontFamily: "'Nunito', sans-serif" }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* 进度条容器 */}
      <div className="relative">
        <div className={`w-full ${colors.bg} rounded-full overflow-hidden ${sizes[size]} border-2 ${colors.border}`}>
          {/* 进度条填充 */}
          <div
            className={`${sizes[size]} bg-gradient-to-r ${variants[variant]} transition-all duration-500 ease-out relative overflow-hidden rounded-full`}
            style={{ width: `${Math.min(100, Math.max(0, animatedProgress))}%` }}
          >
            {/* 光泽效果 */}
            {animated && animatedProgress > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
            )}
          </div>
        </div>

        {/* 百分比显示 */}
        {showPercentage && (
          <div className="flex justify-between items-center mt-3">
            <div className={`text-warm-gray font-medium ${textSizes[size]}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
              进度
            </div>
            <div className={`${colors.text} font-bold ${textSizes[size]}`} style={{ fontFamily: "'Fredoka', sans-serif" }}>
              {Math.round(animatedProgress)}%
            </div>
          </div>
        )}
      </div>

      {/* 加载点动画（当进度小于100%时显示） */}
      {animated && animatedProgress < 100 && (
        <div className="flex justify-center mt-4">
          <div className="storybook-spinner">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      {/* 完成状态显示 */}
      {animatedProgress >= 100 && (
        <div className="flex items-center justify-center mt-4 text-green-500 animate-pop">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full border-2 border-green-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            <span className={`font-bold ${textSizes[size]}`} style={{ fontFamily: "'Fredoka', sans-serif" }}>完成啦!</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;
