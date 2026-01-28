# IDE 加载项目错误修复说明

## 🐛 问题描述

在批量工厂点击"编辑"按钮跳转到IDE后，出现运行时错误：

```
TypeError: Cannot read properties of undefined (reading 'audioLanguage')
```

---

## 🔍 根本原因

### 问题1：缺少安全的默认值处理

**文件**: `pages/ide.js`

**问题代码**:
```javascript
// ❌ 直接访问 settings.audioLanguage，如果 settings 不存在会报错
const audioLanguage = project.settings.audioLanguage || 'zh';
[project.pages, project.settings.audioLanguage, actions]
```

**原因**:
- 批量工厂创建的项目有完整的 `settings` 字段
- 但旧项目或某些边缘情况可能缺少 `settings` 字段
- 依赖数组中直接访问 `project.settings.audioLanguage` 会抛出异常

### 问题2：加载项目时没有合并默认值

**文件**: `contexts/ProjectContext.jsx`

**问题代码**:
```javascript
case ActionTypes.LOAD_PROJECT:
  return {
    ...state,
    project: action.payload  // ❌ 直接替换，没有合并默认值
  };
```

**原因**:
- 加载项目时完全替换 project 对象
- 如果加载的项目缺少某些字段（如 `settings`），就会导致运行时错误
- 没有使用 `initialProject` 中的默认值作为后备

---

## ✅ 解决方案

### 1. 添加安全的默认值处理

**文件**: `pages/ide.js`

**修改1**:
```javascript
// ✅ 使用可选链和多个后备值
const audioLanguage = project.settings?.audioLanguage
  || project.settings?.language
  || 'zh';
```

**修改2**:
```javascript
// ✅ 在依赖数组中使用可选链
[project.pages, project.settings?.audioLanguage, actions]
```

**修改3**:
```javascript
// ✅ 所有 settings 访问都添加可选链和默认值
aspectRatio: project.settings?.aspectRatio || '16:9',
resolution: project.settings?.resolution || '2k',
enableSpeechBubble: project.settings?.enableSpeechBubble || false,
bubbleLanguage: project.settings?.bubbleLanguage || 'zh',
```

### 2. 加载项目时合并默认值

**文件**: `contexts/ProjectContext.jsx`

**修改**:
```javascript
// ✅ 加载项目时合并默认值
case ActionTypes.LOAD_PROJECT:
  return {
    ...state,
    project: {
      ...initialProject,  // 先使用默认值
      ...action.payload,   // 然后用加载的数据覆盖

      // 特殊处理 settings：确保所有字段都有值
      settings: {
        aspectRatio: '16:9',
        resolution: '2k',
        language: 'zh',
        pageCount: 8,
        enableSpeechBubble: false,
        bubbleLanguage: 'zh',
        audioLanguage: 'zh',
        ...action.payload.settings  // 用加载的设置覆盖
      }
    }
  };
```

---

## 🎯 修复效果

### 修复前

```
批量工厂 → 点击编辑 → 跳转到IDE
    ↓
❌ TypeError: Cannot read properties of undefined (reading 'audioLanguage')
    ↓
页面崩溃，无法使用
```

### 修复后

```
批量工厂 → 点击编辑 → 跳转到IDE
    ↓
✅ 检测到 projectId 参数
    ↓
✅ 加载项目数据
    ↓
✅ 合并默认 settings（即使原项目没有 settings）
    ↓
✅ 所有字段都有安全的默认值
    ↓
✅ IDE 正常加载，故事内容显示
```

---

## 📊 默认 settings 字段

```javascript
{
  aspectRatio: '16:9',      // 画幅比例
  resolution: '2k',         // 分辨率
  language: 'zh',           // 故事语言
  pageCount: 8,             // 分镜页数
  enableSpeechBubble: false,// 是否启用语言气泡
  bubbleLanguage: 'zh',     // 气泡语言
  audioLanguage: 'zh'       // 音频语言
}
```

---

## 🧪 测试验证

### 测试场景

1. **批量工厂创建的新项目**
   ```
   ✅ 有完整 settings → 直接加载
   ```

2. **缺少 settings 的旧项目**
   ```
   ✅ 自动合并默认 settings → 正常加载
   ```

3. **settings 不完整的项目**
   ```
   ✅ 只覆盖提供的字段，缺失字段使用默认值 → 正常加载
   ```

4. **完全没有 settings 的项目**
   ```
   ✅ 使用完整的默认 settings → 正常加载
   ```

### 编译测试

```
✅ 编译成功：无语法错误
✅ IDE页面：HTTP 200
✅ 批量工厂：HTTP 200
✅ 无运行时错误
```

---

## 📝 相关文件

| 文件 | 修改内容 |
|------|---------|
| `pages/ide.js` | 添加安全的可选链访问和默认值 |
| `contexts/ProjectContext.jsx` | 修改 LOAD_PROJECT 逻辑，合并默认值 |

---

## 🎉 总结

**修复内容**:
1. ✅ 所有 `project.settings` 访问都使用可选链 (`?.`)
2. ✅ 添加多层后备默认值
3. ✅ 加载项目时自动合并完整的默认 `settings`
4. ✅ 确保即使项目数据不完整也不会报错

**结果**:
- ✅ 批量工厂的"编辑"功能正常工作
- ✅ IDE 加载项目时不会崩溃
- ✅ 兼容各种格式的项目数据
- ✅ 新旧项目都能正常加载

现在批量工厂到IDE的编辑流程已经完全打通，不会再出现这个错误！🎉
