/**
 * 智能剧本分析API模拟版本
 * 用于测试4步工作流，等Claude API配置完成后切换到真实版本
 */

// 模拟Claude API响应
function simulateClaudeResponse(stepName, input) {
  console.log(`🤖 模拟${stepName}...`);

  switch (stepName) {
    case '第1步: 故事切分':
      return `---
## 第1份
**完整剧情原文**: 李小红在图书馆里看书，突然张小明走了进来。李小红抬起头，两人四目相对。
**核心视觉点**: 图书馆内，李小红与张小明初次相遇的瞬间

---
## 第2份
**完整剧情原文**: 张小明鼓起勇气走向李小红，轻声问道："请问这个位置有人坐吗？"李小红脸红地摇摇头。
**核心视觉点**: 张小明主动搭话，李小红害羞回应

---
## 第3份
**完整剧情原文**: 两人开始小声交谈，分享着对书籍的喜爱。时间过得很快，直到图书馆要关门了。
**核心视觉点**: 两人在图书馆里愉快交谈，产生共鸣`;

    case '第2步: 关键帧提取':
      return `---
## 第1份
**帧类型**: 开始帧
**画面描述**: 明亮的图书馆内，李小红坐在木桌前专心看书，阳光从窗户洒在她的长发上，营造温暖宁静的氛围

---
## 第2份
**帧类型**: 开始帧
**画面描述**: 张小明站在李小红旁边，略显紧张地伸手指向空椅子，李小红抬头看向他，脸颊微红，背景是书架

---
## 第3份
**帧类型**: 开始帧
**画面描述**: 两人面对面坐着，都拿着书本，张小明在说话李小红在微笑倾听，图书馆内温暖的灯光

---
## 第3份
**帧类型**: 结束帧
**画面描述**: 夕阳西下，两人在图书馆门口依依不舍地告别，张小明挥手李小红微笑回应，远景镜头`;

    case '第3步: 提示词生成':
      return `---
### 1 第1份-开始帧
**中文辅助描述**: 图书馆里专心读书的女孩
**Jimeng Prompt**: (Masterpiece, top quality, highly detailed, 8k resolution, cinematic lighting, dynamic composition) anime style, young woman with long flowing hair wearing elegant casual outfit, sitting at wooden desk reading book, warm sunlight streaming through library windows, cozy atmosphere, peaceful expression, wide shot establishing scene, soft natural lighting, serene mood --ar 16:9

---
### 2 第2份-开始帧
**中文辅助描述**: 男孩主动搭话的瞬间
**Jimeng Prompt**: (Masterpiece, top quality, highly detailed, 8k resolution, cinematic lighting, dynamic composition) anime style, young man with neat short hair wearing casual shirt, standing beside table gesturing to empty chair, woman looking up with blushing cheeks, library background with bookshelves, medium shot focusing on character interaction, warm ambient lighting, shy nervous mood --ar 16:9

---
### 3 第3份-开始帧
**中文辅助描述**: 两人愉快交谈的场景
**Jimeng Prompt**: (Masterpiece, top quality, highly detailed, 8k resolution, cinematic lighting, dynamic composition) anime style, young man and woman sitting across from each other at library table, both holding books, man speaking while woman listens with gentle smile, cozy library interior, close-up shot capturing emotions, warm golden lighting, happy peaceful mood --ar 16:9

---
### 4 第3份-结束帧
**中文辅助描述**: 图书馆门口的告别场景
**Jimeng Prompt**: (Masterpiece, top quality, highly detailed, 8k resolution, cinematic lighting, dynamic composition) anime style, young man and woman standing outside library entrance, man waving goodbye while woman smiles and waves back, sunset sky in background, wide shot showing full scene, golden hour lighting, bittersweet romantic mood --ar 16:9`;

    default:
      return '模拟响应';
  }
}

// 解析第三步的结果，提取提示词和中文描述
function parseStep3Results(claudeResponse) {
  const frames = [];
  const sections = claudeResponse.split('---').filter(section => section.trim());

  sections.forEach((section, index) => {
    const chineseMatch = section.match(/\*\*中文辅助描述\*\*:\s*([^\n]+)/);
    const promptMatch = section.match(/\*\*Jimeng Prompt\*\*:\s*([^\n]+)/);
    const typeMatch = section.match(/第(\d+)份-(开始帧|结束帧)/);

    if (chineseMatch && promptMatch && typeMatch) {
      frames.push({
        sequence: index + 1,
        sceneIndex: parseInt(typeMatch[1]),
        frameType: typeMatch[2],
        chineseDescription: chineseMatch[1].trim(),
        jimengPrompt: promptMatch[1].trim(),
        imageUrl: null,
        isGenerating: false,
        error: null
      });
    }
  });

  return frames;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { script, sceneCount, style, genre } = req.body;

    if (!script || !sceneCount) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: script, sceneCount'
      });
    }

    console.log('🎭 开始模拟智能剧本分析:', {
      scriptLength: script.length,
      sceneCount,
      style,
      genre
    });

    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 模拟第一步：故事切分
    const segmentedStory = simulateClaudeResponse('第1步: 故事切分', script);

    // 模拟第二步：关键帧提取
    const extractedFrames = simulateClaudeResponse('第2步: 关键帧提取', segmentedStory);

    // 模拟第三步：提示词生成
    const promptResults = simulateClaudeResponse('第3步: 提示词生成', extractedFrames);

    // 第四步：解析结果
    const frames = parseStep3Results(promptResults);

    if (frames.length === 0) {
      throw new Error('第4步: 结果解析失败，未能提取到有效的提示词');
    }

    console.log(`✅ 模拟智能分析完成，生成${frames.length}个关键帧`);

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

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ 模拟智能剧本分析失败:', error);

    // 判断是哪一步失败
    let stepInfo = '';
    if (error.message.includes('第1步')) stepInfo = '第1步 故事切分';
    else if (error.message.includes('第2步')) stepInfo = '第2步 关键帧提取';
    else if (error.message.includes('第3步')) stepInfo = '第3步 提示词生成';
    else if (error.message.includes('第4步')) stepInfo = '第4步 结果解析';
    else stepInfo = '未知步骤';

    res.status(500).json({
      success: false,
      error: `模拟智能分析失败 - ${stepInfo}: ${error.message}`,
      failedStep: stepInfo
    });
  }
}