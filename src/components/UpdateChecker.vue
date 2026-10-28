<template>
  <button
    :class="['plain-action', 'update-action', hasUpdate ? 'is-available' : '']"
    type="button"
    :title="`当前版本 v${currentVersion}`"
    @click="openDialog"
  >
    <span v-if="hasUpdate" class="update-dot" aria-hidden="true"></span>
    <span v-if="checking && !visible">检查中…</span>
    <span v-else-if="hasUpdate">发现新版本 v{{ updateInfo.version }}</span>
    <span v-else>检查更新</span>
  </button>

  <el-dialog
    v-model="visible"
    title="软件更新"
    width="520px"
    append-to-body
    :close-on-click-modal="!installing"
    :close-on-press-escape="!installing"
    :show-close="!installing"
    @closed="resetState"
  >
    <div class="update-body">
      <div class="version-row">
        <span>当前版本</span>
        <strong>v{{ currentVersion }}</strong>
      </div>

      <div v-if="updateInfo" class="version-row">
        <span>最新版本</span>
        <strong>v{{ updateInfo.version }}</strong>
      </div>

      <p class="update-hint">更新包从 GitHub 发布页获取，检查过程不会上传任何本地数据。</p>

      <el-alert
        v-if="status === 'latest'"
        title="当前已是最新版本"
        type="success"
        :closable="false"
        show-icon
      />

      <el-alert
        v-if="status === 'error'"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />

      <div v-if="updateInfo" class="update-card">
        <div class="update-head">
          <span class="update-version">发现新版本 v{{ updateInfo.version }}</span>
          <span v-if="updateInfo.date" class="update-date">{{ formatDate(updateInfo.date) }}</span>
        </div>
        <pre v-if="updateInfo.body" class="update-notes">{{ updateInfo.body }}</pre>
        <p v-else class="update-notes">本次更新暂未附带说明。</p>
      </div>

      <el-alert
        v-if="updateInfo && updateInfo.installBlocker"
        :title="updateInfo.installBlocker"
        type="warning"
        :closable="false"
        show-icon
      />

      <div v-if="installing" class="progress-block">
        <el-progress :percentage="percent" :stroke-width="8" />
        <span class="progress-text">{{ progressText }}</span>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <button class="plain-action" type="button" :disabled="installing" @click="visible = false">关闭</button>
        <button
          v-if="updateInfo"
          class="primary-action"
          type="button"
          :disabled="installing || checking || Boolean(updateInfo.installBlocker)"
          @click="installNow"
        >
          {{ installing ? '正在安装…' : '下载并安装' }}
        </button>
        <button
          v-else
          class="primary-action"
          type="button"
          :disabled="checking || installing"
          @click="runCheck()"
        >
          {{ checking ? '检查中…' : '检查更新' }}
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { canCheckUpdates, checkAppUpdate, installAppUpdate } from '../lib/updates.js'

const currentVersion = __APP_VERSION__

const visible = ref(false)
const checking = ref(false)
const installing = ref(false)
const updateInfo = ref(null)
const status = ref('')
const errorMessage = ref('')
const downloadedBytes = ref(0)
const totalBytes = ref(0)
let autoCheckTimer = null

const hasUpdate = computed(() => Boolean(updateInfo.value) && status.value !== 'installed')

const percent = computed(() => {
  if (!totalBytes.value) return installing.value ? 1 : 0
  return Math.min(100, Math.round((downloadedBytes.value / totalBytes.value) * 100))
})

const progressText = computed(() => {
  if (!totalBytes.value) return '正在下载更新包…'
  return `正在下载更新包 ${formatSize(downloadedBytes.value)} / ${formatSize(totalBytes.value)}`
})

function formatSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(value) {
  const date = new Date(value * 1000)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN')
}

function messageOf(err) {
  if (typeof err === 'string') return err
  return err?.message || '操作失败，请稍后再试。'
}

async function runCheck({ silent = false } = {}) {
  if (checking.value || installing.value) return
  checking.value = true
  status.value = ''
  errorMessage.value = ''
  try {
    const info = await checkAppUpdate()
    updateInfo.value = info || null
    if (!info) {
      status.value = 'latest'
    }
  } catch (err) {
    updateInfo.value = null
    status.value = 'error'
    errorMessage.value = messageOf(err)
    if (silent) {
      status.value = ''
    }
  } finally {
    checking.value = false
  }
}

function openDialog() {
  if (installing.value) return
  visible.value = true
  runCheck()
}

function onProgress(message) {
  if (message?.event === 'started') {
    totalBytes.value = message.data?.contentLength || 0
  } else if (message?.event === 'progress') {
    downloadedBytes.value += message.data?.chunkLength || 0
  } else if (message?.event === 'finished') {
    downloadedBytes.value = totalBytes.value || downloadedBytes.value
  }
}

async function installNow() {
  if (!updateInfo.value || installing.value) return
  installing.value = true
  downloadedBytes.value = 0
  totalBytes.value = 0
  status.value = ''
  errorMessage.value = ''
  try {
    await installAppUpdate(onProgress)
  } catch (err) {
    installing.value = false
    status.value = 'error'
    errorMessage.value = messageOf(err)
  }
}

function resetState() {
  if (installing.value) return
  status.value = ''
  errorMessage.value = ''
  downloadedBytes.value = 0
  totalBytes.value = 0
}

onMounted(() => {
  if (!canCheckUpdates()) return
  autoCheckTimer = setTimeout(() => runCheck({ silent: true }), 1500)
})

onBeforeUnmount(() => {
  if (autoCheckTimer) clearTimeout(autoCheckTimer)
})
</script>

<style scoped>
.update-action {
  gap: 6px;
}

.update-action.is-available {
  background: #ecf5ff;
  border-color: #1e5fa8;
  color: #1e5fa8;
  font-weight: 600;
}

.update-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e6a23c;
}

.update-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.version-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6b7785;
}

.version-row strong {
  color: #2a4a6a;
}

.update-hint {
  margin: 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

.update-card {
  border: 1px solid #dfe4ea;
  border-radius: 4px;
  background: #f7f9fb;
  padding: 10px 12px;
}

.update-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.update-version {
  font-size: 13px;
  font-weight: 600;
  color: #2a4a6a;
}

.update-date {
  font-size: 12px;
  color: #909399;
}

.update-notes {
  margin: 8px 0 0;
  max-height: 200px;
  overflow-y: auto;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.7;
  color: #5a6b7d;
  white-space: pre-wrap;
  word-break: break-word;
}

.progress-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-text {
  font-size: 12px;
  color: #7b8794;
  text-align: right;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
