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
          let imageBuffer = null;
          let fileName = `page_${i + 1}.png`;

          // 情况1：代理URL - 通过代理接口获取
          if (page.image_url.startsWith('/api/proxy/')) {
            try {
              console.log(`📥 [下载] 通过代理获取图片: ${page.image_url}`);
              const response = await fetch(`http://localhost:3000${page.image_url}`);
              if (response.ok) {
                const buffer = await response.arrayBuffer();
                imageBuffer = Buffer.from(buffer);
                console.log(`✅ [下载] 图片获取成功: ${fileName}, ${buffer.length}字节`);
              } else {
                console.error(`❌ [下载] 代理获取失败: ${response.status}`);
              }
            } catch (e) {
              console.error(`❌ [下载] 代理获取异常: ${page.image_url}`, e);
            }
          }
          // 情况2：远程URL
          else if (page.image_url.startsWith('http')) {
            try {
              console.log(`📥 [下载] 从远程获取图片: ${page.image_url}`);
              const response = await fetch(page.image_url);
              const buffer = await response.arrayBuffer();
              imageBuffer = Buffer.from(buffer);
              console.log(`✅ [下载] 远程图片获取成功: ${fileName}`);
            } catch (e) {
              console.error(`❌ [下载] 远程图片获取失败: ${page.image_url}`, e);
            }
          }
          // 情况3：base64 图片
          else if (page.image_url.startsWith('data:')) {
            const base64Data = page.image_url.split(',')[1];
            imageBuffer = Buffer.from(base64Data, 'base64');
            console.log(`✅ [下载] Base64图片: ${fileName}`);
          }
          // 情况4：本地路径
          else if (page.image_url.startsWith('/')) {
            const imagePath = path.join(process.cwd(), 'public', page.image_url);
            try {
              imageBuffer = await fs.readFile(imagePath);
              console.log(`✅ [下载] 本地图片读取成功: ${fileName}`);
            } catch (e) {
              console.error(`❌ [下载] 本地图片读取失败: ${imagePath}`, e);
            }
          }

          // 添加到ZIP
          if (imageBuffer) {
            zip.addFile(fileName, imageBuffer);
          } else {
            console.warn(`⚠️ [下载] 跳过图片: page_${i + 1}.png`);
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
      for (let i = 0; i < projectData.pages.length; i++) {
        const page = projectData.pages[i];

        // 优先使用 remote_audio_url，回退到 audio_url
        const audioUrl = page.remote_audio_url || page.audio_url;

        if (audioUrl) {
          let audioBuffer = null;
          let fileName = `audio_${i + 1}.wav`;

          // 情况1：代理URL - 通过代理接口获取
          if (audioUrl.startsWith('/api/proxy/')) {
            try {
              console.log(`📥 [下载] 通过代理获取音频: ${audioUrl}`);
              const response = await fetch(`http://localhost:3000${audioUrl}`);
              if (response.ok) {
                const buffer = await response.arrayBuffer();
                audioBuffer = Buffer.from(buffer);
                console.log(`✅ [下载] 音频获取成功: ${fileName}, ${buffer.length}字节`);
              } else {
                console.error(`❌ [下载] 代理获取失败: ${response.status}`);
              }
            } catch (e) {
              console.error(`❌ [下载] 代理获取异常: ${audioUrl}`, e);
            }
          }
          // 情况2：远程URL
          else if (audioUrl.startsWith('http')) {
            try {
              console.log(`📥 [下载] 从远程获取音频: ${audioUrl}`);
              const response = await fetch(audioUrl);
              const buffer = await response.arrayBuffer();
              audioBuffer = Buffer.from(buffer);
              console.log(`✅ [下载] 远程音频获取成功: ${fileName}`);
            } catch (e) {
              console.error(`❌ [下载] 远程音频获取失败: ${audioUrl}`, e);
            }
          }
          // 情况3：本地路径
          else if (audioUrl.startsWith('/')) {
            const audioPath = path.join(process.cwd(), 'public', audioUrl);
            try {
              await fs.access(audioPath);
              audioBuffer = await fs.readFile(audioPath);
              console.log(`✅ [下载] 本地音频读取成功: ${fileName}`);
            } catch (e) {
              console.error(`❌ [下载] 本地音频读取失败: ${audioPath}`, e);
            }
          }

          // 添加到ZIP
          if (audioBuffer) {
            zip.addFile(fileName, audioBuffer);
          } else {
            console.warn(`⚠️ [下载] 跳过音频: ${fileName}`);
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
