import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useProject } from '../contexts/ProjectContext';

/**
 * 导航侧边栏组件 (Navigation Dock)
 * 功能: 新建故事、项目列表、保存/提交
 * 宽度: 60px (收起) / 240px (展开)
 */
const NavigationDock = () => {
  const router = useRouter();
  const { state, actions } = useProject();
  const { isNavExpanded, project, projectList, isLoading } = state;
  const [showProjectDrawer, setShowProjectDrawer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveType, setSaveType] = useState('draft'); // 'draft' | 'published'
  const [projectName, setProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isPushingToRemote, setIsPushingToRemote] = useState(false);

  // 判断当前是否在批量工厂页面
  const isBatchFactoryPage = router.pathname === '/batch-factory';

  // 打开项目列表时加载数据
  useEffect(() => {
    if (showProjectDrawer) {
      actions.loadProjectList();
    }
  }, [showProjectDrawer]);

  const handleNewProject = () => {
    // 如果在批量工厂页面，跳转到IDE页面
    if (isBatchFactoryPage) {
      router.push('/ide');
      return;
    }

    // 如果在IDE页面，执行原来的新建项目逻辑
    if (project.rawStory || project.pages.length > 0) {
      if (confirm('创建新项目将清空当前内容，是否继续？')) {
        actions.newProject();
      }
    } else {
      actions.newProject();
    }
  };

  // 打开保存对话框
  const openSaveDialog = (type) => {
    setSaveType(type);
    setProjectName(project.title || '');
    setShowSaveDialog(true);
  };

  // 确认保存
  const handleConfirmSave = async () => {
    if (!projectName.trim()) {
      alert('请输入项目名称');
      return;
    }

    setIsSaving(true);
    try {
      // 先更新项目名称
      actions.updateProject({ title: projectName.trim() });

      // 然后保存
      const result = await actions.saveProject(saveType);
      if (result.success) {
        setShowSaveDialog(false);

        // 如果是发布成品，重新加载项目列表以解锁远程推送按钮
        if (saveType === 'published') {
          await actions.loadProjectList();
          alert('🎉 绘本已发布！');
        } else {
          alert('✅ 草稿已保存！');
        }
      } else {
        alert('❌ 保存失败: ' + result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 保存草稿按钮点击
  const handleSaveDraft = () => {
    openSaveDialog('draft');
  };

  // 发布成品按钮点击
  const handlePublish = () => {
    if (project.phaseStatus[3] !== 'completed') {
      alert('请先完成图片生成再发布');
      return;
    }
    openSaveDialog('published');
  };

  // 检查项目是否已发布（通过从项目列表中查找）
  // 方法1: 检查项目是否在 published 数组中
  // 方法2: 检查项目对象的 _type 字段
  const isProjectPublished = () => {
    // 首先检查项目列表中的 published 数组
    if (projectList.published && projectList.published.some(p => p.id === project.id)) {
      return true;
    }
    // 兼容：检查 _type 字段
    const projInList = [...(projectList.drafts || []), ...(projectList.published || [])]
      .find(p => p.id === project.id);
    return projInList?._type === 'published';
  };

  // 验证资源是否都有远程ID
  const validateRemoteResources = () => {
    const missingResources = [];

    // 检查封面（第一页）
    const coverPage = project.pages[0];
    if (!coverPage) {
      missingResources.push('封面');
    } else if (!coverPage.remote_id) {
      missingResources.push(`封面（第1页）`);
    }

    // 检查所有分镜图片
    project.pages.forEach((page, index) => {
      if (!page.remote_id) {
        missingResources.push(`第${page.page_index || index + 1}页图片`);
      }
    });

    // 检查音频（如果存在）
    project.pages.forEach((page, index) => {
      if (page.audio_url && !page.remote_audio_id) {
        missingResources.push(`第${page.page_index || index + 1}页音频`);
      }
    });

    return missingResources;
  };

  // 远程推送按钮点击
  const handlePushToRemote = async () => {
    // 检查是否已发布
    if (!isProjectPublished()) {
      alert('请先点击"发布成品"后再进行远程推送');
      return;
    }

    // 验证所有资源是否都有远程URL
    const missingResources = validateRemoteResources();
    if (missingResources.length > 0) {
      alert(`以下资源尚未推送到远程存储，无法完成产品推送：\n\n${missingResources.slice(0, 5).join('\n')}${missingResources.length > 5 ? '\n...' : ''}\n\n请先生成图片/音频，确保自动推送到远程成功。`);
      return;
    }

    const confirmed = confirm(`确定要将《${project.title}》推送到远程平台吗？\n\n这将创建一个新的产品记录。`);
    if (!confirmed) return;

    setIsPushingToRemote(true);
    try {
      const response = await fetch('/api/push-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('✅ 产品推送成功！');
      } else {
        alert('❌ 推送失败: ' + result.error);
      }
    } catch (error) {
      console.error('远程推送失败:', error);
      alert('❌ 推送失败: ' + error.message);
    } finally {
      setIsPushingToRemote(false);
    }
  };

  // 删除项目
  const handleDeleteProject = async (e, proj) => {
    e.stopPropagation();
    if (confirm(`确定要删除 "${proj.title || '未命名绘本'}" 吗？`)) {
      const result = await actions.deleteProject(proj.id);
      if (!result.success) {
        alert('❌ 删除失败: ' + result.error);
      }
    }
  };

  // 开始重命名
  const handleStartRename = (e, proj) => {
    e.stopPropagation();
    setEditingProjectId(proj.id);
    setEditingName(proj.title || '');
  };

  // 确认重命名
  const handleConfirmRename = async (proj) => {
    if (!editingName.trim()) {
      setEditingProjectId(null);
      return;
    }

    try {
      // 更新项目名称并保存
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: { ...proj, title: editingName.trim() },
          type: proj._type || 'draft'
        })
      });

      const result = await response.json();
      if (result.success) {
        // 刷新项目列表
        actions.loadProjectList();
      }
    } catch (error) {
      console.error('重命名失败:', error);
    }

    setEditingProjectId(null);
  };

  // 下载项目
  const handleDownloadProject = async (e, proj) => {
    e.stopPropagation();

    // 调用下载API
    try {
      const response = await fetch('/api/download-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: proj.id })
      });

      if (response.ok) {
        // 获取文件名
        const projectName = proj.story_name || proj.title || '未命名绘本';
        const fileName = `${proj.id}-${projectName}.zip`;

        // 创建下载链接
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log(`✅ 下载项目: ${fileName}`);
      } else {
        const error = await response.json();
        alert('下载失败: ' + (error.error || '未知错误'));
      }
    } catch (error) {
      console.error('下载项目失败:', error);
      alert('下载失败: ' + error.message);
    }
  };

  const navItems = [
    {
      icon: '➕',
      label: '新建故事',
      onClick: handleNewProject,
      color: 'text-green-500'
    },
    {
      icon: '📂',
      label: '项目列表',
      onClick: () => setShowProjectDrawer(true),
      color: 'text-blue-500'
    },
    {
      icon: '🏭',
      label: '批量工厂',
      onClick: () => {
        if (!isBatchFactoryPage) {
          router.push('/batch-factory');
        }
      },
      color: 'text-indigo-500',
      disabled: true  // 暂未开放
    },
    {
      icon: isSaving ? '⏳' : '💾',
      label: isSaving ? '保存中...' : '保存草稿',
      onClick: handleSaveDraft,
      color: 'text-orange-500',
      disabled: isSaving
    },
    {
      icon: isSaving ? '⏳' : '🚀',
      label: isSaving ? '发布中...' : '发布成品',
      onClick: handlePublish,
      color: 'text-purple-500',
      disabled: project.phaseStatus[3] !== 'completed' || isSaving
    },
    {
      icon: isPushingToRemote ? '⏳' : '☁️',
      label: isPushingToRemote ? '推送中...' : '远程推送',
      onClick: handlePushToRemote,
      color: 'text-cyan-500',
      disabled: isPushingToRemote || !isProjectPublished()
    }
  ];

  return (
    <>
      {/* 导航栏主体 */}
      <nav
        className={`
          h-full flex flex-col
          bg-gradient-to-b from-white via-orange-50 to-yellow-50
          border-r-4 border-yellow-300
          shadow-lg
          transition-all duration-300 ease-in-out
          ${isNavExpanded ? 'w-60' : 'w-16'}
        `}
        onMouseEnter={() => actions.toggleNav(true)}
        onMouseLeave={() => actions.toggleNav(false)}
      >
        {/* Logo 区域 */}
        <div className="p-3 border-b-2 border-yellow-200 flex items-center justify-center">
          <div className={`
            flex items-center gap-2
            transition-all duration-300
            ${isNavExpanded ? 'w-full' : 'w-10'}
          `}>
            <span className="text-3xl">📚</span>
            {isNavExpanded && (
              <span
                className="text-orange-600 font-bold text-sm whitespace-nowrap overflow-hidden"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                绘本工坊
              </span>
            )}
          </div>
        </div>

        {/* 导航项目 */}
        <div className="flex-1 py-4 space-y-2">
          {navItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              disabled={item.disabled}
              className={`
                w-full flex items-center gap-3
                px-4 py-3
                transition-all duration-200
                hover:bg-yellow-100
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isNavExpanded ? 'justify-start' : 'justify-center'}
              `}
              title={!isNavExpanded ? item.label : undefined}
            >
              <span className={`text-2xl ${item.color}`}>{item.icon}</span>
              {isNavExpanded && (
                <span
                  className="text-gray-700 font-medium text-sm whitespace-nowrap"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 当前项目状态 */}
        {isNavExpanded && (
          <div className="p-3 border-t-2 border-yellow-200">
            <div className="bg-white/80 rounded-xl p-3 border-2 border-yellow-200">
              <p
                className="text-xs text-gray-500 mb-1"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                当前项目
              </p>
              <p
                className="text-sm font-bold text-orange-600 truncate"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                {project.title || '未命名绘本'}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4].map((phase) => (
                  <div
                    key={phase}
                    className={`
                      w-2 h-2 rounded-full
                      ${project.phaseStatus[phase] === 'completed' ? 'bg-green-500' :
                        project.phaseStatus[phase] === 'in_progress' ? 'bg-yellow-500' :
                        project.phaseStatus[phase] === 'pending' ? 'bg-gray-300' :
                        'bg-gray-200'}
                    `}
                    title={`阶段 ${phase}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* 保存对话框 */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => !isSaving && setShowSaveDialog(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-96 overflow-hidden animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-gradient-to-r from-orange-100 to-yellow-100 border-b-2 border-yellow-200">
              <h3
                className="text-lg font-bold text-orange-600 flex items-center gap-2"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                <span>{saveType === 'published' ? '🚀' : '💾'}</span>
                {saveType === 'published' ? '发布成品' : '保存草稿'}
              </h3>
            </div>

            <div className="p-4">
              <label className="block text-sm font-bold text-gray-600 mb-2">
                绘本名称
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={isSaving}
                placeholder="输入绘本名称..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl
                  focus:border-orange-400 focus:outline-none
                  disabled:bg-gray-100"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmSave()}
              />
            </div>

            <div className="p-4 flex gap-2 border-t border-gray-100">
              <button
                onClick={() => !isSaving && setShowSaveDialog(false)}
                disabled={isSaving}
                className="flex-1 py-3 px-4 rounded-xl font-bold
                  bg-gray-100 text-gray-600 hover:bg-gray-200
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                取消
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={isSaving || !projectName.trim()}
                className={`
                  flex-1 py-3 px-4 rounded-xl font-bold
                  flex items-center justify-center gap-2
                  ${isSaving || !projectName.trim()
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : saveType === 'published'
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }
                `}
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    保存中...
                  </>
                ) : (
                  <>
                    <span>{saveType === 'published' ? '🚀' : '💾'}</span>
                    {saveType === 'published' ? '发布' : '保存'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 项目列表抽屉 */}
      {showProjectDrawer && (
        <div
          className="fixed inset-0 z-50 flex"
          onClick={() => setShowProjectDrawer(false)}
        >
          {/* 遮罩 */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

          {/* 抽屉内容 */}
          <div
            className="relative ml-16 w-80 h-full bg-white shadow-2xl animate-slide-in-left overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 抽屉头部 */}
            <div className="p-4 border-b-2 border-yellow-200 bg-gradient-to-r from-orange-50 to-yellow-50">
              <div className="flex items-center justify-between">
                <h2
                  className="text-lg font-bold text-orange-600 flex items-center gap-2"
                  style={{ fontFamily: "'Fredoka', sans-serif" }}
                >
                  <span>📂</span> 我的项目
                </h2>
                <button
                  onClick={() => setShowProjectDrawer(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* 项目列表 */}
            <div className="p-4 space-y-3 overflow-y-auto storybook-scrollbar" style={{ maxHeight: 'calc(100vh - 80px)' }}>
              {(!projectList.drafts || projectList.drafts.length === 0) && (!projectList.published || projectList.published.length === 0) ? (
                <div className="text-center py-10">
                  <span className="text-5xl mb-4 block">📭</span>
                  <p className="text-gray-500" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    还没有保存的项目
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    创建你的第一个绘本吧！
                  </p>
                </div>
              ) : (
                // 合并 drafts 和 published，已发布的在前
                [...(projectList.published || []), ...(projectList.drafts || [])].map((proj) => (
                  <div
                    key={proj.id}
                    className="
                      p-3 rounded-xl border-2 border-yellow-200
                      bg-white hover:bg-yellow-50
                      cursor-pointer transition-all duration-200
                      hover:shadow-md relative group
                    "
                    onClick={() => {
                      actions.loadProject(proj);
                      setShowProjectDrawer(false);
                    }}
                  >
                    {/* 类型标签和操作按钮 */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <span className={`
                        text-xs px-2 py-0.5 rounded-full font-bold
                        ${proj._type === 'published'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-orange-100 text-orange-600'}
                      `}>
                        {proj._type === 'published' ? '已发布' : '草稿'}
                      </span>
                      {/* 下载按钮 */}
                      <button
                        onClick={(e) => handleDownloadProject(e, proj)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity
                          w-6 h-6 rounded-full bg-purple-100 text-purple-500
                          hover:bg-purple-200 flex items-center justify-center text-xs"
                        title="下载项目"
                      >
                        ⬇️
                      </button>
                      {/* 重命名按钮 */}
                      <button
                        onClick={(e) => handleStartRename(e, proj)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity
                          w-6 h-6 rounded-full bg-blue-100 text-blue-500
                          hover:bg-blue-200 flex items-center justify-center text-xs"
                        title="重命名"
                      >
                        ✏️
                      </button>
                      {/* 删除按钮 */}
                      <button
                        onClick={(e) => handleDeleteProject(e, proj)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity
                          w-6 h-6 rounded-full bg-red-100 text-red-500
                          hover:bg-red-200 flex items-center justify-center text-sm"
                        title="删除项目"
                      >
                        ×
                      </button>
                    </div>

                    {/* 项目封面 */}
                    <div className="aspect-video bg-gradient-to-br from-orange-100 to-yellow-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                      {proj._meta?.coverImage || proj.pages?.[0]?.image_url ? (
                        <img
                          src={proj._meta?.coverImage || proj.pages[0].image_url}
                          alt={proj.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl">🖼️</span>
                      )}
                    </div>

                    {/* 项目名称（可编辑） */}
                    {editingProjectId === proj.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleConfirmRename(proj)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename(proj);
                          if (e.key === 'Escape') setEditingProjectId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 border-2 border-orange-400 rounded-lg
                          text-sm font-bold text-orange-600 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <h3
                        className="font-bold text-orange-600 truncate pr-16"
                        style={{ fontFamily: "'Fredoka', sans-serif" }}
                      >
                        {proj.title || '未命名绘本'}
                      </h3>
                    )}

                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">
                        {proj._meta?.pageCount || proj.pages?.length || 0} 页
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4].map((phase) => (
                          <div
                            key={phase}
                            className={`
                              w-1.5 h-1.5 rounded-full
                              ${proj.phaseStatus?.[phase] === 'completed' ? 'bg-green-500' :
                                proj.phaseStatus?.[phase] === 'in_progress' ? 'bg-yellow-500' :
                                'bg-gray-200'}
                            `}
                          />
                        ))}
                      </div>
                    </div>
                    {/* 更新时间 */}
                    {proj.updated_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(proj.updated_at).toLocaleDateString('zh-CN')}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 动画样式 */}
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.3s ease-out forwards;
        }
        @keyframes pop {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-pop {
          animation: pop 0.2s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default NavigationDock;
