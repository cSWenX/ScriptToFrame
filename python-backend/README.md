# Python 后端图片生成服务

基于火山引擎官方Python SDK的图片生成后端服务，使用FastAPI框架提供RESTful API接口。

## 🚀 特点

- ✅ 使用火山引擎官方Python SDK，避免手动签名问题
- ✅ FastAPI框架，自动生成API文档
- ✅ 异步处理，支持高并发
- ✅ 完整的错误处理和日志记录
- ✅ 跨域支持，可与前端应用集成
- ✅ 环境配置管理

## 📁 项目结构

```
python-backend/
├── main.py          # 主服务文件
├── requirements.txt # Python依赖
├── .env            # 环境配置
├── start.sh        # 启动脚本
└── README.md       # 本文档
```

## 🛠️ 安装和运行

### 方法1：使用启动脚本（推荐）

```bash
cd python-backend
./start.sh
```

### 方法2：手动安装

```bash
cd python-backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python main.py
```

## 🔧 环境配置

创建 `.env` 文件：

```env
# 火山引擎API配置
VOLCENGINE_ACCESS_KEY_ID=your_access_key
VOLCENGINE_SECRET_ACCESS_KEY=your_secret_key

# 服务配置
PORT=8081
DEBUG=True
```

## 📡 API接口

### 1. 健康检查

**GET** `/api/health`

```json
{
  "status": "healthy",
  "service": "Image Generation Backend",
  "sdk_available": true,
  "timestamp": 1640995200
}
```

### 2. 生成图片

**POST** `/api/generate-image`

#### 请求体

```json
{
  "prompt": "一只可爱的小猫咪",
  "frame": {
    "prompt": "可选的框架提示词"
  }
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "imageUrl": "https://example.com/image.jpg",
    "taskId": "jimeng_v4_1640995200",
    "prompt": "一只可爱的小猫咪",
    "frame": {
      "prompt": "可选的框架提示词"
    }
  }
}
```

### 3. API文档

服务启动后，访问以下地址查看自动生成的API文档：

- **Swagger UI**: `http://localhost:8081/docs`
- **ReDoc**: `http://localhost:8081/redoc`

## 🔗 与前端集成

### Next.js API代理

创建 `/pages/api/generate-image-python.js`：

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const response = await fetch('http://localhost:8081/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Python后端调用失败: ${error.message}`
    });
  }
}
```

### 前端调用示例

```javascript
const response = await fetch('/api/generate-image-python', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: '一只可爱的小猫咪' })
});

const result = await response.json();
if (result.success) {
  console.log('图片URL:', result.data.imageUrl);
}
```

## 🐛 故障排除

### 1. SDK导入失败

```bash
# 安装火山引擎SDK
pip install volcengine-python-sdk
```

### 2. 环境变量未配置

确保 `.env` 文件存在且包含正确的API密钥。

### 3. 端口冲突

修改 `.env` 文件中的 `PORT` 配置。

## 📝 日志示例

```
🎨 [API启动] 提示词: "一只可爱的小猫咪..."
🚀 [Step 1] 提交任务...
📤 [提交参数] {"req_key": "jimeng_t2i_v40", "prompt": "一只可爱的小猫咪"}
📥 [提交响应] {"Result": {"task_id": "12345"}}
⏳ [Step 2] 获得 TaskID: 12345，开始轮询...
🔄 --- [轮询 第 1 次] ---
📥 [查询响应] {"Result": {"status": 0}}
⏳ [处理中] 状态: 0
🔄 --- [轮询 第 2 次] ---
📥 [查询响应] {"Result": {"status": 1, "image_urls": ["https://..."]}}
🎉 [成功] 获得图片URL: https://...
```

## 🚀 生产部署

### 使用 Gunicorn

```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UnicornWorker main:app --bind 0.0.0.0:8081
```

### 使用 Docker

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8081

CMD ["python", "main.py"]
```

## 📈 性能优化

1. **连接池**: SDK会自动管理连接池
2. **异步处理**: 使用FastAPI的异步特性
3. **错误重试**: 可添加指数退避重试机制
4. **缓存**: 可添加Redis缓存重复请求

---

*服务端口: 8081*
*API文档: http://localhost:8081/docs*