# 摸了么 MoYu - 发布配置指南

## 一、绑定自定义域名 (chillworks.ai)

### 步骤 1: 在 Manus 中配置域名

1. 点击项目卡片右上角的 **Dashboard** 按钮
2. 在左侧导航中选择 **Settings → Domains**
3. 在 "Custom Domain" 区域输入: `chillworks.ai`
4. 点击 **Add Domain** 按钮
5. 系统会显示需要配置的 DNS 记录

### 步骤 2: 在域名注册商配置 DNS

登录您的域名注册商（如 Cloudflare、GoDaddy、Namecheap 等），添加以下 DNS 记录：

| 类型 | 名称 | 值 | TTL |
|------|------|-----|-----|
| CNAME | @ | `<Manus 提供的值>` | Auto |
| CNAME | www | `<Manus 提供的值>` | Auto |

**注意**: 如果您使用 Cloudflare，建议将代理状态设为 "DNS only"（灰色云朵），避免双重代理导致的问题。

### 步骤 3: 验证域名

1. DNS 记录生效后（通常 5-30 分钟），返回 Manus Dashboard
2. 点击 **Verify** 按钮验证域名
3. 验证成功后，SSL 证书会自动配置

---

## 二、配置 Google Search Console

### 步骤 1: 添加网站资源

1. 访问 [Google Search Console](https://search.google.com/search-console)
2. 点击左上角的下拉菜单 → **添加资源**
3. 选择 **网址前缀** 类型
4. 输入: `https://chillworks.ai`
5. 点击 **继续**

### 步骤 2: 验证所有权

推荐使用 **HTML 标签验证**（最简单）：

1. 复制 Google 提供的 meta 标签，类似：
   ```html
   <meta name="google-site-verification" content="xxxxxx" />
   ```

2. 将此标签添加到 `client/index.html` 的 `<head>` 部分

3. 保存并发布更新

4. 返回 Google Search Console 点击 **验证**

### 步骤 3: 提交 Sitemap

1. 在 Search Console 左侧菜单选择 **站点地图**
2. 在 "添加新的站点地图" 输入: `sitemap.xml`
3. 点击 **提交**
4. 等待 Google 抓取（通常 1-3 天）

### 步骤 4: 请求索引

1. 在顶部搜索框输入您的首页 URL
2. 点击 **请求编入索引**
3. 对重要页面重复此操作：
   - `https://chillworks.ai/`
   - `https://chillworks.ai/membership`
   - `https://chillworks.ai/invite`

---

## 三、SEO 检查清单

域名绑定后，请确认以下配置：

- [x] OG 分享图已上传到 CDN
- [x] sitemap.xml 已配置正确的域名
- [x] robots.txt 允许搜索引擎抓取
- [x] JSON-LD 结构化数据已添加
- [ ] Google Search Console 已验证
- [ ] Sitemap 已提交
- [ ] 首页已请求索引

---

## 四、社交媒体分享测试

配置完成后，使用以下工具测试分享效果：

1. **Facebook 分享调试器**: https://developers.facebook.com/tools/debug/
2. **Twitter 卡片验证器**: https://cards-dev.twitter.com/validator
3. **LinkedIn 帖子检查器**: https://www.linkedin.com/post-inspector/

输入 `https://chillworks.ai` 检查预览效果。

---

## 五、常见问题

### Q: DNS 记录多久生效？
A: 通常 5-30 分钟，最长可能需要 48 小时。

### Q: SSL 证书如何配置？
A: Manus 会自动为绑定的域名配置 Let's Encrypt SSL 证书，无需手动操作。

### Q: 如何更换域名？
A: 在 Settings → Domains 中删除旧域名，添加新域名，然后更新 DNS 记录。

---

**配置完成后，您的应用将可以通过 https://chillworks.ai 访问！**
