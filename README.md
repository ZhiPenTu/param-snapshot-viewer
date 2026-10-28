# 参数快照查看器

离线查看设备轮询参数的跨平台桌面工具，供现场施工与维护工程师使用：在网管系统里把一次轮询结果导出为参数快照文件，拿到现场后用本工具打开核对。

- 导入参数快照 JSON，支持一次导入多份，左侧列表切换设备
- 按参数分类页签查看参数名称、对象标识、length、读写属性、当前值与单位
- 可跨分类搜索参数名称或对象标识
- 导出当前设备或全部已导入快照为 CSV（UTF-8 BOM，Excel 直接打开不乱码）
- 启动后自动检测新版本，发现更新可在应用内下载并安装
- 查看参数全程离线：不连接业务系统、不上传本地数据

更新检查只访问 GitHub Releases 的版本文件，不会上传任何本机数据；浏览器预览不发起该请求。

## 使用流程

1. 在网管系统「轮询结果 → 查看参数」中点击「导出参数」，得到 `轮询参数_<设备名>_<设备ID>_<时间>.json`
2. 打开本工具，点击「导入快照」或把文件拖进窗口（支持多选）
3. 在左侧列表切换不同设备，顶部页签切换参数分类
4. 需要交付或归档时，点击「导出当前设备」或「导出全部」生成 CSV

## 安装

从 Releases 下载对应平台的安装包：macOS 为 `.dmg`，Windows 为 `.msi`／`.exe`，Linux 为 `.AppImage`／`.deb`。

安装包未做商业代码签名，首次打开时系统可能拦截：macOS 在应用上右键「打开」，Windows 在 SmartScreen 提示中点「更多信息 → 仍要运行」。

## 开发

需要 Node.js 20+；打包桌面安装包还需要 Rust 工具链（见 [Tauri 环境准备](https://tauri.app/start/prerequisites/)）。

```bash
npm install
npm run dev        # 浏览器里预览界面（导入/导出退化为网页行为）
npm run dev:app    # 启动桌面窗口（Tauri）
npm run test:e2e   # Playwright 端到端测试
npm run build      # 只构建前端产物
npm run build:app  # 打包当前平台的安装包
```

## 数据格式

工具只接受 `param-snapshot` 格式的 JSON，字段定义与版本规则见 [docs/format.md](docs/format.md)。格式变化必须升级 `version`，并在解析层保留旧版本兼容。

## 目录

```
src/            渲染进程（Vue 3 + Element Plus）
src/lib/        快照解析、CSV 生成、文件读写
src-tauri/      桌面壳（Tauri 2）
docs/           格式契约
e2e/            Playwright 用例与样例快照
```

## 许可

MIT
