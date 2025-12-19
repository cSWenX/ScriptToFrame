/**
 * 模拟剧本分析API接口
 * 用于前端功能测试，当Claude代理SSL问题解决后可切换回真实API
 */

// 模拟分析结果
const generateMockAnalysis = (script, frameCount, style, genre) => {
  // 简单的剧本解析 - 提取角色名
  const characters = extractCharactersFromScript(script);
  const scenes = extractScenesFromScript(script);

  return {
    success: true,
    data: {
      script_analysis: {
        characters: characters,
        scenes: scenes,
        genre_detected: genre,
        total_frames: frameCount
      },
      storyboard_frames: generateMockFrames(script, frameCount, style, characters),
      recommendedStyle: style,
      recommendedGenre: genre,
      estimatedScenes: scenes.length
    }
  };
};

// 从剧本中提取角色
const extractCharactersFromScript = (script) => {
  const characters = [];

  // 简单的角色名提取（寻找对话格式）
  const dialogueMatches = script.match(/([^：:\n]{1,10})(?=：|:)/gm) || [];
  let characterNames = [...new Set(dialogueMatches.map(name => name.trim().replace(/^.*[。！？\n]/, '')))];

  // 过滤掉明显不是人名的内容
  characterNames = characterNames.filter(name =>
    name.length <= 4 &&
    !name.includes('说') &&
    !name.includes('道') &&
    !name.includes('问') &&
    !name.includes('答') &&
    !/^\d/.test(name) &&
    name.length > 0
  );

  // 从剧本内容中提取提到的人名
  const namePatterns = script.match(/[王李张刘陈杨黄赵吴周马高朱胡郭何邓][小大老]*[明红华军强伟芳丽美娟霞燕雪梅娜莉]/g) || [];
  characterNames = [...new Set([...characterNames, ...namePatterns])];

  // 如果还是没找到，使用默认角色
  if (characterNames.length === 0) {
    characterNames = ['主角', '配角'];
  }

  // 为每个角色生成描述
  characterNames.forEach((name, index) => {
    const gender = name.includes('红') || name.includes('华') || name.includes('美') || name.includes('丽') || name.includes('芳') || name.includes('娟') || name.includes('霞') || name.includes('燕') || name.includes('雪') || name.includes('梅') || name.includes('娜') || name.includes('莉') ? 'female' : 'male';
    characters.push({
      name: name,
      description: `剧本中的${index === 0 ? '主要' : '重要'}角色`,
      visual_description: `${gender === 'female' ? 'young woman' : 'young man'} with ${gender === 'female' ? 'long hair' : 'short hair'}, expressive eyes, ${gender === 'female' ? 'elegant appearance' : 'handsome appearance'}`
    });
  });

  return characters;
};

// 从剧本中提取场景
const extractScenesFromScript = (script) => {
  const scenes = [];

  // 寻找场景关键词
  const sceneKeywords = ['咖啡厅', '教室', '家里', '公司', '学校', '街道', '公园', '餐厅', '房间', '办公室'];
  const foundScenes = [];

  sceneKeywords.forEach(keyword => {
    if (script.includes(keyword)) {
      foundScenes.push(keyword);
    }
  });

  // 如果没找到特定场景，分析剧本内容
  if (foundScenes.length === 0) {
    if (script.includes('说') || script.includes('道') || script.includes('：')) {
      foundScenes.push('室内场景');
    } else {
      foundScenes.push('通用场景');
    }
  }

  foundScenes.forEach(scene => {
    scenes.push({
      location: scene,
      description: `${scene}的环境设置`
    });
  });

  return scenes;
};

// 生成基于真实剧本的模拟分镜
const generateMockFrames = (script, count, style, characters) => {
  const frames = [];

  // 将剧本按句子或段落分割
  const sentences = script.split(/[。！？\n]/).filter(s => s.trim().length > 0);

  // 提取场景信息
  const hasIndoorKeywords = script.includes('图书馆') || script.includes('教室') || script.includes('房间') || script.includes('家') || script.includes('办公室');
  const hasOutdoorKeywords = script.includes('街道') || script.includes('公园') || script.includes('户外');
  const sceneType = hasIndoorKeywords ? 'indoor' : hasOutdoorKeywords ? 'outdoor' : 'indoor';

  for (let i = 1; i <= count; i++) {
    let description, emotion, keyMoment, detailedPrompt;

    // 根据剧本内容生成描述
    if (sentences.length > 0) {
      const sentenceIndex = Math.floor((i - 1) * sentences.length / count);
      const sentence = sentences[sentenceIndex] || sentences[0];
      description = sentence.trim();

      // 详细情感分析
      if (sentence.includes('紧张') || sentence.includes('害怕') || sentence.includes('担心')) {
        emotion = '紧张';
      } else if (sentence.includes('开心') || sentence.includes('笑') || sentence.includes('高兴') || sentence.includes('微笑')) {
        emotion = '快乐';
      } else if (sentence.includes('生气') || sentence.includes('愤怒') || sentence.includes('火')) {
        emotion = '愤怒';
      } else if (sentence.includes('伤心') || sentence.includes('哭') || sentence.includes('难过')) {
        emotion = '悲伤';
      } else if (sentence.includes('惊讶') || sentence.includes('震惊') || sentence.includes('意外')) {
        emotion = '惊讶';
      } else if (sentence.includes('害羞') || sentence.includes('脸红') || sentence.includes('不好意思')) {
        emotion = '害羞';
      } else {
        emotion = '平静';
      }

      keyMoment = `第${i}个关键情节：${sentence.substring(0, 25)}...`;
    } else {
      description = `第${i}个场景的内容`;
      emotion = '平静';
      keyMoment = `第${i}个重要时刻`;
    }

    // 生成详细的英文提示词
    const characterDescriptions = characters.map(char => {
      const gender = char.visual_description.includes('woman') ? 'woman' : 'man';
      const hairStyle = gender === 'woman' ? 'long flowing hair' : 'neat short hair';
      const clothing = gender === 'woman' ? 'elegant dress or casual outfit' : 'casual shirt and pants';
      return `${gender} with ${hairStyle}, wearing ${clothing}`;
    }).join(' and ');

    // 根据分镜序号和内容生成不同的场景设置
    let sceneDescription = '';
    let cameraAngle = '';
    let lighting = '';
    let composition = '';

    switch (i) {
      case 1:
        sceneDescription = sceneType === 'indoor' ? 'cozy library interior with bookshelves, warm wooden furniture' : 'beautiful outdoor park with trees and benches';
        cameraAngle = 'wide shot establishing the scene';
        lighting = 'soft natural lighting from windows';
        composition = 'establishing shot showing the environment and characters entering';
        break;

      case 2:
        sceneDescription = sceneType === 'indoor' ? 'detailed library setting with books and reading tables' : 'intimate outdoor seating area';
        cameraAngle = 'medium shot focusing on character interaction';
        lighting = 'warm ambient lighting highlighting faces';
        composition = 'characters positioned in frame showing their relationship';
        break;

      case 3:
        sceneDescription = sceneType === 'indoor' ? 'close library environment with soft background blur' : 'romantic outdoor setting with soft focus background';
        cameraAngle = 'close-up shot capturing emotions and dialogue';
        lighting = 'dramatic lighting emphasizing facial expressions';
        composition = 'intimate framing focusing on character reactions';
        break;

      default:
        sceneDescription = sceneType === 'indoor' ? 'warm library atmosphere with detailed background' : 'serene outdoor environment';
        cameraAngle = i === count ? 'extreme close-up for emotional impact' : 'medium close-up';
        lighting = i === count ? 'golden hour lighting for warmth' : 'balanced natural lighting';
        composition = i === count ? 'tight framing for maximum emotional connection' : 'balanced composition';
        break;
    }

    // 情感对应的视觉描述
    const emotionVisuals = {
      '紧张': 'tense expressions, slightly hunched postures, worried eyes',
      '快乐': 'bright smiles, relaxed postures, sparkling eyes, joyful energy',
      '愤怒': 'furrowed brows, clenched fists, intense stares',
      '悲伤': 'downcast eyes, slumped shoulders, melancholic atmosphere',
      '惊讶': 'wide eyes, open mouths, raised eyebrows',
      '害羞': 'blushing cheeks, averted gazes, gentle smiles',
      '平静': 'serene expressions, natural postures, peaceful atmosphere'
    };

    const emotionVisual = emotionVisuals[emotion] || emotionVisuals['平静'];

    detailedPrompt = `${style} style artwork, ${characterDescriptions}, ${sceneDescription}, ${cameraAngle}, ${lighting}, ${composition}, ${emotionVisual}, highly detailed, professional illustration, vibrant colors, 16:9 aspect ratio, ${emotion} mood, cinematic quality`;

    frames.push({
      sequence: i,
      scene: `场景${i}`,
      characters: characters.slice(0, 2).map(c => c.name), // 最多两个角色
      description: description,
      prompt: detailedPrompt,
      emotion: emotion,
      camera_angle: cameraAngle,
      key_moment: keyMoment
    });
  }

  return frames;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { script, frameCount, style, genre } = req.body;

    if (!script || !frameCount) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: script, frameCount'
      });
    }

    console.log('🎭 模拟Claude API分析请求:', {
      scriptLength: script.length,
      frameCount,
      style,
      genre
    });

    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockResult = generateMockAnalysis(script, frameCount, style, genre);

    console.log('✅ 模拟分析完成');

    res.status(200).json(mockResult);

  } catch (error) {
    console.error('模拟API错误:', error);
    res.status(500).json({
      success: false,
      error: '模拟服务器内部错误'
    });
  }
}