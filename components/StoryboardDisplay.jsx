import { useState } from 'react';

/**
 * 分镜图显示组件 - 未来科技风格
 * 功能: 卡片式布局、图片预览、标注信息、重新生成
 */
const StoryboardDisplay = ({
  frames = [],
  onRegenerateFrame,
  onDownloadFrame,
  onDownloadAll,
  isGenerating
}) => {
  const [selectedFrame, setSelectedFrame] = useState(null);

  const handleRegenerateFrame = (frameId) => {
    if (onRegenerateFrame) {
      onRegenerateFrame(frameId);
    }
  };

  const handleDownloadFrame = (frame) => {
    if (onDownloadFrame) {
      onDownloadFrame(frame);
    }
  };

  const handleDownloadAll = () => {
    if (onDownloadAll) {
      onDownloadAll();
    }
  };

  const openImageModal = (frame) => {
    setSelectedFrame(frame);
  };

  const closeImageModal = () => {
    setSelectedFrame(null);
  };

  if (frames.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="cyber-card-header">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <h2 className="text-lg font-semibold text-green-300 neon-text">分镜画板</h2>
          </div>
        </div>
        <div className="cyber-card-body flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30 backdrop-blur-sm">
              <svg className="w-16 h-16 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-cyan-300 font-['Orbitron'] tracking-wide">未检测到分镜数据</p>
            <p className="text-cyan-400/60 text-sm mt-2 font-['Rajdhani']">请先输入剧本并执行AI智能分析</p>

            {/* 动态装饰线 */}
            <div className="mt-6 flex justify-center">
              <div className="w-24 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="cyber-card-header">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <h2 className="text-lg font-semibold text-green-300 neon-text font-['Orbitron']">
              分镜画板 <span className="text-cyan-400">({frames.length})</span>
            </h2>
          </div>
          <button
            onClick={handleDownloadAll}
            className="cyber-button cyber-button-primary"
            disabled={frames.some(frame => frame.isGenerating)}
          >
            <span>📦</span>
            <span>批量下载</span>
          </button>
        </div>
      </div>

      <div className="cyber-card-body flex-1 cyber-scrollbar overflow-auto">
        <div className="space-y-6">
          {frames.map((frame, index) => (
            <div key={frame.id} className="cyber-card relative">
              {/* 序号标识 */}
              <div className="absolute -left-3 -top-3 w-8 h-8 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm font-['Orbitron'] z-10 border-2 border-gray-900">
                {frame.sequence}
              </div>

              <div className="cyber-card-header">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-cyan-300 font-['Orbitron'] tracking-wide">
                      FRAME {String(frame.sequence).padStart(2, '0')}
                    </h3>
                    <p className="text-cyan-400/70 text-sm font-['Rajdhani']">
                      {frame.scene || '未定义场景'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownloadFrame(frame)}
                      disabled={frame.isGenerating || !frame.imageUrl}
                      className="cyber-button cyber-button-success text-xs"
                    >
                      <span>⬇️</span>
                    </button>
                    <button
                      onClick={() => handleRegenerateFrame(frame.id)}
                      disabled={frame.isGenerating}
                      className="cyber-button cyber-button-danger text-xs"
                    >
                      <span>{frame.isGenerating ? '🔄' : '🔁'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="cyber-card-body">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 图片区域 */}
                  <div className="relative group">
                    <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden border border-cyan-500/30 relative">
                      {frame.isGenerating ? (
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center backdrop-blur-sm">
                          <div className="text-center">
                            <div className="cyber-spinner mb-3"></div>
                            <p className="text-cyan-300 font-['Rajdhani'] text-sm">AI绘制中...</p>
                            <div className="mt-2">
                              <div className="cyber-progress">
                                <div className="cyber-progress-bar" style={{width: '60%'}}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : frame.imageUrl ? (
                        <>
                          <img
                            src={frame.imageUrl}
                            alt={`分镜图 ${frame.sequence}`}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                            onClick={() => openImageModal(frame)}
                          />
                          {/* 悬停效果 */}
                          <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1 text-xs text-cyan-300 font-['Rajdhani']">
                              点击放大
                            </div>
                          </div>
                        </>
                      ) : frame.error ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-red-400">
                            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <p className="text-sm font-['Orbitron']">生成失败</p>
                            <p className="text-xs font-['Rajdhani'] mt-1 max-w-48">{frame.error}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-cyan-400/60">
                            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm font-['Orbitron']">待渲染</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 状态指示器 */}
                    <div className="absolute top-2 left-2">
                      {frame.isGenerating && (
                        <div className="status-indicator status-warning"></div>
                      )}
                      {frame.imageUrl && !frame.isGenerating && (
                        <div className="status-indicator status-success"></div>
                      )}
                      {frame.error && (
                        <div className="status-indicator status-error"></div>
                      )}
                      {!frame.imageUrl && !frame.isGenerating && !frame.error && (
                        <div className="status-indicator status-info"></div>
                      )}
                    </div>
                  </div>

                  {/* 信息区域 */}
                  <div className="space-y-4">
                    {/* 分镜描述 */}
                    <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30 backdrop-blur-sm">
                      <h4 className="text-sm font-semibold text-cyan-300 mb-2 font-['Orbitron'] flex items-center gap-2">
                        <span>📋</span>
                        <span>场景描述</span>
                      </h4>
                      <p className="text-sm text-cyan-100/90 leading-relaxed font-['Rajdhani']">
                        {frame.description}
                      </p>
                    </div>

                    {/* 元数据网格 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-purple-500/10 rounded border border-purple-500/30 backdrop-blur-sm">
                        <span className="text-xs font-semibold text-purple-300 font-['Orbitron'] flex items-center gap-1">
                          <span>👥</span>角色
                        </span>
                        <p className="text-xs text-purple-100/80 mt-1 font-['Rajdhani']">
                          {frame.characters?.join(', ') || '无'}
                        </p>
                      </div>
                      <div className="p-3 bg-green-500/10 rounded border border-green-500/30 backdrop-blur-sm">
                        <span className="text-xs font-semibold text-green-300 font-['Orbitron'] flex items-center gap-1">
                          <span>😊</span>情绪
                        </span>
                        <p className="text-xs text-green-100/80 mt-1 font-['Rajdhani']">
                          {frame.emotion || '中性'}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-500/10 rounded border border-blue-500/30 backdrop-blur-sm">
                        <span className="text-xs font-semibold text-blue-300 font-['Orbitron'] flex items-center gap-1">
                          <span>📹</span>镜头
                        </span>
                        <p className="text-xs text-blue-100/80 mt-1 font-['Rajdhani']">
                          {frame.camera_angle || '正常'}
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-500/10 rounded border border-yellow-500/30 backdrop-blur-sm">
                        <span className="text-xs font-semibold text-yellow-300 font-['Orbitron'] flex items-center gap-1">
                          <span>⭐</span>关键
                        </span>
                        <p className="text-xs text-yellow-100/80 mt-1 font-['Rajdhani']">
                          {frame.key_moment || '无'}
                        </p>
                      </div>
                    </div>

                    {/* AI提示词 */}
                    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 backdrop-blur-sm">
                      <h4 className="text-xs font-semibold text-gray-300 mb-2 font-['Orbitron'] flex items-center gap-2">
                        <span>🤖</span>
                        <span>AI PROMPT</span>
                      </h4>
                      <div className="bg-black/30 rounded p-3 text-xs text-gray-300 font-mono leading-relaxed max-h-20 overflow-y-auto cyber-scrollbar">
                        {frame.prompt}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 底部装饰 */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-cyan-400/60 text-xs font-['Rajdhani']">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-cyan-500"></div>
            <span>GENERATED BY AI</span>
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-cyan-500"></div>
          </div>
        </div>
      </div>

      {/* 图片预览模态框 - 科技风格 */}
      {selectedFrame && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={closeImageModal}
        >
          <div className="max-w-6xl max-h-full p-6 relative">
            {/* 模态框装饰框 */}
            <div className="absolute inset-0 border border-cyan-500/50 rounded-lg"></div>
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg -z-10"></div>

            <div className="relative">
              <img
                src={selectedFrame.imageUrl}
                alt={`分镜图 ${selectedFrame.sequence}`}
                className="max-w-full max-h-[80vh] object-contain rounded"
              />

              {/* 图片信息叠层 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b">
                <div className="text-cyan-300 font-['Orbitron'] text-lg">
                  FRAME {String(selectedFrame.sequence).padStart(2, '0')}
                </div>
                <div className="text-cyan-400/80 font-['Rajdhani'] text-sm">
                  {selectedFrame.scene}
                </div>
              </div>
            </div>

            <div className="text-center mt-6">
              <button
                onClick={closeImageModal}
                className="cyber-button cyber-button-primary"
              >
                <span>❌</span>
                <span>关闭预览</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryboardDisplay;