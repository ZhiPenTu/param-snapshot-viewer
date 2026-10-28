// 更新检查：仅在桌面端走 Tauri，更新包从 GitHub Releases 下载，浏览器预览不做任何网络请求。

import { isTauriRuntime } from './fileAccess.js'

export function canCheckUpdates() {
  return isTauriRuntime()
}

export async function checkAppUpdate() {
  if (!isTauriRuntime()) {
    throw new Error('当前是浏览器预览，无法检查更新，请在安装后的桌面版中使用。')
  }
  const { invoke } = await import('@tauri-apps/api/core')
  return await invoke('check_app_update')
}

export async function installAppUpdate(onProgress) {
  if (!isTauriRuntime()) {
    throw new Error('当前是浏览器预览，无法安装更新，请在安装后的桌面版中使用。')
  }
  const { invoke, Channel } = await import('@tauri-apps/api/core')
  const channel = new Channel()
  if (typeof onProgress === 'function') {
    channel.onmessage = onProgress
  }
  return await invoke('install_app_update', { onEvent: channel })
}
