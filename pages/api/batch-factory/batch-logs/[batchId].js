/**
 * 获取批量执行日志 API
 */

import { promises } from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'logs');

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { batchId } = req.query;
    const tail = parseInt(req.query.tail) || 100;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        error: '缺少批次ID'
      });
    }

    const logFile = path.join(LOGS_DIR, `${batchId}.log`);

    // 检查日志文件是否存在
    try {
      await promises.access(logFile);
    } catch {
      return res.status(404).json({
        success: false,
        error: '日志文件不存在'
      });
    }

    // 读取最后 N 行
    const content = await promises.readFile(logFile, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const tailLines = lines.slice(-tail);

    // 解析统计信息
    let total = 0;
    let completed = 0;
    let failed = 0;

    for (const line of lines) {
      if (line.includes('🚀 开始批量生成')) {
        const match = line.match(/(\d+) 个故事/);
        if (match) total = parseInt(match[1]);
      } else if (line.includes('生成成功')) {
        completed++;
      } else if (line.includes('生成失败')) {
        failed++;
      }
    }

    const inProgress = total - completed - failed;

    return res.status(200).json({
      success: true,
      data: {
        batchId,
        logs: tailLines,
        summary: {
          total,
          completed,
          failed,
          inProgress
        }
      }
    });

  } catch (error) {
    console.error('❌ 读取日志失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
