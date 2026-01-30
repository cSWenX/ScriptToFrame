/**
 * 故事列表表格组件
 */

import { getStatusDisplayInfo } from '../../lib/status-utils';
import StoryStatusBadge from './StoryStatusBadge';
import { calculateStatus } from '../../lib/status-utils';

export default function StoryTable({ stories, selectedStories, onSelectStory, onContinueStory, onEditStory, onPushStory, onDeleteStory, loading }) {
  // 处理选择单个故事
  const handleSelect = (story) => {
    onSelectStory(story);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* 表格 */}
      <table className="w-full">
        {/* 表头 */}
        <thead className="bg-gray-50">
          <tr className="border-b-2 border-gray-200">
            <th className="p-3 text-left w-20">
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    // 全选
                  } else {
                    // 取消全选
                  }
                }}
                className="h-4 w-4 text-blue-600"
              />
            </th>
            <th className="p-3 text-left text-sm font-bold text-gray-700">故事ID</th>
            <th className="p-3 text-left text-sm font-bold text-gray-700">标题</th>
            <th className="p-3 text-left text-sm font-bold text-gray-700">故事</th>
            <th className="p-> text-left text-sm font-bold text-gray-700">状态</th>
            <th className="p-3 text-left text-sm font-bold text-gray-700">操作</th>
          </tr>
        </thead>

        {/* 表体 */}
        <tbody className="divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan="6" className="p-4 text-center text-gray-500">
                加载中...
              </td>
            </tr>
          ) : stories.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-8 text-center text-gray-500">
                暂时没有故事，请点击"新增故事"创建第一个故事
              </td>
            </tr>
          ) : (
            stories.map((story) => {
              const isSelected = selectedStories.find(s => s.id === story.id);
              const displayInfo = getStatusDisplayInfo(story.status);
              const canContinue = calculateStatus(story.phaseStatus);
              const canPush = calculateStatus(story.phaseStatus) === 'completed' && story._type === 'published';

              return (
                <tr key={story.id} className="hover:bg-gray-50">
                  {/* 多选框 */}
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelect(story)}
                      className="h-4 w-4 text-blue-600"
                    />
                  </td>

                  {/* 故事ID */}
                  <td className="p-3">
                    <div className="font-mono text-xs text-gray-600 truncate" style={{ maxWidth: '100px' }}>
                      {story.id}
                    </div>
                  </td>

                  {/* 标题 */}
                  <td className="p-3">
                    <div className="text-sm font-medium text-gray-900">
                      {story.title}
                    </div>
                  </td>

                  {/* 故事预览 */}
                  <td className="p-3">
                    <div className="text-xs text-gray-600 truncate" style={{ maxWidth: '300px' }}>
                      {story.rawStory ? (
                        <>
                          {story.rawStory.substring(0, 50)}
                          {story.rawStory.length > 50 ? '...' : ''}
                        </>
                      ) : (
                        <span className="text-gray-400">暂无内容</span>
                      )}
                    </div>
                  </td>

                  {/* 状态 */}
                  <td className="p-3">
                    <StoryStatusBadge status={story.status} />
                  </td>

                  {/* 操作 */}
                  <td className="p-3">
                    <div className="flex gap-2">
                      {/* 编辑按钮 - 始终显示 */}
                      <button
                        onClick={() => onEditStory(story)}
                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600"
                        title="编辑故事"
                      >
                        ✏️ 编辑
                      </button>

                      {/* 删除按钮 */}
                      <button
                        onClick={() => {
                          if (confirm(`确定要删除故事 "${story.title}" 吗？\n\n此操作将永久删除该故事及其所有资源，无法恢复。`)) {
                            onDeleteStory(story);
                          }
                        }}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600"
                        title="删除故事"
                      >
                        🗑️ 删除
                      </button>

                      {/* 继续生成按钮 */}
                      {!displayInfo.icon.includes('generating') &&
                       !displayInfo.icon.includes('completed') &&
                       canContinue ? (
                          <button
                            onClick={() => onContinueStory(story)}
                            className="px-2 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600"
                            title="继续生成"
                          >
                            ▶️ 继续生成
                          </button>
                        ) : displayInfo.icon === '🎉' ? (
                        <button
                          disabled
                          className="px-2 py-1 bg-gray-300 text-gray-500 text-xs rounded-lg cursor-not-allowed"
                          title="已经完成，无需操作"
                        >
                          ✓ 已完成
                        </button>
                      ) : null}

                      {/* 远程推送按钮 */}
                      {canPush ? (
                        <button
                          onClick={() => onPushStory(story)}
                          className="px-2 py-1 bg-cyan-500 text-white text-xs rounded-lg hover:bg-cyan-600"
                          title="推送到远程"
                        >
                          ☁️ 推送远程
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-2 py-1 bg-gray-300 text-gray-500 text-xs rounded-lg cursor-not-allowed"
                          title="未满足推送条件"
                        >
                          🔒 未解锁
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
