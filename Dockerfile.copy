# 使用 Node 18 Slim (Debian 12 Bookworm)
FROM node:18-slim

# 1. 换源 (修复路径：针对 Debian 12 新版位置)
# 如果 debian.sources 存在，就修改它；否则尝试修改旧的 sources.list (为了兼容性)
RUN if [ -f /etc/apt/sources.list.d/debian.sources ]; then       sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources;     elif [ -f /etc/apt/sources.list ]; then       sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list;     fi

# 2. 安装系统基础依赖
# 必须先 update，否则可能找不到包
RUN apt-get update &&     apt-get install -y python3 python3-pip make g++ git &&     apt-get clean

WORKDIR /app

COPY . .

# 3. 安装 Python 依赖 (带判断逻辑)
RUN if [ -f "requirements.txt" ]; then pip3 install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --break-system-packages;     elif [ -f "python-backend/requirements.txt" ]; then pip3 install --no-cache-dir -r python-backend/requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --break-system-packages;     else echo "Warning: requirements.txt not found"; fi

# 4. 安装 Node 依赖 (核心修复步骤)
# 第一步：暴力删除 package.json 里所有带 'darwin-arm64' 的行 (解决 EBADPLATFORM 报错)
# 第二步：npm install
RUN sed -i '/darwin-arm64/d' package.json &&     rm -f package-lock.json &&     npm install --registry=https://registry.npmmirror.com --legacy-peer-deps --force --no-audit

# 5. 构建
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
