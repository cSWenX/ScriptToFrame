# 前端进度条显示 - 完整诊断指南

## 🔍 快速诊断步骤

### 步骤1: 打开浏览器开发者工具
```
快捷键:
- Chrome/Edge: F12 或 Ctrl+Shift+I
- Firefox: F12 或 Ctrl+Shift+I
- Safari: Cmd+Option+I
```

### 步骤2: 进入 Console 标签
- 点击开发者工具的 "Console" 标签
- 清空之前的日志 (右击 → Clear)

### 步骤3: 进入应用并测试
1. 在左栏"剧本输入"区输入一段短文本，例如:
   ```
   一个男人走进咖啡馆，坐下，喝了一杯咖啡。
   ```

2. 点击中栏的 **"🧠 AI智能分析"** 按钮

### 步骤4: 观察控制台和页面

**观察内容**:
- ✅ 控制台是否显示这些日志:
  ```
  🎭 [前端] 开始AI智能分析
  ⏳ [前端] 设置状态: isAnalyzing=true, progress=0, visible=true
  ⏳ [前端] progressVisible 新状态: { analysis: true, firstFrame: false, batch: false }
  🔗 [前端] 调用API: /api/intelligent-analyze-script?stream=true
  📊 [前端] 开始读取SSE流...
  📨 [前端] 收到SSE事件 #1: {"type":"progress"...
  ```

- ✅ **页面上**是否显示进度条:
  - 应该在页面上方看到一个面板
  - 标题: "AI智能分析"
  - 副标题: "正在执行4步工作流..."
  - 进度条从 0% 开始推进

---

## 🐛 常见问题排查

### 问题1: 控制台无日志，页面无进度条

**原因**: 可能脚本输入验证失败

**检查**:
1. 确保左栏有输入文本
2. 文本至少有一定长度 (建议30个字以上)
3. 查看是否有红色错误提示

**修复**: 在左栏输入更多内容后重试

---

### 问题2: 控制台有日志，但页面无进度条显示

**原因**: React 状态更新可能延迟

**检查步骤**:

1. **打开 React DevTools**
   - Chrome: 安装 "React Developer Tools" 扩展
   - 访问 `chrome://extensions/` 确保已启用

2. **检查 Home 组件的状态**
   - 打开 React DevTools
   - 找到 `Home` 组件
   - 查看 `progressVisible` 状态是否为 `{ analysis: true, ... }`
   - 查看 `analysisProgress` 是否大于 0

3. **检查 ProgressBar 的 props**
   - 展开 ProgressBar 组件
   - 检查 `isVisible` prop 是否为 `true`
   - 检查 `progress` prop 是否显示当前进度

---

### 问题3: 控制台有日志，但进度条卡在0%

**原因**: SSE 连接已建立，但进度事件未被正确解析

**检查步骤**:

1. **打开 Network 标签**
   - DevTools → Network 标签
   - 重新点击"AI智能分析"
   - 查找请求: `intelligent-analyze-script?stream=true`

2. **检查响应头**
   ```
   Content-Type: text/event-stream
   Transfer-Encoding: chunked
   Connection: keep-alive
   ```

3. **检查响应内容**
   - 点击该请求
   - 切换到 "Response" 标签
   - 应该看到多个 `data: {...}` 行
   - 例如:
   ```
   data: {"type":"progress","step":1,"progress":0,...}
   data: {"type":"progress","step":1,"progress":25,...}
   data: {"type":"progress","step":2,"progress":25,...}
   ```

4. **如果看到响应数据但进度条没更新**
   - 可能是进度条状态更新延迟
   - 检查浏览器控制台中 `📊 [前端] 收到进度事件` 的日志
   - 查看 `📊 [前端] 进度条已更新为` 的日志

---

## 🔧 高级调试

### 添加临时调试 CSS

在浏览器 DevTools Console 中运行:

```javascript
// 强制显示进度条 (用于测试)
document.querySelector('[class*="cyber-panel"]').style.border = '2px solid red';
console.log('已为进度条添加红色边框，便于查看');
```

### 监控状态变化

在 Console 中运行:

```javascript
// 监听所有 console.log
const originalLog = console.log;
let progressEvents = [];
console.log = function(...args) {
  if (String(args[0]).includes('📊')) {
    progressEvents.push(args);
    console.table(progressEvents);
  }
  originalLog.apply(console, args);
};
```

---

## 📱 浏览器兼容性

确保你使用的浏览器支持 ReadableStream:

| 浏览器 | 支持 | 最低版本 |
|-------|------|---------|
| Chrome | ✅ | 43+ |
| Firefox | ✅ | 65+ |
| Safari | ✅ | 11.1+ |
| Edge | ✅ | 14+ |
| IE | ❌ | 不支持 |

---

## 📊 预期行为时间线

| 时间 | 预期行为 |
|------|---------|
| T+0s | 点击按钮 → 进度条显示 (0%) |
| T+1s | 第1步完成 → 进度条到 25% |
| T+3s | 第2步完成 → 进度条到 50% |
| T+5s | 第3步完成 → 进度条到 75% |
| T+6s | 第4步完成 → 进度条到 100% |
| T+8s | 进度条自动隐藏，显示分析结果 |

*实际时间取决于 AI API 响应速度*

---

## 🚀 完整测试流程

1. **打开浏览器**: http://localhost:3002
2. **打开开发者工具**: F12
3. **进入 Console 标签**
4. **输入测试文本**:
   ```
   皇帝新衣的故事：两个骗子来到皇帝面前，
   声称能织出最神奇的布料。皇帝给了他们很多金线和
   银线。骗子们假装织布，其实什么都没织。
   他们说只有聪慧的人才能看到这布料的美丽。
   ```
5. **点击"AI智能分析"**
6. **检查**:
   - 页面上是否看到进度条
   - 进度条是否从 0% 推进到 100%
   - 控制台是否有正确的日志

---

## 🆘 如果还是有问题

请截图或复制以下信息发给我:

1. **浏览器控制台的完整日志** (从点击按钮开始)
2. **Network 标签中的请求信息** (特别是 Response 内容)
3. **React DevTools 中的组件状态** (progressVisible 和 analysisProgress 的值)

---

**本诊断指南版本**: v1.0
**更新时间**: 2025-12-25
