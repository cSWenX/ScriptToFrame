/**
 * 智能剧本分析API v2
 * 单步AI分析：同时生成分镜脚本 + 提取角色
 */

import { STYLE_CONFIG } from '../../config/styles';

// 分镜脚本生成提示词（去风格化版本）
const STORYBOARD_PROMPT_TEMPLATE = `# Role: AI 绘本导演与分镜统筹 (Story & Layout Master)

## Task
请阅读我提供的故事，将其改编为一份**逐页拆解的绘本分镜脚本**。
你需要同时扮演两个角色：
1.  **编剧**: 编写生动、有画面感的故事描述和角色对白（用于后期配音）。
2.  **排版师**: 为即梦 (Jimeng) 编写包含**精确构图、角色位置、气泡台词**的绘画提示词。

## Process (执行步骤)
1.  **Step 1: 建立角色名册 (Character Roster)**
    * 通读全文，识别所有出场角色。
    * 对群体角色进行拆分（如：蝌蚪老大、老二、老三），并定义其简要特征。
    * **在脚本最前方列出这份名单**。
2.  **Step 2: 逐页编写分镜 (Page-by-Page)**
    * **上层（剧本层）**: 保留故事的原汁原味。将心理描写转化为有声对白。
    * **下层（指令层）**: 将上层的画面转化为冷冰冰的、精确的视觉指令。

## Constraints (核心约束)
1.  **故事味 (Story Flavor)**: [画面] 和 [对白] 部分必须生动、口语化，适合朗读。
2.  **排版强制 (Layout Enforcement)**:
    * **数量**: 提示词中必须写明"画面中有[数字]个角色"。
    * **位置**: 必须写明"[角色名]位于画面[左/右/中/角落]"。
    * **气泡**: 必须包含"从[角色名]嘴边冒出气泡，气泡内清晰地写着中文文本：'[台词]'"。
3.  **去风格化 (No Style)**: 即梦提示词中**严禁**出现风格修饰词（如：吉卜力、水彩、3D等），仅描述内容。
4.  **页数控制**: 将故事拆分为 {PAGE_COUNT} 页。

## Output Format (输出格式 - JSON)
请严格按照以下JSON格式输出，确保可以被JSON.parse解析：

\`\`\`json
{
  "characters": [
    {
      "name": "角色名",
      "identity": "角色身份（如：小兔子、老奶奶）",
      "appearance": "外貌描述（发型、发色、眼睛、体型等）",
      "details": "服装和配饰细节",
      "personality": "性格特点"
    }
  ],
  "pages": [
    {
      "page_index": 1,
      "scene_description": "画面描述（生动的语言，包含动作和环境）",
      "dialogues": [
        {
          "role": "说话角色名或旁白",
          "text": "台词内容"
        }
      ],
      "jimeng_prompt": "构图：[景别]。布局：画面中有[数字]个角色。[角色名]位于画面[位置]。动作：[动作描述]。气泡：从[角色名]嘴边冒出白色对话气泡，气泡内写着中文：'[台词]'。环境：[背景描述]。"
    }
  ]
}
\`\`\`

## Input Story
以下是我的故事原文：
{STORY_CONTENT}`;

// 角色三视图提示词生成（根据风格）
function generateCharacterPromptByStyle(styleId, character) {
  const styleConfig = STYLE_CONFIG[styleId];
  if (!styleConfig) {
    console.warn(`未找到风格配置: ${styleId}, 使用默认 watercolor`);
    return generateCharacterPromptByStyle('watercolor', character);
  }

  return styleConfig.characterPromptTemplate
    .replace('{CHARACTER_IDENTITY}', character.identity || character.name)
    .replace('{APPEARANCE_DESC}', character.appearance || '')
    .replace('{DETAIL_DESC}', character.details || '');
}

// 调用DeepSeek API
async function callDeepSeek(prompt, requestId) {
  try {
    console.log(`🤖 [智能分析-${requestId}] 调用DeepSeek API...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`⏰ [智能分析-${requestId}] 请求超时，中断 (90秒)`);
      controller.abort();
    }, 90000);

    const startTime = Date.now();
    const response = await fetch(process.env.DEEPSEEK_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 8000,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('API返回内容为空');
    }

    console.log(`✅ [智能分析-${requestId}] DeepSeek响应成功，耗时: ${responseTime}ms，内容长度: ${content.length}`);
    return content;

  } catch (error) {
    console.error(`❌ [智能分析-${requestId}] DeepSeek调用失败:`, error.message);
    if (error.name === 'AbortError') {
      throw new Error('请求超时（90秒），请稍后重试');
    }
    throw error;
  }
}

// 解析AI返回的JSON结果
function parseAIResponse(responseText, styleId) {
  console.log('🔍 解析AI响应，内容长度:', responseText.length);

  // 尝试提取JSON部分
  let jsonStr = responseText;

  // 移除markdown代码块标记
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    // 尝试找到JSON对象
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      jsonStr = responseText.substring(startIndex, endIndex + 1);
    }
  }

  try {
    const data = JSON.parse(jsonStr);

    // 处理角色数据，添加三视图提示词
    const characters = (data.characters || []).map((char, index) => ({
      id: `char_${Date.now()}_${index}`,
      name: char.name,
      identity: char.identity || char.name,
      appearance: char.appearance || '',
      details: char.details || '',
      personality: char.personality || '',
      // 根据风格生成三视图提示词
      prompt: generateCharacterPromptByStyle(styleId, char),
      image_url: null,
      locked: false
    }));

    // 处理页面数据
    const pages = (data.pages || []).map((page, index) => ({
      page_index: page.page_index || index + 1,
      scene_description: page.scene_description || '',
      dialogues: page.dialogues || [],
      jimeng_prompt: page.jimeng_prompt || '',
      image_url: null,
      audio_url: null,
      status: 'pending'
    }));

    console.log(`✅ 解析成功: ${characters.length}个角色, ${pages.length}页`);
    return { characters, pages };

  } catch (error) {
    console.error('❌ JSON解析失败:', error.message);
    console.log('原始内容:', jsonStr.substring(0, 500));
    throw new Error('AI返回格式解析失败，请重试');
  }
}

// SSE流式响应处理
async function handleStreamingAnalysis(req, res, requestId, story, pageCount, styleId) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sendProgress = (progress, message) => {
    res.write(`data: ${JSON.stringify({ type: 'progress', progress, message })}\n\n`);
    res.flush?.();
  };

  try {
    sendProgress(0, '开始分析故事...');

    // 构建提示词
    const prompt = STORYBOARD_PROMPT_TEMPLATE
      .replace('{PAGE_COUNT}', pageCount.toString())
      .replace('{STORY_CONTENT}', story);

    sendProgress(10, 'AI正在阅读故事...');

    // 调用AI
    const aiResponse = await callDeepSeek(prompt, requestId);

    sendProgress(70, '解析分镜脚本...');

    // 解析结果
    const { characters, pages } = parseAIResponse(aiResponse, styleId);

    sendProgress(90, '生成角色提示词...');

    // 发送完成结果
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      data: {
        characters,
        pages,
        storyboard_frames: pages, // 兼容旧格式
        style: styleId,
        analysisComplete: true
      }
    })}\n\n`);
    res.flush?.();

    sendProgress(100, '分析完成');

    console.log(`✅ [智能分析-${requestId}] 流式分析完成`);
    res.end();

  } catch (error) {
    console.error(`❌ [智能分析-${requestId}] 分析失败:`, error.message);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.flush?.();
    res.end();
  }
}

// 传统JSON响应处理
async function handleTraditionalAnalysis(req, res, requestId, story, pageCount, styleId) {
  try {
    const prompt = STORYBOARD_PROMPT_TEMPLATE
      .replace('{PAGE_COUNT}', pageCount.toString())
      .replace('{STORY_CONTENT}', story);

    const aiResponse = await callDeepSeek(prompt, requestId);
    const { characters, pages } = parseAIResponse(aiResponse, styleId);

    res.status(200).json({
      success: true,
      data: {
        characters,
        pages,
        storyboard_frames: pages,
        style: styleId,
        analysisComplete: true
      }
    });

  } catch (error) {
    console.error(`❌ [智能分析-${requestId}] 分析失败:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export default async function handler(req, res) {
  const requestId = Date.now();

  console.log(`🎭 [智能分析-${requestId}] 收到请求`);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { script, sceneCount = 8, style = 'watercolor' } = req.body;

    if (!script || script.trim().length < 50) {
      return res.status(400).json({
        success: false,
        error: '故事内容太短，请至少输入50个字符'
      });
    }

    const { stream } = req.query;

    if (stream === 'true') {
      return await handleStreamingAnalysis(req, res, requestId, script, sceneCount, style);
    } else {
      return await handleTraditionalAnalysis(req, res, requestId, script, sceneCount, style);
    }

  } catch (error) {
    console.error(`❌ [智能分析-${requestId}] 请求处理失败:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
