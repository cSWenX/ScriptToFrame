import { useState, useEffect, useCallback } from 'react';

/**
 * 图片查看器组件 (Image Viewer)
 * 全屏查看图片，支持缩放和关闭
 */
const ImageViewer = ({ isOpen, imageUrl, title, onClose }) => {
  const [scale, setScale] = useState(1);

  // ESC键关闭
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // 禁止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // 重置缩放
  useEffect(() => {
    if (isOpen) {
      setScale(1);
    }
  }, [isOpen, imageUrl]);

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
  }, []);

  // 滚轮缩放
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, [handleZoomIn, handleZoomOut]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* 顶部工具栏 */}
      <div
        className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-white">
          {title && (
            <h3 className="text-lg font-bold">{title}</h3>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 缩放控制 */}
          <div className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1">
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 rounded-full text-white hover:bg-white/20 flex items-center justify-center text-lg"
              title="缩小"
            >
              −
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 text-white text-sm font-medium min-w-[60px] text-center"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 rounded-full text-white hover:bg-white/20 flex items-center justify-center text-lg"
              title="放大"
            >
              +
            </button>
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center text-2xl"
            title="关闭 (ESC)"
          >
            ×
          </button>
        </div>
      </div>

      {/* 图片区域 */}
      <div
        className="flex-1 w-full flex items-center justify-center overflow-auto p-8"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
      >
        <img
          src={imageUrl}
          alt={title || '图片预览'}
          className="max-w-full max-h-full object-contain transition-transform duration-200 cursor-zoom-in"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (scale < 2) {
              handleZoomIn();
            } else {
              handleResetZoom();
            }
          }}
          draggable={false}
        />
      </div>

      {/* 底部提示 */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-white/60 text-sm">
          滚轮缩放 | 点击图片放大 | ESC或点击背景关闭
        </p>
      </div>
    </div>
  );
};

export default ImageViewer;
