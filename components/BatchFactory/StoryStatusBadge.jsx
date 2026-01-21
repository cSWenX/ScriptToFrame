/**
 * 状态徽章组件
 * 显示故事的当前状态
 */

import { getStatusDisplayInfo } from '../../lib/status-utils';

export default function StoryStatusBadge({ status }) {
  const displayInfo = getStatusDisplayInfo(status);

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold
        ${
          displayInfo.color === 'gray' ? 'bg-gray-100 text-gray-600' :
          displayInfo.color === 'blue' ? 'bg-blue-100 text-blue-600' :
          displayInfo.color === 'orange' ? 'bg-orange-100 text-orange-600' :
          displayInfo.color === 'green' ? 'bg-green-100 text-green-600' :
          displayInfo.color === 'darkgreen' ? 'bg-green-100 text-green-700' :
          'bg-gray-100 text-gray-600'
        }`}
    >
      <span className="mr-1">{displayInfo.icon}</span>
      {displayInfo.label}
    </span>
  );
}
