/**
 * 角色三视图生成API
 * 代理请求到Python后端（火山引擎即梦SDK）
 */

import path from 'path';
import fs from 'fs';

// Python后端地址
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8081';

export default async function handler(req, res) {
  const requestId = Date.now();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { prompt, characterId, characterName, project_id } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: prompt'
      });
    }

    console.log(`🎭 [角色生成-${requestId}] 开始生成: ${characterName || characterId}`);
    console.log(`📝 提示词: ${prompt.substring(0, 100)}...`);
    console.log(`📂 项目ID: ${project_id || 'default'}`);

    // 调用Python后端
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        project_id: project_id || 'default',  // 添加项目ID
        save_to_storage: true,  // 启用自动推送远程存储
        frame: {
          type: 'character',
          characterId,
          characterName
        }
      })
    });

    // 检查HTTP状态码
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [角色生成-${requestId}] Python后端返回错误:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText.substring(0, 500)
      });
      throw new Error(`Python后端错误 (${response.status}): ${response.statusText}`);
    }

    // 尝试解析JSON
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      const responseText = await response.text();
      console.error(`❌ [角色生成-${requestId}] JSON解析失败:`, {
        error: parseError.message,
        responseStart: responseText.substring(0, 500)
      });
      throw new Error(`Python后端返回了无效的JSON。响应内容: ${responseText.substring(0, 200)}...`);
    }

    if (!result.success) {
      throw new Error(result.error || '生成失败');
    }

    console.log(`✅ [角色生成-${requestId}] 生成成功: ${characterName || characterId}`);
    console.log(`📦 [角色生成-${requestId}] 返回数据:`, {
      has_image_url: !!result.data.imageUrl,
      has_tos_url: !!result.data.tosUrl,
      has_remote_url: !!result.data.remote_url,
      has_remote_id: !!result.data.remote_id,
      local_path: result.data.local_path
    });

    // 决定最终使用的URL：优先使用远程URL，否则使用TOS URL，最后使用本地路径
    const finalImageUrl = result.data.remote_url || result.data.tosUrl || result.data.imageUrl;

    // 生成本地路径（用于更新项目文件）
    // 必须是相对路径（相对于 public/ 目录）
    let localImagePath;
    if (result.data.local_path) {
      // 如果Python后端返回了本地路径，需要转换
      // 绝对路径 → 相对路径
      if (result.data.local_path.startsWith('/Users/') || result.data.local_path.startsWith(process.cwd())) {
        // 提取 /public/ 之后的部分
        const publicIndex = result.data.local_path.indexOf('/public/');
        if (publicIndex !== -1) {
          localImagePath = result.data.local_path.substring(publicIndex); // 保留 /public/
          localImagePath = localImagePath.replace('/public/', '/'); // 替换为根路径
        } else {
          // 如果没有 /public/，使用默认格式
          localImagePath = `/generated/${project_id || 'default'}/characters/char_${characterId}.png`;
        }
      } else if (result.data.local_path.startsWith('/generated/')) {
        // 已经是正确的相对路径
        localImagePath = result.data.local_path;
      } else {
        // 其他情况，使用默认格式
        localImagePath = `/generated/${project_id || 'default'}/characters/char_${characterId}.png`;
      }
    } else {
      // 没有返回本地路径，使用默认格式
      localImagePath = `/generated/${project_id || 'default'}/characters/char_${characterId}.png`;
    }

    console.log(`💾 [角色生成-${requestId}] 本地路径: ${localImagePath}`);

    // 生成代理URL（前端统一使用代理URL访问图片）
    // 必须传递 projectId，否则图片代理无法定位到具体项目
    const imageProxyUrl = `/api/proxy/image?assetId=${characterId}&projectId=${project_id || 'default'}`;

    console.log(`🔗 [角色生成-${requestId}] 代理URL: ${imageProxyUrl}`);

    // 更新项目文件中的 image_url
    if (project_id) {
      try {
        const projectFilePath = path.join(process.cwd(), 'data', 'projects', `${project_id}.json`);

        if (fs.existsSync(projectFilePath)) {
          const projectData = JSON.parse(fs.readFileSync(projectFilePath, 'utf-8'));

          // 查找并更新对应资产的 image_url
          const asset = projectData.assets?.find(a => a.id === characterId);
          if (asset) {
            asset.image_url = localImagePath;
            asset.remote_url = result.data.remote_url || null;
            asset.remote_id = result.data.remote_id || null;
            asset.tos_url = result.data.tosUrl || null;

            // 保存更新后的项目文件
            fs.writeFileSync(projectFilePath, JSON.stringify(projectData, null, 2), 'utf-8');
            console.log(`✅ [角色生成-${requestId}] 已更新项目文件中的 image_url`);
          } else {
            console.warn(`⚠️ [角色生成-${requestId}] 未找到资产 ${characterId}，无法更新 image_url`);
          }
        } else {
          console.warn(`⚠️ [角色生成-${requestId}] 项目文件不存在: ${projectFilePath}`);
        }
      } catch (updateError) {
        console.error(`❌ [角色生成-${requestId}] 更新项目文件失败:`, updateError.message);
        // 不影响响应，继续返回成功
      }
    }

    res.status(200).json({
      success: true,
      data: {
        characterId,
        characterName,
        image_url: imageProxyUrl,  // 使用代理URL（前端统一使用）
        original_image_url: finalImageUrl,  // 保留原始URL（如果需要）
        local_path: localImagePath,  // 本地路径
        tos_url: result.data.tosUrl,  // 即梦返回的原始TOS URL，用于修图
        remote_url: result.data.remote_url,  // 远程存储URL
        remote_id: result.data.remote_id  // 远程存储ID
      }
    });

  } catch (error) {
    console.error(`❌ [角色生成-${requestId}] 生成失败:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
