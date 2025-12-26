import { useState, useRef } from 'react';
import { useProject } from '../contexts/ProjectContext';

/**
 * 资产库组件 (Asset Lab) v3
 * 功能: 资产卡片列表（角色+背景）、图片生成、提示词编辑、一致性锁定
 * 支持type字段区分角色(character)和背景(background)
 */
const AssetLab = ({ onGenerateCharacter, onGenerateAllCharacters, isGeneratingCharacters }) => {
  const { state, actions } = useProject();
  const { project } = state;
  const { assets } = project;

  const [editingId, setEditingId] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'character' | 'background'
  const fileInputRef = useRef(null);

  // 按类型过滤资产
  const filteredAssets = filterType === 'all'
    ? assets
    : assets.filter(a => a.type === filterType);

  // 统计
  const characterCount = assets.filter(a => a.type === 'character').length;
  const backgroundCount = assets.filter(a => a.type === 'background').length;
  const lockedCount = assets.filter(a => a.locked).length;

  // 处理单个角色生成
  const handleGenerateSingle = async (asset) => {
    setGeneratingId(asset.id);
    try {
      await onGenerateCharacter?.(asset);
    } finally {
      setGeneratingId(null);
    }
  };

  // 处理角色锁定
  const handleLockAsset = (assetId) => {
    actions.lockAsset(assetId);
  };

  // 处理提示词更新
  const handleUpdatePrompt = (assetId, newPrompt) => {
    actions.updateAsset({ id: assetId, prompt: newPrompt });
    setEditingId(null);
  };

  // 处理自定义上传
  const handleUpload = (assetId) => {
    fileInputRef.current?.click();
    fileInputRef.current.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          actions.updateAsset({
            id: assetId,
            image_url: event.target.result,
            custom_upload: true
          });
        };
        reader.readAsDataURL(file);
      }
    };
  };

  // 添加新资产
  const handleAddAsset = (type = 'character') => {
    const prefix = type === 'character' ? 'Char' : 'BG';
    const count = assets.filter(a => a.type === type).length + 1;
    const newAsset = {
      id: `${project.story_name || 'Story'}-${prefix}-${String(count).padStart(2, '0')}`,
      type: type,
      name: type === 'character' ? '新角色' : '新背景',
      prompt: '',
      image_url: null,
      locked: false
    };
    actions.addAsset(newAsset);
    setEditingId(newAsset.id);
  };

  // 计算状态
  const allGenerated = assets.length > 0 && assets.every(a => a.image_url);
  const allLocked = assets.length > 0 && assets.every(a => a.locked);

  return (
    <div className="h-full flex flex-col">
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
      />

      {/* 头部工具栏 */}
      <div className="p-4 border-b-2 border-yellow-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-lg font-bold text-purple-600 flex items-center gap-2"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            <span>🎨</span>
            资产库
            {assets.length > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({lockedCount}/{assets.length} 已锁定)
              </span>
            )}
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => handleAddAsset('character')}
              className="candy-button candy-button-purple text-xs py-1.5 px-2"
              title="添加角色"
            >
              <span>🎭</span>
              <span>+角色</span>
            </button>
            <button
              onClick={() => handleAddAsset('background')}
              className="candy-button candy-button-green text-xs py-1.5 px-2"
              title="添加背景"
            >
              <span>🏞️</span>
              <span>+背景</span>
            </button>
          </div>
        </div>

        {/* 类型筛选 */}
        {assets.length > 0 && (
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                filterType === 'all'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部 ({assets.length})
            </button>
            <button
              onClick={() => setFilterType('character')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                filterType === 'character'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🎭 角色 ({characterCount})
            </button>
            <button
              onClick={() => setFilterType('background')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                filterType === 'background'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🏞️ 背景 ({backgroundCount})
            </button>
          </div>
        )}

        {/* 批量操作按钮 */}
        {assets.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={onGenerateAllCharacters}
              disabled={isGeneratingCharacters || assets.length === 0 || allLocked}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-bold
                flex items-center justify-center gap-2 transition-all
                ${isGeneratingCharacters || allLocked
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
                }
              `}
            >
              <span>{isGeneratingCharacters ? '🔄' : '🎨'}</span>
              <span>{isGeneratingCharacters ? '生成中...' : '生成全部'}</span>
            </button>

            <button
              onClick={() => {
                assets.forEach(a => {
                  if (a.image_url && !a.locked) {
                    handleLockAsset(a.id);
                  }
                });
                // 检查是否全部锁定，更新阶段状态
                if (assets.every(a => a.image_url)) {
                  actions.updatePhaseStatus(2, 'completed');
                }
              }}
              disabled={!allGenerated || allLocked}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-bold
                flex items-center justify-center gap-2 transition-all
                ${!allGenerated || allLocked
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
                }
              `}
            >
              <span>🔒</span>
              <span>全部锁定</span>
            </button>
          </div>
        )}

        {/* 提示信息 */}
        <p className="text-xs text-gray-500 mt-2">
          💡 生成资产图片，锁定后用于保持绘本中外观一致
        </p>
      </div>

      {/* 资产列表 */}
      <div className="flex-1 overflow-y-auto storybook-scrollbar p-4">
        {filteredAssets.length === 0 ? (
          <EmptyState onAddCharacter={() => handleAddAsset('character')} onAddBackground={() => handleAddAsset('background')} />
        ) : (
          <div className="space-y-4">
            {filteredAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                isEditing={editingId === asset.id}
                isGenerating={generatingId === asset.id || isGeneratingCharacters}
                onEdit={() => setEditingId(asset.id)}
                onCancelEdit={() => setEditingId(null)}
                onUpdatePrompt={(prompt) => handleUpdatePrompt(asset.id, prompt)}
                onUpdate={(data) => actions.updateAsset({ id: asset.id, ...data })}
                onRemove={() => actions.removeAsset(asset.id)}
                onLock={() => handleLockAsset(asset.id)}
                onGenerate={() => handleGenerateSingle(asset)}
                onUpload={() => handleUpload(asset.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 空状态组件
 */
const EmptyState = ({ onAddCharacter, onAddBackground }) => (
  <div className="h-full flex flex-col items-center justify-center text-center">
    <span className="text-6xl mb-4">🎨</span>
    <p
      className="text-gray-500 font-medium mb-2"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      还没有资产
    </p>
    <p className="text-gray-400 text-sm mb-4">
      完成AI分析后会自动提取角色和背景，或手动添加
    </p>
    <div className="flex gap-2">
      <button
        onClick={onAddCharacter}
        className="candy-button candy-button-purple"
      >
        <span>🎭</span>
        <span>添加角色</span>
      </button>
      <button
        onClick={onAddBackground}
        className="candy-button candy-button-green"
      >
        <span>🏞️</span>
        <span>添加背景</span>
      </button>
    </div>
  </div>
);

/**
 * 资产卡片组件（支持角色和背景）
 */
const AssetCard = ({
  asset,
  isEditing,
  isGenerating,
  onEdit,
  onCancelEdit,
  onUpdatePrompt,
  onUpdate,
  onRemove,
  onLock,
  onGenerate,
  onUpload
}) => {
  const [editPrompt, setEditPrompt] = useState(asset.prompt || '');
  const [editName, setEditName] = useState(asset.name || '');

  const isCharacter = asset.type === 'character';
  const typeIcon = isCharacter ? '🎭' : '🏞️';
  const typeLabel = isCharacter ? '角色' : '背景';
  const typeColor = isCharacter ? 'orange' : 'green';

  const handleSaveEdit = () => {
    onUpdate({ name: editName });
    onUpdatePrompt(editPrompt);
  };

  return (
    <div className={`
      bg-white rounded-2xl border-2 overflow-hidden transition-all duration-200
      ${asset.locked
        ? 'border-green-300 bg-green-50/50'
        : isCharacter
          ? 'border-orange-200 hover:border-orange-300'
          : 'border-green-200 hover:border-green-300'
      }
    `}>
      {/* 卡片头部 */}
      <div className={`
        px-4 py-3 flex items-center justify-between
        ${asset.locked
          ? 'bg-green-100'
          : isCharacter
            ? 'bg-gradient-to-r from-orange-50 to-yellow-50'
            : 'bg-gradient-to-r from-green-50 to-blue-50'
        }
        border-b border-gray-100
      `}>
        <div className="flex items-center gap-2">
          {/* 类型徽章 */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            isCharacter
              ? 'bg-orange-100 text-orange-600'
              : 'bg-green-100 text-green-600'
          }`}>
            {typeIcon} {typeLabel}
          </span>

          {/* 资产ID */}
          <span className="text-xs text-gray-400 font-mono">{asset.id}</span>
        </div>

        {/* 操作按钮 */}
        {!asset.locked && (
          <div className="flex gap-1">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center text-sm"
                  title="保存"
                >
                  ✓
                </button>
                <button
                  onClick={onCancelEdit}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-sm"
                  title="取消"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onEdit}
                  className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center"
                  title="编辑"
                >
                  ✏️
                </button>
                <button
                  onClick={() => {
                    if (confirm(`确定删除此${typeLabel}？`)) onRemove();
                  }}
                  className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center"
                  title="删除"
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        )}

        {/* 锁定标识 */}
        {asset.locked && (
          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
            🔒 已锁定
          </span>
        )}
      </div>

      {/* 卡片内容 */}
      <div className="p-4">
        {/* 资产名称 */}
        <div className="mb-3">
          {isEditing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={`text-lg font-bold bg-white border-2 rounded-lg px-2 py-1 focus:outline-none w-full ${
                isCharacter
                  ? 'text-orange-600 border-orange-300 focus:border-orange-500'
                  : 'text-green-600 border-green-300 focus:border-green-500'
              }`}
              placeholder={`${typeLabel}名称`}
            />
          ) : (
            <h3
              className={`text-lg font-bold ${isCharacter ? 'text-orange-600' : 'text-green-600'}`}
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              {asset.name}
            </h3>
          )}
        </div>

        <div className="flex gap-4">
          {/* 图片预览 */}
          <div className="w-40 flex-shrink-0">
            <div className={`aspect-[3/2] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed overflow-hidden relative group ${
              isCharacter ? 'border-orange-200' : 'border-green-200'
            }`}>
              {isGenerating ? (
                <div className={`absolute inset-0 flex flex-col items-center justify-center ${
                  isCharacter ? 'bg-orange-50' : 'bg-green-50'
                }`}>
                  <div className="storybook-spinner mb-2">
                    <span></span><span></span><span></span>
                  </div>
                  <p className={`text-xs font-bold ${isCharacter ? 'text-orange-600' : 'text-green-600'}`}>生成中...</p>
                </div>
              ) : asset.image_url ? (
                <>
                  <img
                    src={asset.image_url}
                    alt={`${asset.name}`}
                    className="w-full h-full object-cover"
                  />
                  {!asset.locked && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={onGenerate}
                        className={`px-2 py-1 text-white rounded text-xs font-bold ${
                          isCharacter ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                        }`}
                      >
                        🔄 重生成
                      </button>
                      <button
                        onClick={onUpload}
                        className="px-2 py-1 bg-white text-gray-700 rounded text-xs font-bold hover:bg-gray-100"
                      >
                        📤 上传
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                  <span className="text-2xl mb-1">{typeIcon}</span>
                  <p className="text-xs text-gray-400 mb-2">暂无图片</p>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={onGenerate}
                      disabled={isGenerating}
                      className={`px-3 py-1.5 text-white rounded-lg text-xs font-bold disabled:opacity-50 ${
                        isCharacter ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      🎨 AI生成
                    </button>
                    <button
                      onClick={onUpload}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300"
                    >
                      📤 上传
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 提示词编辑区 */}
          <div className="flex-1 min-w-0">
            <label className="text-xs font-bold text-gray-600 mb-1 block">
              画面提示词 {asset.locked && <span className="text-gray-400">(已锁定)</span>}
            </label>
            {isEditing && !asset.locked ? (
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className={`w-full h-28 p-2 text-xs border-2 rounded-lg focus:outline-none resize-none ${
                  isCharacter
                    ? 'border-orange-200 focus:border-orange-400'
                    : 'border-green-200 focus:border-green-400'
                }`}
                placeholder={`输入${typeLabel}提示词...`}
              />
            ) : (
              <div className="w-full h-28 p-2 text-xs text-gray-600 bg-gray-50 rounded-lg overflow-y-auto">
                {asset.prompt || '暂无提示词，点击编辑添加'}
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮区 */}
        {!asset.locked && asset.image_url && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={onLock}
              className="py-2 px-4 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 flex items-center gap-2"
            >
              <span>✅</span>
              <span>确认锁定</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetLab;
