/**
 * 图片代理接口
 * 从远程或本地获取图片资源并返回给前端
 * 解决内网图片无法直接访问的问题
 */

export const config = {
  api: {
    responseLimit: false, // 不限制响应大小（图片可能很大）
    timeout: 60000, // 60秒超时
  },
};

export default async function handler(req, res) {
  const requestId = Date.now();

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { characterId, assetId, pageId, projectId } = req.query;

    // 兼容旧参数：characterId 实际上可能是 assetId
    const targetAssetId = assetId || characterId;
    const targetPageId = pageId;

    if (!targetAssetId && !targetPageId) {
      console.error(`❌ [图片代理-${requestId}] 缺少必要参数`);
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: 需要 assetId/characterId 或 pageId'
      });
    }

    console.log(`🖼️ [图片代理-${requestId}] 收到请求:`, {
      assetId: targetAssetId,
      pageId: targetPageId,
      projectId,
      timestamp: new Date().toISOString()
    });

    // 读取项目数据，查找对应的图片URL
    const fs = require('fs');
    const path = require('path');
    const projectsDir = path.join(process.cwd(), 'data', 'projects');

    // 如果提供了projectId，直接读取该项目
    // 否则搜索所有项目
    let project = null;
    let projectPath = null;
    let imageUrl = null;
    let imageType = null;  // 'asset' 或 'page'

    if (projectId) {
      projectPath = path.join(projectsDir, `${projectId}.json`);
      if (fs.existsSync(projectPath)) {
        const data = fs.readFileSync(projectPath, 'utf-8');
        project = JSON.parse(data);
      }
    } else {
      // 搜索所有项目找到匹配的资源
      const projectFiles = fs.readdirSync(projectsDir)
        .filter(file => file.endsWith('.json') && file !== 'index.json');

      for (const file of projectFiles) {
        const filePath = path.join(projectsDir, file);
        const data = fs.readFileSync(filePath, 'utf-8');
        const tempProject = JSON.parse(data);

        // 优先查找资产（角色/背景）
        if (targetAssetId) {
          const asset = tempProject.assets?.find(a => a.id === targetAssetId);
          if (asset && asset.image_url) {
            project = tempProject;
            projectPath = filePath;
            imageUrl = asset.image_url;
            imageType = 'asset';
            break;
          }
        }

        // 其次查找分镜页
        if (targetPageId) {
          const page = tempProject.pages?.find(p => p.page_index === parseInt(targetPageId) || p.scene_id === targetPageId);
          if (page && page.image_url) {
            project = tempProject;
            projectPath = filePath;
            imageUrl = page.image_url;
            imageType = 'page';
            break;
          }
        }
      }
    }

    // 如果找到了项目但还需要查找具体资源
    if (project && !imageUrl) {
      if (targetAssetId) {
        const asset = project.assets?.find(a => a.id === targetAssetId);
        if (asset && asset.image_url) {
          imageUrl = asset.image_url;
          imageType = 'asset';
        }
      }

      if (!imageUrl && targetPageId) {
        const page = project.pages?.find(p => p.page_index === parseInt(targetPageId) || p.scene_id === targetPageId);
        if (page && page.image_url) {
          imageUrl = page.image_url;
          imageType = 'page';
        }
      }
    }

    if (!imageUrl) {
      console.error(`❌ [图片代理-${requestId}] 未找到图片: assetId=${targetAssetId}, pageId=${targetPageId}`);
      return res.status(404).json({
        success: false,
        error: `未找到对应的图片资源 (assetId: ${targetAssetId}, pageId: ${targetPageId})`
      });
    }

    console.log(`📍 [图片代理-${requestId}] 找到${imageType}图片URL: ${imageUrl.substring(0, 100)}...`);
    console.log(`📍 [图片代理-${requestId}] 找到图片URL: ${imageUrl.substring(0, 100)}...`);

    // 判断是本地路径还是远程URL
    let imageBuffer = null;
    let contentType = 'image/png';

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // 远程URL - 通过fetch获取
      console.log(`🌐 [图片代理-${requestId}] 从远程获取图片...`);

      const response = await fetch(imageUrl, {
        method: 'GET',
        // 某些内网服务器可能需要特殊headers
        headers: {
          'User-Agent': 'Toby-Image-Proxy/1.0'
        },
        // 30秒超时
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        console.error(`❌ [图片代理-${requestId}] 远程获取失败: ${response.status}`);
        throw new Error(`远程图片获取失败: ${response.status} ${response.statusText}`);
      }

      // 获取content-type
      contentType = response.headers.get('content-type') || 'image/png';

      // 获取图片数据
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);

      console.log(`✅ [图片代理-${requestId}] 远程图片获取成功: ${imageBuffer.length} 字节`);

    } else if (imageUrl.startsWith('/generated/') || imageUrl.startsWith('/audio/')) {
      // 本地路径 - 从public目录读取
      console.log(`📁 [图片代理-${requestId}] 从本地读取图片...`);

      const localPath = path.join(process.cwd(), 'public', imageUrl);
      console.log(`📂 [图片代理-${requestId}] 本地路径: ${localPath}`);

      if (!fs.existsSync(localPath)) {
        console.error(`❌ [图片代理-${requestId}] 本地文件不存在: ${localPath}`);
        return res.status(404).json({
          success: false,
          error: '本地图片文件不存在'
        });
      }

      // 读取文件
      imageBuffer = fs.readFileSync(localPath);

      // 根据扩展名设置content-type
      if (imageUrl.endsWith('.png')) {
        contentType = 'image/png';
      } else if (imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (imageUrl.endsWith('.webp')) {
        contentType = 'image/webp';
      } else if (imageUrl.endsWith('.gif')) {
        contentType = 'image/gif';
      }

      console.log(`✅ [图片代理-${requestId}] 本地图片读取成功: ${imageBuffer.length} 字节`);

    } else {
      console.error(`❌ [图片代理-${requestId}] 不支持的URL格式: ${imageUrl}`);
      return res.status(400).json({
        success: false,
        error: '不支持的图片URL格式'
      });
    }

    // 设置响应头并返回图片
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时
    res.setHeader('Content-Length', imageBuffer.length);
    res.send(imageBuffer);

    console.log(`📤 [图片代理-${requestId}] 图片已返回: ${contentType}, ${imageBuffer.length} 字节`);

  } catch (error) {
    console.error(`❌ [图片代理-${requestId}] 代理失败:`, {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });

    // 返回错误
    res.status(500).json({
      success: false,
      error: `图片代理失败: ${error.message}`
    });
  }
}
