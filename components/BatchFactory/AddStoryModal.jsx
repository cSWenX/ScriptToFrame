/**
 * 新增故事弹窗组件
 */

import { useState, useEffect } from 'react';

export default function AddStoryModal({ onClose, onConfirm }) {
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [storyLength, setStoryLength] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setStory('');
    setStoryLength(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('请输入故事标题');
      return;
    }

    if (story.trim().length < 50) {
      alert('故事内容至少需要50个字符，当前：' + story.trim().length);
      return;
    }

    setIsSubmitting(true);

    try {
      await onConfirm(title.trim(), story.trim());
      handleClose();
    } catch (error) {
      alert('创建失败: ' + error.message);
      setIsSubmitting(false);
    }
  };

  const handleStoryChange = (e) => {
    const value = e.target.value;
    setStory(value);
    setStoryLength(value.length);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">📝</span>
          <h2 className="text-xl font-bold text-gray-800">新增故事</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入故事标题"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              故事 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={story}
              onChange={handleStoryChange}
              placeholder="请输入故事内容（至少50个字符）..."
              rows={6}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <div className="mt-2 text-sm text-gray-500">
              字数: {storyLength}/50
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || story.trim().length < 50}
            className="flex-1 px-4 py-2 rounded-xl font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
            style={{
              opacity: (isSubmitting || !title.trim() || story.trim().length < 50) ? 0.5 : 1
            }}
          >
            {isSubmitting ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                创建中...
              </>
            ) : (
              <>
                <span>📝</span>
                确认
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
