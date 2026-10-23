use std::fs;
use std::path::PathBuf;

/// 把导出的文本内容写入用户选择的路径（CSV 等），只写文件，不读取其他数据。
#[tauri::command]
fn save_text_file(path: String, content: String) -> Result<(), String> {
    let target = PathBuf::from(&path);
    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|err| format!("创建目录失败：{err}"))?;
        }
    }
    fs::write(&target, content.as_bytes()).map_err(|err| format!("写入文件失败：{err}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_text_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
