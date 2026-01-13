/**
 * 项目管理 API
 * GET - 获取项目列表
 * POST - 保存项目（草稿或成品）
 * DELETE - 删除项目
 */

import fs from 'fs';
import path from 'path';

// 项目存储目录
const PROJECTS_DIR = path.join(process.cwd(), 'data', 'projects');

// 生成随机项目ID（8位字母+数字组合）
function generateProjectId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// 确保目录存在
function ensureDir() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
}

// 获取项目索引文件路径
function getIndexPath() {
  return path.join(PROJECTS_DIR, 'index.json');
}

// 读取项目索引
function readIndex() {
  ensureDir();
  const indexPath = getIndexPath();
  if (fs.existsSync(indexPath)) {
    return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  }
  return { drafts: [], published: [] };
}

// 写入项目索引
function writeIndex(index) {
  ensureDir();
  fs.writeFileSync(getIndexPath(), JSON.stringify(index, null, 2));
}

// 获取项目文件路径
function getProjectPath(projectId) {
  return path.join(PROJECTS_DIR, `${projectId}.json`);
}

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET': {
        // 获取项目列表
        const { type } = req.query; // 'draft' | 'published' | 'all'
        const index = readIndex();

        // 根据是否指定 type，返回不同格式
        // type=all 或 未指定时：返回 {drafts: [], published: []} 格式
        // type=draft 或 type=published 时：返回具体数组
        if (type === 'draft') {
          // 返回草稿数组
          const projects = [];
          for (const item of index.drafts) {
            const projectPath = getProjectPath(item.id);
            if (fs.existsSync(projectPath)) {
              const project = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
              projects.push({
                ...project,
                _type: 'draft',
                _meta: item
              });
            }
          }
          projects.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
          return res.status(200).json({ success: true, data: projects });
        }

        if (type === 'published') {
          // 返回成品数组
          const projects = [];
          for (const item of index.published) {
            const projectPath = getProjectPath(item.id);
            if (fs.existsSync(projectPath)) {
              const project = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
              projects.push({
                ...project,
                _type: 'published',
                _meta: item
              });
            }
          }
          projects.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
          return res.status(200).json({ success: true, data: projects });
        }

        // type=all 或 未指定：返回 {drafts: [], published: []} 格式
        const result = {
          drafts: [],
          published: []
        };

        for (const item of index.drafts) {
          const projectPath = getProjectPath(item.id);
          if (fs.existsSync(projectPath)) {
            const project = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
            result.drafts.push({
              ...project,
              _type: 'draft',
              _meta: item
            });
          }
        }

        for (const item of index.published) {
          const projectPath = getProjectPath(item.id);
          if (fs.existsSync(projectPath)) {
            const project = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
            result.published.push({
              ...project,
              _type: 'published',
              _meta: item
            });
          }
        }

        // 按更新时间排序
        result.drafts.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        result.published.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        return res.status(200).json({
          success: true,
          data: result
        });
      }

      case 'POST': {
        // 保存项目
        const { project, type = 'draft' } = req.body;

        if (!project) {
          return res.status(400).json({
            success: false,
            error: '缺少项目数据'
          });
        }

        // 生成或使用现有ID
        const projectId = project.id || generateProjectId();
        const now = new Date().toISOString();

        const projectData = {
          ...project,
          id: projectId,
          updated_at: now,
          created_at: project.created_at || now
        };

        // 保存项目文件
        ensureDir();
        fs.writeFileSync(
          getProjectPath(projectId),
          JSON.stringify(projectData, null, 2)
        );

        // 更新索引
        const index = readIndex();
        const meta = {
          id: projectId,
          title: project.title || '未命名绘本',
          updated_at: now,
          pageCount: project.pages?.length || 0,
          coverImage: project.pages?.[0]?.image_url || null,
          phaseStatus: project.phaseStatus
        };

        if (type === 'draft') {
          // 更新或添加到草稿
          const existingIndex = index.drafts.findIndex(d => d.id === projectId);
          if (existingIndex >= 0) {
            index.drafts[existingIndex] = meta;
          } else {
            index.drafts.unshift(meta);
          }
          // 如果之前是成品，从成品列表移除
          index.published = index.published.filter(p => p.id !== projectId);
        } else if (type === 'published') {
          // 添加到成品
          const existingIndex = index.published.findIndex(p => p.id === projectId);
          if (existingIndex >= 0) {
            index.published[existingIndex] = meta;
          } else {
            index.published.unshift(meta);
          }
          // 从草稿列表移除
          index.drafts = index.drafts.filter(d => d.id !== projectId);
        }

        writeIndex(index);

        console.log(`💾 [Projects] 保存项目: ${projectId} (${type})`);

        return res.status(200).json({
          success: true,
          data: {
            id: projectId,
            type,
            saved_at: now
          }
        });
      }

      case 'DELETE': {
        // 删除项目
        const { id } = req.query;

        if (!id) {
          return res.status(400).json({
            success: false,
            error: '缺少项目ID'
          });
        }

        // 删除项目文件
        const projectPath = getProjectPath(id);
        if (fs.existsSync(projectPath)) {
          fs.unlinkSync(projectPath);
        }

        // 更新索引
        const index = readIndex();
        index.drafts = index.drafts.filter(d => d.id !== id);
        index.published = index.published.filter(p => p.id !== id);
        writeIndex(index);

        console.log(`🗑️ [Projects] 删除项目: ${id}`);

        return res.status(200).json({
          success: true,
          data: { id }
        });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({
          success: false,
          error: `Method ${method} Not Allowed`
        });
    }
  } catch (error) {
    console.error('❌ [Projects] 错误:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
