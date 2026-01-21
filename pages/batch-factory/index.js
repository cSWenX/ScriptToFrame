/**
 * 批量工厂页面
 * 用于批量管理和生成绘本
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ProjectProvider } from '../../contexts/ProjectContext';
import NavigationDock from '../../components/NavigationDock';
import { getStatusDisplayInfo } from '../../lib/status-utils';
import StoryTable from '../../components/BatchFactory/StoryTable';
import AddStoryModal from '../../components/BatchFactory/AddStoryModal';
import BatchLogsModal from '../../components/BatchFactory/BatchLogsModal';

// 禁用静态生成，使用动态渲染
export const getServerSideProps = () => {
  return {
    props: {},
  };
};

function BatchFactoryContent() {
  const router = useRouter();

  const [stories, setStories] = useState([]);
  const [filteredStories, setFilteredStories] = useState([]);
  const [selectedStories, setSelectedStories] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);

  // 加载故事列表
  const loadStories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/batch-factory/stories?status=${statusFilter}`);
      const result = await response.json();

      if (result.success) {
        setStories(result.data.stories);
        setFilteredStories(result.data.stories);
      } else {
        alert('加载失败: ' + result.error);
      }
    } catch (error) {
      console.error('加载故事列表失败:', error);
      alert('加载失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadStories();
  }, [statusFilter]);

  // 处理筛选变化
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredStories(stories);
    } else {
      setFilteredStories(stories.filter(s => s.status === statusFilter));
    }
  }, [stories, statusFilter]);

  // 处理新增故事
  const handleAddStory = async (title, rawStory) => {
    try {
      const response = await fetch('/api/batch-factory/stories/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, rawStory })
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ 故事创建成功！');
        setShowAddModal(false);
        loadStories();
      } else {
        alert('创建失败: ' + result.error);
      }
    } catch (error) {
      alert('创建失败: ' + error.message);
    }
  };

  // 处理批量生成
  const handleBatchGenerate = async () => {
    if (selectedStories.length === 0) {
      alert('请先选择要生成的故事');
      return;
    }

    const storyIds = selectedStories.map(s => s.id);

    // 检查是否有正在生成中的
    const hasGenerating = selectedStories.some(s => s.status.includes('generating'));

    if (hasGenerating) {
      alert('选择的故事中有正在生成中的，请等待完成或排除这些故事');
      return;
    }

    const confirmed = confirm(`确定要批量生成 ${storyIds.length} 个故事的绘本吗？\n\n此操作将在后台执行，您可以关闭页面，稍后查看执行情况。`);

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch('/api/batch-factory/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyIds })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ 批量生成任务已启动\n\n批次ID: ${result.data.batchId}\n您可以在"查看执行情况"中查看进度`);
        setCurrentBatchId(result.data.batchId);
        setBatchGenerating(true);

        // 刷新列表
        loadStories();
      } else {
        alert('启动失败: ' + result.error);
      }
    } catch (error) {
      alert('启动失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理批量保存
  const handleBatchSave = async () => {
    if (selectedStories.length === 0) {
      alert('请先选择要保存的故事');
      return;
    }

    const storyIds = selectedStories.map(s => s.id);

    setLoading(true);

    try {
      const response = await fetch('/api/batch-factory/batch-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyIds })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ 成功保存 ${result.data.saved} 个故事`);
        loadStories();
        setSelectedStories([]);
      } else {
        // 显示详细错误
        const errorMsg = result.data.details.map(d =>
          `- ${d.title}: ${d.reason || d.status}`
        ).join('\n');

        alert(`❌ 部分故事保存失败:\n${errorMsg}`);
      }
    } catch (error) {
      alert('批量保存失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理批量推送
  const handleBatchPush = async () => {
    if (selectedStories.length === 0) {
      alert('请先选择要推送的故事');
      return;
    }

    const storyIds = selectedStories.map(s => s.id);

    setLoading(true);

    try {
      const response = await fetch('/api/batch-factory/batch-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyIds })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ 成功推送 ${result.data.pushed} 个故事到远程平台`);
        loadStories();
        setSelectedStories([]);
      } else {
        // 显示详细错误
        const errorMsg = result.data.details.map(d =>
          `- ${d.title}: ${d.reason || d.status}`
        ).join('\n');

        alert(`❌ 部分故事推送失败:\n${errorMsg}\n\n请检查这些故事的发布状态和资源推送情况`);
      }
    } catch (error) {
      alert('批量推送失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 处理查看执行情况
  const handleViewLogs = () => {
    if (!currentBatchId) {
      alert('没有正在执行的批量任务');
      return;
    }
    setShowLogsModal(true);
  };

  // 处理选择故事
  const handleSelectStory = (story) => {
    setSelectedStories(prev => {
      const exists = prev.find(s => s.id === story.id);
      if (exists) {
        // 取消选择
        return prev.filter(s => s.id !== story.id);
      } else {
        // 添加选择
        return [...prev, story];
      }
    });
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectedStories.length === filteredStories.length) {
      // 全部取消
      setSelectedStories([]);
    } else {
      // 全选
      setSelectedStories(filteredStories);
    }
  };

  // 处理继续生成单个故事
  const handleContinueStory = async (story) => {
    const confirmed = confirm(`确定要继续生成 "${story.title}" 吗？\n\n系统将自动执行所有剩余步骤，直到音频生成完毕。`);

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/batch-factory/generate/${story.id}/continue`, {
        method: 'POST'
      });

      // SSE 流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5));
              console.log('进度:', data);
            } catch (e) {
              // 忽略非JSON行
            }
          }
        }
      }

      // 完成
      loadStories();
      alert('✅ 生成完成！');
    } catch (error) {
      alert('生成失败: ' + error.message);
    }
  };

  // 处理编辑故事
  const handleEditStory = (story) => {
    router.push(`/ide?projectId=${story.id}`);
  };

  // 处理推送单个故事
  const handlePushStory = async (story) => {
    const confirmed = confirm(`确定要将 "${story.title}" 推送到远程平台吗？`);

    if (!confirmed) return;

    try {
      // 调用现有的单个推送API
      alert('推送功能开发中...');
    } catch (error) {
      alert('推送失败: ' + error.message);
    }
  };

  return (
    <>
      <Head>
        <title>AI绘本创作工坊 - 批量工厂</title>
        <meta name="description" content="批量管理和生成绘本，提高工作效率" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="h-screen flex overflow-hidden">
        {/* 左侧导航栏 */}
        <NavigationDock />

        {/* 主工作区 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-orange-50 via-white to-blue-50">
          {/* 页面头部 */}
          <div className="flex-shrink-0 px-6 py-4">
            <div className="bg-white rounded-2xl shadow-lg p-6 border-4 border-orange-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">🏭</span>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                    批量工厂
                  </h1>
                  <p className="text-sm text-gray-600">
                    批量管理和生成绘本，提高工作效率
                  </p>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50"
                  disabled={loading}
                >
                  📝 新增故事
                </button>

                <button
                  onClick={handleBatchGenerate}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50"
                  disabled={loading || batchGenerating}
                >
                  {batchGenerating ? '🔄 批量生成中...' : '🚀 批量生成绘本'}
                </button>

                <button
                  onClick={handleBatchSave}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 disabled:opacity-50"
                  disabled={loading}
                >
                  💾 批量保存成品
                </button>

                <button
                  onClick={handleBatchPush}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-bold hover:bg-cyan-600 disabled:opacity-50"
                  disabled={loading}
                >
                  ☁️ 批量推送绘本
                </button>

                {currentBatchId && (
                  <button
                    onClick={handleViewLogs}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600"
                  >
                    📊 查看执行情况
                  </button>
                )}
              </div>

              {/* 筛选器 */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-700">状态筛选:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg"
                  disabled={loading}
                >
                  <option value="all">全部</option>
                  <option value="created">已创建</option>
                  <option value="analyzed">已分析</option>
                  <option value="character_generating">角色生成中</option>
                  <option value="character_completed">角色已完成</option>
                  <option value="storyboard_generating">分镜生成中</option>
                  <option value="storyboard_completed">分镜已完成</option>
                  <option value="audio_generating">音频生成中</option>
                  <option value="completed">已完成</option>
                </select>

                {filteredStories.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    {selectedStories.length === filteredStories.length ? '取消全选' : '全选'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 故事列表 */}
          <div className="flex-1 px-6 pb-6 overflow-auto">
            <StoryTable
              stories={filteredStories}
              selectedStories={selectedStories}
              onSelectStory={handleSelectStory}
              onContinueStory={handleContinueStory}
              onEditStory={handleEditStory}
              onPushStory={handlePushStory}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* 新增故事弹窗 */}
      {showAddModal && (
        <AddStoryModal
          onClose={() => setShowAddModal(false)}
          onConfirm={handleAddStory}
        />
      )}

      {/* 批量日志弹窗 */}
      {showLogsModal && currentBatchId && (
        <BatchLogsModal
          batchId={currentBatchId}
          onClose={() => setShowLogsModal(false)}
        />
      )}
    </>
  );
}

// 导出的页面组件，包裹ProjectProvider
export default function BatchFactoryPage() {
  return (
    <ProjectProvider>
      <BatchFactoryContent />
    </ProjectProvider>
  );
}
