# 生产环境部署时的音频读取逻辑

## 🎯 核心答案

**是的！** 系统会根据 `.env` 配置文件中的 `NEXT_PUBLIC_SITE_URL` 来访问音频。

### 配置文件：`.env`

```bash
NEXT_PUBLIC_SITE_URL=http://61.155.227.69:3111
```

这个配置决定了：
- ✅ 本地音频URL在生产环境如何被转换
- ✅ 前端如何访问音频文件

---

## 📊 完整流程

### 1️⃣ 音频生成阶段

**Python后端**：
- 保存音频：`public/audio/project_xxx/pages/page_0.wav`
- 尝试推送到远程存储
- 返回本地路径：`/audio/project_xxx/pages/page_0.wav`
- 如果推送成功：返回 `remote_url`, `remote_id`

### 2️⃣ API代理转换

**文件**: `pages/api/generate-audio.js` (第114-118行)

```javascript
// 如果返回的是相对路径，则添加 SITE_URL 前缀
let audioUrl = result.data.audioUrl;
if (audioUrl && audioUrl.startsWith('/')) {
  audioUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}${audioUrl}`;
}

res.status(200).json({
  success: true,
  data: {
    ...result.data,
    audioUrl  // 返回完整URL
  }
});
```

转换结果：
```
http://61.155.227.69:3111/audio/project_xxx/pages/page_0.wav
```

### 3️⃣ 前端保存

**文件**: `pages/ide.js` (第520-525行)

```javascript
actions.updatePage({
  page_index: page.page_index,
  audio_url: result.data.audioUrl,           // 完整URL ✅
  remote_audio_url: result.data.remote_url,  // 如果推送成功
  remote_audio_id: result.data.remote_id     // 如果推送成功
});
```

保存的数据示例：
```json
{
  "audio_url": "http://61.155.227.69:3111/audio/project_123/pages/page_0.wav",
  "remote_audio_url": null,
  "remote_audio_id": null
}
```

### 4️⃣ Flipbook读取

**文件**: `components/Flipbook.jsx` (第305行)

```javascript
const getAudioUrl = (pageIndex) => {
  if (pageIndex >= 0 && pageIndex < contentPages.length) {
    const page = contentPages[pageIndex];
    // 优先使用 remote_audio_url，如果没有则使用 audio_url
    return page?.remote_audio_url || page?.audio_url;
  }
  return null;
};
```

**结果**：
- ✅ 如果推送成功：使用 `remote_audio_url` (完整URL)
- ✅ 如果推送失败：使用 `audio_url` (已转换的完整URL)

---

## ✅ 好消息

**音频URL在保存时就已经是完整URL了！**

- ✅ 不依赖浏览器相对路径解析
- ✅ 在任何页面访问都正常
- ✅ 生产环境完全可用

### 浏览器请求

```
GET http://61.155.227.69:3111/audio/project_123/pages/page_0.wav
```

### 服务器配置要求

需要确保音频文件可访问：

**选项1: Nginx反向代理**
```nginx
location /audio/ {
    alias /path/to/app/public/audio/;
    add_header Access-Control-Allow-Origin *;
}
```

**选项2: Next.js静态文件服务**
```javascript
// Next.js 默认提供 public/ 目录下的文件
// 无需额外配置
```

---

## ⚠️ 图片的问题（不同！）

图片URL**没有**经过转换！

### 1️⃣ 如果推送成功
```json
{
  "image_url": "http://61.155.227.35:9000/chatai/...png"
}
```
✅ 完整URL，任何环境都可访问

### 2️⃣ 如果推送失败
```json
{
  "image_url": "/generated/project_xxx/pages/page_0.png"
}
```
❌ 相对路径，可能导致问题：

- 访问 `/ide` → `http://61.155.227.69:3111/generated/...png` ✅
- 访问 `/ide/book/123` → `http://61.155.227.69:3111/ide/generated/...png` ❌

---

## 🔧 建议的改进方案

### 方案1: 统一图片URL处理

在 `pages/api/generate-image-python.js` 中添加类似音频的转换：

```javascript
// 如果返回的是相对路径，添加 SITE_URL 前缀
let imageUrl = result.data.imageUrl;
if (imageUrl && imageUrl.startsWith('/')) {
  imageUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}${imageUrl}`;
  result.data.imageUrl = imageUrl;
}
```

### 方案2: Flipbook中处理相对路径

```javascript
const getImageUrl = (page) => {
  if (page.image_url?.startsWith('http')) {
    return page.image_url;  // 已是完整URL
  }
  // 相对路径，添加SITE_URL前缀
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  return `${baseUrl}${page.image_url}`;
};
```

### 方案3: 确保远程推送成功

检查远程推送配置，确保所有资源都推送到远程存储：
- 检查网络连接
- 检查远程存储服务状态
- 检查认证配置

---

## 📝 总结

| 资源 | 本地URL格式 | API转换 | 保存格式 | 生产环境 |
|------|-----------|---------|---------|----------|
| **音频** | `/audio/...` | ✅ 是 | 完整URL | ✅ 正常 |
| **图片** | `/generated/...` | ❌ 否 | 相对URL | ⚠️ 可能404 |

**关键差异**：音频URL在API层就被转换了，而图片URL没有！
