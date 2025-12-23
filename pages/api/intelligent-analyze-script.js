/**
 * 智能剧本分析API - 替换原有的mock-analyze-script
 * 执行4步Claude工作流：故事切分 → 关键帧提取 → 提示词生成 → 结果整合
 */

// 使用代理API，不能用官方SDK

// 第一步：故事切分的提示词
const STEP1_PROMPT_TEMPLATE = `# Role: 资深编辑与分镜师

# Task:
请阅读我提供的【故事文本】，并将其切分为【Target_Number】个部分。
切分后的每一部分将用于生成单张关键分镜，因此需要保证每一段的文字量适中，且包含明确的画面信息。

# Inputs:
1. 故事文本: {SCRIPT_CONTENT}
2. 切分份数 (Target_Number): {SCENE_COUNT}

# Important Rules:
1. 必须严格按照要求的份数进行切分，确保生成**准确的{SCENE_COUNT}份**内容
2. 保持故事原汁原味，不要删减细节，只是进行物理切分
3. 确保切分点落在情节转折或动作变换的自然停顿处
4. 每一份都必须包含完整的画面信息，适合生成分镜图
5. 如果故事较短，可以按照时间顺序、地点变化、人物动作等进行合理切分

# Output Format:
请严格按照以下格式输出每一份，确保输出{SCENE_COUNT}份：

---
## 第1份
**完整剧情原文**: [这里必须放入切分出来的原始故事文本，不要概括]
**核心视觉点**: [用一句话提炼这段文字最核心的画面内容]
---
## 第2份
**完整剧情原文**: [这里必须放入切分出来的原始故事文本，不要概括]
**核心视觉点**: [用一句话提炼这段文字最核心的画面内容]
---
[继续输出到第{SCENE_COUNT}份]

记住：必须输出准确的{SCENE_COUNT}份内容！`;

// 第二步：关键帧提取的提示词
const STEP2_PROMPT_TEMPLATE = `# Role: 视觉导演

# Task:
基于上一步切分的每一份【完整剧情原文】，将其转化为具体的画面视觉描述。

# Logic Rules (关键):
1. 对于 **第1份 到 第{LAST_SCENE_INDEX}份**：
   - 只提炼 **1个"开始帧"**。这个画面代表该段剧情开始时的状态。
2. 对于 **最后一份 (第{SCENE_COUNT}份)**：
   - 提炼 **1个"开始帧"**。
   - 额外提炼 **1个"结束帧"**（作为整个故事的落幅/结局）。

# Requirement:
描述必须包含：
- **主体**: 角色是谁，在做什么动作。
- **环境**: 背景细节，天气，时间。
- **氛围**: 光影颜色，情绪基调。

# Input (上一步的切分结果):
{SEGMENTED_STORY}

# Output Format:
---
## 第X份
**帧类型**: [开始帧 / 结束帧]
**画面描述**: (例如：暴雨夜，林默站在霓虹闪烁的巷口，风衣被风吹起，右手按在刀柄上，眼神冷冽)
---`;

// 第三步：即梦提示词生成
const STEP3_PROMPT_TEMPLATE = `# Role: AI绘图提示词专家 (即梦/Jimeng 专项优化)

# Setup (角色一致性):
在生成提示词之前，请先帮我建立主要角色的【特征词库】。
对于故事中的主角，请固定以下格式：
- [角色名]: (具体的发型, 发色, 瞳色, 服装细节, 特殊配饰)
*请确保在每一条包含该角色的提示词中，都完整包含这些特征词。*

# Style & Quality (画风设置):
每一条提示词必须包含以下前缀：
(Masterpiece, top quality, highly detailed, 8k resolution, cinematic lighting, dynamic composition) + {STYLE_SETTING}

# Task:
将第二步得到的每一个"画面描述"转化为即梦可用的提示词。

# Input (上一步的关键帧结果):
{EXTRACTED_FRAMES}

# Output Format:
请严格按以下格式输出：

---
### [序号] 第X份-[帧类型]
**中文辅助描述**: [简短的中文画面说明，方便我确认]
**Jimeng Prompt**: [画风修饰词], [角色特征词], [动作与具体场景描述], [环境与光影], [镜头语言: 如 close-up, wide angle, depth of field] --ar 16:9
---`;

// 调用DeepSeek API的通用函数
async function callDeepSeek(prompt, stepName, requestId) {
  try {
    console.log(`🤖 [智能分析-${requestId}] 执行${stepName}...`);
    console.log(`📤 [智能分析-${requestId}] DeepSeek请求参数:`, {
      url: process.env.DEEPSEEK_BASE_URL + '/chat/completions',
      model: 'deepseek-chat',
      max_tokens: 4000,
      temperature: 0.7,
      promptLength: prompt.length,
      stepName: stepName,
      timestamp: new Date().toISOString()
    });

    const requestData = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7
    };

    console.log(`🔗 [智能分析-${requestId}] 发送请求到DeepSeek API...`);

    // 创建AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`⏰ [智能分析-${requestId}] ${stepName}超时，中断请求 (60秒)`);
      controller.abort();
    }, 60000); // 设置60秒超时

    const startTime = Date.now();
    const response = await fetch(process.env.DEEPSEEK_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(requestData),
      signal: controller.signal // 添加超时控制
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    console.log(`📥 [智能分析-${requestId}] DeepSeek响应:`, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length')
      },
      stepName: stepName,
      responseTime: `${responseTime}ms`
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [智能分析-${requestId}] DeepSeek API错误:`, {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500),
        stepName: stepName
      });
      throw new Error(`${stepName}失败: HTTP ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();

    console.log(`📊 [智能分析-${requestId}] DeepSeek响应数据:`, {
      hasChoices: !!result.choices,
      choicesLength: result.choices ? result.choices.length : 0,
      hasContent: !!(result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content),
      contentLength: (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) ? result.choices[0].message.content.length : 0,
      usage: result.usage || 'no usage info',
      stepName: stepName,
      responseTime: `${responseTime}ms`
    });

    if (!result.choices || !result.choices[0] || !result.choices[0].message || !result.choices[0].message.content) {
      console.error(`❌ [智能分析-${requestId}] DeepSeek响应格式错误:`, {
        result: result,
        stepName: stepName
      });
      throw new Error(`${stepName}失败: API返回格式错误`);
    }

    const content = result.choices[0].message.content;
    console.log(`✅ [智能分析-${requestId}] ${stepName}成功，内容长度: ${content.length}, 耗时: ${responseTime}ms`);

    return content;

  } catch (error) {
    console.error(`💥 [智能分析-${requestId}] ${stepName}异常:`, {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n')[0],
      stepName: stepName,
      timestamp: new Date().toISOString()
    });

    // 根据错误类型提供更具体的错误信息
    if (error.name === 'AbortError') {
      throw new Error(`${stepName}失败: 请求超时（60秒），可能是网络问题或API响应过慢`);
    } else if (error.message.includes('fetch')) {
      throw new Error(`${stepName}失败: 网络连接错误 - ${error.message}`);
    } else if (error.message.includes('terminated')) {
      throw new Error(`${stepName}失败: 连接被终止，可能是API服务器问题`);
    } else {
      throw new Error(`${stepName}失败: ${error.message}`);
    }
  }
}

// 解析第三步的结果，提取提示词和中文描述
function parseStep3Results(claudeResponse) {
  console.log('🔍 解析第3步结果，内容长度:', claudeResponse.length);
  console.log('🔍 前500字符预览:', claudeResponse.substring(0, 500));

  const frames = [];

  // 尝试多种分割方式
  const sections = claudeResponse.split('---').filter(section => section.trim());

  console.log('📊 分割后的部分数量:', sections.length);

  sections.forEach((section, index) => {
    const trimmedSection = section.trim();
    console.log(`📝 处理第${index + 1}部分:`, trimmedSection.substring(0, 200) + '...');

    // 更灵活的匹配模式
    const chineseMatch = trimmedSection.match(/\*\*中文辅助描述\*\*[:：]\s*([^\n]+)/);
    const promptMatch = trimmedSection.match(/\*\*Jimeng Prompt\*\*[:：]\s*([^\n]+)/);

    // 匹配标题中的序号和类型信息
    const titleMatch = trimmedSection.match(/###\s*\[?\d*\]?\s*第(\d+)份[-—]?(开始帧|结束帧)/);

    console.log('🔎 匹配结果:', {
      sectionIndex: index,
      hasChineseMatch: !!chineseMatch,
      hasPromptMatch: !!promptMatch,
      hasTitleMatch: !!titleMatch,
      chineseText: chineseMatch ? chineseMatch[1] : null,
      promptText: promptMatch ? promptMatch[1]?.substring(0, 100) + '...' : null
    });

    if (chineseMatch && promptMatch) {
      const sceneIndex = titleMatch ? parseInt(titleMatch[1]) : index + 1;
      const frameType = titleMatch ? titleMatch[2] : '开始帧';

      const frame = {
        sequence: index + 1,
        sceneIndex: sceneIndex,
        frameType: frameType,
        chineseDescription: chineseMatch[1].trim(),
        jimengPrompt: promptMatch[1].trim(),
        imageUrl: null,
        isGenerating: false,
        error: null
      };

      console.log('✅ 成功解析帧:', {
        sequence: frame.sequence,
        sceneIndex: frame.sceneIndex,
        frameType: frame.frameType,
        descLength: frame.chineseDescription.length,
        promptLength: frame.jimengPrompt.length
      });

      frames.push(frame);
    } else {
      console.log('❌ 该部分匹配失败，跳过');
    }
  });

  console.log(`🎯 最终解析结果: 共${frames.length}个有效帧`);
  return frames;
}

export default async function handler(req, res) {
  const requestId = Date.now();

  console.log(`🎭 [智能分析-${requestId}] 收到智能分析请求:`, {
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent']?.substring(0, 50),
    contentLength: req.headers['content-length']
  });

  if (req.method !== 'POST') {
    console.error(`❌ [智能分析-${requestId}] 错误方法:`, req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log(`📋 [智能分析-${requestId}] 解析请求体:`, {
      bodyKeys: req.body ? Object.keys(req.body) : []
    });

    const { script, sceneCount, style, genre } = req.body;

    console.log(`📝 [智能分析-${requestId}] 提取的参数:`, {
      scriptLength: script ? script.length : 0,
      sceneCount: sceneCount,
      style: style,
      genre: genre,
      hasScript: !!script,
      hasSceneCount: !!sceneCount
    });

    if (!script || !sceneCount) {
      console.error(`❌ [智能分析-${requestId}] 缺少必要参数:`, {
        hasScript: !!script,
        hasSceneCount: !!sceneCount
      });
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: script, sceneCount'
      });
    }

    console.log('🎭 开始智能剧本分析:', {
      scriptLength: script.length,
      sceneCount,
      style,
      genre
    });

    // 第一步：故事切分
    console.log(`🤖 [智能分析-${requestId}] 执行第1步: 故事切分...`);
    const step1Prompt = STEP1_PROMPT_TEMPLATE
      .replace('{SCRIPT_CONTENT}', script)
      .replace('{SCENE_COUNT}', sceneCount.toString());

    console.log(`📤 [智能分析-${requestId}] Step1 提示词长度: ${step1Prompt.length}`);

    const segmentedStory = await callDeepSeek(step1Prompt, '第1步: 故事切分', requestId);

    console.log(`📥 [智能分析-${requestId}] Step1 结果长度: ${segmentedStory.length}`);

    // 第二步：关键帧提取
    console.log(`🤖 [智能分析-${requestId}] 执行第2步: 关键帧提取...`);
    const step2Prompt = STEP2_PROMPT_TEMPLATE
      .replace('{LAST_SCENE_INDEX}', (sceneCount - 1).toString())
      .replace('{SCENE_COUNT}', sceneCount.toString())
      .replace('{SEGMENTED_STORY}', segmentedStory);

    console.log(`📤 [智能分析-${requestId}] Step2 提示词长度: ${step2Prompt.length}`);

    const extractedFrames = await callDeepSeek(step2Prompt, '第2步: 关键帧提取', requestId);

    console.log(`📥 [智能分析-${requestId}] Step2 结果长度: ${extractedFrames.length}`);

    // 第三步：提示词生成
    console.log(`🤖 [智能分析-${requestId}] 执行第3步: 提示词生成...`);
    const styleMapping = {
      'anime': 'anime style',
      'realistic': 'photorealistic style',
      'cyberpunk': 'cyberpunk style',
      'traditional': 'traditional chinese painting style'
    };

    console.log(`🎨 [智能分析-${requestId}] 样式映射:`, {
      inputStyle: style,
      mappedStyle: styleMapping[style] || style
    });

    const step3Prompt = STEP3_PROMPT_TEMPLATE
      .replace('{STYLE_SETTING}', styleMapping[style] || style)
      .replace('{EXTRACTED_FRAMES}', extractedFrames);

    console.log(`📤 [智能分析-${requestId}] Step3 提示词长度: ${step3Prompt.length}`);

    const promptResults = await callDeepSeek(step3Prompt, '第3步: 提示词生成', requestId);

    console.log(`📥 [智能分析-${requestId}] Step3 结果长度: ${promptResults.length}`);

    // 第四步：解析结果
    console.log(`🤖 [智能分析-${requestId}] 执行第4步: 结果解析...`);
    const frames = parseStep3Results(promptResults);

    console.log(`📊 [智能分析-${requestId}] Step4 解析结果:`, {
      totalFrames: frames.length,
      framesInfo: frames.map(frame => ({
        sequence: frame.sequence,
        sceneIndex: frame.sceneIndex,
        frameType: frame.frameType,
        hasChineseDescription: !!frame.chineseDescription,
        hasJimengPrompt: !!frame.jimengPrompt,
        chineseDescLength: frame.chineseDescription ? frame.chineseDescription.length : 0,
        jimengPromptLength: frame.jimengPrompt ? frame.jimengPrompt.length : 0
      }))
    });

    if (frames.length === 0) {
      console.error(`❌ [智能分析-${requestId}] Step4 解析失败: 未能提取到有效的提示词`, {
        promptResultsLength: promptResults.length,
        promptResultsPreview: promptResults.substring(0, 200) + '...'
      });
      throw new Error('第4步: 结果解析失败，未能提取到有效的提示词');
    }

    console.log(`✅ [智能分析-${requestId}] 智能分析完成，生成${frames.length}个关键帧`);

    // 构造返回结果
    const result = {
      success: true,
      data: {
        script_analysis: {
          sceneCount: sceneCount,
          frameCount: frames.length,
          genre_detected: genre,
          segmented_story: segmentedStory,
          extracted_frames: extractedFrames
        },
        storyboard_frames: frames,
        recommendedStyle: style,
        recommendedGenre: genre,
        intelligentAnalysisComplete: true
      }
    };

    console.log(`📤 [智能分析-${requestId}] 构造返回结果:`, {
      success: result.success,
      dataKeys: Object.keys(result.data),
      scriptAnalysisKeys: Object.keys(result.data.script_analysis),
      storyboardFramesLength: result.data.storyboard_frames.length,
      intelligentAnalysisComplete: result.data.intelligentAnalysisComplete,
      resultSize: JSON.stringify(result).length
    });

    console.log(`✅ [智能分析-${requestId}] 智能分析响应发送完成`);
    res.status(200).json(result);

  } catch (error) {
    console.error(`❌ [智能分析-${requestId}] 智能剧本分析失败:`, {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n')[0],
      timestamp: new Date().toISOString()
    });

    // 判断是哪一步失败
    let stepInfo = '';
    if (error.message.includes('第1步')) stepInfo = '第1步 故事切分';
    else if (error.message.includes('第2步')) stepInfo = '第2步 关键帧提取';
    else if (error.message.includes('第3步')) stepInfo = '第3步 提示词生成';
    else if (error.message.includes('第4步')) stepInfo = '第4步 结果解析';
    else stepInfo = '未知步骤';

    console.error(`❌ [智能分析-${requestId}] 失败步骤: ${stepInfo}`, {
      errorMessage: error.message,
      failedStep: stepInfo
    });

    const errorResponse = {
      success: false,
      error: `智能分析失败 - ${stepInfo}: ${error.message}`,
      failedStep: stepInfo
    };

    console.log(`📤 [智能分析-${requestId}] 错误响应发送:`, {
      success: errorResponse.success,
      errorLength: errorResponse.error.length,
      failedStep: errorResponse.failedStep
    });

    res.status(500).json(errorResponse);
  }
}