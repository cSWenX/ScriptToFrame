# Java 后端图片生成服务

基于Spring Boot和火山引擎SDK实现的图片生成服务，用于解决JavaScript直接调用火山引擎API时的签名问题。

## 项目结构

```
java-backend/
├── pom.xml                                    # Maven配置文件
├── src/main/java/com/scripttoframe/
│   ├── ImageGenerationApplication.java       # 主应用类
│   ├── controller/
│   │   └── ImageGenerationController.java    # REST API控制器
│   └── service/
│       └── ImageGenerationService.java       # 图片生成服务
└── src/main/resources/
    └── application.properties               # 应用配置文件
```

## 环境要求

- Java 11+
- Maven 3.6+

## 安装和运行

### 1. 安装依赖

在`java-backend`目录下运行：

```bash
cd java-backend
mvn clean install
```

### 2. 配置环境变量（可选）

可以通过环境变量设置API密钥：

```bash
export VOLCENGINE_ACCESS_KEY_ID=your_access_key
export VOLCENGINE_SECRET_ACCESS_KEY=your_secret_key
```

或者直接使用默认配置（已在application.properties中设置）。

### 3. 运行服务

```bash
mvn spring-boot:run
```

服务将在 http://localhost:8080 启动

## API 接口

### 生成图片

**POST** `/api/generate-image`

#### 请求体
```json
{
  "prompt": "一只可爱的小猫"
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "imageUrl": "https://example.com/image.jpg",
    "taskId": "jimeng_v4_1234567890",
    "prompt": "一只可爱的小猫"
  }
}
```

### 健康检查

**GET** `/api/health`

#### 响应
```json
{
  "status": "healthy",
  "service": "Image Generation Backend"
}
```

## 集成到Next.js应用

在Next.js应用中，可以通过代理API调用Java后端：

1. 使用 `/pages/api/generate-image-java.js` 作为代理端点
2. 在前端中调用该端点，而不是直接调用火山引擎API

示例：
```javascript
const response = await fetch('/api/generate-image-java', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: '一只可爱的小猫' })
});
```

## 优势

1. **解决签名问题**: 使用官方Java SDK，避免手动实现签名逻辑
2. **更好的稳定性**: Java环境下的SDK更稳定可靠
3. **性能优化**: 可以实现连接池、缓存等优化
4. **扩展性**: 便于添加更多图片生成功能

## 注意事项

- 确保Java后端服务在启动前已配置正确的API密钥
- 生产环境中建议使用环境变量而非硬编码的密钥
- 可以通过修改`server.port`配置来更改服务端口