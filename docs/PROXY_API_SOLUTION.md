# 图片和音频代理方案

## 📋 问题背景

### 当前问题
1. **生成的图片存储在内网机器**
   - 图片URL格式：`http://61.155.227.35:9000/chatai/aiBookPicture/xxx.png`
   - 用户浏览器无法直接访问内网地址
   - 导致图片加载失败

2. **音频也存在类似问题**
   - 远程音频URL：`http://61.155.227.69:3111/audio/xxx.wav`
   - 本地音频URL：`/audio/project_xxx/pages/page_0.wav`

### 解决方案
通过创建**代理接口**，由后端服务器去拉取图片/音频资源，然后返回给前端。

---

## 🔧 实现方案

### 1️⃣ 图片代理接口

**文件**: `pages/api/proxy/image.js`

**接口路径**: `/api/proxy/image?characterId=xxx&projectId=xxx`

**功能**:
- 根据 `characterId` 查找项目数据中的图片
- 自动判断是远程URL还是本地路径
- 从远程或本地获取图片并返回
- 支持缓存（1小时）

**工作流程**:
```
1. 接收请求 → 解析 characterId 参数
2. 查找项目数据 → 获取 page.image_url
3. 判断URL类型
   ├─ http(s):// → 远程URL，通过fetch获取
   └─ /generated/ → 本地路径，从public目录读取
4. 设置响应头 → 返回图片数据
```

**使用示例**:
```jsx
// 前端调用
const imageUrl = `/api/proxy/image?characterId=${page.characterId}`;

<img src={imageUrl} alt="图片" />
```

**响应头**:
- `Content-Type`: image/png, image/jpeg 等
- `Cache-Control`: public, max-age=3600
- `Content-Length`: 图片大小

---

### 2️⃣ 音频代理接口

**文件**: `pages/api/proxy/audio.js`

**接口路径**: `/api/proxy/audio?pageId=xxx&projectId=xxx`

**功能**:
- 根据 `pageId` 查找项目数据中的音频
- 优先使用 `remote_audio_url`，回退到 `audio_url`
- 自动判断是远程URL还是本地路径
- 支持Range请求（音频进度条）

**工作流程**:
```
1. 接收请求 → 解析 pageId 参数
2. 查找项目数据 → 获取页面
3. 获取音频URL（优先级）
   ├─ remote_audio_url（远程） ✅
   └─ audio_url（本地） ⬅️ 回退
4. 判断URL类型
   ├─ http(s):// → 远程URL，通过fetch获取
   └─ /audio/ → 本地路径，从public目录读取
5. 设置响应头 → 返回音频数据
```

**使用示例**:
```jsx
// 前端调用
const pageId = page.pageId || page.page_index?.toString();
const audioUrl = `/api/proxy/audio?pageId=${pageId}`;

<audio src={audioUrl} controls />
```

**响应头**:
- `Content-Type`: audio/wav, audio/mpeg 等
- `Cache-Control`: public, max-age=3600
- `Accept-Ranges`: bytes（支持Range请求）
- `Content-Length`: 音频大小

---

## 📝 前端修改

### Flipbook组件修改

**文件**: `components/Flipbook.jsx`

#### 1. 添加代理URL转换函数

```javascript
/**
 * 获取图片代理URL
 */
const getImageProxyUrl = (page) => {
  if (!page?.image_url) return null;

  // 如果有characterId，使用代理接口
  if (page.characterId) {
    return `/api/proxy/image?characterId=${page.characterId}`;
  }

  // 本地路径不需要代理
  if (page.image_url.startsWith('/generated/')) {
    return page.image_url;
  }

  // 远程URL但没有characterId，直接返回
  return page.image_url;
};

/**
 * 获取音频代理URL
 */
const getAudioProxyUrl = (page, projectId) => {
  if (!page) return null;

  const audioUrl = page.remote_audio_url || page.audio_url;
  if (!audioUrl) return null;

  // 如果有pageId，使用代理接口
  const pageId = page.pageId || page.page_index?.toString() || page.id;
  if (pageId) {
    const params = new URLSearchParams({ pageId });
    if (projectId) params.set('projectId', projectId);
    return `/api/proxy/audio?${params.toString()}`;
  }

  // 本地路径不需要代理
  if (audioUrl.startsWith('/audio/')) {
    return audioUrl;
  }

  return audioUrl;
};
```

#### 2. 修改图片显示

```javascript
// 修改前
<img src={page.image_url} alt="图片" />

// 修改后
const imageUrl = getImageProxyUrl(page);
<img src={imageUrl} alt="图片" />
```

#### 3. 修改音频获取

```javascript
// 修改前
const getCurrentAudioUrl = useCallback(() => {
  const page = contentPages[pageIndex];
  return page?.remote_audio_url || page?.audio_url;
}, [currentPage, contentPages]);

// 修改后
const getCurrentAudioUrl = useCallback(() => {
  const page = contentPages[pageIndex];
  return getAudioProxyUrl(page, project.id);
}, [currentPage, contentPages, project.id]);
```

---

## 🎯 关键特性

### ✅ 自动类型判断
- 远程URL（http/https）：通过fetch获取
- 本地路径（/generated/, /audio/）：从文件系统读取

### ✅ 智能回退机制
- **音频**: 优先使用远程，失败回退到本地
- **图片**: 优先使用characterId查询，支持本地路径

### ✅ 性能优化
- 图片缓存：1小时
- 音频缓存：1小时
- 支持音频Range请求（进度条）

### ✅ 错误处理
- 完整的日志记录
- 友好的错误提示
- 404/500错误处理

---

## 📊 数据流对比

### 修改前（直接访问）
```
前端 → 浏览器直接访问 → http://内网IP:9000/xxx.png
                ❌ 无法访问（内网地址）
```

### 修改后（代理访问）
```
前端 → /api/proxy/image?characterId=xxx
       ↓
     Next.js服务器 → fetch远程图片 → 返回图片数据
                      ✅ 服务器可以访问内网
       ↓
     前端接收图片数据并显示
```

---

## 🔄 完整工作流程示例

### 图片加载流程

1. **用户访问Flipbook页面**
   ```
   http://localhost:3000/flipbook?projectId=xxx
   ```

2. **Flipbook组件渲染图片**
   ```jsx
   const page = {
     characterId: 'char_123',
     image_url: 'http://61.155.227.35:9000/chatai/aiBookPicture/xxx.png'
   };

   const imageUrl = getImageProxyUrl(page);
   // 结果: /api/proxy/image?characterId=char_123
   ```

3. **浏览器请求图片**
   ```
   GET /api/proxy/image?characterId=char_123
   ```

4. **代理接口处理**
   ```javascript
   // 1. 查找项目数据
   const project = readProject('xxx');
   const page = project.pages.find(p => p.characterId === 'char_123');
   const imageUrl = page.image_url;

   // 2. 判断是远程URL
   // 3. 通过fetch获取
   const response = await fetch(imageUrl);
   const buffer = await response.arrayBuffer();

   // 4. 返回图片
   res.setHeader('Content-Type', 'image/png');
   res.send(buffer);
   ```

5. **浏览器显示图片** ✅

### 音频播放流程

1. **用户翻页触发音频**
   ```jsx
   const audioUrl = getAudioProxyUrl(page, project.id);
   // 结果: /api/proxy/audio?pageId=0&projectId=xxx
   ```

2. **浏览器请求音频**
   ```
   GET /api/proxy/audio?pageId=0&projectId=xxx
   ```

3. **代理接口处理**
   ```javascript
   // 1. 查找项目数据
   const page = project.pages.find(p => p.page_index === 0);

   // 2. 优先获取远程音频
   const audioUrl = page.remote_audio_url || page.audio_url;

   // 3. 通过fetch获取远程音频
   const response = await fetch(audioUrl);
   const buffer = await response.arrayBuffer();

   // 4. 返回音频
   res.setHeader('Content-Type', 'audio/wav');
   res.send(buffer);
   ```

4. **浏览器播放音频** ✅

---

## ⚙️ 配置说明

### 需要确保的数据字段

**图片页面**:
```json
{
  "characterId": "char_123",        // 必须：用于代理查询
  "image_url": "http://...",       // 图片URL（远程或本地）
  "page_index": 0,
  "pageId": "page_0"               // 可选：用于音频查询
}
```

**音频页面**:
```json
{
  "pageId": "page_0",              // 或使用 page_index
  "page_index": 0,                 // 或使用 id
  "audio_url": "/audio/...",       // 本地音频
  "remote_audio_url": "http://...", // 远程音频（可选）
  "remote_audio_id": "123"          // 远程音频ID（可选）
}
```

---

## 🧪 测试方法

### 测试图片代理

```bash
# 直接访问代理接口
curl "http://localhost:3000/api/proxy/image?characterId=char_123" \
  --output test.png

# 检查图片是否正确返回
file test.png
# 应该显示: test.png: PNG image data
```

### 测试音频代理

```bash
# 直接访问代理接口
curl "http://localhost:3000/api/proxy/audio?pageId=0&projectId=xxx" \
  --output test.wav

# 检查音频是否正确返回
file test.wav
# 应该显示: test.wav: RIFF (little-endian) data, WAVE audio
```

### 浏览器测试

1. 打开Flipbook页面
2. 检查Network标签
3. 查看图片/音频请求：
   - 应该看到 `/api/proxy/image?characterId=xxx`
   - 应该看到 `/api/proxy/audio?pageId=xxx`
   - 状态码应该是 200
   - 类型应该是 image/png 或 audio/wav

---

## 📈 性能考虑

### 优点
- ✅ 解决内网访问问题
- ✅ 统一的资源访问入口
- ✅ 支持缓存，减少重复请求
- ✅ 错误处理更友好

### 缺点与优化
- ⚠️ 增加了一次服务器转发
- ✅ 缓存机制减轻了负担
- ✅ 可以考虑使用CDN进一步优化

---

## 🔮 未来优化方向

1. **为所有图片添加characterId**
   - 当前部分图片没有characterId，无法使用代理
   - 建议在生成图片时统一添加

2. **支持批量代理**
   - 当前一次请求一个资源
   - 可以考虑支持批量获取多个资源

3. **使用CDN**
   - 将代理接口的响应缓存到CDN
   - 进一步提升访问速度

4. **添加图片压缩**
   - 在代理时对图片进行压缩
   - 减少带宽消耗

---

## 📝 总结

这个代理方案通过以下方式解决了内网资源访问问题：

1. **创建代理接口** - 作为中间层访问内网资源
2. **自动类型判断** - 智能处理远程和本地资源
3. **智能回退机制** - 确保资源加载成功
4. **性能优化** - 通过缓存减少重复请求
5. **友好错误处理** - 提供清晰的错误信息

**效果**:
- ✅ 用户可以正常查看图片和播放音频
- ✅ 不需要修改内网服务器配置
- ✅ 保持了良好的用户体验
