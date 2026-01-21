/**
 * 批量保存成品 API
 */

import { canContinueGenerate } from '../../../lib/status-utils';
import { promises } from 'fs';
import path from 'path';

const PROJECTS_DIR = path.join(process.cwd(), 'data/projects');

async function loadProject(projectId) {
  const projectPath = path.join(PROJECTS_DIR, `${projectId}.json`);
  const content = await promises.readFile(projectPath, 'utf-8');
  return JSON.parse(content);
}

async function saveProject(project) {
  const projectPath = path.join(PROJECTS_DIR, `${project.id}.json`);
  await promises.writeFile(projectPath, JSON.stringify(project, null, 2));
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
        error: '请选择要保存的故事'
      });
    }

    console.log(`💾 [批量工厂-${requestId}] 批量保存 ${storyIds.length} 个故事`);

    const results = [];
    let saved = 0;
    let failed = 0;

    for (const storyId of storyIds) {
      const project = await loadProject(storyId);

      // 检查是否可以保存（音频必须生成完毕）
      if (project.phaseStatus[4] !== 'completed') {
        results.push({
          id: storyId,
          title: project.title,
          status: 'failed',
          reason: '音频尚未生成完毕'
        });
        failed++;
        continue;
      }

      try {
        // 调用现有的保存项目 API
        const response = await fetch('http://localhost:3000/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project,
            type: 'published'
          })
        });

        const result = await response.json();

        if (result.success) {
          results.push({
            id: storyId,
            title: project.title,
            status: 'success'
          });
          saved++;
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
        error: '部分故事保存失败',
        data: {
          total: storyIds.length,
          saved,
          failed,
          details: results
        }
      });
    }

    console.log(`✅ [批量工厂-${requestId}] 批量保存完成: ${saved}/${storyIds.length}`);

    return res.status(200).json({
      success: true,
      data: {
        total: storyIds.length,
        saved,
        failed,
        details: results
      }
    });

  } catch (error) {
    console.error(`❌ [批量工厂-${requestId}] 批量保存失败:`, error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
