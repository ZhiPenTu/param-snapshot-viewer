// 文件读写：桌面端（Tauri）走原生保存对话框；浏览器里退化为下载，方便本地预览与自动化测试。

export function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function saveTextFile({ fileName, content, mime = 'text/plain', extensionLabel = '文件', extensions = ['txt'] }) {
  if (isTauriRuntime()) {
    const [{ save }, { invoke }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/api/core'),
    ])
    const path = await save({
      defaultPath: fileName,
      filters: [{ name: extensionLabel, extensions }],
    })
    if (!path) return { saved: false }
    await invoke('save_text_file', { path, content })
    return { saved: true, path }
  }

  const blob = new Blob([content], { type: `${mime};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return { saved: true, path: fileName }
}

export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'))
    reader.readAsText(file, 'utf-8')
  })
}
