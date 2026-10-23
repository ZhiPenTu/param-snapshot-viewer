<template>
  <div class="app-shell">
    <header class="app-toolbar">
      <div class="brand">
        <span class="brand-name">参数快照查看器</span>
        <span class="brand-sub">离线查看设备轮询参数</span>
      </div>
      <div class="toolbar-actions">
        <button class="primary-action" @click="pickFiles">导入快照</button>
        <button class="plain-action" :disabled="!current" @click="exportCurrentCsv">导出当前设备</button>
        <button class="plain-action" :disabled="!snapshots.length" @click="exportAllCsv">导出全部</button>
      </div>
      <span class="toolbar-meta">已导入 {{ snapshots.length }} 份</span>
    </header>

    <main class="app-body">
      <SnapshotList
        :snapshots="snapshots"
        :active-id="activeId"
        @select="activeId = $event"
        @remove="removeSnapshot"
      />

      <section
        :class="['detail-pane', dragActive ? 'is-dragging' : '']"
        @dragover.prevent="dragActive = true"
        @dragleave.prevent="dragActive = false"
        @drop.prevent="onDrop"
      >
        <DeviceParamPanel v-if="current" :snapshot="current" />

        <div v-else class="empty-state">
          <div class="empty-icon">JSON</div>
          <p class="empty-title">把网管系统导出的参数快照拖到这里</p>
          <p class="empty-hint">也可以点击下方按钮选择文件，支持一次导入多份</p>
          <button class="primary-action" @click="pickFiles">选择文件导入</button>
          <p class="empty-foot">快照文件由网管系统「轮询结果 - 查看参数」导出</p>
        </div>

        <div v-if="dragActive" class="drop-mask">松开即可导入快照</div>
      </section>
    </main>

    <input
      ref="fileInput"
      class="file-input"
      type="file"
      accept=".json,application/json"
      multiple
      @change="onFileInputChange"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import SnapshotList from './components/SnapshotList.vue'
import DeviceParamPanel from './components/DeviceParamPanel.vue'
import { readTextFile, saveTextFile } from './lib/fileAccess.js'
import { buildSnapshotCsv } from './lib/csv.js'
import {
  formatClock,
  parseSnapshot,
  sanitizeFileName,
  snapshotTitle,
} from './lib/snapshot.js'

const snapshots = ref([])
const activeId = ref(null)
const dragActive = ref(false)
const fileInput = ref(null)

const current = computed(() => snapshots.value.find((s) => s.id === activeId.value) || null)

function pickFiles() {
  fileInput.value?.click()
}

function onFileInputChange(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  importFiles(files)
}

function onDrop(event) {
  dragActive.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  if (!files.length) return
  importFiles(files)
}

async function importFiles(files) {
  if (!files.length) return
  let added = 0
  let duplicated = 0
  const failures = []
  let lastAddedId = null

  for (const file of files) {
    if (!/\.json$/i.test(file.name)) {
      failures.push(`${file.name}：不是 JSON 文件`)
      continue
    }
    try {
      const parsed = JSON.parse(await readTextFile(file))
      const items = Array.isArray(parsed) ? parsed : [parsed]
      if (!items.length) {
        failures.push(`${file.name}：文件内容为空`)
        continue
      }
      for (const item of items) {
        const snapshot = parseSnapshot(item, { fileName: file.name })
        if (snapshots.value.some((s) => s.id === snapshot.id)) {
          duplicated += 1
          continue
        }
        snapshots.value.push(snapshot)
        added += 1
        lastAddedId = snapshot.id
      }
    } catch (err) {
      const reason = err instanceof SyntaxError ? 'JSON 格式有误' : (err?.message || '解析失败')
      failures.push(`${file.name}：${reason}`)
    }
  }

  if (added > 0 && !activeId.value) {
    activeId.value = lastAddedId
  }

  if (failures.length) {
    ElMessage.error(`导入失败 ${failures.length} 份，${failures[0]}`)
  }
  if (added > 0) {
    ElMessage.success(`成功导入 ${added} 份快照${duplicated > 0 ? `，跳过 ${duplicated} 份重复文件` : ''}`)
  } else if (!failures.length && duplicated > 0) {
    ElMessage.warning('这些快照已经导入过了')
  }
}

function removeSnapshot(id) {
  const index = snapshots.value.findIndex((s) => s.id === id)
  if (index === -1) return
  snapshots.value.splice(index, 1)
  if (activeId.value === id) {
    activeId.value = snapshots.value[index]?.id || snapshots.value[index - 1]?.id || null
  }
}

async function exportCurrentCsv() {
  if (!current.value) return
  const snapshot = current.value
  const csv = buildSnapshotCsv([snapshot])
  const fileName = `参数快照_${sanitizeFileName(snapshotTitle(snapshot))}`
    + `${snapshot.device.devId != null ? `_${snapshot.device.devId}` : ''}_${formatClock()}.csv`
  await saveCsv(fileName, csv)
}

async function exportAllCsv() {
  if (!snapshots.value.length) return
  const csv = buildSnapshotCsv(snapshots.value)
  await saveCsv(`参数快照_全部_${formatClock()}.csv`, csv)
}

async function saveCsv(fileName, content) {
  try {
    const result = await saveTextFile({
      fileName,
      content,
      mime: 'text/csv',
      extensionLabel: 'CSV 表格',
      extensions: ['csv'],
    })
    if (result.saved) {
      ElMessage.success('已导出 CSV 文件')
    }
  } catch (err) {
    ElMessage.error(`导出失败：${err?.message || err}`)
  }
}

function onKeydown(event) {
  const meta = event.metaKey || event.ctrlKey
  if (meta && event.key.toLowerCase() === 'o') {
    event.preventDefault()
    pickFiles()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #eef1f5;
}

.app-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f2f5f9 100%);
  border-bottom: 1px solid #d8dee6;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: #1e3a5f;
}

.brand-sub {
  font-size: 12px;
  color: #8894a3;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.toolbar-meta {
  font-size: 12px;
  color: #7b8794;
  min-width: 96px;
  text-align: right;
}

.app-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  padding: 8px;
  gap: 8px;
}

.detail-pane {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  padding: 8px;
  background: #ffffff;
  border: 1px solid #dfe4ea;
  border-radius: 4px;
}

.detail-pane.is-dragging {
  border-color: #409eff;
  box-shadow: inset 0 0 0 2px rgba(64, 158, 255, 0.25);
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #6b7785;
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background: #eef3f9;
  color: #7fa4cc;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 1px;
}

.empty-title {
  margin: 4px 0 0;
  font-size: 15px;
  font-weight: 600;
  color: #2a4a6a;
}

.empty-hint {
  margin: 0;
  font-size: 13px;
  color: #8b96a4;
}

.empty-foot {
  margin-top: 10px;
  font-size: 12px;
  color: #a3adb8;
}

.drop-mask {
  position: absolute;
  inset: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(236, 245, 255, 0.92);
  border: 2px dashed #409eff;
  border-radius: 4px;
  color: #1e5fa8;
  font-size: 15px;
  font-weight: 600;
  pointer-events: none;
}

.file-input {
  display: none;
}
</style>
