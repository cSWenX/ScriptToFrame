import { useProject } from '../contexts/ProjectContext';
import { STYLE_LIST } from '../config/styles';

/**
 * 指挥塔组件 (Phase Controller)
 * 中栏 15% 宽度
 * 结构: 全局设置 → 阶段1剧本确认 → 阶段2角色定妆 → 阶段3图片生成 → 阶段4音频合成
 */
const PhaseController = ({
  onAnalyzeStory,
  onGenerateAllCharacters,
  onLockAllCharacters,
  onGenerateAllPages,
  onGenerateAllAudio,
  isAnalyzing,
  isGeneratingCharacters,
  isGeneratingPages,
  isGeneratingAudio
}) => {
  const { state, actions } = useProject();
  const { project } = state;
  const { phaseStatus, currentPhase, style_preset, settings, assets, pages, rawStory } = project;

  // 计算各阶段的完成条件
  const canStartAnalysis = rawStory && rawStory.trim().length >= 50;
  const isPhase1Complete = phaseStatus[1] === 'completed';
  // 有图片的角色（包括生成的和手动上传的）
  const charactersWithImage = assets.filter(a => a.image_url);
  // 所有有图片的角色都已锁定
  const allCharactersWithImageLocked = charactersWithImage.length > 0 && charactersWithImage.every(a => a.locked);
  // 是否可以进入下一阶段：至少有一个角色已锁定
  const canProceedToPhase3 = assets.some(a => a.locked);
  const allCharactersGenerated = assets.length > 0 && assets.every(a => a.image_url);
  const allCharactersLocked = assets.length > 0 && assets.every(a => a.locked);
  const isPhase2Complete = phaseStatus[2] === 'completed' || allCharactersWithImageLocked;
  const allPagesGenerated = pages.length > 0 && pages.every(p => p.image_url);
  const isPhase3Complete = phaseStatus[3] === 'completed';

  // 阶段配置
  const phases = [
    {
      id: 1,
      icon: '📜',
      title: '剧本确认',
      subtitle: 'Script Analysis',
      description: 'AI分析故事，生成分镜脚本',
      action: {
        label: isAnalyzing ? '分析中...' : '开始AI分析',
        icon: isAnalyzing ? '🔄' : '🧠',
        disabled: !canStartAnalysis || isAnalyzing,
        onClick: onAnalyzeStory
      },
      status: phaseStatus[1],
      locked: false,
      targetTab: 'script'
    },
    {
      id: 2,
      icon: '🎭',
      title: '角色定妆',
      subtitle: 'Character Setup',
      description: '生成角色三视图并锁定',
      action: allCharactersWithImageLocked ? {
        label: '进入图片生成 →',
        icon: '✅',
        disabled: false,
        onClick: () => {
          actions.updatePhaseStatus(2, 'completed');
          actions.setPhase(3);
          actions.setRightTab('storyboard');
        },
        color: 'green'
      } : charactersWithImage.length > 0 && !allCharactersWithImageLocked ? {
        label: '锁定已有角色',
        icon: '🔒',
        disabled: false,
        onClick: onLockAllCharacters,
        color: 'green'
      } : {
        label: isGeneratingCharacters ? '生成中...' : '生成全部角色',
        icon: isGeneratingCharacters ? '🔄' : '🎨',
        disabled: assets.length === 0 || isGeneratingCharacters,
        onClick: onGenerateAllCharacters
      },
      status: phaseStatus[2],
      locked: !isPhase1Complete,
      targetTab: 'assets',
      badge: assets.length > 0 ? `${assets.filter(a => a.locked).length}/${assets.length}` : null
    },
    {
      id: 3,
      icon: '🖼️',
      title: '图片生成',
      subtitle: 'Image Generation',
      description: '生成绘本每页插图',
      action: {
        label: isGeneratingPages ? '生成中...' : '生成全部页面',
        icon: isGeneratingPages ? '🔄' : '🚀',
        disabled: !isPhase2Complete || isGeneratingPages || pages.length === 0,
        onClick: onGenerateAllPages
      },
      status: phaseStatus[3],
      locked: !isPhase2Complete,
      targetTab: 'storyboard',
      badge: pages.length > 0 ? `${pages.filter(p => p.image_url).length}/${pages.length}` : null,
      // 额外设置：语言气泡
      extraSettings: {
        enableSpeechBubble: settings.enableSpeechBubble,
        bubbleLanguage: settings.bubbleLanguage,
        onToggleSpeechBubble: (enabled) => {
          actions.updateSettings({ enableSpeechBubble: enabled });
          // 如果关闭气泡，重置语言
          if (!enabled) {
            actions.updateSettings({ bubbleLanguage: 'zh' });
          }
        },
        onLanguageChange: (lang) => {
          actions.updateSettings({ bubbleLanguage: lang });
          // 同步更新音频语言（作为默认值）
          actions.updateSettings({ audioLanguage: lang });
        }
      }
    },
    {
      id: 4,
      icon: '🔊',
      title: '音频合成',
      subtitle: 'Audio Dubbing',
      description: '为每页生成配音',
      action: {
        label: isGeneratingAudio ? '合成中...' : '生成全部音频',
        icon: isGeneratingAudio ? '🔄' : '🎤',
        disabled: !isPhase3Complete || isGeneratingAudio,
        onClick: onGenerateAllAudio
      },
      status: phaseStatus[4],
      locked: !isPhase3Complete,
      targetTab: 'flipbook',
      // 音频语言设置
      audioSettings: {
        audioLanguage: settings.audioLanguage,
        bubbleLanguage: settings.bubbleLanguage, // 用于显示默认值来源
        enableSpeechBubble: settings.enableSpeechBubble,
        onLanguageChange: (lang) => actions.updateSettings({ audioLanguage: lang })
      }
    }
  ];

  const handlePhaseClick = (phase) => {
    if (phase.locked) return;
    actions.setPhase(phase.id);
    if (phase.targetTab) {
      if (phase.id === 1) {
        actions.setLeftTab(phase.targetTab);
      } else {
        actions.setRightTab(phase.targetTab);
      }
    }
  };

  // 解锁阶段处理
  const handleUnlockPhase = (phaseId) => {
    if (confirm(`确定要解锁"${phases.find(p => p.id === phaseId)?.title}"吗？\n\n解锁后，该阶段及之后的阶段都需要重新操作。`)) {
      actions.unlockPhase(phaseId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="p-3 border-b-2 border-yellow-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <h2
          className="text-base font-bold text-purple-600 flex items-center gap-2"
          style={{ fontFamily: "'Fredoka', sans-serif" }}
        >
          <span>🎯</span>
          指挥塔
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">按顺序完成每个步骤</p>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto storybook-scrollbar p-3 space-y-3">
        {/* 全局设置 */}
        <GlobalSettings
          style_preset={style_preset}
          settings={settings}
          onStyleChange={(style) => actions.setStylePreset(style)}
          onSettingsChange={(key, value) => actions.updateSettings({ [key]: value })}
          disabled={isPhase1Complete}
        />

        {/* 阶段列表 */}
        {phases.map((phase, index) => (
          <div key={phase.id}>
            <PhaseCard
              phase={phase}
              isActive={currentPhase === phase.id}
              onClick={() => handlePhaseClick(phase)}
              onUnlock={handleUnlockPhase}
            />
            {/* 连接线 */}
            {index < phases.length - 1 && (
              <div className="flex justify-center py-1">
                <div className={`
                  w-0.5 h-3 rounded-full
                  ${phase.status === 'completed' ? 'bg-green-400' : 'bg-gray-200'}
                `} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 全局设置组件
 */
const GlobalSettings = ({ style_preset, settings, onStyleChange, onSettingsChange, disabled }) => {
  return (
    <div className={`bg-white rounded-xl border-2 border-purple-200 overflow-hidden ${disabled ? 'opacity-70' : ''}`}>
      <div className="px-3 py-2 bg-gradient-to-r from-purple-100 to-blue-100 border-b border-purple-200">
        <h3
          className="text-sm font-bold text-purple-600 flex items-center gap-1"
          style={{ fontFamily: "'Fredoka', sans-serif" }}
        >
          <span>🎨</span>
          全局设置
          {disabled && <span className="text-xs text-gray-400 ml-1">(已锁定)</span>}
        </h3>
      </div>

      <div className="p-3 space-y-3">
        {/* 风格选择 */}
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1.5 block">
            绘本风格 <span className="text-gray-400 font-normal">({STYLE_LIST.length}种)</span>
          </label>
          <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto storybook-scrollbar pr-1">
            {STYLE_LIST.map((style) => (
              <button
                key={style.id}
                onClick={() => !disabled && onStyleChange(style.id)}
                disabled={disabled}
                className={`
                  p-1.5 rounded-lg text-left transition-all duration-200
                  ${style_preset === style.id
                    ? 'bg-purple-100 border-2 border-purple-400'
                    : 'bg-gray-50 border-2 border-transparent hover:border-purple-200'
                  }
                  ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
                title={`${style.description}\n适合：${style.suitable}`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-sm">{style.icon}</span>
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {style.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 画幅和分辨率 */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-600 mb-1 block">画幅</label>
            <select
              value={settings.aspectRatio}
              onChange={(e) => !disabled && onSettingsChange('aspectRatio', e.target.value)}
              disabled={disabled}
              className="w-full text-xs p-1.5 border-2 border-gray-200 rounded-lg focus:border-purple-400 focus:outline-none"
            >
              <option value="16:9">16:9 横屏</option>
              <option value="4:3">4:3 经典</option>
              <option value="1:1">1:1 方形</option>
              <option value="3:4">3:4 竖屏</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-600 mb-1 block">分辨率</label>
            <select
              value={settings.resolution}
              onChange={(e) => !disabled && onSettingsChange('resolution', e.target.value)}
              disabled={disabled}
              className="w-full text-xs p-1.5 border-2 border-gray-200 rounded-lg focus:border-purple-400 focus:outline-none"
            >
              <option value="1k">1K</option>
              <option value="2k">2K</option>
              <option value="4k">4K</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 阶段卡片组件
 */
const PhaseCard = ({ phase, isActive, onClick, onUnlock }) => {
  const getStatusStyle = () => {
    if (phase.locked) {
      return {
        bg: 'bg-gray-100',
        border: 'border-gray-200',
        text: 'text-gray-400',
        statusIcon: '🔒'
      };
    }
    switch (phase.status) {
      case 'completed':
        return {
          bg: 'bg-green-50',
          border: 'border-green-300',
          text: 'text-green-600',
          statusIcon: '✅'
        };
      case 'in_progress':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          text: 'text-yellow-600',
          statusIcon: '🔄'
        };
      default:
        return {
          bg: 'bg-white',
          border: isActive ? 'border-orange-400' : 'border-yellow-200',
          text: 'text-gray-600',
          statusIcon: null
        };
    }
  };

  const style = getStatusStyle();

  return (
    <div
      onClick={onClick}
      className={`
        rounded-xl border-2 overflow-hidden transition-all duration-200
        ${style.bg} ${style.border}
        ${phase.locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-md'}
        ${isActive && !phase.locked ? 'ring-2 ring-orange-200' : ''}
      `}
    >
      {/* 阶段头部 */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-lg ${phase.locked ? 'grayscale' : ''}`}>{phase.icon}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <h4
                className={`text-sm font-bold ${phase.locked ? 'text-gray-400' : style.text}`}
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                {phase.title}
              </h4>
              {phase.badge && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  phase.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  {phase.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">{phase.description}</p>
          </div>
        </div>

        {/* 状态图标或解锁按钮 */}
        <div className="flex items-center gap-1">
          {phase.status === 'completed' && onUnlock && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnlock(phase.id);
              }}
              className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
              title="解锁此步骤重新操作"
            >
              🔓 解锁
            </button>
          )}
          {style.statusIcon && !onUnlock && (
            <span className="text-base">{style.statusIcon}</span>
          )}
          {style.statusIcon && onUnlock && phase.status !== 'completed' && (
            <span className="text-base">{style.statusIcon}</span>
          )}
        </div>
      </div>

      {/* 额外设置：语言气泡（阶段3专用） */}
      {phase.extraSettings && !phase.locked && (
        <div className="px-3 pb-2" onClick={(e) => e.stopPropagation()}>
          <div className="bg-blue-50 rounded-lg p-2 space-y-2">
            {/* 语言气泡开关 */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-600 flex items-center gap-1">
                <span>💬</span>
                语言气泡
              </label>
              <button
                onClick={() => phase.extraSettings.onToggleSpeechBubble(!phase.extraSettings.enableSpeechBubble)}
                className={`
                  relative w-10 h-5 rounded-full transition-colors duration-200
                  ${phase.extraSettings.enableSpeechBubble ? 'bg-blue-500' : 'bg-gray-300'}
                `}
              >
                <span
                  className={`
                    absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
                    ${phase.extraSettings.enableSpeechBubble ? 'translate-x-5' : 'translate-x-0.5'}
                  `}
                />
              </button>
            </div>

            {/* 语言选择 */}
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold flex items-center gap-1 ${
                phase.extraSettings.enableSpeechBubble ? 'text-blue-600' : 'text-gray-400'
              }`}>
                <span>🌍</span>
                气泡语言
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => phase.extraSettings.onLanguageChange('zh')}
                  disabled={!phase.extraSettings.enableSpeechBubble}
                  className={`
                    px-2 py-1 rounded text-xs font-bold transition-colors
                    ${!phase.extraSettings.enableSpeechBubble
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : phase.extraSettings.bubbleLanguage === 'zh'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }
                  `}
                >
                  中文
                </button>
                <button
                  onClick={() => phase.extraSettings.onLanguageChange('en')}
                  disabled={!phase.extraSettings.enableSpeechBubble}
                  className={`
                    px-2 py-1 rounded text-xs font-bold transition-colors
                    ${!phase.extraSettings.enableSpeechBubble
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : phase.extraSettings.bubbleLanguage === 'en'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }
                  `}
                >
                  English
                </button>
              </div>
            </div>

            {/* 提示信息 */}
            <p className="text-xs text-blue-500">
              {phase.extraSettings.enableSpeechBubble
                ? `✅ 图片将包含${phase.extraSettings.bubbleLanguage === 'zh' ? '中文' : '英文'}对话气泡`
                : '关闭后图片不包含对话气泡'
              }
            </p>
          </div>
        </div>
      )}

      {/* 音频语言设置（阶段4专用） */}
      {phase.audioSettings && !phase.locked && (
        <div className="px-3 pb-2" onClick={(e) => e.stopPropagation()}>
          <div className="bg-purple-50 rounded-lg p-2 space-y-2">
            {/* 音频语言选择 */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-purple-600 flex items-center gap-1">
                <span>🎙️</span>
                配音语言
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => phase.audioSettings.onLanguageChange('zh')}
                  className={`
                    px-2 py-1 rounded text-xs font-bold transition-colors
                    ${phase.audioSettings.audioLanguage === 'zh'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }
                  `}
                >
                  中文
                </button>
                <button
                  onClick={() => phase.audioSettings.onLanguageChange('en')}
                  className={`
                    px-2 py-1 rounded text-xs font-bold transition-colors
                    ${phase.audioSettings.audioLanguage === 'en'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }
                  `}
                >
                  English
                </button>
              </div>
            </div>

            {/* 提示信息 */}
            <p className="text-xs text-purple-500">
              {phase.audioSettings.audioLanguage === 'zh'
                ? '✅ 将生成中文配音'
                : '✅ 将翻译为英文后生成配音'
              }
              {phase.audioSettings.enableSpeechBubble && phase.audioSettings.bubbleLanguage !== phase.audioSettings.audioLanguage && (
                <span className="text-orange-500 ml-1">
                  ⚠️ 与气泡语言不一致
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {phase.action && !phase.locked && phase.status !== 'completed' && (
        <div className="px-3 pb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              phase.action.onClick?.();
            }}
            disabled={phase.action.disabled}
            className={`
              w-full py-2 px-3 rounded-lg text-xs font-bold
              flex items-center justify-center gap-1.5
              transition-all duration-200
              ${phase.action.disabled
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : phase.action.color === 'green'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }
            `}
          >
            <span>{phase.action.icon}</span>
            <span>{phase.action.label}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default PhaseController;
