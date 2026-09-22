# 流星雨观测指南 / Meteor Shower Guide

中英双语静态网站：全球流星雨可见范围、最佳观测点、云量与光污染查询、城市观星技巧。

## 功能

- 登录门：首次访问设置用户名+密码（仅存于浏览器本地，WebCrypto 加盐哈希，无邮箱/手机验证）。
- 首页：下一场极大倒计时、未来 7 天/30 天预告（本地时区 + 月相干扰标注）。
- 流星雨详情：活跃期、极大时刻（UTC/本地）、辐射点与星座、逐夜最佳观测窗口、预计每小时流星数（ZHR × 辐射点高度 × 云量 × 光害）、逐时可见率图、全球可见性地图、全球最佳观测点、大湾区暗空点与建议。
- 可见性地图：按时刻着色显示辐射点地平高度；可叠加 NASA GIBS 夜间灯光（光污染）与推荐观测点。
- 天气云量：Open-Meteo 16 天逐小时预报（云量/降水/能见度/气温），自动高亮晴夜窗口，30 分钟缓存。
- 观星技巧：城市观测、大湾区实战、流星雨常识。
- PWA：可安装、离线可浏览已缓存内容。
- UI：沉浸式 Canvas 星空首屏、平滑“开始观星”入口、统一页面转场、响应式底部导航、今晚观测评分卡、观测模式与观测工具抽屉。

## 开发

```bash
npm install
npm run dev        # 本地开发
npm test           # 单元测试
npm run build      # 类型检查 + 生产构建（输出 dist/）
npm run preview    # 预览构建产物
```

## UI 设计

本项目的星空主题设计令牌、首页桌面/移动端参考画板和观测模式参考画板维护在 Figma：

[流星雨观测指南 · 星空体验 UI 规范](https://www.figma.com/design/JXTs05IBvnB9A8uPk6m8c3)

代码中的 CSS 变量与 Figma 令牌保持对应：背景、卡片、文字、金色主强调色、蓝色辅助强调色、状态色、间距和圆角。实现时优先复用现有组件和令牌，不直接引入大体积背景图片。

## 数据更新

- 流星雨参数：`src/data/showers.json`（来源：IMO 年度日历，2026 已内置）。每年 IMO 新日历发布后更新该文件。
- 推荐观测点：`src/data/dark-sites.json`（含 Bortle 等级、坐标、建议）。
- 城市坐标：`src/data/cities.ts`。
- 云量预报：Open-Meteo（免密钥，16 天逐小时）。
- 光污染图层：NASA GIBS VIIRS Black Marble（公开瓦片）。

## 部署

静态站，可直接部署到 Cloudflare Pages / Vercel / Netlify。

### Cloudflare Pages

项目已配置为通过 GitHub 自动部署到 Cloudflare Pages：

- 生产分支：`main`
- 构建命令：`npm run build`
- 输出目录：`dist`
- Node.js 依赖：按 `package-lock.json` 执行 `npm install`

Cloudflare Pages 会自动使用 `public/_redirects` 中的 SPA fallback 配置，使 React Router 的深层路径可以直接访问和刷新。当前项目不需要环境变量、Workers 或后端函数。

Netlify 配置仍保留，便于迁移验证期间回滚；自定义域名和 DNS 需要在 Cloudflare Pages 验证完成后再单独切换。

GitHub Pages 需要额外配置等价的 `404.html` 回退；当前发布目标为 Cloudflare Pages，其默认 SPA fallback 会将未匹配的导航路径交给 `/index.html`。

## 安全说明

本地账户仅作为访问门槛，凭据以加盐 PBKDF2 哈希存于浏览器 `localStorage`，**不适用于保护敏感数据**；换设备/清浏览器数据需重新注册。如需跨设备或真实安全，可将 `src/auth.ts` 平滑替换为 Supabase/Auth0 认证。
