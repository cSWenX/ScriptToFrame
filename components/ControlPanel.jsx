import { useState, useEffect } from 'react';

/**
 * 控制面板组件 - 未来科技风格
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

  // 画风选项
  const styleOptions = [
    { value: 'default', label: '默认风格' },
    { value: 'anime', label: '日漫风格' },
    { value: 'manga', label: '国漫风格' },
    { value: 'korean', label: '韩漫风格' },
    { value: '3d', label: '3D风格' },
    { value: 'chibi', label: 'Q版风格' },
    { value: 'realistic', label: '写实风格' }
  ];

  // 题材类型选项
  const genreOptions = [
    { value: 'general', label: '通用' },
    { value: 'xuanhuan', label: '玄幻修仙' },
    { value: 'urban', label: '都市逆袭/战神' },
    { value: 'system', label: '系统流/穿越' },
    { value: 'apocalypse', label: '末日/规则怪谈' },
    { value: 'romance', label: '霸总甜宠' },
    { value: 'ancient', label: '古风宫斗' },
    { value: 'rebirth', label: '穿书/重生' },
    { value: 'comedy', label: '搞笑沙雕' },
    { value: 'suspense', label: '悬疑惊悚' }
  ];

  // 分辨率选项
  const resolutionOptions = [
    { value: '1k', label: '1K (1024x576)' },
    { value: '2k', label: '2K (2048x1152)' },
    { value: '4k', label: '4K (4096x2304)' }
  ];

  // 语言选项
  const languageOptions = [
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' }
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
      <div className="cyber-card-header">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
          <h2 className="text-lg font-semibold text-purple-300 neon-text">控制中心</h2>
        </div>
      </div>

      <div className="cyber-card-body flex-1 space-y-6 cyber-scrollbar overflow-y-auto">
        {/* 关键帧数量 */}
        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-3 font-['Orbitron'] tracking-wide">
            剧场数量: <span className="text-purple-400 font-bold">{frameCount}</span>
            <span className="text-xs text-purple-300/70">(生成{frameCount + 1}帧)</span>
          </label>
          <input
            type="range"
            min="3"
            max="12"
            value={frameCount}
            onChange={(e) => setFrameCount(parseInt(e.target.value))}
            className="cyber-slider w-full"
          />
          <div className="flex justify-between text-xs text-cyan-400/60 mt-2 font-['Rajdhani']">
            <span>3</span>
            <span>12</span>
          </div>
        </div>

        {/* 画风选择 */}
        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-3 font-['Orbitron'] tracking-wide">
            画风风格
          </label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="cyber-select"
          >
            {styleOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 漫剧类型 */}
        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-3 font-['Orbitron'] tracking-wide">
            漫剧类型
          </label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="cyber-select"
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
          <label className="block text-sm font-medium text-cyan-300 mb-3 font-['Orbitron'] tracking-wide">
            分辨率
          </label>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="cyber-select"
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
          <label className="block text-sm font-medium text-cyan-300 mb-3 font-['Orbitron'] tracking-wide">
            语言
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="cyber-select"
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
          <label className="block text-sm font-medium text-cyan-300 mb-3 font-['Orbitron'] tracking-wide">
            比例
          </label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="cyber-select"
          >
            <option value="16:9">16:9 (横屏)</option>
            <option value="1:1">1:1 (方形)</option>
            <option value="9:16">9:16 (竖屏)</option>
          </select>
        </div>

        {/* AI分析按钮 */}
        <div className="pt-4 border-t border-cyan-500/30">
          {isAnalyzing ? (
            // 分析进行中时显示停止按钮
            <button
              onClick={onStopAnalysis}
              className="cyber-button cyber-button-warning w-full mb-4"
            >
              <div className="flex items-center gap-2">
                <span>⏹️</span>
                <span>停止分析</span>
              </div>
            </button>
          ) : (
            // 正常情况下显示分析按钮
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="cyber-button cyber-button-primary w-full mb-4"
            >
              <div className="flex items-center gap-2">
                <span>🧠</span>
                <span>AI智能分析</span>
              </div>
            </button>
          )}

          {analysisResult && (
            <div className="text-xs text-cyan-300/80 mb-4 p-3 bg-cyan-500/10 rounded border border-cyan-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="status-indicator status-success"></div>
                <span className="font-semibold text-green-400">分析完成</span>
              </div>
              <p className="text-cyan-400/70 font-['Rajdhani']">
                推荐: {analysisResult.recommendedGenre} | {analysisResult.recommendedStyle}
              </p>
              <p className="text-cyan-400/70 font-['Rajdhani']">
                场景: {analysisResult.estimatedScenes}个
              </p>
            </div>
          )}
        </div>

        {/* 生成按钮区域 */}
        <div className="space-y-3 pb-4">
          {isGeneratingFirst ? (
            // 生成第一张图进行中时显示停止按钮
            <button
              onClick={onStopFirstFrame}
              className="cyber-button cyber-button-warning w-full"
            >
              <div className="flex items-center gap-2">
                <span>⏹️</span>
                <span>停止生成</span>
              </div>
            </button>
          ) : (
            // 正常情况下显示生成第一张图按钮
            <button
              onClick={handleGenerateFirst}
              disabled={isGeneratingFirst || !analysisResult}
              className="cyber-button cyber-button-success w-full"
            >
              <div className="flex items-center gap-2">
                <span>🎬</span>
                <span>生成第一张图</span>
              </div>
            </button>
          )}

          {isGeneratingAll ? (
            // 批量生成进行中时显示停止按钮
            <button
              onClick={onStopAllFrames}
              className="cyber-button cyber-button-warning w-full"
            >
              <div className="flex items-center gap-2">
                <span>⏹️</span>
                <span>停止生成</span>
              </div>
            </button>
          ) : (
            // 正常情况下显示批量生成按钮
            <button
              onClick={handleGenerateAll}
              disabled={isGeneratingAll || !analysisResult}
              className="cyber-button cyber-button-danger w-full"
            >
              <div className="flex items-center gap-2">
                <span>🚀</span>
                <span>生成所有分镜</span>
              </div>
            </button>
          )}
        </div>

        {/* 提示信息 */}
        <div className="text-xs text-cyan-400/60 p-4 bg-blue-500/5 rounded-lg border border-blue-500/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400">ℹ️</span>
            <span className="font-semibold text-blue-300">操作指南</span>
          </div>
          <ul className="list-none space-y-1 ml-4 font-['Rajdhani']">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">1.</span>
              先点击"AI智能分析"解析剧本
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">2.</span>
              生成第一张图确认风格
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">3.</span>
              满意后生成所有分镜图
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">4.</span>
              可单独重新生成任意图片
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;