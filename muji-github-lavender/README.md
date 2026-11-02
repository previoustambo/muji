# 暮记 · 晚餐打卡

淡紫色主题的个人晚餐记录 PWA。可以通过 Safari 添加到 iPhone 主屏幕，支持离线记录。

## 功能

- 一键记录「未吃晚饭 / 已吃晚饭」。
- 日历查看、历史补记、修改、清除；未来日期不可记录。
- 累计次数、本月统计、连续与最长连续记录、近六个月趋势和记录分布。
- JSON 备份导出和确认导入，设备本地保存。
- 淡紫色界面、配套主屏幕图标、适配 iPhone 的底部导航。

连续记录按每天有无记录计算，两种晚餐状态都计入。未吃晚饭的次数独立统计；未记录日期不进入比例分母。

## 用 GitHub Pages 发布

不需要 Netlify、付费域名或服务器。GitHub 免费账号请使用公开仓库。

1. 在自己的 GitHub 账号中创建一个名为 `muji` 的 **Public** 仓库。
2. 将本项目的文件上传到仓库根目录，确保根目录可以看到 `index.html`，不要再嵌套一层 `muji-github` 或 `dist` 文件夹。
3. 打开仓库 **Settings → Pages**。
4. 在 **Build and deployment → Source** 选择 **Deploy from a branch**。
5. 选择 **main** 分支和 **/(root)**，点击 **Save**。
6. 等 GitHub Pages 的部署成功后，从设置页的 **Visit site** 打开真实发布地址。地址通常是 `https://你的用户名.github.io/muji/`。
7. 在 iPhone 上用 Safari 测试，再选择 **分享 → 添加到主屏幕**。

项目包含 `.nojekyll`，无构建依赖。所有资源路径、PWA 启动地址及 service worker 都支持仓库子路径。可用性仍需在实际手机网络下验证。

官方文档：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 数据与迁移

- 不需要登录即可打卡，记录只存放在当前设备、浏览器和网站的数据空间中，未上传 GitHub。
- GitHub Pages 的免费发布方式会公开源码；不应把个人打卡备份上传到仓库。
- 如果旧地址已有记录，请在旧版「我的 → 导出备份」，再到新地址「我的 → 导入备份」。不同域名不会自动共享记录。
- 主屏幕 App 与 Safari 可能使用不同的数据空间，建议从固定入口持续使用。
- 定期导出备份。清理网站数据或删除网页 App 可能导致记录丢失。
- 本版为网页 App，不含原生 WidgetKit 桌面小组件。

## 本地开发

需要 Node.js 20 或以上版本，不需要安装依赖。

```powershell
node --test tests/*.test.mjs
node preview-server.mjs
```

打开 `http://127.0.0.1:4175/muji/` 可检查与 GitHub Pages 一致的子路径。

修改静态资源后，请同时更新 `sw.js` 的缓存版本，使已安装的 App 获得新资源。
