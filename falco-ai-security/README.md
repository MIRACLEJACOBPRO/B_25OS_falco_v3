# Falco AI Security System

基于OpenKylin环境的实时安全监控与AI自动响应系统

## 项目概述

本系统集成Falco运行时监控、Neo4j图数据库、OpenAI GPT-4分析、Pinecone向量数据库和AI决策代理，实现数据-分析-决策-行动的闭环自动化安全防护。

## 系统架构

```
Falco监控 → 日志解析 → Neo4j图谱 → 本地筛选 → LLM分析 → AI决策 → 自动执行 → 效果验证 → 经验存储
```

## 技术栈

- **监控层**: Falco (eBPF/内核模块)
- **数据层**: Neo4j图数据库 + Pinecone向量数据库
- **AI层**: OpenAI GPT-4 + 嵌入模型
- **应用层**: Python后端 + FastAPI
- **前端层**: React + D3.js图可视化
- **部署层**: Docker + Docker Compose

## 快速开始

### 一键安装
```bash
sudo ./scripts/install.sh
```

### 一键启动
```bash
./scripts/start.sh
```

### 访问系统
- Web界面: http://192.168.200.129:3000
- API接口: http://192.168.200.129:8000
- Neo4j浏览器: http://192.168.200.129:7474

## 项目结构

```
falco-ai-security/
├── backend/                 # Python后端服务
├── frontend/               # Web前端
├── config/                 # 配置文件
├── scripts/                # 部署脚本
├── docs/                   # 文档
├── docker-compose.yml      # 容器编排
├── .env.example           # 环境变量模板
└── README.md
```

## 开发指南

详细的开发和部署指南请参考 [项目实施任务.md](../项目实施任务.md)

## 许可证

MIT License