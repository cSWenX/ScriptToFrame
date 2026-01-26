/**
 * 音频代理接口
 * 从远程或本地获取音频资源并返回给前端
 * 优先使用远程音频，如果没有则使用本地音频
 */

export const config = {
  api: {
    responseLimit: false, // 不限制响应大小（音频可能很大）
    timeout: 60000, // 60秒超时
  },
};

export default async function handler(req, res) {
  const requestId = Date.now();

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { pageId, projectId } = req.query;

    if (!pageId) {
      console.error(`❌ [音频代理-${requestId}] 缺少 pageId 参数`);
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: pageId'
      });
    }

    console.log(`🎙️ [音频代理-${requestId}] 收到请求:`, {
      pageId,
      projectId,
      timestamp: new Date().toISOString()
    });

    // 读取项目数据，查找对应的音频URL
    const fs = require('fs');
    const path = require('path');
    const projectsDir = path.join(process.cwd(), 'data', 'projects');

    // 如果提供了projectId，直接读取该项目
    // 否则搜索所有项目
    let project = null;
    let projectPath = null;

    if (projectId) {
      projectPath = path.join(projectsDir, `${projectId}.json`);
      if (fs.existsSync(projectPath)) {
        const data = fs.readFileSync(projectPath, 'utf-8');
        project = JSON.parse(data);
      }
    } else {
      // 搜索所有项目找到匹配的pageId
      const projectFiles = fs.readdirSync(projectsDir)
        .filter(file => file.endsWith('.json') && file !== 'index.json');

      for (const file of projectFiles) {
        const filePath = path.join(projectsDir, file);
        const data = fs.readFileSync(filePath, 'utf-8');
        const tempProject = JSON.parse(data);

        // 在pages中查找匹配的pageId
        const matchedPage = tempProject.pages?.find(p => {
          // 支持多种ID匹配方式
          return p.pageId === pageId ||
                 p.page_index?.toString() === pageId ||
                 p.id === pageId;
        });

        if (matchedPage) {
          project = tempProject;
          projectPath = filePath;
          break;
        }
      }
    }

    if (!project) {
      console.error(`❌ [音频代理-${requestId}] 未找到 pageId: ${pageId}`);
      return res.status(404).json({
        success: false,
        error: '未找到对应的音频资源'
      });
    }

    // 查找匹配的页面
    const page = project.pages.find(p => {
      return p.pageId === pageId ||
             p.page_index?.toString() === pageId ||
             p.id === pageId;
    });

    if (!page) {
      console.error(`❌ [音频代理-${requestId}] 页面不存在`);
      return res.status(404).json({
        success: false,
        error: '音频资源不存在'
      });
    }

    // 优先使用远程音频，回退到本地音频
    const audioUrl = page.remote_audio_url || page.audio_url;

    if (!audioUrl) {
      console.error(`❌ [音频代理-${requestId}] 页面没有音频URL`);
      return res.status(404).json({
        success: false,
        error: '该页面没有音频资源'
      });
    }

    const isRemote = !!page.remote_audio_url;
    console.log(`📍 [音频代理-${requestId}] 找到音频URL: ${audioUrl.substring(0, 80)}... (${isRemote ? '远程' : '本地'})`);

    // 判断是本地路径还是远程URL
    let audioBuffer = null;
    let contentType = 'audio/wav';

    if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
      // 远程URL - 通过fetch获取
      console.log(`🌐 [音频代理-${requestId}] 从远程获取音频...`);

      const response = await fetch(audioUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Toby-Audio-Proxy/1.0'
        },
        // 30秒超时
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        console.error(`❌ [音频代理-${requestId}] 远程获取失败: ${response.status}`);
        throw new Error(`远程音频获取失败: ${response.status} ${response.statusText}`);
      }

      // 获取content-type
      contentType = response.headers.get('content-type') || 'audio/wav';

      // 获取音频数据
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);

      console.log(`✅ [音频代理-${requestId}] 远程音频获取成功: ${audioBuffer.length} 字节`);

    } else if (audioUrl.startsWith('/audio/')) {
      // 本地路径 - 从public目录读取
      console.log(`📁 [音频代理-${requestId}] 从本地读取音频...`);

      const localPath = path.join(process.cwd(), 'public', audioUrl);
      console.log(`📂 [音频代理-${requestId}] 本地路径: ${localPath}`);

      if (!fs.existsSync(localPath)) {
        console.error(`❌ [音频代理-${requestId}] 本地文件不存在: ${localPath}`);
        return res.status(404).json({
          success: false,
          error: '本地音频文件不存在'
        });
      }

      // 读取文件
      audioBuffer = fs.readFileSync(localPath);

      // 根据扩展名设置content-type
      if (audioUrl.endsWith('.wav')) {
        contentType = 'audio/wav';
      } else if (audioUrl.endsWith('.mp3')) {
        contentType = 'audio/mpeg';
      } else if (audioUrl.endsWith('.m4a')) {
        contentType = 'audio/mp4';
      } else if (audioUrl.endsWith('.ogg')) {
        contentType = 'audio/ogg';
      }

      console.log(`✅ [音频代理-${requestId}] 本地音频读取成功: ${audioBuffer.length} 字节`);

    } else {
      console.error(`❌ [音频代理-${requestId}] 不支持的URL格式: ${audioUrl}`);
      return res.status(400).json({
        success: false,
        error: '不支持的音频URL格式'
      });
    }

    // 设置响应头并返回音频
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时
    res.setHeader('Content-Length', audioBuffer.length);
    // 支持音频的Range请求（用于进度条）
    res.setHeader('Accept-Ranges', 'bytes');
    res.send(audioBuffer);

    console.log(`📤 [音频代理-${requestId}] 音频已返回: ${contentType}, ${audioBuffer.length} 字节`);

  } catch (error) {
    console.error(`❌ [音频代理-${requestId}] 代理失败:`, {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });

    // 返回错误
    res.status(500).json({
      success: false,
      error: `音频代理失败: ${error.message}`
    });
  }
}
