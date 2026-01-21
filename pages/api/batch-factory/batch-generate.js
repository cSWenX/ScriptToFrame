/**
 * 批量生成绘本 API
 * 后台异步执行多个项目的生成任务
 */

import { promises } from 'fs';
import path from 'path';
import { fork } from 'child_process';

const LOGS_DIR = path.join(process.cwd(), 'logs');

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

    // 确保日志目录存在
    await promises.mkdir(LOGS_DIR, { recursive: true });

    // 创建后台进程执行批量生成
    const logFile = path.join(LOGS_DIR, `${batchId}.log`);

    // 使用子进程在后台执行
    const child = fork(path.join(__dirname, 'batch-worker.js'), [storyIds.join(','), batchId], {
      detached: true,
      stdio: 'ignore'
    });

    child.unref();

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
