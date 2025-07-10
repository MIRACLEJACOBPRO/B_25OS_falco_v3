# B_25OS_falco_v3 团队协作开发指南

## 项目概述

**项目名称**: B_25OS_falco_v3  
**GitHub仓库**: https://github.com/MIRACLEJACOBPRO/B_25OS_falco_v3  
**项目描述**: 基于Falco的AI安全系统，集成Neo4j数据库，用于OpenKylin操作系统的安全监控和分析平台

## 🚀 快速开始

### 1. 克隆项目到本地

```bash
# 克隆仓库
git clone https://github.com/MIRACLEJACOBPRO/B_25OS_falco_v3.git

# 进入项目目录
cd B_25OS_falco_v3
```

### 2. 环境配置

#### 后端环境配置
```bash
# 进入后端目录
cd falco-ai-security/backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate     # Windows

# 安装依赖
pip install -r requirements.txt
```

#### 前端环境配置
```bash
# 进入前端目录
cd falco-ai-security/frontend

# 安装Node.js依赖
npm install
```

#### 环境变量配置
```bash
# 复制环境变量模板
cp falco-ai-security/.env.example falco-ai-security/.env

# 编辑环境变量文件
vim falco-ai-security/.env
```

### 3. 启动开发环境

#### 启动后端服务
```bash
cd falco-ai-security/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

#### 启动前端服务
```bash
cd falco-ai-security/frontend
npm start
```

## 📋 团队协作工作流程

### 日常开发流程

#### 1. 获取最新代码
```bash
# 切换到主分支
git checkout main

# 拉取最新代码
git pull origin main
```

#### 2. 创建功能分支
```bash
# 创建并切换到新的功能分支
git checkout -b feature/your-feature-name

# 分支命名规范:
# feature/功能名称     - 新功能开发
# bugfix/问题描述      - 错误修复
# hotfix/紧急修复      - 紧急修复
# docs/文档更新        - 文档更新
```

#### 3. 开发和提交
```bash
# 查看文件状态
git status

# 添加修改的文件
git add .
# 或添加特定文件
git add path/to/file

# 提交更改
git commit -m "feat: 添加用户认证功能"
```

#### 4. 推送分支
```bash
# 推送功能分支到远程仓库
git push origin feature/your-feature-name
```

#### 5. 创建Pull Request
1. 访问 GitHub 仓库页面
2. 点击 "Compare & pull request" 按钮
3. 填写 PR 标题和描述
4. 指定审查者
5. 提交 Pull Request

#### 6. 代码审查和合并
1. 团队成员进行代码审查
2. 根据反馈修改代码
3. 审查通过后合并到主分支
4. 删除功能分支

### 提交信息规范

使用约定式提交格式：

```
<类型>[可选的作用域]: <描述>

[可选的正文]

[可选的脚注]
```

**类型说明：**
- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

**示例：**
```bash
git commit -m "feat(auth): 添加JWT用户认证功能"
git commit -m "fix(api): 修复用户登录接口返回错误"
git commit -m "docs: 更新API文档"
```

## 🌿 分支管理策略

### 分支类型

- **main**: 主分支，包含生产就绪的代码
- **develop**: 开发分支（可选，用于集成测试）
- **feature/***: 功能分支，用于开发新功能
- **bugfix/***: 错误修复分支
- **hotfix/***: 紧急修复分支
- **release/***: 发布分支（可选）

### 分支保护规则

建议为 `main` 分支设置保护规则：
1. 要求 Pull Request 审查
2. 要求状态检查通过
3. 要求分支为最新状态
4. 限制推送权限

## 👥 团队协作最佳实践

### 1. 代码审查
- 每个 PR 至少需要一人审查
- 审查重点：代码质量、安全性、性能
- 提供建设性反馈
- 及时响应审查请求

### 2. 沟通协作
- 使用 GitHub Issues 跟踪任务和错误
- 在 PR 中详细描述更改内容
- 定期同步项目进度
- 遇到问题及时沟通

### 3. 代码质量
- 遵循项目编码规范
- 编写清晰的注释
- 保持代码简洁易读
- 编写必要的测试

### 4. 版本管理
- 定期合并主分支到功能分支
- 避免长期存在的功能分支
- 及时删除已合并的分支
- 使用标签标记重要版本

## 🔧 常用Git命令

### 基础操作
```bash
# 查看状态
git status

# 查看提交历史
git log --oneline

# 查看分支
git branch -a

# 切换分支
git checkout branch-name

# 创建并切换分支
git checkout -b new-branch

# 删除本地分支
git branch -d branch-name

# 删除远程分支
git push origin --delete branch-name
```

### 同步操作
```bash
# 拉取远程更改
git pull origin main

# 推送到远程
git push origin branch-name

# 获取远程分支信息
git fetch origin
```

### 合并操作
```bash
# 合并分支
git merge branch-name

# 变基操作
git rebase main

# 交互式变基
git rebase -i HEAD~3
```

## 🚨 冲突解决

### 当出现合并冲突时：

1. **拉取最新代码**
```bash
git pull origin main
```

2. **解决冲突**
- 打开冲突文件
- 查找冲突标记 `<<<<<<<`, `=======`, `>>>>>>>`
- 手动编辑解决冲突
- 删除冲突标记

3. **提交解决方案**
```bash
git add .
git commit -m "resolve: 解决合并冲突"
```

4. **推送更改**
```bash
git push origin your-branch
```

## 📞 获取帮助

### 项目相关问题
- 创建 GitHub Issue
- 联系项目维护者
- 查看项目文档

### Git 使用问题
- 查看 Git 官方文档
- 使用 `git help <command>` 查看命令帮助
- 搜索相关教程和资源

## 📚 相关资源

- [Git 官方文档](https://git-scm.com/doc)
- [GitHub 官方指南](https://guides.github.com/)
- [约定式提交规范](https://www.conventionalcommits.org/)
- [Markdown 语法指南](https://guides.github.com/features/mastering-markdown/)

---

**注意**: 这是团队首次使用 GitHub 进行协作开发，建议先在测试分支上练习工作流程，熟悉后再进行正式开发。

如有任何问题，请及时与团队沟通！🚀