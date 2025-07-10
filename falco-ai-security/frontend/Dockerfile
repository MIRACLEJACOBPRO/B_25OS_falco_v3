# 多阶段构建 - 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install --legacy-peer-deps

# 修复 ajv 版本兼容性问题
RUN npm install ajv@6 ajv-keywords@3 --legacy-peer-deps

# 复制源代码
COPY . .

# 设置构建时环境变量
ARG REACT_APP_API_URL=http://192.168.200.129:8000
ARG REACT_APP_NEO4J_URL=http://192.168.200.129:7474
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_NEO4J_URL=$REACT_APP_NEO4J_URL

# 构建应用
RUN NODE_OPTIONS='--openssl-legacy-provider' DISABLE_ESLINT_PLUGIN=true npm run build

# 生产阶段 - 使用nginx提供静态文件
FROM nginx:alpine AS production

# 安装curl用于健康检查
RUN apk add --no-cache curl

# 复制构建产物到nginx目录
COPY --from=builder /app/build /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 3000

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1