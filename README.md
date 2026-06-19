# 知行网络学堂 · Dify Custom WebApp

基于 [`langgenius/webapp-conversation`](https://github.com/langgenius/webapp-conversation) Fork 的计算机网络课程学习前端。项目保留上游的 Dify 会话、SSE、文件上传和 Agent 展示能力，并新增账号体系、知识库目录、个人引用、个性化分析、学习画像与多套配色。

## 当前能力

- `/login`：账号密码注册、登录、安全问题找回密码
- `/chat`：复用上游 Dify Conversation WebApp 的聊天与 SSE 渲染
- `/library`：读取 Dify 知识库文档列表、索引状态、字数和命中次数
- `/sources`：仅展示当前账号对话产生的知识库引用
- `/analysis`：仅根据当前账号的会话、消息和引用生成学习分析
- `/knowledge-graph`：个人学习主题、文档和知识点关系图
- `/profile`：学习偏好、账号信息与个人统计
- 森林青、海洋蓝、星云紫、日落橙、石墨灰五套界面配色
- Dify API Key 和知识库 API Key 只保存在服务端
- 账号名经过 SHA-256 派生为稳定的 Dify `user`，不直接传输账号名

## 本地运行

```bash
pnpm install
copy .env.example .env.local
pnpm db:push
pnpm dev
```

访问 <http://localhost:3000>，注册账号后即可进入学习空间。

## 必填环境变量

```env
NEXT_PUBLIC_APP_ID=你的_Dify_App_ID
DIFY_API_BASE_URL=https://你的-dify.example.com/v1
DIFY_API_KEY=app-xxxxxxxx
DIFY_DATASET_API_KEY=dataset-xxxxxxxx
DIFY_DATASET_ID=知识库_UUID
AUTH_SECRET=随机强密钥
AUTH_URL=https://你的前端域名
DATABASE_URL=postgresql://...
```

`DIFY_API_KEY`、`DIFY_DATASET_API_KEY`、`AUTH_SECRET` 和 `DATABASE_URL` 禁止使用 `NEXT_PUBLIC_` 前缀。

## 账号与数据隔离

- 密码至少 8 位，并同时包含大写字母、小写字母、数字和特殊字符。
- 密码和安全问题答案使用 bcrypt 加盐哈希保存。
- 连续 5 次登录失败后，账号临时锁定 15 分钟。
- 会话、消息、引用、画像和分析查询全部绑定当前 `appUserId`。
- Dify `user` 由规范化账号名的 SHA-256 摘要生成，不包含明文账号。

## 数据库

PostgreSQL 模型位于 [`prisma/schema.prisma`](./prisma/schema.prisma)，覆盖用户、会话、消息、知识库引用、图谱、用户画像和分析报告。

首次连接数据库后执行：

```bash
pnpm db:push
```

Vercel 可通过 Marketplace 连接 Neon 等 PostgreSQL 服务，并将连接串写入 `DATABASE_URL`。

## Vercel 部署

1. 在 Vercel 导入 GitHub Fork。
2. Framework Preset 选择 Next.js。
3. 连接 PostgreSQL 数据库并配置全部服务端环境变量。
4. 执行一次 `pnpm db:push` 初始化表结构。
5. 推送分支生成 Preview Deployment，合并到 `main` 后生成 Production Deployment。

## 验证

```bash
pnpm typecheck
pnpm lint
pnpm build
```
