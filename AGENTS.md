# 协作规则

本文件适用于整个仓库。开工前先读相关代码与 `docs/format.md`。

## 边界

- 本工具只做导入、展示、导出，不写入业务系统，不实现协议编解码；除检查更新访问 GitHub Releases 外，不连接任何服务器，也不上传本地数据。
- 更新检查只能通过 `src-tauri/src/update.rs` 与 `src/lib/updates.js` 进行，界面文案不得暴露实现细节或调试信息。
- `src/lib/snapshot.js` 是快照格式的唯一解析入口；格式变化先改 `docs/format.md` 再改代码。
- 渲染进程不直接读写任意路径：保存文件走 `src/lib/fileAccess.js`，桌面端通过 `save_text_file` 命令写入用户选择的路径。
- 界面文案使用简体中文，不写实现原理、调试信息或开发者待办。

## 验证

- 代码变更：`npm run build`，涉及交互或布局时加跑 `npm run test:e2e`。
- 桌面端变更：`cargo check --manifest-path src-tauri/Cargo.toml`。
- 区分「浏览器预览通过」与「桌面安装包已验证」，未执行的不宣称已通过。

## Git

- 未经明确要求不提交、不推送、不发布版本。
- 不提交 `node_modules/`、`dist/`、`src-tauri/target/`、测试产物。
