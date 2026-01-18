/**
 * 项目下载打包 API
 * 将项目的图片、音频、文字打包成 ZIP 文件下载
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { projectId } = req.body;

  if (!projectId) {
    return res.status(400).json({ success: false, error: '缺少项目ID' });
  }

  try {
    // 读取项目数据
    const fs = require('fs').promises;
    const path = require('path');

    const projectPath = path.join(process.cwd(), 'data', 'projects', `${projectId}.json`);
    const projectData = JSON.parse(await fs.readFile(projectPath, 'utf-8'));

    // 创建 ZIP 文件
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();

    // 项目信息
    const projectName = projectData.story_name || projectData.title || '未命名绘本';
    const zipFileName = `${projectId}-${projectName}.zip`;

    // 添加图片
    if (projectData.pages && Array.isArray(projectData.pages)) {
      for (let i = 0; i < projectData.pages.length; i++) {
        const page = projectData.pages[i];
        if (page.image_url) {
          // 如果是远程URL或本地路径，需要下载/读取文件
          if (page.image_url.startsWith('http')) {
            // 远程图片，尝试下载
            try {
              const response = await fetch(page.image_url);
              const buffer = await response.arrayBuffer();
              const fileName = `page_${i + 1}.png`;
              zip.addFile(fileName, Buffer.from(buffer));
            } catch (e) {
              console.error(`下载图片失败: ${page.image_url}`, e);
            }
          } else if (page.image_url.startsWith('data:')) {
            // base64 图片
            const base64Data = page.image_url.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `page_${i + 1}.png`;
            zip.addFile(fileName, buffer);
          }
        }
      }
    }

    // 添加角色图片
    if (projectData.assets && Array.isArray(projectData.assets)) {
      for (let i = 0; i < projectData.assets.length; i++) {
        const asset = projectData.assets[i];
        if (asset.image_url) {
          if (asset.image_url.startsWith('data:')) {
            const base64Data = asset.image_url.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `character_${asset.name || i}.png`;
            zip.addFile(fileName, buffer);
          }
        }
      }
    }

    // 添加音频
    if (projectData.pages && Array.isArray(projectData.pages)) {
      const audioDir = path.join(process.cwd(), 'public', 'audio', projectId);

      for (let i = 0; i < projectData.pages.length; i++) {
        const page = projectData.pages[i];
        if (page.audio_url) {
          if (page.audio_url.startsWith('/')) {
            // 本地音频路径
            const audioPath = path.join(process.cwd(), 'public', page.audio_url);
            try {
              if (await fs.access(audioPath).then(() => true).catch(() => false)) {
                const audioBuffer = await fs.readFile(audioPath);
                const fileName = `audio_${i + 1}.wav`;
                zip.addFile(fileName, audioBuffer);
              }
            } catch (e) {
              console.error(`读取音频失败: ${audioPath}`, e);
            }
          }
        }
      }
    }

    // 添加文字脚本
    let scriptText = `绘本名称：${projectName}\n`;
    scriptText += `生成时间：${new Date().toLocaleString('zh-CN')}\n`;
    scriptText += `\n========================================\n\n`;

    if (projectData.pages && Array.isArray(projectData.pages)) {
      for (let i = 0; i < projectData.pages.length; i++) {
        const page = projectData.pages[i];
        scriptText += `第 ${i + 1} 页\n`;
        scriptText += `----------------------------------------\n`;

        if (page.rationale) {
          scriptText += `分页说明：${page.rationale}\n`;
        }

        if (page.voice_script && Array.isArray(page.voice_script)) {
          scriptText += `语音脚本：\n`;
          page.voice_script.forEach((line, idx) => {
            scriptText += `  ${idx + 1}. [${line.role}] ${line.emotion ? `(${line.emotion})` : ''}: ${line.text}\n`;
          });
        }

        if (page.tts_text) {
          scriptText += `TTS文本：${page.tts_text}\n`;
        }

        scriptText += `\n`;
      }
    }

    zip.addFile('script.txt', Buffer.from(scriptText, 'utf-8'));

    // 生成 ZIP 缓冲区
    const zipBuffer = zip.toBuffer();

    // 设置响应头
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFileName)}"`);

    // 发送 ZIP 文件
    return res.send(zipBuffer);

  } catch (error) {
    console.error('下载项目失败:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
