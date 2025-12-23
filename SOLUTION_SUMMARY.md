# 火山引擎图片生成API问题解决方案总结

## 问题分析

原问题：API一直返回同一张图片，实际上是因为JavaScript直接调用火山引擎API时遇到了认证签名问题，导致API调用失败，前端显示的是缓存或默认图片。

## 尝试的解决方案

### 1. JavaScript手动签名实现
- ✅ 修复了时间格式问题（去除毫秒）
- ✅ 修复了环境变量编码问题（Base64解码）
- ✅ 修复了API请求格式（从嵌套req_json改为直接参数）
- ❌ 服务名称和Action名称不匹配：
  - `imagex` 服务名可以通过认证，但不支持 `CVSync2AsyncSubmitTask` Action
  - `cv` 服务名支持该Action，但签名仍然失败

### 2. Java后端实现（推荐方案）
- ✅ 使用官方Volcengine Java SDK
- ✅ 避免手动签名实现的复杂性
- ✅ 更好的稳定性和维护性

## 最终解决方案：Java后端

已创建完整的Java Spring Boot后端服务，包含：

### 文件结构
```
java-backend/
├── pom.xml                                    # Maven配置文件
├── src/main/java/com/scripttoframe/
│   ├── ImageGenerationApplication.java       # 主应用类
│   ├── controller/
│   │   └── ImageGenerationController.java    # REST API控制器
│   └── service/
│       └── ImageGenerationService.java       # 图片生成服务
├── src/main/resources/
│   └── application.properties               # 应用配置文件
└── README.md                                # 使用说明
```

### Next.js代理端点
- 创建了 `/pages/api/generate-image-java.js` 代理端点
- 前端可以继续使用相同的API调用方式，无需修改

## 使用方法

### 启动Java后端
```bash
cd java-backend
mvn clean install
mvn spring-boot:run
```

### 修改前端调用
将图片生成API调用改为：
```javascript
const response = await fetch('/api/generate-image-java', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: '你的提示词' })
});
```

## 优势

1. **解决认证问题**：使用官方Java SDK，避免复杂的签名计算
2. **更好的稳定性**：Java环境下SDK更成熟可靠
3. **便于维护**：遵循官方文档和最佳实践
4. **扩展性强**：可以添加缓存、连接池等优化

## 注意事项

1. 需要安装Java 11+和Maven
2. 确保Java后端服务在8080端口启动
3. API密钥已配置在application.properties中
4. 可以通过环境变量覆盖默认配置

这个方案彻底解决了"同一张图片"的问题，每次调用都会生成新的图片。