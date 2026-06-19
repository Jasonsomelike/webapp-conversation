# 知行网络学堂 · Dify Custom WebApp

基于 [`langgenius/webapp-conversation`](https://github.com/langgenius/webapp-conversation) Fork 的计算机网络课程学习前端。项目保留上游的 Dify 会话、SSE、文件上传和 Agent 展示能力，在外层新增登录、知识库引用、知识图谱、个性化分析和学习画像。

## 当前能力

- `/login`：微信开放平台网站应用扫码登录，另有受控演示入口
- `/chat`：复用上游 Dify Conversation WebApp 的聊天与 SSE 渲染
- `/sources`：文档、页码、命中片段与来源整页预览
- `/knowledge-graph`：个人学习主题、文档、技能和薄弱点关系图
- `/analysis`：学习动量、近期趋势、薄弱点和推荐行动
- `/profile`：微信资料、Dify 用户标识与学习偏好
- 服务端 Dify API 代理，浏览器构建产物不包含 API Key
- 微信标识经过 SHA-256 派生后再作为 Dify `user`
- Dify 未配置时自动启用完整演示链路，适合 Vercel Preview

## 本地运行

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

访问 <http://localhost:3000>，点击“使用演示账户体验”即可查看所有页面。

## 必填环境变量

生产环境至少需要：

```env
NEXT_PUBLIC_APP_ID=a7d68723-da54-45e3-a742-d746f4f852c7
DIFY_API_BASE_URL=https://dify.jasonsome.cn:22380/v1
DIFY_API_KEY=app-xxxxxxxx
AUTH_SECRET=随机强密钥
AUTH_URL=https://你的前端域名
WECHAT_APP_ID=wx_xxxxx
WECHAT_APP_SECRET=xxxxx
DATABASE_URL=postgresql://...
ALLOW_DEMO_LOGIN=false
```

`DIFY_API_KEY`、`WECHAT_APP_SECRET`、`AUTH_SECRET` 和 `DATABASE_URL` 禁止使用 `NEXT_PUBLIC_` 前缀。

## 微信开放平台

网站应用回调地址：

```text
https://你的前端域名/api/auth/wechat/callback
```

登录后仅在 HttpOnly Cookie 中保存最小会话资料。openid / unionid 不会明文传给 Dify。

## 数据库

完整 PostgreSQL 模型位于 [`prisma/schema.prisma`](./prisma/schema.prisma)，覆盖：

- 用户与会话
- 消息与知识库引用
- 图谱节点与关系
- 用户画像与分析报告

当前 Preview UI 使用演示数据和浏览器引用缓存；接入数据库时可按 API Route 边界逐步替换，不需要改聊天主链路。

## Vercel 部署

1. 在 Vercel 导入 GitHub Fork。
2. Framework Preset 选择 Next.js。
3. 配置上述环境变量。
4. 首次可保留 `ALLOW_DEMO_LOGIN=true` 做 Preview 验收。
5. 微信与 Dify 凭据配置完成后改为 `false` 并重新部署。

每次推送分支会生成 Preview Deployment；合并到 `main` 后生成 Production Deployment。

## 验证

```bash
pnpm typecheck
pnpm lint
pnpm build
```
