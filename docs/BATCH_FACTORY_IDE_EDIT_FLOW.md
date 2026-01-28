# 批量工厂编辑功能说明

## 📋 功能概述

批量工厂和IDE现在已经完全打通：
- ✅ 在批量工厂创建的故事 → 可以在IDE中编辑
- ✅ 在IDE保存的草稿 → 自动出现在批量工厂
- ✅ 点击"编辑"按钮 → 跳转到IDE并自动加载项目

---

## 🔄 完整工作流程

### 1. 在批量工厂创建故事

```
批量工厂页面
    ↓
点击"📝 新增故事"
    ↓
填写标题和故事内容
    ↓
点击"确认"
    ↓
系统询问: "是否立即跳转到编辑页面？"
    ↓
├─ 点击"确定" → 跳转到IDE并加载项目 ✅
└─ 点击"取消" → 留在批量工厂，稍后可在项目列表中打开
```

### 2. 从批量工厂打开已创建的故事

```
批量工厂页面
    ↓
故事列表中找到要编辑的故事
    ↓
点击"✏️ 编辑"按钮
    ↓
跳转到 /ide?projectId=xxx
    ↓
IDE自动加载项目数据 ✅
    ↓
开始编辑创作
```

### 3. 在IDE中保存项目

```
IDE编辑页面
    ↓
点击"💾 保存草稿"或"🚀 发布成品"
    ↓
项目保存到 data/projects/xxx.json
    ↓
更新 data/projects/index.json
    ↓
项目自动出现在批量工厂的故事列表中 ✅
```

---

## 🔍 技术实现

### 数据流向

```
批量工厂创建故事
    ↓
POST /api/batch-factory/stories/create
    ↓
保存: data/projects/project_xxx.json
    ↓
更新: data/projects/index.json (drafts数组)
    ↓
跳转: router.push('/ide?projectId=project_xxx')
    ↓
IDE页面检测到projectId参数
    ↓
GET /api/projects?projectId=project_xxx
    ↓
返回完整项目数据
    ↓
actions.loadProject(projectData)
    ↓
项目加载到IDE context中 ✅
```

### 文件修改

| 文件 | 修改内容 |
|------|---------|
| `pages/ide.js` | ✨ 添加IDEPageWrapper组件处理URL参数 |
| `pages/api/projects.js` | 📝 GET接口支持projectId参数 |
| `pages/batch-factory/index.js` | 📝 handleAddStory添加跳转询问 |

---

## 🎯 用户操作指南

### 场景1：快速创建并编辑

1. 进入批量工厂页面
2. 点击"📝 新增故事"
3. 填写：
   - **标题**: "南柯一梦"
   - **故事**: 唐代有个叫淳于棼的人...
4. 点击"确认"
5. 选择"确定"跳转到编辑页面
6. ✅ 自动进入IDE，故事内容已填充，可以开始创作

### 场景2：批量工厂管理，IDE编辑

1. 在批量工厂批量创建多个故事
2. 稍后进入批量工厂，在故事列表中选择一个
3. 点击"✏️ 编辑"按钮
4. ✅ 跳转到IDE，项目自动加载
5. 开始创作（AI分析、角色生成、分镜生成等）
6. 点击"💾 保存草稿"
7. 返回批量工厂，看到故事状态已更新

### 场景3：删除不需要的故事

1. 在批量工厂故事列表中
2. 勾选要删除的故事（可多选）
3. 点击"🗑️ 批量删除"
4. 确认删除
5. ✅ 项目及相关资源（图片、音频）被完全删除

---

## 📊 数据结构

### 批量工厂创建的项目

```json
{
  "id": "project_xxx",
  "title": "南柯一梦",
  "story_name": "南柯一梦",
  "rawStory": "完整的故事文本...",
  "style_preset": "watercolor",
  "settings": {
    "aspectRatio": "16:9",
    "resolution": "2k",
    "language": "zh",
    "pageCount": 8
  },
  "phaseStatus": {
    "1": "pending",
    "2": "locked",
    "3": "locked",
    "4": "locked"
  },
  "assets": [],
  "pages": [],
  "created_at": "2026-01-27T11:27:38.761Z",
  "updated_at": "2026-01-27T11:27:38.761Z"
}
```

### IDE加载后的项目

IDE会自动识别所有字段并填充到对应的输入框：
- `rawStory` → 故事输入框
- `story_name` → 绘本名称
- `style_preset` → 风格预设选择
- `settings` → 各种设置选项
- `phaseStatus` → 显示当前进度

---

## ⚠️ 注意事项

### 1. 项目ID一致性
批量工厂和IDE使用同一个项目ID，确保：
- 项目文件：`data/projects/project_xxx.json`
- URL参数：`/ide?projectId=project_xxx`
- API调用：`/api/projects?projectId=project_xxx`

### 2. 数据同步
- 批量工厂和IDE实时共享 `data/projects/index.json`
- 一方保存，另一方立即看到更新
- 无需手动刷新或同步

### 3. 删除不可恢复
- 删除操作会永久删除项目文件
- 删除所有生成的资源（图片、音频）
- 删除前会有二次确认

---

## ✅ 功能验证

### 验证步骤

1. **新建流程**：
   ```
   批量工厂 → 新增故事 → 填写内容 → 确认 → 选择跳转 → IDE加载成功 ✅
   ```

2. **编辑流程**：
   ```
   批量工厂 → 故事列表 → 点击编辑 → IDE加载成功 ✅
   ```

3. **保存流程**：
   ```
   IDE编辑 → 保存草稿 → 批量工厂查看 → 状态更新 ✅
   ```

4. **删除流程**：
   ```
   批量工厂 → 选择故事 → 批量删除 → 确认 → 项目删除成功 ✅
   ```

---

## 🎉 总结

现在批量工厂和IDE已经完全打通：

1. ✅ **统一存储**：使用同一个 `data/projects/` 目录
2. ✅ **双向同步**：批量工厂和IDE实时共享项目数据
3. ✅ **无缝跳转**：点击编辑即可跳转到IDE并自动加载
4. ✅ **完整管理**：支持创建、编辑、保存、删除等所有操作

用户可以在批量工厂批量管理故事，在IDE专注于创作，两者完美配合！
