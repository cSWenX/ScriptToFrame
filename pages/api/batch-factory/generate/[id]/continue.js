/**
 * 继续生成 API
 * 自动执行所有剩余步骤，直到音频生成完毕
 */

import { calculateStatus } from '../../../../../lib/status-utils';
import { promises } from 'fs';
import path from 'path';

const PROJECTS_DIR = path.join(process.cwd(), 'data/projects');

/**
 * 调用分析剧本 API
 */
async function analyzeScript(project) {
  const response = await fetch('http://localhost:3000/api/intelligent-analyze-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      script: project.rawStory,
      style: project.style_preset || 'watercolor',
      projectId: project.id
    })
  });

  if (!response.ok) {
    throw new Error(`分析剧本失败: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 调用生成角色 API
 */
async function generateCharacters(project) {
  const response = await fetch('http://localhost:3000/api/generate-all-characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: project.id
    })
  });

  if (!response.ok) {
    throw new Error(`生成角色失败: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 调用生成分镜 API
 */
async function generateStoryboard(project) {
  const response = await fetch('http://localhost:3000/api/generate-all-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: project.id
    })
  });

  if (!response.ok) {
    throw new Error(`生成分镜失败: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 调用生成音频 API
 */
async function generateAudio(project) {
  const response = await fetch('http://localhost:3000/api/generate-all-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: project.id
    })
  });

  if (!response.ok) {
    throw new Error(`生成音频失败: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 更新项目的 phaseStatus
 */
async function updateProjectPhaseStatus(projectId, phase, status) {
  const projectPath = path.join(PROJECTS_DIR, `${projectId}.json`);
  const content = await promises.readFile(projectPath, 'utf-8');
  const project = JSON.parse(content);

  project.phaseStatus[phase] = status;
  project.updated_at = new Date().toISOString();

  await promises.writeFile(projectPath, JSON.stringify(project, null, 2));

  return project;
}

/**
 * 读取项目
 */
async function loadProject(projectId) {
  const projectPath = path.join(PROJECTS_DIR, `${projectId}.json`);
  const content = await promises.readFile(projectPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * 保存项目
 */
async function saveProject(project) {
  const projectPath = path.join(PROJECTS_DIR, `${project.id}.json`);
  await promises.writeFile(projectPath, JSON.stringify(project, null, 2));
}

export default async function handler(req, res) {
  const requestId = Date.now();
  const { id } = req.query;

  try {
    // 只接受 POST 请求
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    if (!id) {
      return res.status(400).json({ success: false, error: '缺少项目ID' });
    }

    console.log(`🚀 [批量工厂-${requestId}] 开始继续生成: 项目ID=${id}`);

    // 读取项目
    const project = await loadProject(id);

    // 计算当前状态
    const currentStatus = calculateStatus(project.phaseStatus);

    console.log(`📊 [批量工厂-${requestId}] 当前状态: ${currentStatus}`);

    // 如果正在生成中，返回错误
    if (currentStatus.includes('generating')) {
      return res.status(400).json({
        success: false,
        error: '当前正在生成中，请等待完成'
      });
    }

    // 如果已经完成，返回成功
    if (currentStatus === 'completed') {
      return res.status(200).json({
        success: true,
        data: {
          status: 'completed',
          phaseStatus: project.phaseStatus,
          message: '已经完成'
        }
      });
    }

    // 设置 SSE 流式响应
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendProgress = (progress, message) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', progress, message })}\n\n`);
    };

    try {
      // 根据当前状态执行相应步骤
      switch (currentStatus) {
        case 'created':
          // 步骤1: 分析剧本
          sendProgress(10, '开始分析剧本...');
          project.phaseStatus[1] = 'in_progress';
          await saveProject(project);

          const analyzeResult = await analyzeScript(project);
          if (!analyzeResult.success) {
            throw new Error(analyzeResult.error || '分析剧本失败');
          }

          // 等待流式响应完成
          await new Promise(resolve => setTimeout(resolve, 2000));

          project.phaseStatus[1] = 'completed';
          await saveProject(project);

          sendProgress(30, '✅ 剧本分析完成');
          console.log(`✅ [批量工厂-${requestId}] 剧本分析完成，继续下一步`);

          // 继续下一步
          if (project.phaseStatus[2] !== 'completed') {
            await generateCharacters(project);
          }
          break;

        case 'analyzed':
          // 步骤2: 生成角色
          sendProgress(40, '开始生成角色...');
          project.phaseStatus[2] = 'in_progress';
          await saveProject(project);

          const characterResult = await generateCharacters(project);
          if (!characterResult.success) {
            throw new Error(characterResult.error || '生成角色失败');
          }

          // 等待角色生成完成
          await new Promise(resolve => setTimeout(resolve, 5000));

          project.phaseStatus[2] = 'completed';
          await saveProject(project);

          sendProgress(70, '✅ 角色生成完成');
          console.log(`✅ [批量工厂-${requestId}] 角色生成完成，继续下一步`);

          // 继续下一步
          if (project.phaseStatus[3] !== 'completed') {
            await generateStoryboard(project);
          }
          break;

        case 'character_completed':
          // 步骤3: 生成分镜
          sendProgress(70, '开始生成分镜...');
          project.phaseStatus[3] = 'in_progress';
          await saveProject(project);

          const storyboardResult = await generateStoryboard(project);
          if (!storyboardResult.success) {
            throw new Error(storyboardResult.error || '生成分镜失败');
          }

          // 等待分镜生成完成
          await new Promise(resolve => setTimeout(resolve, 5000));

          project.phaseStatus[3] = 'completed';
          await saveProject(project);

          sendProgress(90, '✅ 分镜生成完成');
          console.log(`✅ [批量工厂-${requestId}] 分镜生成完成，继续下一步`);

          // 继续下一步
          if (project.phaseStatus[4] !== 'completed') {
            await generateAudio(project);
          }
          break;

        case 'storyboard_completed':
          // 步骤4: 生成音频
          sendProgress(90, '开始生成音频...');
          project.phaseStatus[4] = 'in_progress';
          await saveProject(project);

          const audioResult = await generateAudio(project);
          if (!audioResult.success) {
            throw new Error(audioResult.error || '生成音频失败');
          }

          // 等待音频生成完成
          await new Promise(resolve => setTimeout(resolve, 3000));

          project.phaseStatus[4] = 'completed';
          await saveProject(project);

          sendProgress(100, '✅ 音频生成完成');
          console.log(`✅ [批量工厂-${requestId}] 音频生成完成，全部步骤完成`);
          break;

        default:
          throw new Error(`未知状态: ${currentStatus}`);
      }

      // 重新加载项目并计算最终状态
      const finalProject = await loadProject(id);
      const finalStatus = calculateStatus(finalProject.phaseStatus);

      res.write(`data: ${JSON.stringify({
        type: 'complete',
        data: {
          status: finalStatus,
          phaseStatus: finalProject.phaseStatus,
          message: '生成完成'
        }
      })}\n\n`);

    } catch (error) {
      console.error(`❌ [批量工厂-${requestId}] 继续生成失败:`, error);

      // 标记失败状态
      try {
        const project = await loadProject(id);
        const currentStatus = calculateStatus(project.phaseStatus);

        // 找到当前正在进行的阶段
        let failedPhase = 1;
        if (currentStatus.includes('generating')) {
          if (currentStatus === 'character_generating') failedPhase = 2;
          else if (currentStatus === 'storyboard_generating') failedPhase = 3;
          else if (currentStatus === 'audio_generating') failedPhase = 4;
        }

        project.phaseStatus[failedPhase] = 'failed';
        project.error = {
          phase: failedPhase,
          message: error.message,
          time: new Date().toISOString()
        };

        await saveProject(project);
      } catch (updateError) {
        console.error('更新失败状态时出错:', updateError);
      }

      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error.message
      })}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error(`❌ [批量工厂-${requestId}] 继续生成接口错误:`, error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
