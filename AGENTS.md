# 参数快照查看器 · 协作规则

本文件适用于整个仓库。开工前先读相关代码与 `docs/format.md`。

## 项目概览

离线桌面工具，供现场工程师导入网管系统导出的设备参数快照并核对参数。

- 技术栈：Vue 3（`<script setup>`）+ Element Plus + Vite 6；桌面壳为 Tauri 2（Rust）。
- 能力：批量导入 `param-snapshot` JSON、按分类查看与跨分类搜索、导出 CSV、启动时检查更新。
- 运行形态：浏览器预览（`npm run dev`）与桌面窗口（`npm run dev:app`），两者行为有差异，见下文。

## 目录

| 路径 | 职责 |
| --- | --- |
| `src/App.vue` | 顶栏、导入入口、拖拽、快照列表与详情布局 |
| `src/components/` | `SnapshotList.vue`、`DeviceParamPanel.vue`、`UpdateChecker.vue` |
| `src/lib/snapshot.js` | 快照格式的唯一解析入口，含版本兼容与去重标识 |
| `src/lib/csv.js` | CSV 生成（UTF-8 BOM + CRLF，Excel 直接打开不乱码） |
| `src/lib/fileAccess.js` | 文件读写：桌面端走原生保存对话框，浏览器退化为下载 |
| `src/lib/updates.js` | 更新检查与安装的前端入口 |
| `src/styles.css` | 全部样式，无 CSS 预处理器 |
| `src-tauri/src/` | `lib.rs` 命令注册、`update.rs` 更新逻辑 |
| `e2e/` | Playwright 用例与样例快照 |
| `docs/format.md` | 快照格式契约，格式的唯一权威说明 |

## 常用命令

```bash
npm install
npm run dev        # 浏览器预览，导入/导出退化为网页行为
npm run dev:app    # 桌面窗口（Tauri）
npm run build      # 只构建前端产物到 dist/
npm run build:app  # 打包当前平台安装包
npm run test:e2e   # Playwright，自动 build + preview 后执行
cargo check --manifest-path src-tauri/Cargo.toml
```

## 边界

- 本工具只做导入、展示、导出，不写入业务系统，不实现协议编解码；除检查更新访问 GitHub Releases 外，不连接任何服务器，也不上传本地数据。
- 更新检查只能通过 `src-tauri/src/update.rs` 与 `src/lib/updates.js` 进行，界面文案不得暴露实现细节或调试信息。
- `src/lib/snapshot.js` 是快照格式的唯一解析入口；格式变化先改 `docs/format.md` 再改代码。
- 渲染进程不直接读写任意路径：保存文件走 `src/lib/fileAccess.js`，桌面端通过 `save_text_file` 命令写入用户选择的路径。
- 界面文案使用简体中文，不写实现原理、调试信息或开发者待办。
- 浏览器预览不得发起网络请求；与桌面端相关的能力必须先判断 `isTauriRuntime()`。

## 代码约定

- 组件用组合式 API，状态留在 `App.vue`，子组件通过 props/emit 交互。
- 快照字段只在 `snapshot.js` 归一化，组件不直接读取原始 JSON 字段。
- 新增可选字段不升 `version`；删除、改名或改变语义必须升版本，并保留旧版本兼容。
- 依赖保持精简，新增运行时依赖前先确认无法用现有库或原生能力完成。
- 不为格式化引入新工具，沿用仓库现有的两空格缩进与无分号风格。

## 验证

- 代码变更：`npm run build`，涉及交互或布局时加跑 `npm run test:e2e`。
- 桌面端变更：`cargo check --manifest-path src-tauri/Cargo.toml`。
- 区分「浏览器预览通过」与「桌面安装包已验证」，未执行的不宣称已通过。
- 端到端用例依赖 `e2e/fixtures/` 中的样例快照，改动解析逻辑时同步确认用例仍覆盖单份与批次导入。

## Git 与发布

- 完成改动后默认合并到主分支 `main`，不推送远程仓库。
- 未经明确要求不发布版本；发布只由 `v*` 标签触发 `.github/workflows/release.yml`。
- 版本号需同时更新 `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`，三处保持一致。
- 无提前说明时，新版本使用小版本号 `v0.0.x`。
- 不提交 `node_modules/`、`dist/`、`src-tauri/target/`、测试产物。
