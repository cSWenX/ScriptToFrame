/**
 * 批量推送绘本 API
 */

import { canPushToRemote } from '../../../lib/status-utils';
import { promises } from 'fs';
import path from 'path';

const PROJECTS_DIR = path.join(process.cwd(), 'data/projects');

async function loadProject(projectId) {
  const projectPath = path.join(PROJECTS_DIR, `${projectId}.json`);
  const content = await promises.readFile(projectPath, 'utf-8');
  return JSON.parse(content);
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
        error: '请选择要推送的故事'
      });
    }

    console.log(`☁️ [批量工厂-${requestId}] 批量推送 ${storyIds.length} 个故事`);

    const results = [];
    let pushed = 0;
    let failed = 0;

    for (const storyId of storyIds) {
      const project = await loadProject(storyId);

      // 检查是否可以推送
      if (!canPushToRemote(project)) {
        const status = calculateStatus(project.phaseStatus);

        let reason = '';
        if (status !== 'completed') {
          reason = `绘本状态不正确 (当前: ${status})`;
        } else if (project._type !== 'published') {
          reason = '故事未发布';
        } else {
          reason = '部分资源未推送到远程';
        }

        results.push({
          id: storyId,
          title: project.title,
          status: 'failed',
          reason
        });
        failed++;
        continue;
      }

      try {
        // 调用推送产品 API
        const response = await fetch('http://localhost:3000/api/push-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: storyId
          })
        });

        const result = await response.json();

        if (result.success) {
          results.push({
            id: storyId,
            title: project.title,
            status: 'success'
          });
          pushed++;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        results.push({
          id: storyId,
          title: project.title,
          status: 'failed',
          reason: error.message
        });
        failed++;
      }
    }

    if (failed > 0) {
      return res.status(400).json({
        success: false,
        error: '部分故事推送失败',
        data: {
          total: storyIds.length,
          pushed,
          failed,
          details: results
        }
      });
    }

    console.log(`✅ [批量工厂-${requestId}] 批量推送完成: ${pushed}/${storyIds.length}`);

    return res.status(200).json({
      success: true,
      data: {
        total: storyIds.length,
        pushed,
        failed,
        details: results
      }
    });

  } catch (error) {
    console.error(`❌ [批量工厂-${requestId}] 批量推送失败:`, error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
