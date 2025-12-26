import { useState } from 'react';

/**
 * 分镜图显示组件 - 儿童绘本风格
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
        {/* 空状态标题栏 */}
        <div className="storybook-card-header">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <h2 className="text-lg font-bold text-orange-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              绘本画板
            </h2>
          </div>
        </div>

        {/* 空状态内容 */}
        <div className="storybook-card-body flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-3xl flex items-center justify-center border-3 border-yellow-300 shadow-lg">
              <span className="text-6xl">🖼️</span>
            </div>
            <p className="text-orange-600 font-bold text-lg" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              还没有绘本插图哦~
            </p>
            <p className="text-gray-500 text-sm mt-2" style={{ fontFamily: "'Nunito', sans-serif" }}>
              请先输入故事内容，然后点击"AI智能分析"开始创作！
            </p>

            {/* 可爱装饰 */}
            <div className="mt-6 flex justify-center gap-3">
              <span className="text-2xl animate-float delay-100">🌟</span>
              <span className="text-2xl animate-float delay-200">✨</span>
              <span className="text-2xl animate-float delay-300">🌈</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 标题栏 */}
      <div className="storybook-card-header">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <h2 className="text-lg font-bold text-orange-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              绘本画板 <span className="text-blue-500">({frames.length}页)</span>
            </h2>
          </div>
          <button
            onClick={handleDownloadAll}
            className="candy-button candy-button-purple"
            disabled={frames.some(frame => frame.isGenerating)}
          >
            <span>📦</span>
            <span>下载全部</span>
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="storybook-card-body flex-1 storybook-scrollbar overflow-auto">
        <div className="space-y-6">
          {frames.map((frame, index) => (
            <div key={frame.id} className="storybook-card relative animate-pop">
              {/* 页码标识 - 可爱风格 */}
              <div className="absolute -left-3 -top-3 w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm z-10 border-3 border-white shadow-lg"
                   style={{ fontFamily: "'Fredoka', sans-serif" }}>
                {index + 1}
              </div>

              {/* 卡片头部 */}
              <div className="storybook-card-header">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-orange-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                      第 {index + 1} 页
                    </h3>
                    <p className="text-gray-500 text-sm" style={{ fontFamily: "'Nunito', sans-serif" }}>
                      {frame.scene || '精彩的故事场景'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownloadFrame(frame)}
                      disabled={frame.isGenerating || !frame.imageUrl}
                      className={`candy-button text-sm ${frame.imageUrl ? 'candy-button-green' : 'candy-button-gray'}`}
                    >
                      <span>⬇️</span>
                    </button>
                    <button
                      onClick={() => handleRegenerateFrame(frame.id)}
                      disabled={frame.isGenerating}
                      className={`candy-button text-sm ${frame.isGenerating ? 'candy-button-gray' : 'candy-button-pink'}`}
                    >
                      <span>{frame.isGenerating ? '🔄' : '🔁'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 卡片内容 */}
              <div className="storybook-card-body">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 图片区域 */}
                  <div className="relative group">
                    <div className="aspect-video bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl overflow-hidden border-3 border-yellow-300 relative shadow-lg">
                      {frame.isGenerating ? (
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/80 to-yellow-100/80 flex items-center justify-center">
                          <div className="text-center">
                            <div className="storybook-spinner mb-3">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                            <p className="text-orange-600 font-bold" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                              正在画画...
                            </p>
                            <div className="mt-3 w-32 mx-auto">
                              <div className="storybook-progress">
                                <div className="storybook-progress-bar" style={{width: '60%'}}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : frame.imageUrl ? (
                        <>
                          <img
                            src={frame.imageUrl}
                            alt={`绘本插图 ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                            onClick={() => openImageModal(frame)}
                          />
                          {/* 悬停效果 */}
                          <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="bg-white/90 rounded-full px-3 py-1 text-xs text-orange-600 font-bold shadow-md" style={{ fontFamily: "'Nunito', sans-serif" }}>
                              🔍 点击放大
                            </div>
                          </div>
                        </>
                      ) : frame.error ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <span className="text-5xl">😢</span>
                            <p className="text-red-500 font-bold mt-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                              生成失败了
                            </p>
                            <p className="text-gray-500 text-xs mt-1 max-w-48" style={{ fontFamily: "'Nunito', sans-serif" }}>
                              {frame.error}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <span className="text-5xl">🎨</span>
                            <p className="text-orange-500 font-bold mt-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                              等待绘制
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 状态指示器 */}
                    <div className="absolute top-2 left-2">
                      {frame.isGenerating && (
                        <div className="status-dot status-dot-warning"></div>
                      )}
                      {frame.imageUrl && !frame.isGenerating && (
                        <div className="status-dot status-dot-success"></div>
                      )}
                      {frame.error && (
                        <div className="status-dot status-dot-error"></div>
                      )}
                      {!frame.imageUrl && !frame.isGenerating && !frame.error && (
                        <div className="status-dot status-dot-pending"></div>
                      )}
                    </div>
                  </div>

                  {/* 信息区域 */}
                  <div className="space-y-4">
                    {/* 故事描述 */}
                    <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
                      <h4 className="text-sm font-bold text-blue-600 mb-2 flex items-center gap-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                        <span>📖</span>
                        <span>故事内容</span>
                        {frame.frameType && (
                          <span className="text-xs bg-blue-100 px-2 py-1 rounded-full border border-blue-300">
                            {frame.frameType}
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        {frame.displayDescription || frame.chineseDescription || frame.description || '精彩的故事情节...'}
                      </p>
                    </div>

                    {/* AI提示词区域 */}
                    <div className="p-4 bg-purple-50 rounded-2xl border-2 border-purple-200">
                      <h4 className="text-sm font-bold text-purple-600 mb-2 flex items-center gap-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                        <span>🤖</span>
                        <span>AI绘画指令</span>
                      </h4>
                      <div className="bg-white p-3 rounded-xl border-2 border-purple-100 max-h-32 overflow-y-auto storybook-scrollbar">
                        <code className="text-xs text-purple-700 leading-relaxed break-all" style={{ fontFamily: "'Nunito', monospace" }}>
                          {frame.prompt || frame.jimengPrompt || '等待AI分析生成...'}
                        </code>
                      </div>
                    </div>

                    {/* 元数据网格 - 可爱风格 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-green-50 rounded-xl border-2 border-green-200">
                        <span className="text-xs font-bold text-green-600 flex items-center gap-1" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                          <span>🎬</span>页码
                        </span>
                        <p className="text-xs text-green-700 mt-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
                          第{index + 1}页
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-xl border-2 border-blue-200">
                        <span className="text-xs font-bold text-blue-600 flex items-center gap-1" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                          <span>🎞️</span>类型
                        </span>
                        <p className="text-xs text-blue-700 mt-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
                          {frame.frameType || '故事页'}
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                        <span className="text-xs font-bold text-yellow-600 flex items-center gap-1" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                          <span>📹</span>视角
                        </span>
                        <p className="text-xs text-yellow-700 mt-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
                          {frame.camera_angle || '标准视角'}
                        </p>
                      </div>
                      <div className="p-3 bg-pink-50 rounded-xl border-2 border-pink-200">
                        <span className="text-xs font-bold text-pink-600 flex items-center gap-1" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                          <span>😊</span>氛围
                        </span>
                        <p className="text-xs text-pink-700 mt-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
                          {frame.emotion || '温馨'}
                        </p>
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
          <div className="inline-flex items-center gap-3 text-orange-400 text-sm" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            <span>🌟</span>
            <span>AI创作完成</span>
            <span>🌟</span>
          </div>
        </div>
      </div>

      {/* 图片预览模态框 - 绘本风格 */}
      {selectedFrame && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={closeImageModal}
        >
          <div className="max-w-6xl max-h-full p-6 relative animate-pop">
            {/* 模态框装饰框 - 绘本风格 */}
            <div className="absolute -inset-2 bg-gradient-to-br from-orange-200 to-yellow-200 rounded-3xl -z-10"></div>
            <div className="absolute -inset-1 bg-white rounded-2xl -z-5"></div>

            <div className="relative bg-white rounded-2xl p-4 border-4 border-yellow-300 shadow-2xl">
              <img
                src={selectedFrame.imageUrl}
                alt={`绘本插图 ${frames.findIndex(f => f.id === selectedFrame.id) + 1}`}
                className="max-w-full max-h-[75vh] object-contain rounded-xl"
              />

              {/* 图片信息叠层 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/95 to-transparent p-6 rounded-b-xl">
                <div className="text-orange-600 font-bold text-xl" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  📖 第 {frames.findIndex(f => f.id === selectedFrame.id) + 1} 页
                </div>
                <div className="text-gray-600 text-sm mt-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  {selectedFrame.scene}
                </div>
              </div>
            </div>

            <div className="text-center mt-6">
              <button
                onClick={closeImageModal}
                className="candy-button candy-button-orange"
              >
                <span>✨</span>
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
