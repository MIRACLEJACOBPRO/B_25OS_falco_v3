# B_25OS_falco_v3

🛡️ **基于Falco的AI安全系统** - OpenKylin操作系统安全监控和分析平台

## 📋 项目简介

B_25OS_falco_v3 是一个集成了 Falco 安全监控引擎和 Neo4j 图数据库的智能安全分析系统，专为 OpenKylin 操作系统设计。该系统提供实时安全事件监控、威胁检测、行为分析和可视化展示功能。

## ✨ 主要特性

- 🔍 **实时安全监控**: 基于Falco引擎的系统调用监控
- 🧠 **AI威胁分析**: 智能行为分析和异常检测
- 📊 **图数据库存储**: 使用Neo4j存储和分析安全事件关系
- 🎯 **可视化界面**: React前端提供直观的监控仪表板
- 🔧 **RESTful API**: 完整的后端API接口
- 🐳 **容器化部署**: 支持Docker容器化部署

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React 前端    │────│   FastAPI 后端  │────│   Neo4j 数据库  │
│   (端口: 3000)  │    │   (端口: 8001)  │    │   (端口: 7474)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │   Falco 引擎    │
                       │  (安全监控核心)  │
                       └─────────────────┘
```

## 🚀 快速开始

### 环境要求

- Python 3.8+
- Node.js 14+
- Neo4j 4.0+
- Docker (可选)

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/MIRACLEJACOBPRO/B_25OS_falco_v3.git
cd B_25OS_falco_v3
```

2. **后端配置**
```bash
cd falco-ai-security/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. **前端配置**
```bash
cd falco-ai-security/frontend
npm install
```

4. **环境变量配置**
```bash
cp falco-ai-security/.env.example falco-ai-security/.env
# 编辑 .env 文件配置数据库连接等信息
```

5. **启动服务**
```bash
# 启动后端 (终端1)
cd falco-ai-security/backend
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# 启动前端 (终端2)
cd falco-ai-security/frontend
npm start
```

### Docker 部署

```bash
cd falco-ai-security
docker-compose up -d
```

## 📁 项目结构

```
B_25OS_falco_v3/
├── falco-ai-security/          # 主要应用目录
│   ├── backend/                # FastAPI 后端
│   │   ├── app/               # 应用核心代码
│   │   ├── requirements.txt   # Python依赖
│   │   └── Dockerfile         # 后端容器配置
│   ├── frontend/              # React 前端
│   │   ├── src/              # 前端源码
│   │   ├── package.json      # Node.js依赖
│   │   └── Dockerfile        # 前端容器配置
│   ├── config/               # 配置文件
│   │   ├── falco/           # Falco配置
│   │   └── nginx/           # Nginx配置
│   ├── docker-compose.yml    # Docker编排文件
│   └── .env.example         # 环境变量模板
├── config/                   # 全局配置
├── docs/                     # 项目文档
├── TEAM_COLLABORATION_GUIDE.md  # 团队协作指南
└── README.md                # 项目说明
```

## 🔧 配置说明

### 环境变量

主要环境变量配置（`.env` 文件）：

```env
# 数据库配置
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# API配置
API_HOST=0.0.0.0
API_PORT=8001

# 安全配置
SECRET_KEY=your_secret_key
JWT_ALGORITHM=HS256

# Falco配置
FALCO_CONFIG_PATH=/etc/falco/falco.yaml
```

### Falco 规则配置

系统使用自定义的 Falco 规则进行安全监控，配置文件位于 `config/falco/` 目录。

## 📊 功能模块

### 1. 安全监控
- 实时系统调用监控
- 文件访问监控
- 网络连接监控
- 进程行为分析

### 2. 威胁检测
- 异常行为识别
- 恶意软件检测
- 权限提升检测
- 数据泄露监控

### 3. 数据分析
- 安全事件关联分析
- 攻击路径追踪
- 风险评估
- 趋势分析

### 4. 可视化展示
- 实时监控仪表板
- 安全事件时间线
- 网络拓扑图
- 统计报表

## 🤝 团队协作

本项目支持多人协作开发，详细的协作指南请参考 [TEAM_COLLABORATION_GUIDE.md](./TEAM_COLLABORATION_GUIDE.md)。

### 贡献流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📝 开发规范

- 遵循 [约定式提交](https://www.conventionalcommits.org/) 规范
- 代码需要通过 Code Review
- 保持代码风格一致
- 编写必要的测试用例

## 🐛 问题反馈

如果您发现任何问题或有改进建议，请：

1. 查看 [Issues](https://github.com/MIRACLEJACOBPRO/B_25OS_falco_v3/issues) 是否已有相关问题
2. 创建新的 Issue 详细描述问题
3. 提供复现步骤和环境信息

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👥 贡献者

感谢所有为这个项目做出贡献的开发者！

## 🔗 相关链接

- [Falco 官方文档](https://falco.org/docs/)
- [Neo4j 官方文档](https://neo4j.com/docs/)
- [FastAPI 官方文档](https://fastapi.tiangolo.com/)
- [React 官方文档](https://reactjs.org/docs/)

---

**注意**: 这是一个安全监控系统，请确保在合规的环境中使用，并遵守相关法律法规。

如有任何问题，欢迎联系项目维护者！🚀