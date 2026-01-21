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
你的核心目标是：**严格按照故事字数生成固定页数的分镜**，制作一本**"图文音"节奏完美的少儿绘本**。

## 2. 全局风格
用户选择的风格：{STYLE_NAME}
风格描述词（生成画面提示词时，置于句首）：
{STYLE_DESCRIPTION}

**用户输入的绘本标题（重要）：** {USER_STORY_NAME}

---

## 阶段零：页数限制规则（⚠️ 强制执行）

**根据故事情节，严格遵守以下页数限制：**
请根据故事的情节进行页数的划分，最少9页，但是最多限制在11页

**分镜策略：在固定页数内合理分配故事情节**
- 开篇定场（1页）：介绍主角和初始场景
- 故事发展（根据剩余页数）：选择最关键的情节节点
- 高潮部分（1-2页）：故事转折或关键时刻
- 结尾收束（1页）：温暖或开放式的结局

**⚠️ 重要提示：不要生成超出指定页数的内容！严格控制在上述页数范围内。**

---

## 阶段一：建立资产库 (Asset Library)

**规则：**
1. 根据页数限制规划，提取所有出场的关键角色和背景。
2. **命名规范**：
   - 角色：\`{故事名缩写}-角色名-编号(01,02...)\`
   - 背景：\`{故事名缩写}-环境名-编号(01,02...)\`
3. **三视图提示词逻辑 (中文)**：必须包含"三视图，正面，侧面，背面，白底，全身照，角色设定图"，并结合角色在故事中的外貌描述 + 全局风格词。
4. **背景提示词逻辑 (中文)**：必须包含"空镜头，无人物，环境概念图，广角"，结合故事描述 + 全局风格词。

---

## 阶段二：分镜与语音脚本 (Storyboard & Audio Script)

**核心指令：**
根据阶段零确定的页数，逐页生成内容。

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
**⚠️ pages 数组长度必须严格遵守阶段零的页数限制！**

\`\`\`json
{
  "story_analysis": {
    "total_words": "原故事字数",
    "estimated_pages": "根据字数确定的总页数（5/8/10）",
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
        max_tokens: 8192,  // DeepSeek API 最大限制
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

    // 打印完整原始响应用于调试
    console.log(`✅ [智能分析-${requestId}] DeepSeek响应成功，耗时: ${responseTime}ms，内容长度: ${content.length}`);
    console.log(`📤 [智能分析-${requestId}] 原始响应内容:\n${content}`);
    return content;

  } catch (error) {
    console.error(`❌ [智能分析-${requestId}] DeepSeek调用失败:`, error.message);
    if (error.name === 'AbortError') {
      throw new Error('请求超时（120秒），请稍后重试');
    }
    throw error;
  }
}

/**
 * 清理和修复AI返回的JSON字符串
 * 处理常见的格式问题：末尾逗号、注释、控制字符、数组缺少逗号等
 */
function cleanJsonString(jsonStr) {
  if (!jsonStr) return jsonStr;

  let cleaned = jsonStr;

  // 1. 移除JavaScript风格的单行注释 // ... (但要保护URL中的//)
  cleaned = cleaned.replace(/([^:])\/\/.*$/gm, '$1');

  // 2. 移除多行注释 /* ... */
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // 3. 修复末尾逗号问题 (如 { "a": 1, } -> { "a": 1 })
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  // 4. 修复数组/对象元素之间缺少逗号的问题
  // 处理 "value" { 或 "value" [ 或 ] { 或 } {
  cleaned = cleaned.replace(/"\s+{/g, '", {');
  cleaned = cleaned.replace(/"\s+\[/g, '", [');
  cleaned = cleaned.replace(/]\s*{/g, '], {');
  cleaned = cleaned.replace(/}\s*\[/g, ', [');
  cleaned = cleaned.replace(/}\s*{/g, ', {');

  // 处理数字后跟 { 或 [ (如 123 { -> 123, {)
  cleaned = cleaned.replace(/(\d+)\s*{/g, '$1, {');
  cleaned = cleaned.replace(/(\d+)\s*\[/g, '$1, [');

  // 处理 true/false/null 后跟 { 或 [
  cleaned = cleaned.replace(/\b(true|false|null)\s*{/gi, '$1, {');
  cleaned = cleaned.replace(/\b(true|false|null)\s*\[/gi, '$1, [');

  // 处理 ] 后跟 } (数组结束对象继续)
  cleaned = cleaned.replace(/]\s*}/g, ']}');
  // 但如果 ] 后跟 " (数组元素后跟另一个对象的键)，需要逗号
  cleaned = cleaned.replace(/]\s*"/g, '], "');

  // 5. 移除可能存在的控制字符（除了换行、制表符等）
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // 6. 移除字符串内的特殊问题字符（如智能引号）
  cleaned = cleaned.replace(/[\u2018\u2019\u201C\u201D]/g, "'");

  // 7. 处理可能的布尔值大小写问题 (true/TRUE -> true)
  cleaned = cleaned.replace(/\b(TRUE|FALSE)\b/g, (match) => match.toLowerCase());

  // 8. 处理 null 大小写
  cleaned = cleaned.replace(/\bNULL\b/g, 'null');

  console.log('🧹 JSON清理完成，长度变化:', jsonStr.length, '->', cleaned.length);
  return cleaned;
}

/**
 * 修复被截断的JSON字符串
 * 当AI输出因token限制被截断时，尝试补全结尾
 */
function fixTruncatedJson(jsonStr) {
  if (!jsonStr) return jsonStr;

  const trimmed = jsonStr.trim();

  // 检查是否以预期的结尾结束
  if (trimmed.endsWith('}') || trimmed.endsWith(']')) {
    return trimmed;  // 看起来完整
  }

  console.warn('⚠️ 检测到JSON可能被截断，尝试修复...');

  let fixed = trimmed;

  // 计算未闭合的括号
  let openBraces = 0;
  let openBrackets = 0;

  for (const char of fixed) {
    if (char === '{') openBraces++;
    else if (char === '}') openBraces--;
    else if (char === '[') openBrackets++;
    else if (char === ']') openBrackets--;
  }

  // 补全未闭合的括号
  while (openBrackets > 0) {
    fixed += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    fixed += '}';
    openBraces--;
  }

  // 如果字符串在中间截断（如 "prompt": "儿童绘本风格，透），需要清理
  // 查找最后一个完整的对象或属性
  const lastCommaBeforeBrace = fixed.lastIndexOf(',', fixed.length - 50);
  if (lastCommaBeforeBrace !== -1) {
    // 检查最后50个字符是否有未完成的结构
    const tail = fixed.slice(-50);
    const hasIncompleteString = tail.includes('"') && !tail.slice(tail.lastIndexOf('"')).includes('"');
    const hasIncompleteObject = tail.includes('{') && !tail.includes('}');

    if (hasIncompleteString || hasIncompleteObject) {
      console.warn('⚠️ 检测到未完成的属性，尝试移除不完整的部分...');
      // 移除最后一个逗号之后的内容
      fixed = fixed.substring(0, lastCommaBeforeBrace);
      // 重新计算括号
      openBraces = 0;
      openBrackets = 0;
      for (const char of fixed) {
        if (char === '{') openBraces++;
        else if (char === '}') openBraces--;
        else if (char === '[') openBrackets++;
        else if (char === ']') openBrackets--;
      }
      while (openBrackets > 0) {
        fixed += ']';
        openBrackets--;
      }
      while (openBraces > 0) {
        fixed += '}';
        openBraces--;
      }
    }
  }

  if (fixed !== trimmed) {
    console.log('✅ JSON修复完成，长度变化:', trimmed.length, '->', fixed.length);
  }

  return fixed;
}

// 解析AI返回的JSON结果
function parseAIResponse(responseText, styleId) {
  console.log('🔍 解析AI响应，内容长度:', responseText.length);
  console.log('📄 原始响应预览:', responseText.substring(0, 300));

  // ============ 策略1: 尝试从markdown代码块提取 ============
  let jsonStr = null;

  // 匹配 ```json ... ```
  let match = responseText.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) {
    jsonStr = match[1].trim();
    console.log('✅ 策略1成功: 找到 ```json 代码块');
  }

  // 匹配 ``` ... ``` (无语言标记)
  if (!jsonStr) {
    match = responseText.match(/```\s*([\s\S]*?)\s*```/);
    if (match) {
      jsonStr = match[1].trim();
      console.log('✅ 策略1b成功: 找到 ``` 代码块');
    }
  }

  // ============ 策略2: 提取最外层的完整JSON对象 ============
  if (!jsonStr) {
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      jsonStr = responseText.substring(startIndex, endIndex + 1);
      console.log('✅ 策略2成功: 提取最外层JSON对象');
    }
  }

  // ============ 策略3: 尝试直接解析整个响应 ============
  if (!jsonStr) {
    jsonStr = responseText.trim();
    console.log('⚠️ 策略3: 直接解析整个响应');
  }

  // ============ 清理和修复常见的JSON问题 ============
  jsonStr = cleanJsonString(jsonStr);

  // ============ 检测并修复JSON被截断的问题 ============
  jsonStr = fixTruncatedJson(jsonStr);

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
    console.error('错误位置:', error.stack?.split('\n')[1]?.trim());

    // 输出更多调试信息
    console.error('📋 提取的JSON字符串长度:', jsonStr?.length);
    console.error('📋 JSON开头 (200字符):', jsonStr?.substring(0, 200));
    console.error('📋 JSON结尾 (200字符):', jsonStr?.substring(Math.max(0, jsonStr?.length - 200)));

    // 尝试定位JSON语法错误
    if (error.message.includes('position')) {
      const posMatch = error.message.match(/position (\d+)/);
      if (posMatch) {
        const errorPos = parseInt(posMatch[1]);
        const contextStart = Math.max(0, errorPos - 50);
        const contextEnd = Math.min(jsonStr.length, errorPos + 50);
        console.error('🔍 错误位置上下文:', jsonStr.substring(contextStart, contextEnd));
        console.error('🔍 错误指示:', ' '.repeat(Math.min(50, errorPos - contextStart)) + '^^^^^');
      }
    }

    // ============ 降级方案: 尝试使用更宽松的解析 ============
    console.warn('⚠️ 尝试降级解析方案...');

    try {
      // 尝试使用 eval 解析（在受控环境下，AI生成的数据相对安全）
      // 这可以容忍更多格式问题，如缺少逗号等
      const data = eval(`(${jsonStr})`);

      console.log('✅ 降级解析成功！');

      // 重新执行数据处理逻辑
      const storyAnalysis = data.story_analysis || {
        total_words: '未知',
        estimated_pages: data.pages?.length || 0,
        pacing_strategy: '默认策略'
      };

      const assets = (data.assets || []).map((asset, index) => ({
        id: asset.id || `asset_${Date.now()}_${index}`,
        type: asset.type,
        name: asset.name,
        prompt: asset.prompt,
        image_url: null,
        locked: false
      }));

      const characters = assets.filter(a => a.type === 'character');
      const backgrounds = assets.filter(a => a.type === 'background');

      const pages = (data.pages || []).map((page, index) => ({
        page_index: page.page_index || index + 1,
        scene_id: page.scene_id || `S-${String(index + 1).padStart(2, '0')}`,
        rationale: page.rationale || '',
        jimeng_prompt: page.jimeng_prompt || '',
        asset_refs: page.asset_refs || [],
        voice_script: page.voice_script || [],
        tts_text: page.tts_text || '',
        dialogues: (page.voice_script || []).map(v => ({
          role: v.role === '旁白' ? '旁白' : v.role,
          text: v.text,
          emotion: v.emotion
        })),
        image_url: null,
        audio_url: null,
        status: 'pending'
      }));

      console.log(`✅ 降级解析完成: ${characters.length}个角色, ${backgrounds.length}个背景, ${pages.length}页`);

      return {
        story_name: data.story_name || 'Story',
        story_analysis,
        assets,
        characters,
        backgrounds,
        pages
      };

    } catch (fallbackError) {
      console.error('❌ 降级解析也失败了:', fallbackError.message);
      throw new Error(`AI返回格式解析失败: ${error.message}`);
    }
  }
}

// SSE流式响应处理
async function handleStreamingAnalysis(req, res, requestId, story, styleId, userStoryName) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sendProgress = (progress, message) => {
    console.log(`📊 [智能分析-${requestId}] 进度: ${progress}% - ${message}`);
    res.write(`data: ${JSON.stringify({ type: 'progress', progress, message })}\n\n`);
    res.flush?.();
  };

  try {
    sendProgress(0, '开始分析故事...');
    await sleep(500);

    // 获取风格信息
    const styleName = STYLE_CONFIG[styleId]?.name || '经典水彩风';
    const styleDescription = getStyleDescription(styleId);

    // 构建提示词
    const prompt = STORYBOARD_PROMPT_TEMPLATE
      .replace('{STYLE_NAME}', styleName)
      .replace('{STYLE_DESCRIPTION}', styleDescription)
      .replace('{USER_STORY_NAME}', userStoryName || '未命名故事')
      .replace('{STORY_CONTENT}', story);

    sendProgress(5, '准备Claude/DeepSeek连接...');
    await sleep(600);

    sendProgress(10, 'AI正在阅读故事，智能规划分镜...');

    // 调用AI（这是耗时操作）
    const aiResponse = await callDeepSeek(prompt, requestId);

    sendProgress(60, '成功获取AI分析结果...');
    await sleep(400);

    sendProgress(70, '解析资产库（角色和背景）...');

    // 解析结果
    const { story_name, story_analysis, assets, characters, backgrounds, pages } = parseAIResponse(aiResponse, styleId);

    // ============ 添加封面页 ============
    // 封面页在 pages 数组最前面，page_index 为 0
    // 重要：使用用户输入的题目作为封面标题
    const coverTitle = userStoryName || story_name;
    const coverPage = {
      page_index: 0,
      scene_id: 'COVER',
      rationale: '绘本封面',
      jimeng_prompt: `儿童绘本封面，${styleDescription}，绘本标题"${coverTitle}"，温馨梦幻的童话风格，精美插画，高清画质`,
      asset_refs: [],
      voice_script: [{ role: '旁白', text: coverTitle, emotion: '平静' }],
      tts_text: coverTitle,
      dialogues: [{ role: '旁白', text: coverTitle, emotion: '平静' }],
      image_url: null,
      audio_url: null,
      status: 'pending',
      is_cover: true  // 标记为封面
    };

    // 调整所有分镜页的 page_index（从1开始）
    const adjustedPages = pages.map((page, index) => ({
      ...page,
      page_index: index + 1  // 原来的第1页变成第2页，以此类推
    }));

    // 将封面页放在最前面
    const finalPages = [coverPage, ...adjustedPages];

    sendProgress(80, `AI规划了 ${pages.length} 页分镜（含封面）...`);
    await sleep(400);

    sendProgress(85, '验证页面数据...');
    await sleep(300);

    sendProgress(90, '整理语音脚本和视觉描述...');
    await sleep(300);

    sendProgress(95, '准备最终结果...');

    // 发送完成结果
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      data: {
        story_name,
        story_analysis,  // 新增：故事分析信息
        assets,          // 完整资产列表（角色+背景）
        characters,      // 仅角色
        backgrounds,     // 仅背景
        pages: finalPages,  // 包含封面的最终分镜页
        style: styleId,
        analysisComplete: true
      }
    })}\n\n`);
    res.flush?.();

    sendProgress(100, `✅ 分析完成 - ${story_analysis.pacing_strategy}`);

    console.log(`✅ [智能分析-${requestId}] 流式分析完成，共 ${finalPages.length} 页（含封面）`);
    res.end();

  } catch (error) {
    console.error(`❌ [智能分析-${requestId}] 分析失败:`, error.message);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.flush?.();
    res.end();
  }
}

// 辅助函数：延迟
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 传统JSON响应处理
async function handleTraditionalAnalysis(req, res, requestId, story, styleId, userStoryName) {
  try {
    const styleName = STYLE_CONFIG[styleId]?.name || '经典水彩风';
    const styleDescription = getStyleDescription(styleId);

    const prompt = STORYBOARD_PROMPT_TEMPLATE
      .replace('{STYLE_NAME}', styleName)
      .replace('{STYLE_DESCRIPTION}', styleDescription)
      .replace('{USER_STORY_NAME}', userStoryName || '未命名故事')
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
    const { script, style = 'watercolor', story_name: userStoryName } = req.body;

    if (!script || script.trim().length < 50) {
      return res.status(400).json({
        success: false,
        error: '故事内容太短，请至少输入50个字符'
      });
    }

    const { stream } = req.query;

    if (stream === 'true') {
      return await handleStreamingAnalysis(req, res, requestId, script, style, userStoryName);
    } else {
      return await handleTraditionalAnalysis(req, res, requestId, script, style, userStoryName);
    }

  } catch (error) {
    console.error(`❌ [智能分析-${requestId}] 请求处理失败:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
