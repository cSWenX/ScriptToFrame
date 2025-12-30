import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * 可拖拽调整大小的三栏布局组件
 * 支持左右拖拽边框调整分栏宽度
 */
const ResizablePanels = ({
  leftPanel,
  middlePanel,
  rightPanel,
  initialLeftWidth = 30,   // 左栏初始宽度百分比
  initialMiddleWidth = 15, // 中栏初始宽度百分比
  minWidth = 10,           // 最小宽度百分比
  maxWidth = 60            // 最大宽度百分比
}) => {
  const containerRef = useRef(null);
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [middleWidth, setMiddleWidth] = useState(initialMiddleWidth);
  const [isDragging, setIsDragging] = useState(null); // 'left' | 'right' | null

  // 计算右栏宽度
  const rightWidth = 100 - leftWidth - middleWidth;

  // 处理拖拽开始
  const handleMouseDown = useCallback((divider) => (e) => {
    e.preventDefault();
    setIsDragging(divider);
  }, []);

  // 处理拖拽移动
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;
    const mousePercent = (mouseX / containerWidth) * 100;

    if (isDragging === 'left') {
      // 拖拽左边分隔线：调整左栏宽度
      const newLeftWidth = Math.max(minWidth, Math.min(maxWidth, mousePercent));
      // 确保中栏和右栏有足够空间
      if (100 - newLeftWidth - middleWidth >= minWidth) {
        setLeftWidth(newLeftWidth);
      }
    } else if (isDragging === 'right') {
      // 拖拽右边分隔线：调整中栏宽度
      const newMiddleEnd = mousePercent;
      const newMiddleWidth = newMiddleEnd - leftWidth;
      if (newMiddleWidth >= minWidth && newMiddleWidth <= maxWidth) {
        // 确保右栏有足够空间
        if (100 - leftWidth - newMiddleWidth >= minWidth) {
          setMiddleWidth(newMiddleWidth);
        }
      }
    }
  }, [isDragging, leftWidth, middleWidth, minWidth, maxWidth]);

  // 处理拖拽结束
  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  // 添加全局事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex overflow-hidden relative"
      style={{ gap: 0 }}
    >
      {/* 左栏 */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{ width: `${leftWidth}%` }}
      >
        <div className="h-full overflow-x-auto overflow-y-auto storybook-scrollbar">
          <div className="min-w-[300px] h-full">
            {leftPanel}
          </div>
        </div>
      </div>

      {/* 左边分隔线 */}
      <div
        className={`
          w-1 flex-shrink-0 cursor-col-resize
          bg-gray-200 hover:bg-orange-400 active:bg-orange-500
          transition-colors duration-150
          relative group
          ${isDragging === 'left' ? 'bg-orange-500' : ''}
        `}
        onMouseDown={handleMouseDown('left')}
      >
        {/* 拖拽指示器 */}
        <div className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-4 h-8 rounded-full
          opacity-0 group-hover:opacity-100
          bg-orange-400 shadow-lg
          flex items-center justify-center
          transition-opacity duration-150
          ${isDragging === 'left' ? 'opacity-100 bg-orange-500' : ''}
        `}>
          <span className="text-white text-xs">⋮</span>
        </div>
      </div>

      {/* 中栏 */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{ width: `${middleWidth}%` }}
      >
        <div className="h-full overflow-x-auto overflow-y-auto storybook-scrollbar">
          <div className="min-w-[150px] h-full">
            {middlePanel}
          </div>
        </div>
      </div>

      {/* 右边分隔线 */}
      <div
        className={`
          w-1 flex-shrink-0 cursor-col-resize
          bg-gray-200 hover:bg-orange-400 active:bg-orange-500
          transition-colors duration-150
          relative group
          ${isDragging === 'right' ? 'bg-orange-500' : ''}
        `}
        onMouseDown={handleMouseDown('right')}
      >
        {/* 拖拽指示器 */}
        <div className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-4 h-8 rounded-full
          opacity-0 group-hover:opacity-100
          bg-orange-400 shadow-lg
          flex items-center justify-center
          transition-opacity duration-150
          ${isDragging === 'right' ? 'opacity-100 bg-orange-500' : ''}
        `}>
          <span className="text-white text-xs">⋮</span>
        </div>
      </div>

      {/* 右栏 */}
      <div
        className="flex-1 min-w-0 overflow-hidden"
        style={{ width: `${rightWidth}%` }}
      >
        <div className="h-full overflow-x-auto overflow-y-auto storybook-scrollbar">
          <div className="min-w-[400px] h-full">
            {rightPanel}
          </div>
        </div>
      </div>

      {/* 拖拽时的遮罩层，防止iframe等元素捕获鼠标事件 */}
      {isDragging && (
        <div className="absolute inset-0 z-50" style={{ cursor: 'col-resize' }} />
      )}
    </div>
  );
};

export default ResizablePanels;
