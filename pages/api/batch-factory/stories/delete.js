/**
 * 删除故事 API
 * 支持单个删除和批量删除
 */

import { promises } from 'fs';
import path from 'path';
import { existsSync } from 'fs';

const PROJECTS_DIR = path.join(process.cwd(), 'data/projects');
const INDEX_FILE = path.join(PROJECTS_DIR, 'index.json');

export default async function handler(req, res) {
  const requestId = Date.now();

  try {
    // 只接受 DELETE 和 POST 请求
    if (req.method !== 'DELETE' && req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { storyIds, storyId } = req.body;

    // 支持 storyIds（批量）和 storyId（单个）两种参数
    const idsToDelete = storyIds || (storyId ? [storyId] : []);

    if (!idsToDelete || idsToDelete.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供要删除的故事ID'
      });
    }

    console.log(`🗑️ [批量工厂-${requestId}] 删除故事: ${idsToDelete.join(', ')}`);

    // 确保目录存在
    await promises.mkdir(PROJECTS_DIR, { recursive: true });

    // 读取索引文件
    let index = { drafts: [], published: [] };
    try {
      const indexContent = await promises.readFile(INDEX_FILE, 'utf-8');
      index = JSON.parse(indexContent);
    } catch (error) {
      console.log('⚠️ [批量工厂] 索引文件不存在或为空');
    }

    const deletedStories = [];
    const failedStories = [];

    // 遍历要删除的ID
    for (const storyId of idsToDelete) {
      try {
        const projectPath = path.join(PROJECTS_DIR, `${storyId}.json`);

        // 检查项目文件是否存在
        if (!existsSync(projectPath)) {
          console.warn(`⚠️ [批量工厂] 项目文件不存在: ${storyId}`);
          failedStories.push({ id: storyId, reason: '项目文件不存在' });
          continue;
        }

        // 删除项目文件
        await promises.unlink(projectPath);
        console.log(`✅ [批量工厂] 已删除项目文件: ${storyId}`);

        // 从索引中移除
        index.drafts = index.drafts.filter(p => p.id !== storyId);
        index.published = index.published.filter(p => p.id !== storyId);

        deletedStories.push(storyId);

        // 尝试删除相关的资源文件（如果存在）
        const generatedDir = path.join(process.cwd(), 'public/generated', storyId);
        if (existsSync(generatedDir)) {
          try {
            await promises.rm(generatedDir, { recursive: true, force: true });
            console.log(`✅ [批量工厂] 已删除资源目录: ${storyId}`);
          } catch (error) {
            console.warn(`⚠️ [批量工厂] 删除资源目录失败: ${storyId}`, error.message);
          }
        }

        // 尝试删除音频文件（如果存在）
        const audioDir = path.join(process.cwd(), 'public/audio', storyId);
        if (existsSync(audioDir)) {
          try {
            await promises.rm(audioDir, { recursive: true, force: true });
            console.log(`✅ [批量工厂] 已删除音频目录: ${storyId}`);
          } catch (error) {
            console.warn(`⚠️ [批量工厂] 删除音频目录失败: ${storyId}`, error.message);
          }
        }

      } catch (error) {
        console.error(`❌ [批量工厂] 删除失败: ${storyId}`, error);
        failedStories.push({ id: storyId, reason: error.message });
      }
    }

    // 保存更新后的索引
    await promises.writeFile(INDEX_FILE, JSON.stringify(index, null, 2));

    console.log(`✅ [批量工厂-${requestId}] 删除完成: 成功 ${deletedStories.length} 个, 失败 ${failedStories.length} 个`);

    return res.status(200).json({
      success: true,
      data: {
        deleted: deletedStories.length,
        deletedIds: deletedStories,
        failed: failedStories.length,
        failedDetails: failedStories,
        message: `成功删除 ${deletedStories.length} 个故事${failedStories.length > 0 ? `，${failedStories.length} 个失败` : ''}`
      }
    });

  } catch (error) {
    console.error(`❌ [批量工厂-${requestId}] 删除故事失败:`, error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
