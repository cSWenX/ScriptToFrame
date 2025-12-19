#!/usr/bin/env node

const https = require('https');

// 测试Claude代理连接
const testClaudeProxy = async () => {
  // 从环境变量读取配置
  const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://anyrouter.top/v1';
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('❌ 缺少 ANTHROPIC_API_KEY 环境变量');
    return;
  }

  const testPayload = {
    model: 'claude-3-sonnet-20240229',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: '请简单说"测试成功"'
      }
    ]
  };

  // 设置忽略SSL证书验证（仅用于代理测试）
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

  console.log('🔍 开始测试Claude代理连接...');
  console.log(`📡 代理地址: ${baseUrl}/messages`);

  try {
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
        'User-Agent': 'ScriptToFrame/1.0.0'
      },
      body: JSON.stringify(testPayload),
      // 设置10秒超时
      signal: AbortSignal.timeout(10000)
    });

    console.log(`📊 响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ 请求失败:`, errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ 连接成功！');
    console.log('📝 Claude回复:', result.content?.[0]?.text || '无内容');

  } catch (error) {
    console.error('❌ 连接失败:', error.message);

    if (error.name === 'TimeoutError') {
      console.error('⏰ 连接超时，可能是代理服务器响应慢');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 DNS解析失败，请检查代理地址');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🚫 连接被拒绝，代理服务器可能不可用');
    } else if (error.message.includes('certificate')) {
      console.error('🔐 SSL证书问题');
    }
  }
};

// 运行测试
testClaudeProxy().catch(console.error);