# 🐍 Python 后端服务启动指南

## ✅ 当前状态

Python 后端服务已启动！
- **服务地址**: http://localhost:8081
- **日志位置**: /tmp/python-backend.log
- **状态**: ✅ 运行中

---

## 🚀 启动 Python 后端

### 方式1: 使用启动脚本 (推荐)

```bash
bash /Users/cswenx/script-to-frame/script-to-frame/python-backend/start.sh
```

或在后台运行:

```bash
bash /Users/cswenx/script-to-frame/script-to-frame/python-backend/start.sh > /tmp/python-backend.log 2>&1 &
```

### 方式2: 直接运行

```bash
cd /Users/cswenx/script-to-frame/script-to-frame/python-backend
source venv/bin/activate
python main.py
```

### 方式3: Docker (如果配置了)

```bash
cd /Users/cswenx/script-to-frame/script-to-frame
docker-compose up python-backend
```

---

## 📊 验证服务状态

### 查看 Python 后端日志

```bash
tail -f /tmp/python-backend.log
```

### 检查进程

```bash
ps aux | grep "python main.py"
```

### 检查端口占用

```bash
lsof -i :8081
```

---

## 🔧 前端-后端通信流程

```
前端 (http://localhost:3005)
  ↓
Next.js 后端 API (http://localhost:3005/api/generate-all-images)
  ↓
Python 后端服务 (http://localhost:8081/api/generate-image)
  ↓
火山引擎 OpenAPI (生成图片)
  ↓
返回图片 URL
```

---

## 🎯 现在可以测试了

1. ✅ **Node.js 前端**: http://localhost:3005
2. ✅ **Python 后端**: http://localhost:8081
3. ✅ **API 连接**: 正常

### 测试步骤

1. 打开浏览器: http://localhost:3005
2. 输入剧本并点击"AI智能分析"
3. 点击"生成所有分镜"
4. 查看日志:
   - **前端日志**: F12 → Console
   - **Next.js日志**: `tail -f /tmp/dev.log`
   - **Python日志**: `tail -f /tmp/python-backend.log`

---

## ⚠️ 常见问题

### 问题1: Python 后端启动失败

**错误**: `ModuleNotFoundError` 或 `ImportError`

**解决**:
```bash
cd /Users/cswenx/script-to-frame/script-to-frame/python-backend
source venv/bin/activate
pip install -r requirements.txt
```

### 问题2: 端口8081被占用

**检查占用进程**:
```bash
lsof -i :8081
```

**修改端口** (在 `.env` 中):
```
PORT=8082
```

### 问题3: 火山引擎 API 密钥错误

**检查 `.env` 文件**:
```bash
cat /Users/cswenx/script-to-frame/script-to-frame/python-backend/.env
```

确保有有效的 API 密钥:
- `VOLCENGINE_ACCESS_KEY_ID`
- `VOLCENGINE_SECRET_ACCESS_KEY`

### 问题4: 连接超时

**检查后端是否运行**:
```bash
ps aux | grep "python main.py"
```

**检查防火墙**:
```bash
# macOS
lsof -i :8081

# Linux
sudo ufw allow 8081
```

---

## 📋 三个服务的启动清单

| 服务 | 地址 | 状态 | 启动命令 |
|------|------|------|---------|
| 前端 (Node.js) | http://localhost:3005 | ✅ | `npm run dev` |
| Python 后端 | http://localhost:8081 | ✅ | `bash start.sh` |
| 数据库 | (如需要) | - | - |

---

## 🎉 现在可以完整测试了

所有三项需求都可以测试:

1. **需求1**: 框架数量 3→40 ✅
2. **需求2**: 4步实时进度 ✅
3. **需求3**: 逐帧实时显示 ✅ (需要Python后端)

---

**更新时间**: 2025-12-25
**Python 后端日志**: `/tmp/python-backend.log`
**状态**: ✅ 就绪
