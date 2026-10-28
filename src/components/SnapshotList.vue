<template>
  <aside :class="['snapshot-pane', collapsed ? 'is-collapsed' : '']">
    <div v-if="collapsed" class="pane-rail">
      <button
        class="pane-toggle"
        type="button"
        aria-label="展开快照列表"
        title="展开快照列表"
        aria-expanded="false"
        @click="toggleCollapsed"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M6 3.5 10.5 8 6 12.5" />
        </svg>
      </button>
      <div class="rail-label">
        <span>快照列表</span>
        <span class="rail-count">{{ snapshots.length }}</span>
      </div>
    </div>

    <template v-else>
      <div class="pane-head">
        <span class="pane-title">快照列表</span>
        <div class="pane-head-actions">
          <span class="pane-count">{{ snapshots.length }}</span>
          <button
            class="pane-toggle"
            type="button"
            aria-label="收起快照列表"
            title="收起快照列表"
            aria-expanded="true"
            @click="toggleCollapsed"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3.5 5.5 8 10 12.5" />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="!snapshots.length" class="pane-empty">
        <p>尚未导入快照</p>
        <p class="hint">导入后可在这里切换设备</p>
      </div>

      <ul v-else class="snapshot-list">
        <li
          v-for="item in snapshots"
          :key="item.id"
          :class="['snapshot-item', item.id === activeId ? 'is-active' : '']"
          @click="emit('select', item.id)"
        >
          <div class="item-main">
            <div class="item-title">{{ snapshotTitle(item) }}</div>
            <div class="item-meta">
              <span>设备ID：{{ item.device.devId ?? '—' }}</span>
              <span>采集：{{ formatCollectedAt(item.device.collectedAt) || '—' }}</span>
            </div>
            <div class="item-sub">
              <span class="item-badge">{{ item.parameterCount }} 个参数</span>
              <span v-if="item.device.pollResultLabel" :class="['item-status', statusClass(item)]">
                {{ item.device.pollResultLabel }}
              </span>
            </div>
          </div>
          <button class="item-remove" title="移除该快照" @click.stop="emit('remove', item.id)">移除</button>
        </li>
      </ul>
    </template>
  </aside>
</template>

<script setup>
import { ref } from 'vue'
import { formatCollectedAt, snapshotTitle } from '../lib/snapshot.js'

const STORAGE_KEY = 'param-snapshot-viewer:sidebar-collapsed'

defineProps({
  snapshots: { type: Array, default: () => [] },
  activeId: { type: String, default: null },
})

const emit = defineEmits(['select', 'remove'])

const collapsed = ref(readCollapsed())

function readCollapsed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed.value ? '1' : '0')
  } catch {}
}

function statusClass(item) {
  const result = item.device.pollResult
  if (result === 'success' || result === 'ok') return 'is-success'
  if (result === 'fail' || result === 'failed') return 'is-fail'
  return 'is-neutral'
}
</script>

<style scoped>
.snapshot-pane {
  width: 268px;
  flex: 0 0 268px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #f7f9fb;
  border-right: 1px solid #dfe4ea;
  transition: width 0.18s ease, flex-basis 0.18s ease;
}

.snapshot-pane.is-collapsed {
  width: 44px;
  flex: 0 0 44px;
}

.pane-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 10px 0 12px;
  min-height: 0;
}

.rail-label {
  writing-mode: vertical-rl;
  text-orientation: upright;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
  color: #2a4a6a;
}

.rail-count {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
  color: #7b8794;
}

.pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #e6eaef;
  font-weight: 600;
  color: #2a4a6a;
}

.pane-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pane-count {
  font-size: 12px;
  color: #7b8794;
  font-weight: 500;
}

.pane-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid #dfe4ea;
  border-radius: 3px;
  background: #ffffff;
  color: #5a6b7d;
  cursor: pointer;
  flex: 0 0 auto;
}

.pane-toggle:hover {
  background: #ecf5ff;
  border-color: #a7c8ee;
  color: #2a4a6a;
}

.pane-toggle svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pane-empty {
  padding: 18px 14px;
  color: #909399;
  font-size: 13px;
  line-height: 1.7;
}

.pane-empty .hint {
  color: #b0b6be;
  font-size: 12px;
}

.snapshot-list {
  list-style: none;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  min-height: 0;
  flex: 1 1 auto;
}

.snapshot-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 4px;
}

.snapshot-item:hover {
  background: #eef3f9;
}

.snapshot-item.is-active {
  background: #ecf5ff;
  border-color: #a7c8ee;
}

.item-main {
  min-width: 0;
  flex: 1 1 auto;
}

.item-title {
  font-size: 13px;
  font-weight: 600;
  color: #2a4a6a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 2px;
  font-size: 12px;
  color: #7b8794;
}

.item-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.item-badge {
  font-size: 11px;
  color: #5a6b7d;
  background: #e8eef5;
  border-radius: 9px;
  padding: 1px 8px;
}

.item-status {
  font-size: 11px;
  border-radius: 9px;
  padding: 1px 8px;
}

.item-status.is-success {
  background: #e8f5e9;
  color: #2e7d32;
}

.item-status.is-fail {
  background: #fdecea;
  color: #c0392b;
}

.item-status.is-neutral {
  background: #eceff1;
  color: #607d8b;
}

.item-remove {
  flex: 0 0 auto;
  border: none;
  background: transparent;
  color: #a0a8b0;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 0;
  visibility: hidden;
}

.snapshot-item:hover .item-remove {
  visibility: visible;
}

.item-remove:hover {
  color: #c0392b;
}
</style>
