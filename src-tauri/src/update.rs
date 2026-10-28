use std::sync::Mutex;

use serde::Serialize;
use tauri::{ipc::Channel, AppHandle, State};
use tauri_plugin_updater::{Update, UpdaterExt};

/// 检查更新时命中的版本，安装时直接复用，避免重复请求。
#[derive(Default)]
pub struct PendingUpdate(pub Mutex<Option<Update>>);

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data")]
pub enum UpdateProgress {
    #[serde(rename_all = "camelCase")]
    Started { content_length: Option<u64> },
    #[serde(rename_all = "camelCase")]
    Progress { chunk_length: usize },
    Finished,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMetadata {
    pub version: String,
    pub current_version: String,
    pub date: Option<i64>,
    pub body: Option<String>,
    pub install_blocker: Option<String>,
}

fn friendly_update_error(message: String) -> String {
    let lower = message.to_lowercase();
    if lower.contains("404") || lower.contains("valid release json") {
        return "暂时没有可用的更新信息，请稍后再试。".to_string();
    }
    if lower.contains("error sending request")
        || lower.contains("timed out")
        || lower.contains("dns")
        || lower.contains("connect")
    {
        return "无法连接更新服务器，请检查网络后重试。".to_string();
    }
    "检查更新失败，请稍后再试。".to_string()
}

fn friendly_install_error(message: String) -> String {
    let lower = message.to_lowercase();
    if lower.contains("signature") {
        return "更新包校验未通过，已停止安装，请从发布页重新下载安装包。".to_string();
    }
    if lower.contains("permission denied")
        || lower.contains("operation not permitted")
        || lower.contains("os error 1")
        || lower.contains("os error 13")
    {
        return "没有权限替换当前应用，请把应用移动到「应用程序」文件夹后重试。".to_string();
    }
    if lower.contains("no such file or directory") || lower.contains("os error 2") {
        return "找不到当前应用所在位置，请把应用移动到「应用程序」文件夹后重新打开。".to_string();
    }
    if lower.contains("cross-device link") || lower.contains("os error 18") {
        return "更新文件与当前应用不在同一磁盘，请把应用移动到「应用程序」文件夹后重试。".to_string();
    }
    if lower.contains("error sending request")
        || lower.contains("timed out")
        || lower.contains("dns")
        || lower.contains("connect")
    {
        return "下载更新失败，请检查网络后重试。".to_string();
    }
    "安装更新失败，请稍后再试。".to_string()
}

#[cfg(target_os = "macos")]
fn install_blocker() -> Option<String> {
    let executable = std::env::current_exe().ok()?;
    let bundle = executable
        .parent()
        .and_then(|macos_dir| macos_dir.parent())
        .and_then(|contents_dir| contents_dir.parent())
        .filter(|path| path.extension().and_then(|value| value.to_str()) == Some("app"))?;
    let display = bundle.to_string_lossy();
    let temporary = display.starts_with("/Volumes/")
        || display.starts_with("/private/var/folders/")
        || display.starts_with("/var/folders/")
        || display.starts_with("/private/tmp/")
        || display.starts_with("/tmp/");
    if temporary {
        return Some(
            "当前应用运行在磁盘映像或临时目录中，无法自动更新。请先把应用拖入「应用程序」文件夹，重新打开后再检查更新。"
                .to_string(),
        );
    }
    None
}

#[cfg(not(target_os = "macos"))]
fn install_blocker() -> Option<String> {
    None
}

#[tauri::command]
pub async fn check_app_update(
    app: AppHandle,
    pending: State<'_, PendingUpdate>,
) -> Result<Option<UpdateMetadata>, String> {
    let update = app
        .updater()
        .map_err(|err| friendly_update_error(err.to_string()))?
        .check()
        .await
        .map_err(|err| friendly_update_error(err.to_string()))?;

    let metadata = update.as_ref().map(|update| UpdateMetadata {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
        date: update.date.map(|date| date.unix_timestamp()),
        body: update.body.clone(),
        install_blocker: install_blocker(),
    });

    *pending.0.lock().unwrap() = update;
    Ok(metadata)
}

#[tauri::command]
pub async fn install_app_update(
    app: AppHandle,
    pending: State<'_, PendingUpdate>,
    on_event: Channel<UpdateProgress>,
) -> Result<(), String> {
    if let Some(reason) = install_blocker() {
        return Err(reason);
    }

    let update = pending.0.lock().unwrap().take();
    let Some(update) = update else {
        return Err("请先检查更新，确认有新版本后再安装。".to_string());
    };

    let mut started = false;
    update
        .download_and_install(
            |chunk_length, content_length| {
                if !started {
                    let _ = on_event.send(UpdateProgress::Started { content_length });
                    started = true;
                }
                let _ = on_event.send(UpdateProgress::Progress { chunk_length });
            },
            || {
                let _ = on_event.send(UpdateProgress::Finished);
            },
        )
        .await
        .map_err(|err| {
            eprintln!("安装更新失败：{err}");
            friendly_install_error(err.to_string())
        })?;

    app.restart();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_release_error_is_friendly() {
        let message = friendly_update_error("HTTP status client error (404 Not Found)".to_string());
        assert!(message.contains("更新信息"));
    }

    #[test]
    fn network_error_mentions_connection() {
        let message = friendly_update_error("error sending request for url".to_string());
        assert!(message.contains("网络"));
    }

    #[test]
    fn unknown_error_does_not_leak_internals() {
        let message = friendly_update_error("some internal decoder panic".to_string());
        assert!(!message.contains("decoder"));
    }

    #[test]
    fn permission_error_is_actionable() {
        let message = friendly_install_error("Permission denied (os error 13)".to_string());
        assert!(message.contains("应用程序"));
    }

    #[test]
    fn signature_error_points_to_release_page() {
        let message = friendly_install_error("signature verification failed".to_string());
        assert!(message.contains("校验"));
    }
}
