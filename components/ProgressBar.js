/**
 * 通用进度条组件
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

  // 样式配置
  const variants = {
    primary: 'from-cyan-500 to-blue-500',
    success: 'from-green-500 to-emerald-500',
    warning: 'from-yellow-500 to-orange-500',
    info: 'from-purple-500 to-pink-500'
  };

  const sizes = {
    small: 'h-2',
    medium: 'h-3',
    large: 'h-4'
  };

  const textSizes = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className="cyber-panel p-4 mb-4">
      {/* 标题和副标题 */}
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <h3 className={`font-semibold text-cyan-300 ${textSizes[size]}`}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className={`text-cyan-400/70 ${textSizes[size]} mt-1`}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* 进度条容器 */}
      <div className="relative">
        <div className={`w-full bg-gray-800/50 rounded-full overflow-hidden ${sizes[size]} border border-cyan-500/20`}>
          {/* 背景光效 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-pulse"></div>

          {/* 进度条填充 */}
          <div
            className={`${sizes[size]} bg-gradient-to-r ${variants[variant]} transition-all duration-500 ease-out relative overflow-hidden`}
            style={{ width: `${Math.min(100, Math.max(0, animatedProgress))}%` }}
          >
            {/* 进度条动画效果 */}
            {animated && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            )}

            {/* 流动光效 */}
            {animated && animatedProgress > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-flow"></div>
            )}
          </div>
        </div>

        {/* 百分比显示 */}
        {showPercentage && (
          <div className="flex justify-between items-center mt-2">
            <div className={`text-cyan-400/80 ${textSizes[size]}`}>
              进度
            </div>
            <div className={`text-cyan-300 font-mono font-semibold ${textSizes[size]}`}>
              {Math.round(animatedProgress)}%
            </div>
          </div>
        )}
      </div>

      {/* 加载点动画（当进度小于100%时显示） */}
      {animated && animatedProgress < 100 && (
        <div className="flex justify-center mt-3">
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
            ))}
          </div>
        </div>
      )}

      {/* 完成状态显示 */}
      {animatedProgress >= 100 && (
        <div className="flex items-center justify-center mt-3 text-green-400">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className={`font-semibold ${textSizes[size]}`}>完成</span>
        </div>
      )}

      <style jsx>{`
        @keyframes flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-flow {
          animation: flow 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;