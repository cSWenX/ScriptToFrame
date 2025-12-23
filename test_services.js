// 测试不同服务名称的签名
require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

const AK = process.env.VOLCENGINE_ACCESS_KEY_ID;
const SK = process.env.VOLCENGINE_SECRET_ACCESS_KEY;

const serviceNames = ['cv', 'imagex', 'visual'];

function hmac(key, data, encoding) {
    return crypto.createHmac('sha256', key).update(data).digest(encoding);
}

function generateSignature(serviceName) {
    const HOST = 'visual.volcengineapi.com';
    const PATH = '/';
    const VERSION = '2022-08-31';
    const REQ_KEY = 'jimeng_t2i_v40';

    const requestBody = {
        req_key: REQ_KEY,
        prompt: "test image generation"
    };

    const bodyStr = JSON.stringify(requestBody);
    const queryString = `Action=CVSync2AsyncSubmitTask&Version=${VERSION}`;

    // 时间
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    const second = String(date.getUTCSeconds()).padStart(2, '0');

    const xDate = `${year}${month}${day}T${hour}${minute}${second}Z`;
    const shortDate = `${year}${month}${day}`;

    // 签名计算
    const contentType = 'application/json';
    const signedHeadersStr = 'content-type;host;x-date';

    const payloadHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
    const canonicalRequest = [
        'POST', PATH, queryString,
        `content-type:${contentType}\\nhost:${HOST}\\nx-date:${xDate}\\n`,
        signedHeadersStr, payloadHash
    ].join('\\n');

    const credentialScope = `${shortDate}/cn-north-1/${serviceName}/request`;
    const stringToSign = [
        'HMAC-SHA256', xDate, credentialScope,
        crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\\n');

    const kDate = hmac(SK, shortDate);
    const kRegion = hmac(kDate, 'cn-north-1');
    const kService = hmac(kRegion, serviceName);
    const kSigning = hmac(kService, 'request');
    const signature = hmac(kSigning, stringToSign, 'hex');

    const authorization = `HMAC-SHA256 Credential=${AK}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

    return {
        serviceName,
        xDate,
        authorization,
        bodyStr,
        queryString
    };
}

// 测试所有服务名称
console.log('测试不同的服务名称签名...');

for (const serviceName of serviceNames) {
    const result = generateSignature(serviceName);

    console.log(`\\n=== 服务名称: ${serviceName} ===`);
    console.log(`Authorization: ${result.authorization}`);

    const curlCmd = `curl -X POST 'https://visual.volcengineapi.com/?${result.queryString}' \\\\
  -H 'Content-Type: application/json' \\\\
  -H 'X-Date: ${result.xDate}' \\\\
  -H 'Authorization: ${result.authorization}' \\\\
  -d '${result.bodyStr}'`;

    console.log(`\\nCurl命令:`);
    console.log(curlCmd);
}