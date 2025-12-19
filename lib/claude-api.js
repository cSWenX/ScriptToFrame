const Anthropic = require('@anthropic-ai/sdk');

/**
 * Claude API集成模块
 * 功能: 剧本解析、关键帧识别、分镜描述生成
 */
class ClaudeScriptParser {
  constructor() {
    console.log('🔧 初始化Claude API连接...');

    const config = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 60000, // 增加超时时间到60秒
    };

    console.log('🔑 API密钥状态:', config.apiKey ? '已设置' : '未设置');

    // 如果有代理地址，则使用代理
    if (process.env.ANTHROPIC_BASE_URL) {
      let baseUrl = process.env.ANTHROPIC_BASE_URL;

      // 确保代理地址不以/v1结尾，因为Anthropic SDK会自动添加
      if (baseUrl.endsWith('/v1')) {
        baseUrl = baseUrl.slice(0, -3);
      }

      config.baseURL = baseUrl;
      console.log('🌐 使用代理地址:', config.baseURL);

      // 添加自定义fetch以处理SSL问题
      config.fetch = async (url, options) => {
        console.log('📡 发起代理请求:', {
          url: url,
          method: options.method,
          hasAuth: !!options.headers?.Authorization,
          apiKey: config.apiKey ? '已设置' : '未设置'
        });

        // 强制忽略SSL证书验证
        process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
        console.log('🔐 SSL证书验证已禁用');

        // 确保认证头正确设置
        const headers = {
          ...options.headers,
          'User-Agent': 'ScriptToFrame/1.0.0',
          'anthropic-version': '2023-06-01'
        };

        // 手动添加Authorization头，防止被覆盖
        if (config.apiKey && !headers.Authorization) {
          headers.Authorization = `Bearer ${config.apiKey}`;
          console.log('🔑 手动设置Authorization头');
        }

        console.log('📋 最终请求头:', {
          hasAuth: !!headers.Authorization,
          userAgent: headers['User-Agent'],
          anthropicVersion: headers['anthropic-version']
        });

        try {
          // 使用更宽松的fetch配置
          const fetchOptions = {
            ...options,
            headers: headers,
            agent: false, // 禁用agent
          };

          const response = await fetch(url, fetchOptions);

          console.log('📈 代理响应状态:', response.status, response.statusText);
          console.log('📋 响应头:', Object.fromEntries(response.headers.entries()));

          if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ 代理响应错误:', errorText.substring(0, 500));
          }

          return response;
        } catch (fetchError) {
          console.error('❌ Fetch错误详情:', {
            name: fetchError.name,
            message: fetchError.message,
            code: fetchError.code,
            errno: fetchError.errno,
            syscall: fetchError.syscall
          });
          throw fetchError;
        }
      };
    } else {
      console.log('📡 使用官方API地址');
    }

    this.anthropic = new Anthropic(config);
    console.log('✅ Claude API客户端初始化完成');
  }

  /**
   * 解析剧本并生成分镜计划
   * @param {string} script - 原始剧本内容
   * @param {number} frameCount - 需要生成的关键帧数量 (3-12)
   * @param {string} style - 画风选择
   * @param {string} genre - 漫剧类型/题材
   * @returns {Promise<Object>} 解析结果
   */
  async parseScript(script, frameCount, style = 'default', genre = 'general') {
    console.log('📝 开始剧本解析:', {
      scriptLength: script.length,
      frameCount,
      style,
      genre
    });

    const prompt = `
你是专业的漫剧分镜师，请智能解析以下剧本内容并规划分镜方案。

剧本内容：
${script}

要求：
1. 智能识别剧本格式（无论是标准剧本、小说段落、对话形式等）
2. 自动提取角色、对话、动作、场景信息
3. 生成 ${frameCount} 个关键帧
4. 画风：${style}
5. 题材类型：${genre}
6. 输出比例：16:9

请按照以下JSON格式输出：
{
  "script_analysis": {
    "characters": [
      {
        "name": "角色名",
        "description": "角色描述",
        "visual_description": "外貌特征描述"
      }
    ],
    "scenes": [
      {
        "location": "场景位置",
        "description": "场景描述"
      }
    ],
    "genre_detected": "检测到的题材类型",
    "total_frames": ${frameCount}
  },
  "storyboard_frames": [
    {
      "sequence": 1,
      "scene": "场景名称",
      "characters": ["出现的角色"],
      "description": "详细的画面描述",
      "prompt": "用于AI绘图的英文提示词",
      "emotion": "情绪氛围",
      "camera_angle": "镜头角度",
      "key_moment": "这一帧捕捉的关键时刻"
    }
  ]
}

注意事项：
1. prompt必须是详细的英文描述，包含人物、场景、动作、情绪
2. 确保人物描述一致性，每次出现同一角色要保持外貌特征
3. 根据剧情密度合理分配关键帧
4. 优先捕捉场景切换、重要动作、情绪转折点
5. 如果场景少于所需帧数，提供合理建议
`;

    try {
      console.log('🔄 发送Claude API请求...');
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      console.log('✅ 收到Claude API响应');
      const content = response.content[0].text;
      console.log('📄 响应内容长度:', content.length);

      // 尝试解析JSON响应
      let parsedResult;
      try {
        parsedResult = JSON.parse(content);
        console.log('✅ JSON解析成功');
      } catch (jsonError) {
        console.log('⚠️ JSON解析失败，尝试提取JSON部分...');
        // 如果JSON解析失败，尝试提取JSON部分
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
          console.log('✅ 成功提取并解析JSON');
        } else {
          console.error('❌ 无法从响应中提取JSON');
          throw new Error('Claude返回的内容无法解析为JSON');
        }
      }

      // 验证返回结果结构
      if (!parsedResult.script_analysis || !parsedResult.storyboard_frames) {
        console.error('❌ 响应数据结构不完整:', {
          hasScriptAnalysis: !!parsedResult.script_analysis,
          hasStoryboardFrames: !!parsedResult.storyboard_frames
        });
        throw new Error('Claude返回的数据结构不完整');
      }

      console.log('🎉 剧本解析完成:', {
        characters: parsedResult.script_analysis.characters?.length || 0,
        scenes: parsedResult.script_analysis.scenes?.length || 0,
        frames: parsedResult.storyboard_frames?.length || 0
      });

      return {
        success: true,
        data: parsedResult
      };

    } catch (error) {
      console.error('❌ Claude API调用失败:');
      console.error('错误类型:', error.name);
      console.error('错误消息:', error.message);
      console.error('完整错误:', error);

      return {
        success: false,
        error: error.message || '剧本解析失败'
      };
    }
  }

  /**
   * 优化单个分镜描述
   * @param {Object} frame - 分镜帧信息
   * @param {Array} characters - 角色列表
   * @param {string} style - 画风
   * @returns {Promise<string>} 优化后的prompt
   */
  async optimizeFramePrompt(frame, characters, style) {
    const characterDescriptions = characters.map(char =>
      `${char.name}: ${char.visual_description}`
    ).join('\n');

    const prompt = `
请优化这个分镜的AI绘图提示词。

分镜信息：
- 场景：${frame.scene}
- 描述：${frame.description}
- 角色：${frame.characters.join(', ')}
- 情绪：${frame.emotion}
- 镜头角度：${frame.camera_angle}

角色外貌设定：
${characterDescriptions}

画风：${style}

请生成一个详细的英文提示词，确保：
1. 包含完整的人物外貌描述
2. 场景环境细节
3. 动作和表情
4. 画风特色
5. 镜头角度和构图
6. 16:9比例

只返回提示词内容，不要其他说明。
`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.content[0].text.trim();
    } catch (error) {
      console.error('提示词优化失败:', error);
      return frame.prompt; // 返回原始prompt
    }
  }

  /**
   * 检测剧本质量和格式
   * @param {string} script - 剧本内容
   * @returns {Promise<Object>} 检测结果
   */
  async validateScript(script) {
    const prompt = `
请检查这个剧本的质量和格式：

${script}

请评估：
1. 格式是否规范（包含角色、对话、动作描述）
2. 内容是否完整
3. 是否包含敏感内容
4. 长度是否适合制作分镜

返回JSON格式：
{
  "is_valid": true/false,
  "issues": ["问题列表"],
  "suggestions": ["改进建议"],
  "estimated_scenes": "预估场景数",
  "genre": "推荐的题材类型"
}
`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0].text;
      const parsedResult = JSON.parse(content);

      return {
        success: true,
        data: parsedResult
      };

    } catch (error) {
      console.error('剧本验证失败:', error);
      return {
        success: false,
        error: '剧本验证失败',
        data: {
          is_valid: false,
          issues: ['无法解析剧本'],
          suggestions: ['请检查剧本格式']
        }
      };
    }
  }

  /**
   * 生成第一张图的详细描述
   * @param {Object} firstFrame - 第一帧信息
   * @param {Array} characters - 角色列表
   * @param {string} style - 画风
   * @returns {Promise<string>} 详细的prompt
   */
  async generateFirstFramePrompt(firstFrame, characters, style) {
    const characterDescriptions = characters.map(char =>
      `${char.name}: ${char.visual_description}`
    ).join('\n');

    const prompt = `
这是漫剧的第一张图，需要特别精细的描述用于AI绘图。

分镜信息：
- 场景：${firstFrame.scene}
- 描述：${firstFrame.description}
- 角色：${firstFrame.characters.join(', ')}
- 情绪：${firstFrame.emotion}
- 镜头角度：${firstFrame.camera_angle}

角色设定：
${characterDescriptions}

画风要求：${style}

请生成极其详细的英文提示词，包括：
1. 每个角色的完整外貌描述（发型、服装、表情）
2. 详细的场景环境（建筑、天气、光线）
3. 构图和镜头角度
4. 色彩和画风特点
5. 16:9比例说明

这张图将作为后续图片的参考，请确保描述充分详细。

只返回英文提示词，不要其他内容。
`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.content[0].text.trim();
    } catch (error) {
      console.error('第一帧提示词生成失败:', error);
      return firstFrame.prompt;
    }
  }
}

module.exports = ClaudeScriptParser;