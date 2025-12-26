/**
 * 文本翻译API
 * 使用DeepSeek将中文文本翻译成目标语言
 * 主要用于将语音脚本翻译成英文用于TTS
 */

// 调用DeepSeek API进行翻译
async function translateWithDeepSeek(text, targetLanguage) {
  const languageMap = {
    'en': 'English',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean'
  };

  const targetLangName = languageMap[targetLanguage] || 'English';

  const prompt = `You are a professional translator specializing in children's storybooks.
Translate the following Chinese text into ${targetLangName}.
Keep the translation simple, natural, and suitable for children.
Preserve the emotional tone and any speaker attributions (like "小兔子说：" -> "Little Rabbit said:").

Chinese text:
${text}

Please provide only the translated text, without any explanations or additional formatting.`;

  const response = await fetch(process.env.DEEPSEEK_BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3  // 低温度以获得更稳定的翻译
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  const translatedText = result.choices?.[0]?.message?.content?.trim();

  if (!translatedText) {
    throw new Error('翻译结果为空');
  }

  return translatedText;
}

export default async function handler(req, res) {
  const requestId = Date.now();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { text, targetLanguage = 'en' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: text'
      });
    }

    // 如果目标语言是中文，直接返回原文
    if (targetLanguage === 'zh') {
      return res.status(200).json({
        success: true,
        data: {
          originalText: text,
          translatedText: text,
          targetLanguage: 'zh'
        }
      });
    }

    console.log(`🌍 [翻译-${requestId}] 开始翻译，目标语言: ${targetLanguage}`);
    console.log(`📝 原文: ${text.substring(0, 100)}...`);

    const translatedText = await translateWithDeepSeek(text, targetLanguage);

    console.log(`✅ [翻译-${requestId}] 翻译完成: ${translatedText.substring(0, 100)}...`);

    res.status(200).json({
      success: true,
      data: {
        originalText: text,
        translatedText: translatedText,
        targetLanguage: targetLanguage
      }
    });

  } catch (error) {
    console.error(`❌ [翻译-${requestId}] 翻译失败:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
