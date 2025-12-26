import { useState, useEffect } from 'react';

/**
 * 控制面板组件 - 儿童绘本风格
 * 功能: 关键帧数量、画风选择、生成控制
 */
const ControlPanel = ({
  onAnalyzeScript,
  onGenerateFirstFrame,
  onGenerateAllFrames,
  onStopAnalysis,
  onStopFirstFrame,
  onStopAllFrames,
  isAnalyzing,
  isGeneratingFirst,
  isGeneratingAll,
  analysisResult
}) => {
  const [frameCount, setFrameCount] = useState(5);
  const [style, setStyle] = useState('default');
  const [genre, setGenre] = useState('general');
  const [resolution, setResolution] = useState('2k');
  const [language, setLanguage] = useState('zh');
  const [aspectRatio, setAspectRatio] = useState('16:9');

  // 画风选项 - 儿童绘本风格
  const styleOptions = [
    { value: 'default', label: '🎨 默认风格' },
    { value: 'watercolor', label: '🖌️ 水彩插画' },
    { value: 'cartoon', label: '🎪 卡通风格' },
    { value: 'crayon', label: '🖍️ 蜡笔风格' },
    { value: 'fairytale', label: '🧚 童话风格' },
    { value: 'papercut', label: '✂️ 剪纸风格' },
    { value: 'flat', label: '📐 扁平插画' }
  ];

  // 题材类型选项 - 儿童故事
  const genreOptions = [
    { value: 'general', label: '📚 通用' },
    { value: 'fairytale', label: '🏰 经典童话' },
    { value: 'adventure', label: '🗺️ 冒险故事' },
    { value: 'animals', label: '🐻 动物故事' },
    { value: 'friendship', label: '🤝 友谊故事' },
    { value: 'family', label: '👨‍👩‍👧 家庭故事' },
    { value: 'nature', label: '🌿 自然科普' },
    { value: 'fantasy', label: '✨ 奇幻故事' }
  ];

  // 分辨率选项
  const resolutionOptions = [
    { value: '1k', label: '1K (1024x576)' },
    { value: '2k', label: '2K (2048x1152)' },
    { value: '4k', label: '4K (4096x2304)' }
  ];

  // 语言选项
  const languageOptions = [
    { value: 'zh', label: '🇨🇳 中文' },
    { value: 'en', label: '🇺🇸 English' },
    { value: 'ja', label: '🇯🇵 日本語' }
  ];

  const handleAnalyze = () => {
    const config = {
      frameCount,
      style,
      genre,
      resolution,
      language,
      aspectRatio
    };
    onAnalyzeScript(config);
  };

  const handleGenerateFirst = () => {
    const config = {
      frameCount,
      style,
      genre,
      resolution,
      language,
      aspectRatio
    };
    onGenerateFirstFrame(config);
  };

  const handleGenerateAll = () => {
    const config = {
      frameCount,
      style,
      genre,
      resolution,
      language,
      aspectRatio
    };
    onGenerateAllFrames(config);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 标题栏 */}
      <div className="storybook-card-header">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎮</span>
          <h2 className="text-lg font-bold text-orange-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            控制中心
          </h2>
        </div>
      </div>

      <div className="storybook-card-body flex-1 space-y-5 storybook-scrollbar overflow-y-auto">
        {/* 页数设置 */}
        <div className="storybook-panel p-4">
          <label className="block text-sm font-bold text-orange-600 mb-3" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            📖 绘本页数: <span className="text-blue-500">{frameCount}</span>
            <span className="text-xs text-gray-500 font-normal ml-1">(生成{frameCount + 1}页)</span>
          </label>
          <input
            type="range"
            min="3"
            max="40"
            value={frameCount}
            onChange={(e) => setFrameCount(parseInt(e.target.value))}
            className="storybook-slider w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium">
            <span>3页</span>
            <span>40页</span>
          </div>
        </div>

        {/* 画风选择 */}
        <div>
          <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            🎨 画风风格
          </label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="storybook-select"
          >
            {styleOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 故事类型 */}
        <div>
          <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            📚 故事类型
          </label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="storybook-select"
          >
            {genreOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 图片分辨率 */}
        <div>
          <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            📐 分辨率
          </label>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="storybook-select"
          >
            {resolutionOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 语言设置 */}
        <div>
          <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            🌐 语言
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="storybook-select"
          >
            {languageOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 图片比例 */}
        <div>
          <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            📏 比例
          </label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="storybook-select"
          >
            <option value="16:9">📺 16:9 (横屏)</option>
            <option value="1:1">⬜ 1:1 (方形)</option>
            <option value="9:16">📱 9:16 (竖屏)</option>
          </select>
        </div>

        {/* AI分析按钮区域 */}
        <div className="pt-4 border-t-2 border-yellow-200">
          {isAnalyzing ? (
            <button
              onClick={onStopAnalysis}
              className="candy-button candy-button-pink w-full mb-4"
            >
              <span>⏹️</span>
              <span>停止分析</span>
            </button>
          ) : (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="candy-button candy-button-orange w-full mb-4"
            >
              <span>🧠</span>
              <span>AI智能分析</span>
            </button>
          )}

          {analysisResult && (
            <div className="text-sm mb-4 p-4 bg-green-50 rounded-2xl border-2 border-green-300">
              <div className="flex items-center gap-2 mb-2">
                <span className="status-dot status-dot-success"></span>
                <span className="font-bold text-green-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  ✨ 分析完成!
                </span>
              </div>
              <p className="text-gray-600 text-xs">
                推荐: {analysisResult.recommendedGenre} | {analysisResult.recommendedStyle}
              </p>
              <p className="text-gray-600 text-xs">
                场景: {analysisResult.estimatedScenes}个
              </p>
            </div>
          )}
        </div>

        {/* 生成按钮区域 */}
        <div className="space-y-3 pb-4">
          {isGeneratingFirst ? (
            <button
              onClick={onStopFirstFrame}
              className="candy-button candy-button-pink w-full"
            >
              <span>⏹️</span>
              <span>停止生成</span>
            </button>
          ) : (
            <button
              onClick={handleGenerateFirst}
              disabled={isGeneratingFirst || !analysisResult}
              className={`candy-button w-full ${!analysisResult ? 'candy-button-gray' : 'candy-button-green'}`}
            >
              <span>🎬</span>
              <span>生成第一页</span>
            </button>
          )}

          {isGeneratingAll ? (
            <button
              onClick={onStopAllFrames}
              className="candy-button candy-button-pink w-full"
            >
              <span>⏹️</span>
              <span>停止生成</span>
            </button>
          ) : (
            <button
              onClick={handleGenerateAll}
              disabled={isGeneratingAll || !analysisResult}
              className={`candy-button w-full ${!analysisResult ? 'candy-button-gray' : 'candy-button-blue'}`}
            >
              <span>🚀</span>
              <span>生成所有页面</span>
            </button>
          )}
        </div>

        {/* 提示信息 */}
        <div className="text-sm p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">💡</span>
            <span className="font-bold text-blue-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              操作指南
            </span>
          </div>
          <ul className="space-y-2 text-gray-600 text-xs">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">1.</span>
              先点击"AI智能分析"解析故事
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">2.</span>
              生成第一页确认风格
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">3.</span>
              满意后生成所有页面
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">4.</span>
              可单独重新生成任意页面
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
