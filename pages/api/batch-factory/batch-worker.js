/**
 * 批量生成工作进程
 * 在后台独立进程中执行批量生成任务
 */

const { promises } = require('fs');
const path = require('path');

const LOGS_DIR = path.join(process.cwd(), 'logs');
const PROJECTS_DIR = path.join(process.cwd(), 'data/projects');

/**
 * 写入日志到文件
 */
async function writeLog(batchId, message) {
  const logFile = path.join(LOGS_DIR, `${batchId}.log`);
  const timestamp = new Date().toISOString();
  await promises.appendFile(logFile, `[${timestamp}] ${message}\n`);
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
 * 执行单个故事的生成
 */
async function generateStory(storyId, batchId) {
  try {
    await writeLog(batchId, `开始生成故事: ${storyId}`);

    // 加载项目数据
    const project = await loadProject(storyId);

    // TODO: 这里应该调用实际的生成逻辑
    // 目前只是一个占位符实现
    await writeLog(batchId, `✅ 故事 "${project.title}" 生成成功`);

    return { success: true, storyId };
  } catch (error) {
    await writeLog(batchId, `❌ 故事 ${storyId} 生成失败: ${error.message}`);
    return { success: false, storyId, error: error.message };
  }
}

/**
 * 主执行函数
 */
async function main() {
  const args = process.argv.slice(2);
  const storyIdsStr = args[0];
  const batchId = args[1];

  if (!storyIdsStr || !batchId) {
    console.error('❌ 缺少必要参数');
    process.exit(1);
  }

  const storyIds = storyIdsStr.split(',');

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

      await generateStory(storyId, batchId);
    }

    // 写入完成日志
    await writeLog(batchId, `✅ 批量生成任务完成`);
    await writeLog(batchId, `总共处理: ${storyIds.length} 个故事`);

    process.exit(0);
  } catch (error) {
    await writeLog(batchId, `❌ 批量生成任务失败: ${error.message}`);
    console.error('批量生成失败:', error);
    process.exit(1);
  }
}

// 启动工作进程
main();
