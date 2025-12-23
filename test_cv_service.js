// 测试cv服务的手动签名实现
require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

const AK = process.env.VOLCENGINE_ACCESS_KEY_ID;
const SK = process.env.VOLCENGINE_SECRET_ACCESS_KEY;

console.log('=== 测试cv服务手动签名 ===');
console.log('AK:', AK);
console.log('SK长度:', SK?.length);

const HOST = 'visual.volcengineapi.com';
const PATH = '/';
const VERSION = '2022-08-31';
const ACTION = 'CVSync2AsyncSubmitTask';
const REQ_KEY = 'jimeng_t2i_v40';

// 使用正确的即梦API格式
const requestBody = {
    req_key: REQ_KEY,
    prompt: "test image generation"
};

const bodyStr = JSON.stringify(requestBody);
const queryString = `Action=${ACTION}&Version=${VERSION}`;

console.log('\n=== 请求参数 ===');
console.log('Body:', bodyStr);
console.log('QueryString:', queryString);

// 时间格式 - 修正为正确格式
const date = new Date();
const year = date.getUTCFullYear();
const month = String(date.getUTCMonth() + 1).padStart(2, '0');
const day = String(date.getUTCDate()).padStart(2, '0');
const hour = String(date.getUTCHours()).padStart(2, '0');
const minute = String(date.getUTCMinutes()).padStart(2, '0');
const second = String(date.getUTCSeconds()).padStart(2, '0');

const xDate = `${year}${month}${day}T${hour}${minute}${second}Z`;
const shortDate = `${year}${month}${day}`;

console.log('\n=== 时间计算 ===');
console.log('X-Date:', xDate);
console.log('Short Date:', shortDate);

// 签名计算
const contentType = 'application/json';
const signedHeadersStr = 'content-type;host;x-date';

const payloadHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
console.log('\n=== Payload Hash ===');
console.log('PayloadHash:', payloadHash);

const canonicalRequest = [
    'POST', PATH, queryString,
    `content-type:${contentType}\nhost:${HOST}\nx-date:${xDate}\n`,
    signedHeadersStr, payloadHash
].join('\n');

console.log('\n=== Canonical Request ===');
console.log(canonicalRequest);

function hmac(key, data, encoding) {
    return crypto.createHmac('sha256', key).update(data).digest(encoding);
}

// 使用cv服务名称（根据官方文档）
const credentialScope = `${shortDate}/cn-north-1/cv/request`;
const stringToSign = [
    'HMAC-SHA256', xDate, credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
].join('\n');

console.log('\n=== String to Sign ===');
console.log(stringToSign);

console.log('\n=== HMAC计算步骤 ===');
const kDate = hmac(SK, shortDate);
console.log('kDate:', kDate.toString('hex'));

const kRegion = hmac(kDate, 'cn-north-1');
console.log('kRegion:', kRegion.toString('hex'));

const kService = hmac(kRegion, 'cv');
console.log('kService:', kService.toString('hex'));

const kSigning = hmac(kService, 'request');
console.log('kSigning:', kSigning.toString('hex'));

const signature = hmac(kSigning, stringToSign, 'hex');
console.log('最终签名:', signature);

const authorization = `HMAC-SHA256 Credential=${AK}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;
console.log('\n=== Authorization ===');
console.log(authorization);

console.log('\n=== 完整curl命令 ===');
console.log(`curl -X POST 'https://${HOST}${PATH}?${queryString}' \\`);
console.log(`  -H 'Content-Type: ${contentType}' \\`);
console.log(`  -H 'X-Date: ${xDate}' \\`);
console.log(`  -H 'Authorization: ${authorization}' \\`);
console.log(`  -d '${bodyStr}' 2>/dev/null | jq .`);

// 测试实际API调用
async function testAPI() {
    console.log('\n=== 测试API调用 ===');

    try {
        const fetch = require('node-fetch');
        const response = await fetch(`https://${HOST}${PATH}?${queryString}`, {
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'X-Date': xDate,
                'Authorization': authorization
            },
            body: bodyStr
        });

        const resText = await response.text();
        console.log('响应状态:', response.status);
        console.log('响应内容:', resText);

        try {
            const resJson = JSON.parse(resText);
            console.log('解析后的响应:', JSON.stringify(resJson, null, 2));
        } catch (e) {
            console.log('无法解析为JSON');
        }
    } catch (error) {
        console.error('API调用失败:', error.message);
    }
}

testAPI();