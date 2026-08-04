# AI 面试小助手 (Interview Assistant)

> Phase 1 Demo · 单用户本地版 · 数据存储在 localStorage

帮助求职者完整记录面试过程、复盘提升，验证「上传资料 → 识别 → 记录 → 复盘」核心闭环。

## ✨ Phase 1 功能

| 模块 | 说明 |
|------|------|
| 首页看板 | 统计卡片 + 近期面试列表 + 快捷入口 |
| 简历与岗位管理 | 岗位录入（公司/岗位/JD/阶段/状态）+ 列表 + 编辑/删除 |
| 面试记录 | 手动新建 + 上传文字记录（txt/docx/pdf）+ 列表筛选 + 详情页 |
| 面试复盘 | 7 区块表单（逐题评分/5 维度/亮点/改进项/行动/方向）+ 复盘详情 |
| 面试准备 | 骨架页（AI 问答 Phase 2 上线） |
| 数据与设置 | 导出 JSON + 清空数据 |

## 🚀 快速开始

### 方式一：直接打开（无需安装任何环境）

双击仓库根目录的 `index.html` 或 `AI面试小助手.html`，在浏览器中即可使用，所有代码已内联进单个 HTML 文件。

### 方式二：开发模式（需要 Node.js 18+）

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器 http://localhost:3000/dev.html
npm run build    # 构建单文件产物到 dist/
```

## 🛠 技术栈

- **框架**：React 18 + Vite 5
- **样式**：Tailwind CSS 3
- **路由**：React Router v6 (HashRouter)
- **文件解析**：mammoth.js (docx) · pdf.js (pdf)
- **数据存储**：localStorage（key: `ia_jobs` / `ia_interviews` / `ia_reviews`）
- **打包**：vite-plugin-singlefile（生成单 HTML 文件，双击即可打开）

## 📁 项目结构

```
interview assistant/
├── src/
│   ├── components/      # 通用组件 (Sidebar, TopBar, Modal, Toast, UploadModal 等)
│   ├── pages/            # 7 个页面
│   ├── utils/            # storage.js / fileParser.js
│   ├── App.jsx           # 路由配置
│   ├── main.jsx          # 入口 (HashRouter)
│   └── index.css         # 全局样式 + 设计规范
├── dev.html              # Vite 开发入口
├── index.html            # 构建产物（双击可打开）
├── AI面试小助手.html       # 同 index.html（便捷入口）
├── vite.config.js        # Vite 配置 + singlefile 插件
├── tailwind.config.js    # 设计规范（颜色/字体/阴影）
└── package.json
```

## 🎨 设计规范

| 用途 | 色值 |
|------|------|
| 品牌主色 | `#4F6EF7` |
| 成功绿 | `#52C41A` |
| 警告橙 | `#FAAD14` |
| 危险红 | `#FF4D4F` |
| 侧边导航 | `#1E2634` |
| 内容区背景 | `#F5F7FA` |

## 📌 Phase 2 规划

- AI 智能问答 / 问题预测 / 复盘自动生成
- 视频上传 + 语音转文字
- 简历上传与解析
- 用户登录系统
- 移动端适配

## 📄 许可证

MIT
