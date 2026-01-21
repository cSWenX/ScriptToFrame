/**
 * 状态工具函数
 * 用于批量工厂的状态计算和判断
 */

/**
 * 根据 phaseStatus 计算项目的 status
 * @param {Object} phaseStatus - 项目的阶段状态
 * @returns {string} status - 批量工厂的状态字符串
 */
function calculateStatus(phaseStatus) {
  if (!phaseStatus || typeof phaseStatus !== 'object') {
    return 'created';
  }

  // 阶段4: 音频生成
  if (phaseStatus[4] === 'completed') {
    return 'completed';
  }
  if (phaseStatus[4] === 'in_progress') {
    return 'audio_generating';
  }

  // 阶段3: 分镜生成
  if (phaseStatus[3] === 'completed') {
    return 'storyboard_completed';
  }
  if (phaseStatus[3] === 'in_progress') {
    return 'storyboard_generating';
  }

  // 阶段2: 角色生成
  if (phaseStatus[2] === 'completed') {
    return 'character_completed';
  }
  if (phaseStatus[2] === 'in_progress') {
    return 'character_generating';
  }

  // 阶段1: 剧本分析
  if (phaseStatus[1] === 'completed') {
    return 'analyzed';
  }
  if (phaseStatus[1] === 'in_progress') {
    return 'analyzed';
  }

  // 默认: 已创建
  return 'created';
}

/**
 * 判断项目是否可以编辑故事内容
 * @param {Object} project - 项目对象
 * @returns {boolean} 是否可以编辑
 */
function canEditStory(project) {
  const status = calculateStatus(project.phaseStatus);
  return status === 'created' || status === 'analyzed';
}

/**
 * 判断项目是否可以继续生成
 * @param {Object} project - 项目对象
 * @returns {boolean} 是否可以继续生成
 */
function canContinueGenerate(project) {
  const status = calculateStatus(project.phaseStatus);

  // 如果正在生成中，不能继续
  if (status.includes('generating')) {
    return false;
  }

  // 如果已经完成，不能继续
  if (status === 'completed') {
    return false;
  }

  return true;
}

/**
 * 判断项目是否可以推送到远程
 * @param {Object} project - 项目对象
 * @returns {boolean} 是否可以推送
 */
function canPushToRemote(project) {
  const status = calculateStatus(project.phaseStatus);

  // 必须已完成
  if (status !== 'completed') {
    return false;
  }

  // 必须已发布
  if (project._type !== 'published') {
    return false;
  }

  // 检查所有资源是否有远程URL
  if (!project.pages || project.pages.length === 0) {
    return false;
  }

  const allPagesHaveRemoteUrl = project.pages.every(page => page.remote_url);
  const allPagesHaveRemoteAudio = project.pages.every(page => page.remote_audio_id);

  return allPagesHaveRemoteUrl && allPagesHaveRemoteAudio;
}

/**
 * 获取状态的显示信息
 * @param {string} status - 状态字符串
 * @returns {Object} 显示信息 { label, color, icon }
 */
function getStatusDisplayInfo(status) {
  const statusMap = {
    'created': {
      label: '已创建',
      color: 'gray',
      icon: '📝'
    },
    'analyzed': {
      label: '已分析',
      color: 'blue',
      icon: '📊'
    },
    'character_generating': {
      label: '角色生成中',
      color: 'orange',
      icon: '👥'
    },
    'character_completed': {
      label: '角色已完成',
      color: 'green',
      icon: '✅'
    },
    'storyboard_generating': {
      label: '分镜生成中',
      color: 'orange',
      icon: '🎬'
    },
    'storyboard_completed': {
      label: '分镜已完成',
      color: 'green',
      icon: '✅'
    },
    'audio_generating': {
      label: '音频生成中',
      color: 'orange',
      icon: '🔊'
    },
    'completed': {
      label: '已完成',
      color: 'darkgreen',
      icon: '🎉'
    }
  };

  return statusMap[status] || {
    label: '未知',
    color: 'gray',
    icon: '❓'
  };
}

/**
 * 获取状态对应的阶段进度
 * @param {string} status - 状态字符串
 * @returns {number} 进度百分比 (0-100)
 */
function getStatusProgress(status) {
  const progressMap = {
    'created': 0,
    'analyzed': 25,
    'character_generating': 37,
    'character_completed': 50,
    'storyboard_generating': 62,
    'storyboard_completed': 75,
    'audio_generating': 87,
    'completed': 100
  };

  return progressMap[status] || 0;
}

module.exports = {
  calculateStatus,
  canEditStory,
  canContinueGenerate,
  canPushToRemote,
  getStatusDisplayInfo,
  getStatusProgress
};
