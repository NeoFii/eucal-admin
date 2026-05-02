# Eucal Admin 部署文档

## 项目简介

Eucal Admin 是 Eucal AI 平台的管理后台，基于 Next.js 14 构建。本项目是纯前端应用，通过 Next.js rewrites 将 `/api/*` 请求代理到后端服务，因此部署时需要指定后端 API 地址。

## 目录结构

```
├── Dockerfile            # 多阶段构建文件
├── docker-compose.yml    # Docker Compose 编排文件
├── .dockerignore         # Docker 构建排除规则
├── .env.example          # 环境变量模板
├── deploy.md             # 本文档
├── next.config.mjs       # Next.js 配置（含 API 代理规则）
├── package.json          # 项目依赖
├── pnpm-lock.yaml        # 依赖锁定文件
└── src/                  # 应用源码
```

## 环境要求

| 依赖 | 最低版本 | 检查命令 |
|------|---------|---------|
| Docker | 20.0+ | `docker --version` |
| Docker Compose | v2.0+ | `docker compose version` |

> 如果服务器未安装 Docker，参考官方文档：https://docs.docker.com/engine/install/

## 环境变量说明

| 变量 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `API_URL` | 构建时 | `http://<BACKEND_IP>:8001` | admin-service 内网地址 |
| `PORT` | 运行时 | `3001` | 宿主机映射端口（仅 localhost） |

### 关于 API_URL

`API_URL` 是**构建时参数**（不是运行时环境变量）。原因：Next.js 的 rewrites 代理规则在 `next build` 阶段写入 `routes-manifest.json`，构建完成后无法动态修改。

这意味着：
- 修改后端地址后，需要**重新构建镜像**（`docker compose up -d --build`）
- 同一镜像只能指向同一个后端地址

### API_URL 填写示例

| 场景 | API_URL 值 |
|------|-----------|
| 三节点架构（推荐）：前端访问后端节点 | `http://<BACKEND_IP>:8001` |
| 与后端同节点（Docker 网络） | `http://admin-service:8001` |
| 本地开发（后端跑在宿主机） | `http://172.17.0.1:8001` |

> 三节点部署时，`<BACKEND_IP>` 应为后端节点的**内网 IP**，由防火墙限制只允许前端节点访问。

---

## 快速开始

### 方式一：使用 Docker Compose（推荐）

```bash
# 1. 克隆项目
git clone git@github.com:NeoFii/eucal-admin.git
cd eucal-admin

# 2. 复制并编辑环境变量
cp .env.example .env

# 3. 编辑 .env，将 API_URL 修改为实际后端地址
#    vim .env
#    API_URL=http://192.168.1.100:8001

# 4. 构建并启动（后台运行）
docker compose up -d --build

# 5. 查看运行状态，等待 STATUS 变为 healthy
docker compose ps
```

启动成功后，浏览器访问 `http://<服务器IP>:3001` 即可进入登录页面。

### 方式二：直接使用 Docker

不使用 Docker Compose 时，可以手动构建和运行：

```bash
# 构建镜像（指定后端地址）
docker build \
  --build-arg API_URL=http://your-backend:8001 \
  -t eucal-admin .

# 运行容器
docker run -d \
  -p 3001:3001 \
  --name eucal-admin \
  --restart unless-stopped \
  eucal-admin

# 查看日志
docker logs -f eucal-admin
```

---

## 常用运维命令

### 服务管理

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看运行状态
docker compose ps

# 查看实时日志
docker compose logs -f admin

# 查看最近 100 行日志
docker compose logs --tail 100 admin
```

### 镜像管理

```bash
# 重新构建镜像（修改代码或 API_URL 后）
docker compose up -d --build

# 仅构建不启动
docker compose build

# 查看镜像大小
docker images | grep eucal-admin

# 清理旧的悬空镜像
docker image prune -f
```

### 故障排查

```bash
# 进入容器内部排查
docker compose exec admin sh

# 检查容器健康状态
docker inspect --format='{{.State.Health.Status}}' $(docker compose ps -q admin)

# 查看容器资源占用
docker stats $(docker compose ps -q admin) --no-stream
```

---

## 镜像导出与离线部署

适用于无法访问外网的服务器。

### 在有网络的机器上

```bash
# 1. 构建镜像
docker compose build

# 2. 查看镜像名称
docker images | grep eucal-admin

# 3. 导出为 tar 文件
docker save eucal-admin-main-admin:latest -o eucal-admin.tar

# 4. 压缩（可选，减小传输体积）
gzip eucal-admin.tar
```

### 在目标服务器上

```bash
# 1. 解压（如果压缩过）
gunzip eucal-admin.tar.gz

# 2. 导入镜像
docker load -i eucal-admin.tar

# 3. 运行容器
docker run -d \
  -p 3001:3001 \
  --name eucal-admin \
  --restart unless-stopped \
  eucal-admin-main-admin:latest
```

---

## 生产部署建议

### 反向代理（Nginx）

生产环境建议在前面加一层 Nginx 处理 HTTPS、域名绑定和静态资源缓存：

```nginx
server {
    listen 80;
    server_name admin.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.example.com;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 反向代理（Caddy）

如果使用 Caddy，配置更简洁（自动 HTTPS）：

```
admin.example.com {
    reverse_proxy 127.0.0.1:3001
}
```

### 日志持久化

默认容器日志由 Docker 管理，可以配置日志驱动限制大小：

```yaml
# docker-compose.yml 中添加
services:
  admin:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

### 资源限制

生产环境建议限制容器资源使用：

```yaml
# docker-compose.yml 中添加
services:
  admin:
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          memory: 256M
```

---

## Dockerfile 说明

项目使用三阶段多阶段构建，最大程度减小最终镜像体积：

| 阶段 | 基础镜像 | 作用 |
|------|---------|------|
| `deps` | node:20-alpine | 安装 pnpm 依赖 |
| `builder` | node:20-alpine | 编译 Next.js 应用（standalone 模式） |
| `runner` | node:20-alpine | 仅包含运行时必要文件，以非 root 用户运行 |

最终镜像特点：
- 不包含 node_modules（standalone 模式自动提取必要依赖）
- 不包含源码和构建工具
- 以 `nextjs` 用户（uid 1001）运行，非 root
- 预期镜像大小 < 200MB

---

## 前端节点部署（独立服务器架构）

推荐架构：管理前端与用户前端 (Frontend-zh) 共同部署在前端节点 (2H2G)，后端服务部署在独立的后端节点 (2H4G)，前端通过**内网 IP** 访问后端。

### 网络配置

前端节点上没有后端服务，前端容器直接通过内网 IP 访问 admin-service。`docker-compose.yml`：

```yaml
services:
  admin:
    build:
      context: .
      args:
        API_URL: ${API_URL:-http://<BACKEND_IP>:8001}
    ports:
      - "127.0.0.1:${PORT:-3001}:3001"   # 只监听 localhost，由 Nginx 反代
    restart: unless-stopped
    networks:
      - frontend
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3001/login"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

networks:
  frontend:
    external: true
    name: eucal_frontend_network
```

### 环境变量

```bash
# .env — 替换 <BACKEND_IP> 为后端节点的内网 IP
API_URL=http://<BACKEND_IP>:8001
PORT=3001
```

> `API_URL` 是构建时参数，修改后端 IP 后必须 `docker compose up -d --build` 重新构建。生产环境建议固定后端节点的内网 IP（云服务器一般支持设置固定私网 IP）。

### 启动步骤

```bash
# 1. 创建前端节点本地网络（与 Frontend-zh 共用）
docker network create eucal_frontend_network

# 2. 确认后端节点的 admin-service 可达
curl -s http://<BACKEND_IP>:8001/api/v1/health

# 3. 构建并启动前端
cd /srv/eucal/admin-frontend
docker compose up -d --build
```

### 验证

```bash
# 容器健康状态
docker compose ps

# 从前端容器内测试到后端
docker exec $(docker compose ps -q admin) \
  wget -qO- http://<BACKEND_IP>:8001/api/v1/health

# 通过 Next.js 代理访问后端 API
curl -s http://127.0.0.1:3001/api/v1/health
```

### Nginx 反向代理（同节点）

前端节点通常会跑 Nginx 做 HTTPS 终止，把不同域名分发到不同前端容器：

```nginx
# admin.yourdomain.com → :3001
server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/admin.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 完整部署架构参考

详见后端仓库的 `DEPLOY.md`，包含三节点架构的完整部署流程：

| 节点 | 配置 | 服务 |
|------|------|------|
| 前端节点 | 2H2G | eucal-admin + Frontend-zh + Nginx |
| 后端节点 | 2H4G | MySQL + Redis + admin-service + user-service |
| GPU 节点 | 视模型而定 | router-service + inference-service |

涵盖：
- 三节点架构图与端口/防火墙规划
- 各节点 `.env` 与 `docker-compose.yml` 配置示例
- 共享密钥管理
- 防火墙规则（仅授信内网 IP 访问后端）
- 内网通信速查表与资源占用估算

---

## 常见问题

### Q: 容器启动后无法访问页面？

1. 检查容器是否正常运行：`docker compose ps`
2. 检查端口是否被占用：`ss -tlnp | grep 3001`
3. 检查防火墙是否放行端口：`sudo ufw status`（Ubuntu）或 `sudo firewall-cmd --list-ports`（CentOS）
4. 查看容器日志：`docker compose logs admin`

### Q: 页面能打开但 API 请求失败？

说明 `API_URL` 配置有误，后端服务不可达：

1. 确认后端服务正在运行
2. 从 Docker 容器内测试连通性：
   ```bash
   docker compose exec admin wget -qO- http://your-backend:8001/api/v1/health
   ```
3. 如果使用 `host.docker.internal`，确认 Docker 版本支持（Linux 需要 Docker 20.10+）
4. 修改 `.env` 中的 `API_URL` 后重新构建：`docker compose up -d --build`

### Q: 如何更新到新版本？

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker compose up -d --build
```

### Q: 如何修改服务端口？

编辑 `.env` 文件中的 `PORT` 变量，然后重启：

```bash
# 修改 .env
PORT=8080

# 重启（端口是运行时参数，无需重新构建）
docker compose down && docker compose up -d
```
