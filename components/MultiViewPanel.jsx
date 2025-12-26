import { useProject } from '../contexts/ProjectContext';
import AssetLab from './AssetLab';
import Storyboard from './Storyboard';
import Flipbook from './Flipbook';

/**
 * 多功能视窗组件 (Multi-View Panel)
 * 右栏 55% 宽度
 * 三个Tab视图: 角色资产库 / 绘本分镜 / 成品预览
 */
const MultiViewPanel = ({
  onGenerateCharacter,
  onGeneratePage,
  onGenerateAll,
  onInpaint,
  isGenerating,
  isGeneratingCharacters
}) => {
  const { state, actions } = useProject();
  const { project } = state;
  const { activeRightTab, pages, assets } = project;

  // Tab 配置
  const tabs = [
    {
      id: 'assets',
      icon: '🎭',
      label: '角色资产库',
      shortLabel: 'Assets',
      badge: assets.length > 0 ? assets.length : null,
      badgeColor: assets.every(a => a.locked) ? 'bg-green-500' : 'bg-orange-500'
    },
    {
      id: 'storyboard',
      icon: '🖼️',
      label: '绘本分镜',
      shortLabel: 'Storyboard',
      badge: pages.filter(p => p.image_url).length > 0
        ? `${pages.filter(p => p.image_url).length}/${pages.length}`
        : null,
      badgeColor: pages.every(p => p.image_url) ? 'bg-green-500' : 'bg-blue-500'
    },
    {
      id: 'flipbook',
      icon: '📖',
      label: '成品预览',
      shortLabel: 'Flipbook',
      badge: pages.filter(p => p.image_url).length === pages.length && pages.length > 0
        ? '✓'
        : null,
      badgeColor: 'bg-green-500'
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tab 切换器 */}
      <div className="flex border-b-3 border-yellow-200 bg-gradient-to-r from-orange-50 to-yellow-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => actions.setRightTab(tab.id)}
            className={`
              flex-1 py-3 px-2 text-sm font-bold
              transition-all duration-200
              flex items-center justify-center gap-1.5
              relative
              ${activeRightTab === tab.id
                ? 'bg-white text-orange-600 border-b-4 border-orange-400 -mb-[3px]'
                : 'text-gray-500 hover:text-orange-500 hover:bg-yellow-50'
              }
            `}
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="hidden lg:inline">{tab.label}</span>
            <span className="lg:hidden">{tab.shortLabel}</span>

            {/* Badge */}
            {tab.badge && (
              <span className={`
                ml-1 px-1.5 py-0.5 text-xs font-bold text-white rounded-full
                ${tab.badgeColor}
              `}>
                {tab.badge}
              </span>
            )}

            {/* 活动指示器动画 */}
            {activeRightTab === tab.id && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-orange-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-hidden">
        {activeRightTab === 'assets' && (
          <AssetLab
            onGenerateCharacter={onGenerateCharacter}
            isGeneratingCharacters={isGeneratingCharacters}
          />
        )}

        {activeRightTab === 'storyboard' && (
          <Storyboard
            onGeneratePage={onGeneratePage}
            onGenerateAll={onGenerateAll}
            onInpaint={onInpaint}
            isGenerating={isGenerating}
          />
        )}

        {activeRightTab === 'flipbook' && (
          <Flipbook />
        )}
      </div>
    </div>
  );
};

export default MultiViewPanel;
