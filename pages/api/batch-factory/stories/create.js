/**
 * 新增故事 API
 * 在批量工厂中创建新项目
 */

import { promises } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const PROJECTS_DIR = path.join(process.cwd(), 'data/projects');
const INDEX_FILE = path.join(PROJECTS_DIR, 'index.json');

export default async function handler(req, res) {
  const requestId = Date.now();

  try {
    // 只接受 POST 请求
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { title, rawStory } = req.body;

    // 验证必填字段
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: '请输入故事标题'
      });
    }

    if (!rawStory || !rawStory.trim()) {
      return res.status(400).json({
        success: false,
        error: '请输入故事内容'
      });
    }

    // 验证故事长度（至少50字）
    if (rawStory.trim().length < 50) {
      return res.status(400).json({
        success: false,
        error: '故事内容至少需要50个字符'
      });
    }

    console.log(`📝 [批量工厂-${requestId}] 创建新故事: "${title.trim()}"`);

    // 生成唯一ID
    const projectId = `project_${Date.now()}`;

    // 创建项目对象
    const project = {
      id: projectId,
      title: title.trim(),
      story_name: title.trim(), // 初始时与 title 相同
      rawStory: rawStory.trim(),
      _type: 'draft',
      phaseStatus: {}, // 空对象，表示已创建
      assets: [],
      pages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 确保目录存在
    await promises.mkdir(PROJECTS_DIR, { recursive: true });

    // 保存项目文件
    const projectPath = path.join(PROJECTS_DIR, `${projectId}.json`);
    await promises.writeFile(projectPath, JSON.stringify(project, null, 2));

    // 更新索引文件
    let index = { drafts: [], published: [] };
    try {
      const indexContent = await promises.readFile(INDEX_FILE, 'utf-8');
      index = JSON.parse(indexContent);
    } catch (error) {
      console.log('📄 [批量工厂-${requestId}] 索引文件不存在，将创建新的');
    }

    // 添加到草稿列表
    index.drafts.push(project);
    await promises.writeFile(INDEX_FILE, JSON.stringify(index, null, 2));

    console.log(`✅ [批量工厂-${requestId}] 故事创建成功: ${projectId}`);

    return res.status(200).json({
      success: true,
      data: {
        id: projectId,
        title: project.title,
        status: 'created',
        message: '故事创建成功'
      }
    });

  } catch (error) {
    console.error(`❌ [批量工厂-${requestId}] 创建故事失败:`, error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
