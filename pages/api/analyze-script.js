const ClaudeScriptParser = require('../../lib/claude-api');

/**
 * 剧本分析API接口
 * POST /api/analyze-script
 */
export default async function handler(req, res) {
  // 详细请求日志
  console.log(`[${new Date().toISOString()}] 收到剧本分析请求`);
  console.log('请求方法:', req.method);
  console.log('请求头:', JSON.stringify(req.headers, null, 2));

  if (req.method !== 'POST') {
    console.log('❌ 请求方法错误:', req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { script, frameCount, style, genre } = req.body;
    console.log('请求参数:', {
      scriptLength: script?.length || 0,
      frameCount,
      style,
      genre
    });

    // 环境变量检查
    console.log('环境变量检查:');
    console.log('- ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '已设置' : '未设置');
    console.log('- ANTHROPIC_BASE_URL:', process.env.ANTHROPIC_BASE_URL || '未设置');

    if (!script || !frameCount) {
      console.log('❌ 参数验证失败: 缺少script或frameCount');
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: script, frameCount'
      });
    }

    console.log('🚀 开始调用Claude API...');
    const claudeParser = new ClaudeScriptParser();
    const result = await claudeParser.parseScript(script, frameCount, style, genre);

    console.log('📊 Claude API调用结果:', {
      success: result.success,
      hasData: !!result.data,
      error: result.error
    });

    if (!result.success) {
      console.log('❌ Claude API调用失败:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    // 返回分析结果
    console.log('✅ 成功返回分析结果');
    res.status(200).json({
      success: true,
      data: {
        ...result.data,
        recommendedStyle: style,
        recommendedGenre: genre,
        estimatedScenes: result.data.script_analysis.scenes.length
      }
    });

  } catch (error) {
    console.error('❌ 剧本分析API错误:');
    console.error('错误类型:', error.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);

    // 特殊错误处理
    let errorMessage = '服务器内部错误';
    if (error.message.includes('fetch failed')) {
      errorMessage = 'Claude API连接失败，请检查代理设置';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Claude API请求超时';
    } else if (error.message.includes('401')) {
      errorMessage = 'Claude API密钥无效';
    } else if (error.message.includes('403')) {
      errorMessage = 'Claude API访问被拒绝，请检查代理配置';
    } else if (error.message.includes('SSL')) {
      errorMessage = 'SSL连接错误，代理证书问题';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}