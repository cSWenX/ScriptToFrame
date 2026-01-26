# 统一代理URL方案 - 完整修改说明

## 📋 修改总结

本次修改确保所有生成接口都返回**代理URL**和**完整的字段信息**，用于判断远程推送是否成功。

---

## ✅ 已修改的接口

### 1. generate-character.js - 角色图片生成

**文件**: `pages/api/generate-character.js`

**返回格式**:
```javascript
{
  success: true,
  data: {
    characterId: "char_001",
    characterName: "小红",
    image_url: "/api/proxy/image?characterId=char_001",  // ✅ 代理URL
    original_image_url: "http://61.155.227.35:9000/...",   // 原始URL
    tos_url: "...",              // 即梦TOS URL
    remote_url: "...",           // 远程存储URL
    remote_id: "123",            // 远程存储ID
    local_path: "...",           // 本地路径
    storage_provider: "...",     // 存储提供者
    external_accessible: true/false  // 是否可外网访问
  }
}
```

**用途判断**:
```javascript
// 判断远程推送是否成功
if (data.remote_id && data.remote_url) {
  console.log('✅ 远程推送成功');
} else {
  console.log('❌ 远程推送失败，使用本地');
}
```

---

### 2. generate-page.js - 单页图片生成

**文件**: `pages/api/generate-page.js`

**返回格式**:
```javascript
{
  success: true,
  data: {
    pageIndex: 0,
    image_url: "/api/proxy/image?characterId=page_0",  // ✅ 代理URL
    original_image_url: "http://61.155.227.35:9000/...",   // 原始URL
    tos_url: "...",              // 即梦TOS URL
    remote_url: "...",           // 远程存储URL
    remote_id: "123",            // 远程存储ID
    local_path: "...",           // 本地路径
    storage_provider: "...",     // 存储提供者
    external_accessible: true/false  // 是否可外网访问
  }
}
```

**新增字段**:
- `image_url`: 代理URL（新增，用于前端显示）
- `original_image_url`: 原始URL（新增，保留完整信息）
- `local_path`: 本地路径（新增）
- `storage_provider`: 存储提供者（新增）
- `external_accessible`: 是否可外网访问（新增）

---

### 3. generate-all-images.js - 批量图片生成

**文件**: `pages/api/generate-all-images.js`

**SSE事件格式**:
```javascript
// frame_complete 事件
{
  type: "frame_complete",
  sequence: 1,
  image_url: "/api/proxy/image?characterId=sequence_1",  // ✅ 代理URL
  original_image_url: "http://61.155.227.35:9000/...",     // 原始URL
  imageUrl: "/api/proxy/image?characterId=sequence_1",      // 向后兼容
  tosUrl: "...",              // 即梦TOS URL
  remote_url: "...",           // 远程存储URL
  remote_id: "123",            // 远程存储ID
  local_path: "...",           // 本地路径
  storage_provider: "...",     // 存储提供者
  external_accessible: true/false,  // 是否可外网访问
  progress: 50,
  responseTime: 5000
}
```

**results数组格式** (批量完成时):
```javascript
results.push({
  sequence: frame.sequence,
  image_url: proxyImageUrl,   // ✅ 代理URL
  original_image_url: finalImageUrl,  // 原始URL
  imageUrl: proxyImageUrl,    // 向后兼容
  tosUrl: result.data.tosUrl,
  remote_url: result.data.remote_url,
  remote_id: result.data.remote_id,
  local_path: result.data.local_path,
  storage_provider: result.data.storage_provider,
  external_accessible: result.data.external_accessible,
  prompt: frame.prompt,
  chineseDescription: frame.chineseDescription,
  frameType: frame.frameType
});
```

---

### 4. generate-audio.js - 音频生成

**文件**: `pages/api/generate-audio.js`

**返回格式**:
```javascript
{
  success: true,
  data: {
    audio_url: "/api/proxy/audio?pageId=0&projectId=xxx",  // ✅ 代理URL（新字段名）
    original_audio_url: "http://61.155.227.69:3111/...",     // 原始URL（新增）
    audioUrl: "/api/proxy/audio?pageId=0&projectId=xxx",      // 向后兼容
    text: "故事文本",
    pageIndex: 0,
    speakerId: "child",
    page_id: "page_0",          // 页面ID
    remote_url: "...",           // 远程存储URL
    remote_id: "123",            // 远程存储ID
    local_path: "/Users/.../public/audio/..."  // 本地路径
  }
}
```

**字段说明**:
- `audio_url`: 代理URL（新字段名，统一使用下划线）
- `original_audio_url`: 原始完整URL（新增）
- `audioUrl`: 向后兼容（保留驼峰命名）
- `remote_url`: 远程存储URL（如果推送成功）
- `remote_id`: 远程存储ID（如果推送成功）
- `local_path`: 本地文件路径

---

## 🔍 判断远程推送是否成功

### 图片判断逻辑

```javascript
// 生成角色图片后
const response = await fetch('/api/generate-character', {
  method: 'POST',
  body: JSON.stringify({ prompt, characterId, characterName })
});

const result = await response.json();
const data = result.data;

// 判断远程推送状态
if (data.remote_id && data.remote_url) {
  console.log('✅ 图片已推送到远程存储');
  console.log('   远程ID:', data.remote_id);
  console.log('   远程URL:', data.remote_url);
} else {
  console.log('⚠️ 图片仅保存在本地');
  console.log('   本地路径:', data.local_path);
  console.log('   可外网访问:', data.external_accessible);
}

// 显示图片
console.log('显示URL:', data.image_url);  // 代理URL
```

### 音频判断逻辑

```javascript
// 生成音频后
const response = await fetch('/api/generate-audio', {
  method: 'POST',
  body: JSON.stringify({ text, page_index: 0 })
});

const result = await response.json();
const data = result.data;

// 判断远程推送状态
if (data.remote_id && data.remote_url) {
  console.log('✅ 音频已推送到远程存储');
  console.log('   远程ID:', data.remote_id);
  console.log('   远程URL:', data.remote_url);
} else {
  console.log('⚠️ 音频仅保存在本地');
  console.log('   本地路径:', data.local_path);
}

// 显示音频URL
console.log('播放URL:', data.audio_url);  // 代理URL
```

---

## 📊 完整的字段说明

### 通用字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `image_url` / `audio_url` | string | **代理URL**（前端使用） | `/api/proxy/image?characterId=xxx` |
| `original_image_url` / `original_audio_url` | string | **原始URL**（完整地址） | `http://61.155.227.35:9000/...` |
| `local_path` | string | 本地文件路径 | `/Users/xxx/public/generated/...` |
| `remote_url` | string | 远程存储URL（如果成功） | `http://61.155.227.35:9000/...` |
| `remote_id` | string | 远程存储ID（如果成功） | `123` |
| `storage_provider` | string | 存储提供者类型 | `LocalStorageProvider` / `VolcengineTOSProvider` |
| `external_accessible` | boolean | 是否可外网直接访问 | `true` / `false` |

### 图片特有字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `tos_url` | string | 即梦TOS URL（用于修图） | `https://p3-aiop-sign.byteimg.com/...` |
| `characterId` | string | 角色ID | `char_001` |
| `characterName` | string | 角色名称 | `小红` |

### 音频特有字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `text` | string | 合成的文本 | `"故事内容"` |
| `pageIndex` / `page_id` | number | 页面索引 | `0` |
| `speakerId` | string | 说话人ID | `"child"` |

---

## 🎯 前端使用方式

### 1. 保存到项目数据

```javascript
// 生成角色图片
const response = await fetch('/api/generate-character', {
  method: 'POST',
  body: JSON.stringify({
    prompt: '可爱的小女孩',
    characterId: 'char_001',
    characterName: '小红'
  })
});

const result = await response.json();
const data = result.data;

// 保存到项目（使用代理URL）
actions.updatePage({
  page_index: 0,
  characterId: data.characterId,
  image_url: data.image_url,  // ✅ 代理URL
  // 保存完整信息用于判断
  _original_image_url: data.original_image_url,
  _remote_url: data.remote_url,
  _remote_id: data.remote_id,
  _local_path: data.local_path
});

// 判断远程推送状态
if (data.remote_id) {
  console.log('✅ 远程推送成功，ID:', data.remote_id);
}
```

### 2. 检查项目状态

```javascript
// 检查某个页面的远程推送状态
const checkRemoteStatus = (page) => {
  const hasImageRemote = page._remote_id && page._remote_url;
  const hasAudioRemote = page._remote_audio_id && page._remote_audio_url;

  return {
    image: {
      pushed: hasImageRemote,
      id: page._remote_id,
      url: page._remote_url,
      local: page._local_path
    },
    audio: {
      pushed: hasAudioRemote,
      id: page._remote_audio_id,
      url: page._remote_audio_url,
      local: page.audio_url  // 这是相对路径
    }
  };
};

// 使用示例
const status = checkRemoteStatus(project.pages[0]);
if (status.image.pushed) {
  console.log('图片已推送到远程:', status.image.url);
} else {
  console.log('图片仅在本地:', status.image.local);
}
```

---

## ⚠️ 重要说明

### 字段命名规范

1. **主要显示字段**（前端使用）:
   - `image_url` / `audio_url`: 代理URL
   - 统一使用下划线命名

2. **向后兼容字段**:
   - `imageUrl`: 图片URL（驼峰，向后兼容）
   - `audioUrl`: 音频URL（驼峰，向后兼容）

3. **元数据字段**（用于判断）:
   - `original_*`: 原始URL
   - `remote_url`: 远程存储URL
   - `remote_id`: 远程存储ID
   - `local_path`: 本地路径
   - `storage_provider`: 存储提供者
   - `external_accessible`: 是否可外网访问

### 前端保存建议

```javascript
// 方式1：保存所有字段
actions.updatePage({
  page_index: 0,
  // 主要字段（用于显示）
  image_url: data.image_url,
  audio_url: data.audio_url,
  // 元数据（用于判断）
  _original_image_url: data.original_image_url,
  _remote_url: data.remote_url,
  _remote_id: data.remote_id,
  _local_path: data.local_path,
  _storage_provider: data.storage_provider,
  _external_accessible: data.external_accessible
});

// 方式2：只保存需要的字段
actions.updatePage({
  page_index: 0,
  image_url: data.image_url,  // 代理URL
  audio_url: data.audio_url,  // 代理URL
  remote_url: data.remote_url,  // 远程URL（用于判断）
  remote_id: data.remote_id     // 远程ID（用于判断）
});
```

---

## 📝 返回数据示例

### 角色图片生成成功（远程推送成功）

```json
{
  "success": true,
  "data": {
    "characterId": "char_001",
    "characterName": "小红",
    "image_url": "/api/proxy/image?characterId=char_001",
    "original_image_url": "http://61.155.227.35:9000/chatai/aiBookPicture/20260124/xxx.png",
    "tos_url": "https://p3-aiop-sign.byteimg.com/tos-cn-i-xxx/xxx.png",
    "remote_url": "http://61.155.227.35:9000/chatai/aiBookPicture/20260124/xxx.png",
    "remote_id": "456",
    "local_path": "/Users/xxx/public/generated/project_xxx/char_001.png",
    "storage_provider": "VolcengineTOSProvider",
    "external_accessible": true
  }
}
```

**判断**:
```javascript
data.remote_id && data.remote_url  // true → 远程推送成功 ✅
```

### 角色图片生成成功（仅本地）

```json
{
  "success": true,
  "data": {
    "characterId": "char_001",
    "characterName": "小红",
    "image_url": "/api/proxy/image?characterId=char_001",
    "original_image_url": "/generated/project_xxx/char_001.png",
    "tos_url": null,
    "remote_url": null,
    "remote_id": null,
    "local_path": "/Users/xxx/public/generated/project_xxx/char_001.png",
    "storage_provider": "LocalStorageProvider",
    "external_accessible": false
  }
}
```

**判断**:
```javascript
data.remote_id && data.remote_url  // false → 仅本地 ❌
```

### 音频生成成功（远程推送成功）

```json
{
  "success": true,
  "data": {
    "audio_url": "/api/proxy/audio?pageId=0&projectId=xxx",
    "original_audio_url": "http://61.155.227.69:3111/audio/xxx.wav",
    "audioUrl": "/api/proxy/audio?pageId=0&projectId=xxx",
    "text": "很久很久以前...",
    "pageIndex": 0,
    "speakerId": "child",
    "page_id": "page_0",
    "remote_url": "http://61.155.227.69:3111/audio/xxx.wav",
    "remote_id": "789",
    "local_path": "/Users/xxx/public/audio/xxx/page_0.wav"
  }
}
```

**判断**:
```javascript
data.remote_id && data.remote_url  // true → 远程推送成功 ✅
```

---

## ✅ 完成检查清单

- [x] `generate-character.js` 返回代理URL和完整字段
- [x] `generate-page.js` 返回代理URL和完整字段
- [x] `generate-all-images.js` 返回代理URL和完整字段（SSE事件 + results）
- [x] `generate-audio.js` 返回代理URL和完整字段
- [ ] `StoryboardDisplay.jsx` 使用代理URL显示图片
- [ ] 前端保存逻辑使用新字段
- [ ] 测试所有接口返回数据

---

## 🎯 下一步

需要修改前端组件以使用代理URL。请确认是否继续修改前端组件？
