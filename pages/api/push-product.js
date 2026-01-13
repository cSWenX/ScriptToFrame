/**
 * 产品推送API
 * 将已发布的绘本产品推送到远程平台
 */

import fs from 'fs';
import path from 'path';

// 项目存储目录
const PROJECTS_DIR = path.join(process.cwd(), 'data', 'projects');

// 远程产品保存API
const REMOTE_PRODUCT_API = 'http://61.155.227.20:19092/chatAI/book/api/product/save';

// 获取项目文件路径
function getProjectPath(projectId) {
  return path.join(PROJECTS_DIR, `${projectId}.json`);
}

// 读取项目数据
function readProject(projectId) {
  const projectPath = getProjectPath(projectId);
  if (fs.existsSync(projectPath)) {
    return JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
  }
  return null;
}

// 提取远程ID（从URL中解析）
function extractRemoteId(url) {
  if (!url) return null;
  // URL格式: http://61.155.227.20:19092/chatai/aiBookPicture/20260112190104b0dc9ec783c5f27b.png
  // 从文件名中提取ID部分
  const match = url.match(/\/([^\/]+)\.\w+$/);
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  const requestId = Date.now();

  console.log(`🚀 [产品推送-${requestId}] 收到请求:`, {
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { projectId } = req.body;

    if (!projectId) {
      console.error(`❌ [产品推送-${requestId}] 缺少 projectId, req.body =`, req.body);
      return res.status(400).json({
        success: false,
        error: '缺少 projectId 参数'
      });
    }

    console.log(`📦 [产品推送-${requestId}] 开始推送产品: ${projectId}`);

    // 读取项目数据
    const project = readProject(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 验证必要的资源
    if (!project.pages || project.pages.length === 0) {
      return res.status(400).json({
        success: false,
        error: '项目没有页面数据'
      });
    }

    // 构建产品数据
    const prodName = project.title || '未命名绘本';
    // 使用项目ID作为产品代码
    const prodCode = projectId;

    // 封面ID（使用第一页的远程ID）
    const coverPage = project.pages[0];
    const faceId = coverPage?.remote_id || extractRemoteId(coverPage?.remote_url) || extractRemoteId(coverPage?.image_url) || '1';

    // 构建内容列表
    const contentList = project.pages.map((page, index) => {
      // 获取图片ID（优先使用remote_id）
      const pictureId = page.remote_id || extractRemoteId(page.remote_url) || extractRemoteId(page.image_url) || `${index + 1}`;

      // 获取音频ID（如果存在音频）
      let audioId = null;
      if (page.audio_url) {
        audioId = page.remote_audio_id || extractRemoteId(page.remote_audio_url) || extractRemoteId(page.audio_url);
      }

      return {
        pictureTxt: page.tts_text,
        pictureId: pictureId,
        audioId: audioId || ''
      };
    }).filter(item => item.pictureId); // 过滤掉没有图片ID的项

    // 分类代码（默认为1）
    const categoryCode = '1';

    // 产品描述
    const des = project.rawStory?.substring(0, 200) || project.title || '绘本作品';

    const requestData = {
      prodName,
      prodCode,
      faceId,
      contentList,
      categoryCode,
      des
    };

    console.log(`📤 [产品推送-${requestId}] 发送数据到远程:`, {
      prodName,
      prodCode,
      faceId,
      contentCount: contentList.length,
      categoryCode,
      desLength: des.length
    });

    // 输出完整的请求数据（方便调试）
    console.log(`📤 [产品推送-${requestId}] 完整请求数据:`, JSON.stringify(requestData, null, 2));

    // 调用远程API（设置30秒超时）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(REMOTE_PRODUCT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const result = await response.json();

    console.log(`📥 [产品推送-${requestId}] 远程响应:`, {
      status: response.status,
      code: result.code,
      msg: result.msg
    });

    if (response.ok && result.code === 10000) {
      console.log(`✅ [产品推送-${requestId}] 推送成功`);
      return res.status(200).json({
        success: true,
        data: {
          message: result.msg || '推送成功'
        }
      });
    } else {
      console.error(`❌ [产品推送-${requestId}] 推送失败:`, result);
      return res.status(500).json({
        success: false,
        error: result.msg || `远程服务器错误 (code: ${result.code})`
      });
    }

  } catch (error) {
    console.error(`❌ [产品推送-${requestId}] 请求失败:`, {
      error: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });

    return res.status(500).json({
      success: false,
      error: error.message || '产品推送失败',
      details: error.stack
    });
  }
}
