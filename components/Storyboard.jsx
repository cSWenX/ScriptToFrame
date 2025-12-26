import { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';

/**
 * 绘本分镜组件 (Storyboard)
 * 右栏 Tab B - 核心生产区
 * 功能: 网格布局展示、文字烧录图片、局部修图、重新生成
 */
const Storyboard = ({
  onGeneratePage,
  onGenerateAll,
  onInpaint,
  isGenerating
}) => {
  const { state, actions } = useProject();
  const { project } = state;
  const { pages, scriptData } = project;

  const [selectedPage, setSelectedPage] = useState(null);
  const [showInpaintModal, setShowInpaintModal] = useState(false);
  const [inpaintTarget, setInpaintTarget] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // 处理单页生成
  const handleGeneratePage = async (pageIndex) => {
    await onGeneratePage?.(pageIndex);
  };

  // 处理批量生成
  const handleGenerateAll = async () => {
    await onGenerateAll?.();
  };

  // 打开修图模态框
  const handleOpenInpaint = (page) => {
    setInpaintTarget(page);
    setShowInpaintModal(true);
  };

  // 处理AI修图
  const handleEditImage = async (prompt, strength) => {
    if (!inpaintTarget) return;

    setIsEditing(true);
    console.log('🖌️ [Storyboard] 开始AI修图:', {
      pageIndex: inpaintTarget.page_index,
      prompt,
      strength
    });

    try {
      const response = await fetch('http://localhost:8081/api/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: inpaintTarget.image_url,
          prompt: prompt,
          page_index: inpaintTarget.page_index,
          strength: strength
        })
      });

      const result = await response.json();

      if (result.success && result.data?.imageUrl) {
        console.log('✅ [Storyboard] AI修图成功:', result.data.imageUrl);

        // 更新页面图片
        actions.updatePage({
          page_index: inpaintTarget.page_index,
          image_url: result.data.imageUrl,
          edit_prompt: prompt,
          edit_strength: strength,
          last_edited: new Date().toISOString()
        });

        // 关闭模态框
        setShowInpaintModal(false);
        setInpaintTarget(null);
        alert('✅ AI修图完成！');
      } else {
        throw new Error(result.error || '修图失败');
      }
    } catch (error) {
      console.error('❌ [Storyboard] AI修图失败:', error);
      alert('❌ 修图失败: ' + error.message);
    } finally {
      setIsEditing(false);
    }
  };

  // 处理图片放大预览
  const handlePreview = (page) => {
    setSelectedPage(page);
  };

  // 计算生成进度
  const completedCount = pages.filter(p => p.image_url).length;
  const totalCount = pages.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="h-full flex flex-col">
      {/* 头部工具栏 */}
      <div className="p-4 border-b-2 border-yellow-200 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-lg font-bold text-orange-600 flex items-center gap-2"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            <span>🖼️</span>
            绘本分镜
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleGenerateAll}
              disabled={isGenerating || pages.length === 0}
              className={`
                candy-button text-sm py-2 px-3
                ${isGenerating || pages.length === 0 ? 'candy-button-gray' : 'candy-button-blue'}
              `}
            >
              <span>{isGenerating ? '🔄' : '🚀'}</span>
              <span>{isGenerating ? '生成中...' : '批量生成'}</span>
            </button>
          </div>
        </div>

        {/* 进度条 */}
        {totalCount > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>完成进度</span>
              <span>{completedCount}/{totalCount} 页 ({progressPercent}%)</span>
            </div>
            <div className="storybook-progress h-2">
              <div
                className="storybook-progress-bar h-2"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* 提示信息 */}
        <p
          className="text-xs text-gray-500"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          💡 图片已包含烧录的文字内容，点击可放大预览或局部修图
        </p>
      </div>

      {/* 分镜网格 */}
      <div className="flex-1 overflow-y-auto storybook-scrollbar p-4">
        {pages.length === 0 ? (
          // 空状态
          <div className="h-full flex flex-col items-center justify-center text-center">
            <span className="text-6xl mb-4">🖼️</span>
            <p
              className="text-gray-500 font-medium mb-2"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              还没有分镜数据
            </p>
            <p className="text-gray-400 text-sm">
              请先完成 AI 分析和角色设定
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((page, index) => (
              <PageCard
                key={page.page_index || index}
                page={page}
                pageIndex={index + 1}
                isGenerating={page.status === 'generating'}
                onPreview={() => handlePreview(page)}
                onRegenerate={() => handleGeneratePage(page.page_index)}
                onInpaint={() => handleOpenInpaint(page)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 图片预览模态框 */}
      {selectedPage && (
        <ImagePreviewModal
          page={selectedPage}
          pages={pages}
          onClose={() => setSelectedPage(null)}
          onRegenerate={() => {
            handleGeneratePage(selectedPage.page_index);
            setSelectedPage(null);
          }}
          onInpaint={() => {
            handleOpenInpaint(selectedPage);
            setSelectedPage(null);
          }}
        />
      )}

      {/* 局部修图模态框 */}
      {showInpaintModal && inpaintTarget && (
        <InpaintModal
          page={inpaintTarget}
          isEditing={isEditing}
          onClose={() => {
            if (!isEditing) {
              setShowInpaintModal(false);
              setInpaintTarget(null);
            }
          }}
          onSubmit={handleEditImage}
        />
      )}
    </div>
  );
};

/**
 * 页面卡片组件
 */
const PageCard = ({
  page,
  pageIndex,
  isGenerating,
  onPreview,
  onRegenerate,
  onInpaint
}) => {
  return (
    <div className="bg-white rounded-xl border-2 border-yellow-200 overflow-hidden hover:border-orange-300 transition-all duration-200 hover:shadow-lg group">
      {/* 图片区域 */}
      <div
        className="aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 relative cursor-pointer overflow-hidden"
        onClick={page.image_url ? onPreview : undefined}
      >
        {isGenerating ? (
          // 生成中状态
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-orange-100 to-yellow-100">
            <div className="storybook-spinner mb-3">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p
              className="text-sm text-orange-600 font-bold"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              AI绘制中...
            </p>
          </div>
        ) : page.image_url ? (
          // 已生成图片
          <>
            <img
              src={page.image_url}
              alt={`第${pageIndex}页`}
              className="w-full h-full object-cover"
            />
            {/* 悬停操作层 */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview();
                }}
                className="px-3 py-2 bg-white rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100"
              >
                🔍 放大
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onInpaint();
                }}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600"
              >
                🖊️ 修图
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerate();
                }}
                className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600"
              >
                🔄 重生成
              </button>
            </div>
          </>
        ) : page.error ? (
          // 生成失败
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <span className="text-4xl mb-2">😢</span>
            <p className="text-sm text-red-500 font-bold">生成失败</p>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{page.error}</p>
            <button
              onClick={onRegenerate}
              className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600"
            >
              🔄 重试
            </button>
          </div>
        ) : (
          // 待生成
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <span className="text-4xl mb-2">🎨</span>
            <p className="text-sm text-gray-400">等待生成</p>
            <button
              onClick={onRegenerate}
              className="mt-3 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-bold hover:bg-purple-600"
            >
              🎨 生成此页
            </button>
          </div>
        )}

        {/* 页码标识 */}
        <div className="absolute top-2 left-2 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
          {pageIndex}
        </div>

        {/* 状态标识 */}
        <div className="absolute top-2 right-2">
          {page.image_url && !isGenerating && (
            <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg" title="已完成" />
          )}
          {isGenerating && (
            <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-lg animate-pulse" title="生成中" />
          )}
          {page.error && (
            <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg" title="失败" />
          )}
        </div>
      </div>

      {/* 内容信息 */}
      <div className="p-3">
        {/* 显示文字预览 */}
        <p
          className="text-xs text-gray-600 line-clamp-2 mb-2"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          {page.display_text || page.script_text || '暂无内容'}
        </p>

        {/* 状态标签 */}
        <div className="flex items-center justify-between">
          <span
            className={`
              text-xs font-medium px-2 py-1 rounded-full
              ${page.status === 'approved' ? 'bg-green-100 text-green-600' :
                page.status === 'generating' ? 'bg-yellow-100 text-yellow-600' :
                page.image_url ? 'bg-blue-100 text-blue-600' :
                'bg-gray-100 text-gray-500'}
            `}
          >
            {page.status === 'approved' ? '✅ 已确认' :
             page.status === 'generating' ? '🔄 生成中' :
             page.image_url ? '📷 已生成' :
             '⏳ 待生成'}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * 图片预览模态框
 */
const ImagePreviewModal = ({ page, pages, onClose, onRegenerate, onInpaint }) => {
  const pageIndex = pages.findIndex(p => p.page_index === page.page_index) + 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 图片 */}
        <div className="relative">
          <img
            src={page.image_url}
            alt={`第${pageIndex}页`}
            className="w-full"
          />
          <div className="absolute top-4 left-4 w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
            {pageIndex}
          </div>
        </div>

        {/* 信息和操作 */}
        <div className="p-6">
          <div className="mb-4">
            <h3
              className="text-lg font-bold text-orange-600 mb-2"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              第 {pageIndex} 页
            </h3>
            <p
              className="text-gray-600"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              {page.display_text || page.script_text}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onRegenerate}
              className="flex-1 candy-button candy-button-orange"
            >
              <span>🔄</span>
              <span>重新生成</span>
            </button>
            <button
              onClick={onInpaint}
              className="flex-1 candy-button candy-button-blue"
            >
              <span>🖊️</span>
              <span>局部修图</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 candy-button candy-button-gray"
            >
              <span>✕</span>
              <span>关闭</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 局部修图模态框 (Image Edit / 图生图)
 */
const InpaintModal = ({ page, onClose, onSubmit, isEditing }) => {
  const [prompt, setPrompt] = useState('');
  const [strength, setStrength] = useState(0.65);

  const handleSubmit = () => {
    if (!prompt.trim()) {
      alert('请输入修改描述');
      return;
    }
    onSubmit(prompt, strength);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-4 border-b-2 border-yellow-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <h2
              className="text-lg font-bold text-purple-600 flex items-center gap-2"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              <span>🖊️</span>
              AI修图
            </h2>
            <button
              onClick={onClose}
              disabled={isEditing}
              className="text-gray-500 hover:text-gray-700 text-2xl disabled:opacity-50"
            >
              ×
            </button>
          </div>
          <p
            className="text-xs text-gray-500 mt-1"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            描述你想要的修改，AI会基于原图进行智能编辑
          </p>
        </div>

        {/* 内容 */}
        <div className="flex flex-col md:flex-row">
          {/* 图片预览区 */}
          <div className="flex-1 p-4">
            <div className="relative bg-gray-100 rounded-xl overflow-hidden">
              <img
                src={page.image_url}
                alt="原图"
                className={`w-full transition-opacity ${isEditing ? 'opacity-50' : ''}`}
              />
              {isEditing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                  <div className="storybook-spinner mb-3">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p className="text-white font-bold text-sm">AI正在修图...</p>
                </div>
              )}
            </div>
            {/* 原图提示 */}
            <p className="text-xs text-gray-400 text-center mt-2">
              原图 - 第{page.page_index}页
            </p>
          </div>

          {/* 控制面板 */}
          <div className="w-full md:w-80 p-4 border-t-2 md:border-t-0 md:border-l-2 border-yellow-200 bg-gray-50">
            {/* 修改描述 */}
            <div className="mb-4">
              <label
                className="text-sm font-bold text-gray-600 mb-2 block"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                ✏️ 修改描述
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isEditing}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none resize-none disabled:bg-gray-100"
                style={{ minHeight: '120px', fontFamily: "'Nunito', sans-serif" }}
                placeholder="描述你想要的修改效果...&#10;&#10;例如:&#10;• 把小兔子的帽子改成红色&#10;• 添加更多的花朵和蝴蝶&#10;• 把背景改成夜晚的星空"
              />
            </div>

            {/* 修改强度 */}
            <div className="mb-6">
              <label
                className="text-sm font-bold text-gray-600 mb-2 block"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                🎨 修改强度: {Math.round(strength * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="0.95"
                step="0.05"
                value={strength}
                onChange={(e) => setStrength(parseFloat(e.target.value))}
                disabled={isEditing}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>微调</span>
                <span>大改</span>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-2">
              <button
                onClick={handleSubmit}
                disabled={isEditing || !prompt.trim()}
                className={`
                  w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2
                  transition-all duration-200
                  ${isEditing || !prompt.trim()
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-500 text-white hover:bg-purple-600 shadow-lg hover:shadow-xl'
                  }
                `}
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                <span>{isEditing ? '🔄' : '✨'}</span>
                <span>{isEditing ? 'AI修图中...' : '开始AI修图'}</span>
              </button>
              <button
                onClick={onClose}
                disabled={isEditing}
                className="w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2
                  bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                <span>❌</span>
                <span>取消</span>
              </button>
            </div>

            {/* 提示 */}
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border-2 border-amber-200">
              <p className="text-xs text-amber-600">
                💡 提示: 描述越详细，AI生成的效果越好。修改强度越高，变化越明显。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Storyboard;
