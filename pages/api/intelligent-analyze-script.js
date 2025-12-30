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

// 分镜脚本生成提示词（新版本 - 智能分镜）
const STORYBOARD_PROMPT_TEMPLATE = `# Role: 少儿绘本导演 & AIGC提示词专家 & 视觉叙事大师

## 1. 任务目标
你将接收一个"故事文本"和一个"用户选择的风格"。你需要先进行智能分镜规划，然后按顺序完成资产建立、脚本编写，最后输出为标准的JSON格式。
你的核心目标是：打破固定页数限制，完全根据故事的内在节奏，制作一本**"图文音"节奏完美的少儿绘本**。

## 2. 全局风格
用户选择的风格：{STYLE_NAME}
风格描述词（生成画面提示词时，置于句首）：
{STYLE_DESCRIPTION}

---

## 阶段零：智能分镜规划 (Intelligent Segmentation Logic)

**核心原则：形式服从内容 (Form Follows Content)**
请勿使用固定的页数限制。请根据以下**"视觉节拍 (Visual Beats)"**逻辑，将故事自动划分为最合理的页数。每一页必须只承载一个核心视觉状态。

**强制分页触发条件：**
1. **时空切换**：一旦出现地点变化（如：室内->室外）或时间显著流逝（如：第二天），必须分页。
2. **动作序列**：如果一段文字包含连续的复杂动作（如："他先穿好衣服，然后冲出门，最后跳进河里"），必须拆分为多页，每页展示一个动作阶段。
3. **情绪突变**：当氛围发生重大转折（如：从平静变惊恐），必须分页以制造视觉冲击。
4. **信息浓度**：单页文字不宜过密。如果对话过长，请拆分为"全景（交代环境）"和"特写（聚焦表情）"两页。
5. **翻页悬念**：在秘密揭晓或惊讶时刻前分页，利用翻页动作制造惊喜。

---

## 阶段一：建立资产库 (Asset Library)

**规则：**
1. 根据阶段零的规划，提取所有出场的关键角色和背景。
2. **命名规范**：
   - 角色：\`{故事名缩写}-角色名-编号(01,02...)\`
   - 背景：\`{故事名缩写}-环境名-编号(01,02...)\`
3. **三视图提示词逻辑 (中文)**：必须包含"三视图，正面，侧面，背面，白底，全身照，角色设定图"，并结合角色在故事中的外貌描述 + 全局风格词。
4. **背景提示词逻辑 (中文)**：必须包含"空镜头，无人物，环境概念图，广角"，结合故事描述 + 全局风格词。

---

## 阶段二：分镜与语音脚本 (Storyboard & Audio Script)

**核心指令：**
根据阶段零拆分出的页数，逐页生成内容。

**1. 语音脚本生成规则 (Voiceover) —— 唯一真理：**
- **内容**：将原故事转化为适合TTS朗读的脚本，句子要短，多用拟声词。
- **对应**：此处的文本是最终配音依据。
- **标注**：每一句台词前标注建议语气（如[开心]）。

**2. 画面描述规则 (Visual Prompt) —— 严谨对应：**
- **语言**：中文。
- **气泡强制规则**：如果画面有对话气泡，气泡内文字必须与"语音脚本"台词100%一致。若台词过长，画面描述中不要写气泡指令。
- **结构 (用逗号分隔)**：
  1. **[风格词]**：使用全局风格描述。
  2. **[环境背景]**：引用资产ID，描述细节。
  3. **[角色构图/景别]**：引用资产ID。必须根据分镜逻辑指定景别（如：特写、全景、仰视）。
  4. **[对话气泡]**(可选)："对话气泡从[角色]嘴边冒出，气泡内写着：'文字'"。
  5. **[光影与氛围]**：描述光线、色彩倾向。

---

## 阶段三：TTS 配音专用纯文本 (TTS Raw Text)

**规则：**
1. 提取阶段二中所有语音脚本。
2. **格式**：按分镜顺序排列。如果是角色台词，格式为"【角色名】【语气】的说"；旁白则直接写。

---

## Output Format (输出格式 - JSON)

请严格按照以下JSON格式输出，不要输出任何Markdown代码块标记之外的文字，确保可以直接被代码解析。
**pages 数组的长度由你根据"阶段零"的逻辑自动决定。**

\`\`\`json
{
  "story_analysis": {
    "total_words": "原故事字数",
    "estimated_pages": "AI计算出的总页数",
    "pacing_strategy": "简述分镜策略（如：动作密集型、情感细腻型）"
  },
  "story_name": "故事名称缩写",
  "assets": [
    {
      "type": "character",
      "id": "Story-Char-01",
      "name": "角色中文名",
      "prompt": "[风格词], 三视图, 正面, 侧面, 背面, 白底, 全身照, 角色设定图, [详细描述]"
    },
    {
      "type": "background",
      "id": "Story-BG-01",
      "name": "背景中文名",
      "prompt": "[风格词], 空镜头, 无人物, 环境概念图, 广角, [详细描述]"
    }
  ],
  "pages": [
    {
      "page_index": 1,
      "scene_id": "S-01",
      "rationale": "简述本页拆分理由（如：开篇定场 / 情绪转折点）",
      "jimeng_prompt": "[风格词], Story-BG-01(森林), 全景镜头, 画面中央是 Story-Char-01(小兔子), 它正向右上方跳跃, 神情兴奋, 一个白色的气泡在它头顶, 气泡里写着: '你好呀!', 阳光从树叶缝隙洒下, 丁达尔效应, 梦幻氛围。",
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
        max_tokens: 8192,
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

    // 提取故事分析信息
    const storyAnalysis = data.story_analysis || {
      total_words: '未知',
      estimated_pages: data.pages?.length || 0,
      pacing_strategy: '默认策略'
    };

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
      rationale: page.rationale || '', // 分页理由
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
    console.log(`📊 故事分析: ${storyAnalysis.estimated_pages}页, 策略: ${storyAnalysis.pacing_strategy}`);

    return {
      story_name: data.story_name || 'Story',
      story_analysis: storyAnalysis,
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
async function handleStreamingAnalysis(req, res, requestId, story, styleId) {
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

    // 构建提示词（不再需要PAGE_COUNT）
    const prompt = STORYBOARD_PROMPT_TEMPLATE
      .replace('{STYLE_NAME}', styleName)
      .replace('{STYLE_DESCRIPTION}', styleDescription)
      .replace('{STORY_CONTENT}', story);

    sendProgress(10, 'AI正在阅读故事，智能规划分镜...');

    // 调用AI
    const aiResponse = await callDeepSeek(prompt, requestId);

    sendProgress(60, '解析资产库...');

    // 解析结果
    const { story_name, story_analysis, assets, characters, backgrounds, pages } = parseAIResponse(aiResponse, styleId);

    sendProgress(80, `AI规划了 ${pages.length} 页分镜...`);

    sendProgress(90, '生成语音脚本...');

    // 发送完成结果
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      data: {
        story_name,
        story_analysis,  // 新增：故事分析信息
        assets,          // 完整资产列表（角色+背景）
        characters,      // 仅角色
        backgrounds,     // 仅背景
        pages,
        style: styleId,
        analysisComplete: true
      }
    })}\n\n`);
    res.flush?.();

    sendProgress(100, `分析完成 - ${story_analysis.pacing_strategy}`);

    console.log(`✅ [智能分析-${requestId}] 流式分析完成，共 ${pages.length} 页`);
    res.end();

  } catch (error) {
    console.error(`❌ [智能分析-${requestId}] 分析失败:`, error.message);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.flush?.();
    res.end();
  }
}

// 传统JSON响应处理
async function handleTraditionalAnalysis(req, res, requestId, story, styleId) {
  try {
    const styleName = STYLE_CONFIG[styleId]?.name || '经典水彩风';
    const styleDescription = getStyleDescription(styleId);

    const prompt = STORYBOARD_PROMPT_TEMPLATE
      .replace('{STYLE_NAME}', styleName)
      .replace('{STYLE_DESCRIPTION}', styleDescription)
      .replace('{STORY_CONTENT}', story);

    const aiResponse = await callDeepSeek(prompt, requestId);
    const { story_name, story_analysis, assets, characters, backgrounds, pages } = parseAIResponse(aiResponse, styleId);

    res.status(200).json({
      success: true,
      data: {
        story_name,
        story_analysis,
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
    const { script, style = 'watercolor' } = req.body;

    if (!script || script.trim().length < 50) {
      return res.status(400).json({
        success: false,
        error: '故事内容太短，请至少输入50个字符'
      });
    }

    const { stream } = req.query;

    if (stream === 'true') {
      return await handleStreamingAnalysis(req, res, requestId, script, style);
    } else {
      return await handleTraditionalAnalysis(req, res, requestId, script, style);
    }

  } catch (error) {
    console.error(`❌ [智能分析-${requestId}] 请求处理失败:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
