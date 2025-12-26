import { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';

/**
 * 故事引擎组件 (Story Engine) v2
 * 左栏 30% 宽度
 * 双Tab: 故事原文 / AI脚本（画面+对白+提示词）
 */
const StoryEngine = () => {
  const { state, actions } = useProject();
  const { project } = state;
  const { activeLeftTab, rawStory, scriptData, pages } = project;

  const [wordCount, setWordCount] = useState(0);
  const [isValid, setIsValid] = useState(false);

  // 更新字数统计
  useEffect(() => {
    const count = rawStory.trim().length;
    setWordCount(count);
    setIsValid(count >= 50);
  }, [rawStory]);

  const handleStoryChange = (e) => {
    actions.setRawStory(e.target.value);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab 切换器 */}
      <div className="flex border-b-3 border-yellow-200 bg-gradient-to-r from-orange-50 to-yellow-50">
        <button
          onClick={() => actions.setLeftTab('input')}
          className={`
            flex-1 py-3 px-4 text-sm font-bold
            transition-all duration-200
            flex items-center justify-center gap-2
            ${activeLeftTab === 'input'
              ? 'bg-white text-orange-600 border-b-4 border-orange-400 -mb-[3px]'
              : 'text-gray-500 hover:text-orange-500 hover:bg-yellow-50'
            }
          `}
          style={{ fontFamily: "'Fredoka', sans-serif" }}
        >
          <span>📝</span>
          <span>故事原文</span>
        </button>
        <button
          onClick={() => actions.setLeftTab('script')}
          className={`
            flex-1 py-3 px-4 text-sm font-bold
            transition-all duration-200
            flex items-center justify-center gap-2
            ${activeLeftTab === 'script'
              ? 'bg-white text-orange-600 border-b-4 border-orange-400 -mb-[3px]'
              : 'text-gray-500 hover:text-orange-500 hover:bg-yellow-50'
            }
            ${pages.length === 0 ? 'opacity-50' : ''}
          `}
          style={{ fontFamily: "'Fredoka', sans-serif" }}
          disabled={pages.length === 0}
        >
          <span>📜</span>
          <span>AI脚本</span>
          {pages.length > 0 && (
            <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full">
              {pages.length}页
            </span>
          )}
        </button>
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-hidden">
        {activeLeftTab === 'input' ? (
          <StoryInputTab
            rawStory={rawStory}
            wordCount={wordCount}
            isValid={isValid}
            onChange={handleStoryChange}
          />
        ) : (
          <ScriptDisplayTab pages={pages} />
        )}
      </div>
    </div>
  );
};

/**
 * 故事输入Tab
 */
const StoryInputTab = ({ rawStory, wordCount, isValid, onChange }) => (
  <div className="h-full flex flex-col p-4">
    {/* 状态栏 */}
    <div className="flex justify-between items-center mb-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-orange-500 font-medium">
          📊 字数: <span className="text-blue-500 font-bold">{wordCount}</span>
        </span>
        <div className={`w-2 h-2 rounded-full ${isValid ? 'bg-green-500' : 'bg-amber-500'}`} />
      </div>
      <span className={`text-xs ${isValid ? 'text-green-500' : 'text-amber-500'}`}>
        {isValid ? '✅ 可以分析' : '⚠️ 至少50字'}
      </span>
    </div>

    {/* 文本输入区 */}
    <textarea
      value={rawStory}
      onChange={onChange}
      className="storybook-textarea flex-1 storybook-scrollbar resize-none"
      placeholder={`✨ 在这里粘贴或输入你的童话故事...

📖 示例故事：

从前，在一片美丽的森林里，住着一只小兔子。小兔子有一身雪白的毛发和长长的耳朵。

一天早晨，小兔子决定去探险。她穿过了开满野花的草地，跳过了潺潺的小溪，来到了一棵巨大的橡树下。

"你好！"树上传来一个声音。小兔子抬头一看，原来是一只可爱的小松鼠。

"你好呀！"小兔子开心地说，"我叫小白，你叫什么名字？"

就这样，小白和小松鼠成为了好朋友，一起在森林里度过了快乐的一天。

🌟 提示：故事越详细，生成的绘本效果越好！`}
    />

    {/* 提示信息 */}
    <div className="mt-3 p-3 bg-blue-50 rounded-xl border-2 border-blue-200">
      <p className="text-xs text-blue-600 flex items-center gap-2">
        <span>💡</span>
        输入故事后，在右侧指挥塔点击"开始AI分析"
      </p>
    </div>
  </div>
);

/**
 * AI脚本展示Tab
 */
const ScriptDisplayTab = ({ pages }) => {
  const { actions } = useProject();

  if (pages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <span className="text-6xl mb-4">📜</span>
        <p className="text-gray-500 font-medium">还没有生成AI脚本</p>
        <p className="text-gray-400 text-sm mt-2">
          请先输入故事并点击"开始AI分析"
        </p>
        <button
          onClick={() => actions.setLeftTab('input')}
          className="mt-4 candy-button candy-button-blue text-sm"
        >
          <span>📝</span>
          <span>去输入故事</span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部信息 */}
      <div className="p-3 bg-green-50 border-b border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-green-600 text-sm" style={{ fontFamily: "'Fredoka', sans-serif" }}>
              ✨ AI脚本生成完成
            </h3>
            <p className="text-xs text-green-500 mt-0.5">
              共 {pages.length} 页分镜
            </p>
          </div>
          <button
            onClick={() => actions.setLeftTab('input')}
            className="text-xs text-green-600 hover:text-green-700 underline"
          >
            查看原文
          </button>
        </div>
      </div>

      {/* 脚本列表 */}
      <div className="flex-1 overflow-y-auto storybook-scrollbar p-3 space-y-3">
        {pages.map((page, index) => (
          <ScriptPageCard
            key={page.page_index || index}
            page={page}
            pageIndex={page.page_index || index + 1}
            onUpdate={(updates) => {
              actions.updatePage({ page_index: page.page_index, ...updates });
            }}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * 脚本页面卡片组件
 */
const ScriptPageCard = ({ page, pageIndex, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    scene_description: page.scene_description || '',
    jimeng_prompt: page.jimeng_prompt || ''
  });

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-xl border-2 border-yellow-200 overflow-hidden hover:border-orange-300 transition-colors">
      {/* 页面头部 */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-yellow-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-orange-400 text-white rounded-full flex items-center justify-center text-xs font-bold">
            {pageIndex}
          </span>
          <span className="text-sm font-bold text-orange-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            第 {pageIndex} 页
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setIsExpanded(true);
              }}
              className="text-xs text-blue-500 hover:text-blue-600"
            >
              ✏️ 编辑
            </button>
          )}
          <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* 展开的内容 */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* 画面描述 */}
          <div>
            <label className="text-xs font-bold text-purple-600 flex items-center gap-1 mb-1">
              <span>🎬</span> 画面描述
            </label>
            {isEditing ? (
              <textarea
                value={editData.scene_description}
                onChange={(e) => setEditData({ ...editData, scene_description: e.target.value })}
                className="w-full p-2 text-xs border-2 border-purple-200 rounded-lg focus:border-purple-400 focus:outline-none resize-none"
                rows={3}
              />
            ) : (
              <p className="text-xs text-gray-700 bg-purple-50 p-2 rounded-lg">
                {page.scene_description || '暂无画面描述'}
              </p>
            )}
          </div>

          {/* 角色对白 */}
          <div>
            <label className="text-xs font-bold text-blue-600 flex items-center gap-1 mb-1">
              <span>💬</span> 角色对白
            </label>
            <div className="space-y-1">
              {(page.dialogues || []).map((dialogue, i) => (
                <div key={i} className="text-xs bg-blue-50 p-2 rounded-lg">
                  <span className="font-bold text-blue-700">{dialogue.role}：</span>
                  <span className="text-gray-700">{dialogue.text}</span>
                </div>
              ))}
              {(!page.dialogues || page.dialogues.length === 0) && (
                <p className="text-xs text-gray-400 bg-gray-50 p-2 rounded-lg">暂无对白</p>
              )}
            </div>
          </div>

          {/* 即梦提示词 */}
          <div>
            <label className="text-xs font-bold text-green-600 flex items-center gap-1 mb-1">
              <span>🎨</span> 即梦提示词
            </label>
            {isEditing ? (
              <textarea
                value={editData.jimeng_prompt}
                onChange={(e) => setEditData({ ...editData, jimeng_prompt: e.target.value })}
                className="w-full p-2 text-xs border-2 border-green-200 rounded-lg focus:border-green-400 focus:outline-none resize-none font-mono"
                rows={4}
              />
            ) : (
              <p className="text-xs text-gray-600 bg-green-50 p-2 rounded-lg font-mono whitespace-pre-wrap">
                {page.jimeng_prompt || '暂无提示词'}
              </p>
            )}
          </div>

          {/* 编辑模式按钮 */}
          {isEditing && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600"
              >
                ✅ 保存
              </button>
              <button
                onClick={() => {
                  setEditData({
                    scene_description: page.scene_description || '',
                    jimeng_prompt: page.jimeng_prompt || ''
                  });
                  setIsEditing(false);
                }}
                className="flex-1 py-2 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          )}
        </div>
      )}

      {/* 折叠状态的预览 */}
      {!isExpanded && (
        <div className="px-3 py-2">
          <p className="text-xs text-gray-600 line-clamp-2">
            {page.scene_description || '暂无画面描述'}
          </p>
        </div>
      )}
    </div>
  );
};

export default StoryEngine;
