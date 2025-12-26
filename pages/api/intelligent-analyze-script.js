/**
 * 智能剧本分析API v3
 * 三阶段AI分析：资产库 + 分镜脚本 + TTS配音文本
 */

import { STYLE_CONFIG, getStyleSuffix } from '../../config/styles';

// 获取风格的中文描述（用于提示词）
function getStyleDescription(styleId) {
  const style = STYLE_CONFIG[styleId];
  if (!style) return '';
  // 返回风格后缀（去掉开头的逗号）
  return style.styleSuffix.replace(/^，/, '');
}

// 分镜脚本生成提示词（新版本 - 三阶段）
const STORYBOARD_PROMPT_TEMPLATE = `# Role: 少儿绘本导演 & AIGC提示词专家

## 1. 任务目标
你将接收一个"故事文本"和一个"用户选择的风格"，请按顺序完成以下三个阶段的任务。你的核心目标是协助用户制作一本**"图文音"俱佳的少儿绘本**，并确保**分镜脚本与配音文本完全一致**。

## 2. 全局风格
用户选择的风格：{STYLE_NAME}
风格描述词（请在生成所有画面提示词时，将该风格的中文描述词置于句首）：
{STYLE_DESCRIPTION}

---

## 阶段一：建立资产库 (Asset Library)

**规则：**
1. 分析故事，提取所有关键角色和背景。
2. **命名规范**：
   - 角色：\`{故事名缩写}-角色名-编号(01,02...)\`
   - 背景：\`{故事名缩写}-环境名-编号(01,02...)\`
3. **三视图提示词逻辑 (中文)**：必须包含"三视图，正面，侧面，背面，白底，全身照，角色设定图"，并结合角色在故事中的外貌描述 + 全局风格词。
4. **背景提示词逻辑 (中文)**：必须包含"空镜头，无人物，环境概念图，广角"，结合故事描述 + 全局风格词。

---

## 阶段二：分镜与语音脚本 (Storyboard & Audio Script)

**核心指令：**
在此阶段，你需要同时扮演**分镜画师**和**少儿频道主持人**。

**1. 语音脚本生成规则 (Voiceover Generation) —— 唯一真理：**
- **目标**：将原故事转化为适合TTS（语音合成）朗读的脚本。
- **原则**：句子要短，多用拟声词，**此处的文本是最终配音依据**。
- **格式**：每一句台词前必须标注建议的语气（如[开心]、[神秘]）。

**2. 画面描述规则 (Visual Prompt) —— 严谨对应：**
- **语言**：**中文**。
- **图文同步强制规则**：如果画面中有对话气泡，**气泡内的文字必须与"绘本语音脚本"中的台词100%完全一致，一字不差**。如果台词过长不适合放入气泡，则在画面描述中不要写气泡指令。
- **结构必须包含以下要素，并用逗号分隔**：
  1. **[风格词]**：使用上面的风格描述词
  2. **[环境背景]**：使用资产ID（如 Story-BG-01），并描述细节。
  3. **[角色构图与动作]**：使用资产ID（如 Story-Char-01），描述位置、姿态及神情。
  4. **[对话气泡]**(可选)：格式为"对话气泡从[角色]嘴边冒出，气泡内写着文字：'与语音脚本完全一致的台词'"。
  5. **[光影与氛围]**：描述光线、时间及氛围。

---

## 阶段三：TTS 配音专用纯文本 (TTS Raw Text)

**核心指令：**
将"阶段二"中所有的"绘本语音脚本"提取出来，整理成纯文本。

**规则：**
1. **绝对一致性**：这里的内容必须与"阶段二"中的文字**一字不差**。
2. **格式**：按分镜顺序排列。
3. **标注**：如果是角色就改为"【角色名】【语气】的说"，如果是旁白就去掉标注。

---

## Output Format (输出格式 - JSON)
请严格按照以下JSON格式输出，确保可以被JSON.parse解析：

\`\`\`json
{
  "story_name": "故事名称缩写（用于资产命名）",
  "assets": [
    {
      "type": "character",
      "id": "Story-Char-01",
      "name": "角色中文名",
      "prompt": "[风格词], 三视图, 正面, 侧面, 背面, 白底, 全身照, 角色设定图, [角色外貌详细描述]"
    },
    {
      "type": "background",
      "id": "Story-BG-01",
      "name": "背景中文名",
      "prompt": "[风格词], 空镜头, 无人物, 环境概念图, 广角, [环境详细描述]"
    }
  ],
  "pages": [
    {
      "page_index": 1,
      "scene_id": "S-01",
      "jimeng_prompt": "[风格词], Story-BG-01(森林), 画面左下角是 Story-Char-01(小兔子), 正向右上方跳跃, 神情兴奋, 一个白色的气泡在它头顶, 气泡里写着: '你好呀!', 阳光从树叶缝隙洒下, 丁达尔效应, 梦幻氛围。",
      "asset_refs": ["Story-Char-01", "Story-BG-01"],
      "voice_script": [
        {
          "role": "旁白",
          "emotion": "温暖亲切",
          "text": "春天来了。"
        },
        {
          "role": "Story-Char-01",
          "emotion": "开心",
          "text": "你好呀！"
        }
      ],
      "tts_text": "春天来了。小兔子开心的说你好呀！"
    }
  ]
}
\`\`\`

## 页数要求
请将故事拆分为 {PAGE_COUNT} 页。

## Input Story
以下是我的故事原文：
{STORY_CONTENT}`;

// 调用DeepSeek API
async function callDeepSeek(prompt, requestId) {
  try {
    console.log(`🤖 [智能分析-${requestId}] 调用DeepSeek API...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`⏰ [智能分析-${requestId}] 请求超时，中断 (120秒)`);
      controller.abort();
    }, 120000);

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
      throw new Error('请求超时（120秒），请稍后重试');
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

    // 处理资产数据
    const assets = (data.assets || []).map((asset, index) => ({
      id: asset.id || `asset_${Date.now()}_${index}`,
      type: asset.type, // 'character' 或 'background'
      name: asset.name,
      prompt: asset.prompt,
      image_url: null,
      locked: false
    }));

    // 分离角色和背景
    const characters = assets.filter(a => a.type === 'character');
    const backgrounds = assets.filter(a => a.type === 'background');

    // 处理页面数据
    const pages = (data.pages || []).map((page, index) => ({
      page_index: page.page_index || index + 1,
      scene_id: page.scene_id || `S-${String(index + 1).padStart(2, '0')}`,
      jimeng_prompt: page.jimeng_prompt || '',
      asset_refs: page.asset_refs || [], // 引用的资产ID列表
      voice_script: page.voice_script || [], // 语音脚本（带角色和情绪）
      tts_text: page.tts_text || '', // TTS纯文本
      // 兼容旧格式
      dialogues: (page.voice_script || []).map(v => ({
        role: v.role === '旁白' ? '旁白' : v.role,
        text: v.text,
        emotion: v.emotion
      })),
      image_url: null,
      audio_url: null,
      status: 'pending'
    }));

    console.log(`✅ 解析成功: ${characters.length}个角色, ${backgrounds.length}个背景, ${pages.length}页`);

    return {
      story_name: data.story_name || 'Story',
      assets,
      characters,
      backgrounds,
      pages
    };

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

    // 获取风格信息
    const styleName = STYLE_CONFIG[styleId]?.name || '经典水彩风';
    const styleDescription = getStyleDescription(styleId);

    // 构建提示词
    const prompt = STORYBOARD_PROMPT_TEMPLATE
      .replace('{PAGE_COUNT}', pageCount.toString())
      .replace('{STYLE_NAME}', styleName)
      .replace('{STYLE_DESCRIPTION}', styleDescription)
      .replace('{STORY_CONTENT}', story);

    sendProgress(10, 'AI正在阅读故事...');

    // 调用AI
    const aiResponse = await callDeepSeek(prompt, requestId);

    sendProgress(60, '解析资产库...');

    // 解析结果
    const { story_name, assets, characters, backgrounds, pages } = parseAIResponse(aiResponse, styleId);

    sendProgress(80, '整理分镜脚本...');

    sendProgress(90, '生成语音脚本...');

    // 发送完成结果
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      data: {
        story_name,
        assets,        // 完整资产列表（角色+背景）
        characters,    // 仅角色
        backgrounds,   // 仅背景
        pages,
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
    const styleName = STYLE_CONFIG[styleId]?.name || '经典水彩风';
    const styleDescription = getStyleDescription(styleId);

    const prompt = STORYBOARD_PROMPT_TEMPLATE
      .replace('{PAGE_COUNT}', pageCount.toString())
      .replace('{STYLE_NAME}', styleName)
      .replace('{STYLE_DESCRIPTION}', styleDescription)
      .replace('{STORY_CONTENT}', story);

    const aiResponse = await callDeepSeek(prompt, requestId);
    const { story_name, assets, characters, backgrounds, pages } = parseAIResponse(aiResponse, styleId);

    res.status(200).json({
      success: true,
      data: {
        story_name,
        assets,
        characters,
        backgrounds,
        pages,
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
