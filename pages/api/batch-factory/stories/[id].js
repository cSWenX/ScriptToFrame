/**
 * 编辑故事 API
 */

import { promises } from 'fs';
import path from 'path';
import { canEditStory } from '../../../../lib/status-utils';

const PROJECTS_DIR = path.join(process.cwd(), 'data/projects');

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    if (req.method !== 'PUT') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { title, rawStory } = req.body;

    // 验证
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: '请输入故事标题' });
    }

    if (rawStory && rawStory.trim().length < 50) {
      return res.status(400).json({ success: false, error: '故事内容至少需要50个字符' });
    }

    // 读取项目
    const projectPath = path.join(PROJECTS_DIR, `${id}.json`);
    const content = await promises.readFile(projectPath, 'utf-8');
    const project = JSON.parse(content);

    // 检查是否可以编辑
    if (!canEditStory(project)) {
      return res.status(400).json({
        success: false,
        error: '当前状态不允许编辑故事内容'
      });
    }

    // 更新字段
    if (title) {
      project.title = title.trim();
      project.story_name = title.trim();
    }

    if (rawStory) {
      project.rawStory = rawStory.trim();
    }

    project.updated_at = new Date().toISOString();

    // 保存
    await promises.writeFile(projectPath, JSON.stringify(project, null, 2));

    console.log(`✅ [批量工厂] 故事编辑成功: ${id}`);

    return res.status(200).json({
      success: true,
      data: {
        id: project.id,
        title: project.title,
        message: '故事更新成功'
      }
    });

  } catch (error) {
    console.error('❌ 编辑故事失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
