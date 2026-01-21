/**
 * 获取故事列表 API
 * 用于批量工厂页面
 */

import { calculateStatus } from '../../../../lib/status-utils';
import { promises } from 'fs';
import path from 'path';

const PROJECTS_DIR = path.join(process.cwd(), 'data/projects');

export default async function handler(req, res) {
  const requestId = Date.now();

  try {
    // 只接受 GET 请求
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // 获取筛选参数
    const { status = 'all' } = req.query;

    console.log(`📋 [批量工厂-${requestId}] 获取故事列表，筛选条件: ${status}`);

    // 读取所有项目文件
    let projectFiles;
    try {
      projectFiles = await promises.readdir(PROJECTS_DIR);
    } catch (error) {
      console.log(`📁 [批量工厂-${requestId}] 项目目录不存在，创建中...`);
      await promises.mkdir(PROJECTS_DIR, { recursive: true });
      projectFiles = [];
    }

    // 过滤 JSON 文件
    const jsonFiles = projectFiles.filter(file => file.endsWith('.json'));

    // 读取所有项目数据
    const projects = [];
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(PROJECTS_DIR, file);
        const content = await promises.readFile(filePath, 'utf-8');
        const project = JSON.parse(content);

        // 动态计算 status
        const status = calculateStatus(project.phaseStatus);

        projects.push({
          ...project,
          status // 不存储到文件中，只用于显示
        });
      } catch (error) {
        console.error(`❌ 读取项目文件失败 ${file}:`, error.message);
      }
    }

    // 按更新时间倒序排序
    projects.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    // 根据筛选条件过滤
    let filteredProjects = projects;
    if (status !== 'all') {
      filteredProjects = projects.filter(p => p.status === status);
    }

    console.log(`✅ [批量工厂-${requestId}] 返回 ${filteredProjects.length} 个故事（总共 ${projects.length} 个）`);

    return res.status(200).json({
      success: true,
      data: {
        stories: filteredProjects,
        total: filteredProjects.length,
        allTotal: projects.length
      }
    });

  } catch (error) {
    console.error(`❌ [批量工厂-${requestId}] 获取故事列表失败:`, error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
