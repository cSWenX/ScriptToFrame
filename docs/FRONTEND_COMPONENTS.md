# ScriptToFrame 前端组件文档

## 概述

ScriptToFrame前端采用React + Next.js架构，使用Tailwind CSS构建未来科技风格的用户界面。整个应用采用组件化设计，状态管理通过React Hooks实现，用户体验注重实时反馈和进度展示。

## 组件层次结构

```
pages/index.js (主页面)
├── components/ScriptInput.jsx      # 剧本输入组件
├── components/ControlPanel.jsx     # 控制面板组件
├── components/StoryboardDisplay.jsx # 分镜显示组件
└── components/ProgressBar.js       # 进度条组件

CSS样式系统
├── styles/globals.css              # 全局样式
├── tailwind.config.js             # Tailwind配置
└── postcss.config.js              # PostCSS配置
```

## 布局架构

### 主页面布局 (pages/index.js)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Header (头部)                             │
│  ┌─────────────────┐                    ┌─────────────────┐      │
│  │ SCRIPTTOFRAME   │                    │ 系统状态显示     │      │
│  │ Logo + 标题     │                    │ 在线状态 v1.0.0  │      │
│  └─────────────────┘                    └─────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                      进度条区域 (悬浮)                            │
│  [AI智能分析进度条] [第一张图生成进度条] [批量生成进度条]           │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                      主内容区 (三栏布局)                          │
│ ┌──────────────┐ ┌───────────┐ ┌──────────────────────────────┐ │
│ │ ScriptInput  │ │ Control   │ │      StoryboardDisplay       │ │
│ │   (30%)      │ │ Panel     │ │           (55%)              │ │
│ │              │ │  (15%)    │ │                              │ │
│ │ 剧本输入区域  │ │           │ │      分镜显示区域             │ │
│ │ - 大文本框    │ │ 控制面板   │ │ - 分镜图片网格               │ │
│ │ - 字数统计    │ │ - 参数设置 │ │ - 操作按钮                  │ │
│ │ - 格式验证    │ │ - 生成按钮 │ │ - 下载功能                  │ │
│ └──────────────┘ └───────────┘ └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                        Footer (底部)                             │
│  © 2025 ScriptToFrame  |  AI分镜生成技术    [系统状态: 就绪]      │
└─────────────────────────────────────────────────────────────────┘
```

## 主要组件详解

### 1. ScriptInput 组件 (剧本输入)

**文件位置**: `components/ScriptInput.jsx`

**功能概述**:
- 大型文本输入框，支持多种剧本格式
- 实时字数统计和格式验证
- 用户引导和使用说明

**组件结构**:
```jsx
const ScriptInput = ({ value, onChange, onValidate }) => {
  const [wordCount, setWordCount] = useState(0);
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');

  return (
    <div className="h-full flex flex-col">
      {/* 头部 - 标题和状态 */}
      <div className="cyber-card-header">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <h2 className="text-lg font-semibold text-cyan-300">剧本输入</h2>
        </div>
        <div className="flex justify-between items-center mt-3">
          {/* 字数统计 */}
          <span className="text-sm text-cyan-400/80">
            字数: <span className="text-cyan-300 font-bold">{wordCount}</span>
          </span>
          {/* 验证状态指示器 */}
          <div className={`status-indicator ${isValid ? 'status-success' : 'status-warning'}`}></div>
          {/* 验证消息 */}
          <div className={`text-sm ${isValid ? 'text-green-400' : 'text-yellow-400'}`}>
            {isValid ? '✓' : '⚠'} {validationMessage}
          </div>
        </div>
      </div>

      {/* 主体 - 文本输入区 */}
      <div className="cyber-card-body flex-1 flex flex-col">
        <textarea
          className="cyber-textarea flex-1 min-h-[500px]"
          value={value}
          onChange={handleChange}
          placeholder="请输入漫剧剧本内容..."
        />
        {/* 使用说明 */}
        <div className="mt-4 text-xs text-cyan-400/70">
          <p className="mb-2">使用说明：</p>
          <ul className="list-none space-y-1">
            <li>● AI可识别多种剧本格式</li>
            <li>● 建议包含角色名称、对话内容、场景描述</li>
            <li>● 动作和表情描述有助于生成更准确的分镜图</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
```

**验证逻辑**:
```javascript
const handleChange = (e) => {
  const newValue = e.target.value;
  const words = newValue.trim().split(/\s+/).filter(word => word.length > 0);
  setWordCount(words.length);

  // 格式验证
  const minLength = newValue.length > 20;
  const hasContent = newValue.trim().length > 0;

  let valid = true;
  let message = '';

  if (!hasContent) {
    valid = false;
    message = '请输入剧本内容';
  } else if (!minLength) {
    valid = false;
    message = '剧本内容过短，建议至少20个字符';
  } else {
    valid = true;
    message = '剧本内容已输入，可以进行AI分析';
  }

  setIsValid(valid);
  setValidationMessage(message);
  onChange(newValue);
  onValidate?.(valid, message);
};
```

### 2. ControlPanel 组件 (控制面板)

**文件位置**: `components/ControlPanel.jsx`

**功能概述**:
- 分镜参数配置 (数量、画风、类型等)
- 三个主要操作按钮 (智能分析、生成第一张图、生成所有分镜)
- 实时状态显示和停止控制

**组件结构**:
```jsx
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
  // 配置状态
  const [frameCount, setFrameCount] = useState(5);
  const [style, setStyle] = useState('default');
  const [genre, setGenre] = useState('general');

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="cyber-card-header">
        <h2 className="text-lg font-semibold text-purple-300">控制中心</h2>
      </div>

      {/* 配置区域 */}
      <div className="cyber-card-body flex-1 space-y-6">
        {/* 关键帧数量滑块 */}
        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-3">
            剧场数量: <span className="text-purple-400 font-bold">{frameCount}</span>
          </label>
          <input
            type="range"
            min="3"
            max="12"
            value={frameCount}
            onChange={(e) => setFrameCount(parseInt(e.target.value))}
            className="cyber-slider w-full"
          />
        </div>

        {/* 画风选择下拉框 */}
        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-3">画风风格</label>
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="cyber-select">
            <option value="default">默认风格</option>
            <option value="anime">日漫风格</option>
            <option value="manga">国漫风格</option>
            <option value="korean">韩漫风格</option>
            <option value="3d">3D风格</option>
            <option value="realistic">写实风格</option>
          </select>
        </div>

        {/* 漫剧类型选择 */}
        <div>
          <label className="block text-sm font-medium text-cyan-300 mb-3">漫剧类型</label>
          <select value={genre} onChange={(e) => setGenre(e.target.value)} className="cyber-select">
            <option value="general">通用</option>
            <option value="xuanhuan">玄幻修仙</option>
            <option value="urban">都市逆袭/战神</option>
            <option value="system">系统流/穿越</option>
            <option value="apocalypse">末日/规则怪谈</option>
            <option value="romance">霸总甜宠</option>
          </select>
        </div>

        {/* AI分析按钮 */}
        <div className="pt-4 border-t border-cyan-500/30">
          {isAnalyzing ? (
            <button onClick={onStopAnalysis} className="cyber-button cyber-button-warning w-full">
              <span>⏹️</span> 停止分析
            </button>
          ) : (
            <button onClick={() => handleAnalyze()} className="cyber-button cyber-button-primary w-full">
              <span>🧠</span> AI智能分析
            </button>
          )}
        </div>

        {/* 生成按钮区域 */}
        <div className="space-y-3">
          {/* 生成第一张图按钮 */}
          {isGeneratingFirst ? (
            <button onClick={onStopFirstFrame} className="cyber-button cyber-button-warning w-full">
              <span>⏹️</span> 停止生成
            </button>
          ) : (
            <button
              onClick={() => handleGenerateFirst()}
              disabled={!analysisResult}
              className="cyber-button cyber-button-success w-full"
            >
              <span>🎬</span> 生成第一张图
            </button>
          )}

          {/* 生成所有分镜按钮 */}
          {isGeneratingAll ? (
            <button onClick={onStopAllFrames} className="cyber-button cyber-button-warning w-full">
              <span>⏹️</span> 停止生成
            </button>
          ) : (
            <button
              onClick={() => handleGenerateAll()}
              disabled={!analysisResult}
              className="cyber-button cyber-button-danger w-full"
            >
              <span>🚀</span> 生成所有分镜
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

**配置选项定义**:
```javascript
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
```

### 3. StoryboardDisplay 组件 (分镜显示)

**文件位置**: `components/StoryboardDisplay.jsx`

**功能概述**:
- 网格化显示生成的分镜图片
- 支持单张图片重新生成
- 提供下载功能 (单张/全部)
- 显示生成状态和错误信息

**组件结构**:
```jsx
const StoryboardDisplay = ({
  frames,
  onRegenerateFrame,
  onDownloadFrame,
  onDownloadAll,
  isGenerating
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* 头部 - 标题和操作 */}
      <div className="cyber-card-header">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-green-300">分镜预览</h2>
          {frames.length > 0 && (
            <button onClick={onDownloadAll} className="cyber-button-sm">
              <span>📥</span> 下载全部
            </button>
          )}
        </div>
        {/* 统计信息 */}
        <div className="mt-3 flex gap-4 text-sm">
          <span>总计: {frames.length}</span>
          <span>已生成: {frames.filter(f => f.imageUrl).length}</span>
          <span>生成中: {frames.filter(f => f.isGenerating).length}</span>
        </div>
      </div>

      {/* 主体 - 分镜网格 */}
      <div className="cyber-card-body flex-1">
        {frames.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-cyan-400/60">
              <div className="text-6xl mb-4">🎬</div>
              <p>请先进行AI智能分析</p>
              <p className="text-sm mt-2">分析完成后，分镜图将显示在这里</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 auto-rows-max">
            {frames.map((frame, index) => (
              <StoryboardFrame
                key={frame.id}
                frame={frame}
                index={index}
                onRegenerate={onRegenerateFrame}
                onDownload={onDownloadFrame}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

**单个分镜帧组件**:
```jsx
const StoryboardFrame = ({ frame, index, onRegenerate, onDownload }) => {
  return (
    <div className="relative bg-gray-900/50 rounded-lg border border-cyan-500/30 overflow-hidden">
      {/* 分镜序号和类型 */}
      <div className="absolute top-2 left-2 z-10">
        <div className="cyber-badge">
          {frame.sequence}. {frame.frameType || '分镜'}
        </div>
      </div>

      {/* 图片区域 */}
      <div className="aspect-video bg-gray-800 flex items-center justify-center">
        {frame.isGenerating ? (
          <div className="text-center">
            <div className="cyber-spinner mb-2"></div>
            <div className="text-xs text-cyan-400">生成中...</div>
          </div>
        ) : frame.imageUrl ? (
          <img
            src={frame.imageUrl}
            alt={`分镜 ${frame.sequence}`}
            className="w-full h-full object-cover"
          />
        ) : frame.error ? (
          <div className="text-center text-red-400">
            <div className="text-2xl mb-2">❌</div>
            <div className="text-xs">{frame.error}</div>
          </div>
        ) : (
          <div className="text-center text-cyan-400/60">
            <div className="text-2xl mb-2">🖼️</div>
            <div className="text-xs">等待生成</div>
          </div>
        )}
      </div>

      {/* 描述区域 */}
      <div className="p-3">
        <div className="text-xs text-cyan-300 mb-2">
          {frame.chineseDescription || frame.displayDescription}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={() => onRegenerate(frame.id)}
            disabled={frame.isGenerating}
            className="cyber-button-xs flex-1"
          >
            🔄 重新生成
          </button>
          {frame.imageUrl && (
            <button
              onClick={() => onDownload(frame)}
              className="cyber-button-xs"
            >
              📥
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

### 4. ProgressBar 组件 (进度条)

**文件位置**: `components/ProgressBar.js`

**功能概述**:
- 支持多种进度条变体 (primary、success、warning、danger)
- 动画效果和视觉反馈
- 可配置大小和样式

**组件结构**:
```jsx
const ProgressBar = ({
  progress,
  isVisible,
  title,
  subtitle,
  variant = 'primary',
  size = 'medium',
  animated = true
}) => {
  if (!isVisible) return null;

  const variantClasses = {
    primary: 'from-blue-500 to-cyan-500',
    success: 'from-green-500 to-emerald-500',
    warning: 'from-yellow-500 to-orange-500',
    danger: 'from-red-500 to-pink-500'
  };

  const sizeClasses = {
    small: 'h-2',
    medium: 'h-3',
    large: 'h-4'
  };

  return (
    <div className="fixed inset-x-0 top-32 z-50 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900/95 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4">
          {/* 标题和副标题 */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-cyan-300">{title}</h3>
              {subtitle && (
                <p className="text-xs text-cyan-400/70 mt-1">{subtitle}</p>
              )}
            </div>
            <div className="text-sm font-mono text-cyan-300">
              {Math.round(progress)}%
            </div>
          </div>

          {/* 进度条 */}
          <div className="relative">
            <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${sizeClasses[size]}`}>
              <div
                className={`h-full bg-gradient-to-r ${variantClasses[variant]} transition-all duration-300 ease-out ${animated ? 'animate-pulse' : ''}`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>

            {/* 动画光效 (可选) */}
            {animated && progress > 0 && progress < 100 && (
              <div
                className="absolute top-0 h-full w-2 bg-white/30 rounded-full animate-slide-right"
                style={{ left: `${Math.min(98, Math.max(0, progress - 2))}%` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
```

## 状态管理机制

### 主页面状态结构

```javascript
// 主要状态定义
const [script, setScript] = useState('');                    // 剧本内容
const [scriptValid, setScriptValid] = useState(false);      // 剧本验证状态
const [analysisResult, setAnalysisResult] = useState(null); // AI分析结果
const [firstFrameData, setFirstFrameData] = useState(null); // 第一张图数据
const [frames, setFrames] = useState([]);                   // 分镜帧数组
const [currentConfig, setCurrentConfig] = useState(null);   // 当前配置

// 操作状态
const [isAnalyzing, setIsAnalyzing] = useState(false);           // 分析中
const [isGeneratingFirst, setIsGeneratingFirst] = useState(false); // 生成第一张图中
const [isGeneratingAll, setIsGeneratingAll] = useState(false);     // 批量生成中

// 停止控制器
const [analysisController, setAnalysisController] = useState(null);
const [firstFrameController, setFirstFrameController] = useState(null);
const [allFramesController, setAllFramesController] = useState(null);

// 进度状态
const [analysisProgress, setAnalysisProgress] = useState(0);
const [firstFrameProgress, setFirstFrameProgress] = useState(0);
const [batchProgress, setBatchProgress] = useState(0);
const [progressVisible, setProgressVisible] = useState({
  analysis: false,
  firstFrame: false,
  batch: false
});
```

### 分镜帧数据结构

```javascript
const frameStructure = {
  sequence: 1,                          // 序号
  sceneIndex: 1,                       // 场景索引
  frameType: '开始帧',                  // 帧类型
  id: 'frame_1',                       // 唯一ID
  chineseDescription: '张三站在山顶',   // 中文描述
  jimengPrompt: 'Masterpiece, anime style, young man...', // 即梦提示词
  displayDescription: '张三站在山顶',   // 显示描述
  prompt: 'Masterpiece, anime style...', // 通用提示词
  imageUrl: null,                      // 图片URL
  isGenerating: false,                 // 是否生成中
  error: null                          // 错误信息
};
```

### 状态更新模式

**不可变更新**:
```javascript
// 更新单个帧的状态
setFrames(prevFrames =>
  prevFrames.map(frame =>
    frame.id === frameId
      ? { ...frame, isGenerating: true, error: null }
      : frame
  )
);

// 批量标记为生成中
setFrames(prevFrames =>
  prevFrames.map(frame =>
    !frame.imageUrl ? { ...frame, isGenerating: true } : frame
  )
);

// 更新生成结果
setFrames(prevFrames =>
  prevFrames.map((frame) => {
    const generatedFrame = results.find(f => f.sequence === frame.sequence);
    return generatedFrame
      ? { ...frame, imageUrl: generatedFrame.imageUrl, isGenerating: false }
      : { ...frame, isGenerating: false };
  })
);
```

## Tailwind CSS样式系统

### 自定义CSS类定义

```css
/* globals.css */

/* 未来科技风主题色彩 */
:root {
  --color-cyan-primary: #00bcd4;
  --color-purple-primary: #9c27b0;
  --color-neon-blue: #00e6ff;
  --color-neon-purple: #bf00ff;
}

/* 霓虹灯文字效果 */
.neon-text {
  text-shadow:
    0 0 5px currentColor,
    0 0 10px currentColor,
    0 0 15px currentColor,
    0 0 20px currentColor;
}

.neon-blue {
  color: var(--color-neon-blue);
  text-shadow:
    0 0 5px var(--color-neon-blue),
    0 0 10px var(--color-neon-blue),
    0 0 15px var(--color-neon-blue);
}

.neon-purple {
  color: var(--color-neon-purple);
  text-shadow:
    0 0 5px var(--color-neon-purple),
    0 0 10px var(--color-neon-purple);
}

/* 赛博朋克面板样式 */
.cyber-panel {
  @apply bg-gradient-to-br from-gray-900/90 to-gray-800/90
         backdrop-blur-md border border-cyan-500/30
         rounded-lg shadow-2xl relative overflow-hidden;
}

.cyber-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, #00bcd4, transparent);
  animation: scan 2s linear infinite;
}

/* 赛博朋克卡片 */
.cyber-card-header {
  @apply p-4 border-b border-cyan-500/20 bg-gray-800/30;
}

.cyber-card-body {
  @apply p-4;
}

/* 赛博朋克输入框 */
.cyber-textarea {
  @apply w-full bg-gray-800/50 border border-cyan-500/30
         rounded-md p-4 text-cyan-100 placeholder-cyan-400/50
         focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50
         transition-all duration-200 resize-none;
}

.cyber-select {
  @apply w-full bg-gray-800/70 border border-cyan-500/30
         rounded text-cyan-100 p-2
         focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50
         transition-all duration-200;
}

.cyber-slider {
  @apply w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer;
}

.cyber-slider::-webkit-slider-thumb {
  @apply appearance-none w-4 h-4 bg-cyan-400 rounded-full
         shadow-lg shadow-cyan-400/50;
}

/* 赛博朋克按钮 */
.cyber-button {
  @apply px-4 py-2 rounded-lg font-semibold text-sm
         transition-all duration-200 transform
         hover:scale-105 active:scale-95
         disabled:opacity-50 disabled:cursor-not-allowed
         disabled:hover:scale-100;
}

.cyber-button-primary {
  @apply cyber-button bg-gradient-to-r from-blue-600 to-cyan-600
         text-white hover:from-blue-700 hover:to-cyan-700
         shadow-lg shadow-blue-500/25;
}

.cyber-button-success {
  @apply cyber-button bg-gradient-to-r from-green-600 to-emerald-600
         text-white hover:from-green-700 hover:to-emerald-700
         shadow-lg shadow-green-500/25;
}

.cyber-button-warning {
  @apply cyber-button bg-gradient-to-r from-yellow-600 to-orange-600
         text-white hover:from-yellow-700 hover:to-orange-700
         shadow-lg shadow-yellow-500/25;
}

.cyber-button-danger {
  @apply cyber-button bg-gradient-to-r from-red-600 to-pink-600
         text-white hover:from-red-700 hover:to-pink-700
         shadow-lg shadow-red-500/25;
}

/* 小尺寸按钮 */
.cyber-button-sm {
  @apply cyber-button-primary text-xs px-3 py-1;
}

.cyber-button-xs {
  @apply cyber-button-primary text-xs px-2 py-1;
}

/* 状态指示器 */
.status-indicator {
  @apply w-2 h-2 rounded-full animate-pulse;
}

.status-success {
  @apply bg-green-400 shadow-lg shadow-green-400/50;
}

.status-warning {
  @apply bg-yellow-400 shadow-lg shadow-yellow-400/50;
}

.status-info {
  @apply bg-cyan-400 shadow-lg shadow-cyan-400/50;
}

.status-error {
  @apply bg-red-400 shadow-lg shadow-red-400/50;
}

/* 徽章样式 */
.cyber-badge {
  @apply px-2 py-1 bg-cyan-500/20 border border-cyan-500/50
         rounded text-xs text-cyan-300 font-mono backdrop-blur-sm;
}

/* 滚动条样式 */
.cyber-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.cyber-scrollbar::-webkit-scrollbar-track {
  @apply bg-gray-800/50;
}

.cyber-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-cyan-500/50 rounded-full;
}

.cyber-scrollbar::-webkit-scrollbar-thumb:hover {
  @apply bg-cyan-500/70;
}

/* 加载动画 */
.cyber-spinner {
  @apply w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400
         rounded-full animate-spin;
}

/* 淡入动画 */
.fade-in-up {
  animation: fadeInUp 0.6s ease-out;
}

.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scan {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

@keyframes slideRight {
  0% { transform: translateX(0); }
  100% { transform: translateX(50px); }
}

.animate-slide-right {
  animation: slideRight 2s ease-in-out infinite;
}
```

### Tailwind配置

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'orbitron': ['Orbitron', 'monospace'],
        'rajdhani': ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          from: { boxShadow: '0 0 5px #00bcd4' },
          to: { boxShadow: '0 0 20px #00bcd4, 0 0 30px #00bcd4' }
        }
      },
      colors: {
        cyber: {
          blue: '#00e6ff',
          purple: '#bf00ff',
          cyan: '#00bcd4',
        }
      }
    },
  },
  plugins: [],
}
```

## 用户交互流程

### 完整操作流程

```
1. 用户输入剧本
   ├─ 实时字数统计
   ├─ 格式验证
   └─ 状态反馈

2. 配置生成参数
   ├─ 选择分镜数量 (3-12)
   ├─ 选择画风类型
   ├─ 选择漫剧题材
   └─ 其他高级设置

3. 执行AI智能分析
   ├─ 显示进度条 (4步工作流)
   ├─ 支持用户停止操作
   ├─ 实时日志输出
   └─ 返回分镜帧结构

4. 生成第一张图 (可选)
   ├─ 选择第一帧进行生成
   ├─ 显示生成进度
   ├─ 预览效果
   └─ 确认风格

5. 批量生成所有分镜
   ├─ 串行生成每张图片
   ├─ 实时更新状态
   ├─ 显示成功/失败统计
   └─ 支持重新生成失败项

6. 结果操作
   ├─ 预览所有分镜
   ├─ 下载单张图片
   ├─ 批量下载
   └─ 重新生成指定图片
```

### 错误处理和用户反馈

**用户友好的错误提示**:
```javascript
// 根据错误类型显示不同的用户提示
const getErrorMessage = (error) => {
  if (error.name === 'AbortError') {
    return '操作已取消';
  } else if (error.message.includes('timeout')) {
    return 'AI生成需要较长时间，请稍后重试';
  } else if (error.message.includes('ECONNREFUSED')) {
    return '后端服务未启动，请检查服务状态';
  } else if (error.status === 429) {
    return 'API请求过于频繁，请稍后重试';
  } else {
    return `操作失败: ${error.message}`;
  }
};

// 在UI中显示错误
const showError = (error) => {
  const message = getErrorMessage(error);

  // 可以使用toast提示或模态框
  alert(message);

  // 或者在组件中显示错误状态
  setErrorMessage(message);
  setErrorVisible(true);
};
```

**加载状态指示**:
```jsx
// 各种加载状态的视觉反馈
const LoadingStates = {
  // 分析中
  analyzing: (
    <div className="flex items-center gap-2 text-blue-400">
      <div className="cyber-spinner"></div>
      <span>AI正在分析剧本...</span>
    </div>
  ),

  // 生成中
  generating: (
    <div className="flex items-center gap-2 text-green-400">
      <div className="cyber-spinner"></div>
      <span>正在生成图片...</span>
    </div>
  ),

  // 上传中
  uploading: (
    <div className="flex items-center gap-2 text-purple-400">
      <div className="cyber-spinner"></div>
      <span>正在处理...</span>
    </div>
  )
};
```

---

**文档版本**: v1.0.0
**最后更新**: 2025-12-24
**维护者**: ScriptToFrame Team