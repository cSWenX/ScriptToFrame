/**
 * 批量执行日志弹窗组件
 */

import { useState, useEffect } from 'react';

export default function BatchLogsModal({ batchId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/batch-factory/batch-logs/${batchId}?tail=100`);
      const result = await response.json();

      if (result.success) {
        setLogs(result.data.logs);
        setSummary(result.data.summary);
      }
    } catch (error) {
      console.error('获取日志失败:', error);
    }
  };

  useEffect(() => {
    fetchLogs();

    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchLogs();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [batchId, autoRefresh]);

  const handleRefresh = async () => {
    await fetchLogs();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <h2 className="text-xl font-bold text-gray-800">批量生成执行情况</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {summary && (
          <div className="flex items-center gap-4 mb-4 p-4 bg-gray-50 rounded-xl">
            <div className="text-sm text-gray-600">
              总数: <span className="font-bold">{summary.total}</span>
            </div>
            <div className="text-sm text-green-600">
              成功: <span className="font-bold">{summary.completed}</span>
            </div>
            <div className="text-sm text-red-600">
              失败: <span className="font-bold">{summary.failed}</span>
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="bg-gray-900 text-green-400 p-4 rounded-xl">
            <pre className="text-xs overflow-auto max-h-80">
              {logs.length > 0 ? logs.join('\n') : '暂无日志...'}
            </pre>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-sm text-gray-500">
              {autoRefresh ? '🔄 自动刷新中' : '⏸️ 已暂停'}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            className="px-4 py-2 rounded-xl font-bold bg-blue-500 text-white hover:bg-blue-600"
          >
            🔄 刷新
          </button>

          <button
            onClick={toggleAutoRefresh}
            className={`px-4 py-2 rounded-xl font-bold ${
              autoRefresh ? 'bg-gray-200 text-gray-600' : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {autoRefresh ? '⏸️ 暂停刷新' : '▶️ 开启刷新'}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold bg-gray-200 text-gray-600 hover:bg-gray-300"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
