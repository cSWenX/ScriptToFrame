/**
 * 分镜数量计算API
 * 使用DeepSeek根据故事内容智能计算合适的分镜数量
 */

async function callDeepSeek(prompt) {
  const response = await fetch(process.env.DEEPSEEK_BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.3  // 低温度以获得稳定结果
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content?.trim();
}

export default async function handler(req, res) {
  const requestId = Date.now();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { story } = req.body;

    if (!story || story.trim().length < 50) {
      return res.status(400).json({
        success: false,
        error: '故事内容太短，请至少输入50个字符'
      });
    }

    console.log(`🔢 [分镜计算-${requestId}] 开始分析故事...`);

    const prompt = `你是一位专业的儿童绘本编辑。请分析以下故事，并根据故事的情节发展、场景变化、角色互动等因素，计算出最适合的绘本分镜数量。

规则：
1. 分镜数量范围：4-16页
2. 考虑因素：
   - 故事长度和复杂度
   - 关键情节转折点
   - 场景变化次数
   - 角色对话和互动
   - 适合儿童阅读的节奏感
3. 短故事（100-300字）：4-6页
4. 中等故事（300-600字）：6-10页
5. 长故事（600字以上）：10-16页

故事内容：
${story}

请只返回一个JSON对象，格式如下：
{
  "sceneCount": 数字,
  "reason": "简短说明为什么选择这个数量（50字以内）"
}`;

    const aiResponse = await callDeepSeek(prompt);
    console.log(`📝 [分镜计算-${requestId}] AI响应: ${aiResponse}`);

    // 解析JSON
    let result;
    try {
      // 尝试提取JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析AI响应');
      }
    } catch (parseError) {
      console.error(`❌ [分镜计算-${requestId}] 解析失败:`, parseError.message);
      // 默认返回8页
      result = {
        sceneCount: 8,
        reason: '默认分镜数量'
      };
    }

    // 确保数量在合理范围内
    let sceneCount = parseInt(result.sceneCount) || 8;
    sceneCount = Math.max(4, Math.min(16, sceneCount));

    console.log(`✅ [分镜计算-${requestId}] 计算结果: ${sceneCount}页, 原因: ${result.reason}`);

    res.status(200).json({
      success: true,
      data: {
        sceneCount,
        reason: result.reason || '根据故事内容分析'
      }
    });

  } catch (error) {
    console.error(`❌ [分镜计算-${requestId}] 计算失败:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
