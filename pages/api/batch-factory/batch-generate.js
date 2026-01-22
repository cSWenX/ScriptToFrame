/**
 * 批量生成绘本 API
 * 后台异步执行多个项目的生成任务
 */

import { promises } from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'logs');
const PROJECTS_DIR = path.join(process.cwd(), 'data/projects');

// 正在执行的批量任务
const runningTasks = new Map();

/**
 * 写入日志到文件
 */
async function writeLog(batchId, message) {
  try {
    const logFile = path.join(LOGS_DIR, `${batchId}.log`);
    const timestamp = new Date().toISOString();
    await promises.appendFile(logFile, `[${timestamp}] ${message}\n`);
  } catch (error) {
    console.error('写入日志失败:', error);
  }
}

/**
 * 加载项目数据
 */
async function loadProject(projectId) {
  const projectPath = path.join(PROJECTS_DIR, `${projectId}.json`);
  const content = await promises.readFile(projectPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * 批量生成主函数（后台执行）
 */
async function executeBatchGeneration(storyIds, batchId) {
  try {
    // 确保日志目录存在
    await promises.mkdir(LOGS_DIR, { recursive: true });

    // 写入开始日志
    await writeLog(batchId, `🚀 开始批量生成 ${storyIds.length} 个故事`);
    await writeLog(batchId, `故事列表: ${storyIds.join(', ')}`);

    // 逐个生成故事
    for (let i = 0; i < storyIds.length; i++) {
      const storyId = storyIds[i];
      await writeLog(batchId, `处理进度: ${i + 1}/${storyIds.length}`);

      try {
        await writeLog(batchId, `开始生成故事: ${storyId}`);

        // 加载项目数据
        const project = await loadProject(storyId);

        // TODO: 这里应该调用实际的生成逻辑
        // 目前只是一个占位符实现
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟生成过程

        await writeLog(batchId, `✅ 故事 "${project.title}" 生成成功`);
      } catch (error) {
        await writeLog(batchId, `❌ 故事 ${storyId} 生成失败: ${error.message}`);
      }
    }

    // 写入完成日志
    await writeLog(batchId, `✅ 批量生成任务完成`);
    await writeLog(batchId, `总共处理: ${storyIds.length} 个故事`);

    // 从运行任务列表中移除
    runningTasks.delete(batchId);

  } catch (error) {
    await writeLog(batchId, `❌ 批量生成任务失败: ${error.message}`);
    console.error('批量生成失败:', error);
    runningTasks.delete(batchId);
  }
}

export default async function handler(req, res) {
  const requestId = Date.now();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { storyIds } = req.body;

    if (!storyIds || !Array.isArray(storyIds) || storyIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请选择要生成的故事'
      });
    }

    console.log(`🚀 [批量工厂-${requestId}] 开始批量生成 ${storyIds.length} 个故事`);

    // 生成批次ID
    const batchId = `batch_${Date.now()}`;

    // 启动后台任务（不阻塞响应）
    executeBatchGeneration(storyIds, batchId);

    // 标记任务为运行中
    runningTasks.set(batchId, true);

    console.log(`✅ [批量工厂-${requestId}] 批量生成任务已启动: batchId=${batchId}`);

    return res.status(200).json({
      success: true,
      data: {
        batchId,
        total: storyIds.length,
        message: '批量生成任务已启动，请在后台执行'
      }
    });

  } catch (error) {
    console.error(`❌ [批量工厂-${requestId}] 批量生成失败:`, error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
