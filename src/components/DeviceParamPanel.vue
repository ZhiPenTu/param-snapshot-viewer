<template>
  <section class="device-panel">
    <div class="device-header-strip">
      <span class="header-name">{{ snapshot.device.name || '未命名设备' }}</span>
      <span class="header-type">{{ snapshot.device.typeName || '—' }}</span>
      <span class="header-id">设备ID:{{ snapshot.device.devId ?? '—' }}</span>
      <span class="header-ip">设备IP:{{ snapshot.device.ip || '—' }}</span>
      <div class="header-right-meta">
        <span v-if="snapshot.device.pollResultLabel" :class="['result-pill', statusClass]">
          轮询状态：{{ snapshot.device.pollResultLabel }}
        </span>
        <span v-if="snapshot.device.collectedAt" class="time-meta">
          采集时间：{{ formatCollectedAt(snapshot.device.collectedAt) }}
        </span>
      </div>
    </div>

    <div class="param-tab-row">
      <div class="param-tabs">
        <button
          v-for="(cat, index) in snapshot.categories"
          :key="`${cat.name}-${index}`"
          :class="['param-tab', !searching && index === activeIndex ? 'active' : '']"
          @click="selectCategory(index)"
        >
          {{ cat.name }}
          <span class="group-count">{{ cat.count }}</span>
        </button>
      </div>
      <el-input
        v-model="keyword"
        class="param-search"
        size="small"
        clearable
        placeholder="搜索参数名称 / 对象标识"
      />
    </div>

    <div v-if="searching" class="search-summary">
      在全部 {{ totalParameters }} 个参数中命中 {{ rows.length }} 个
    </div>

    <div class="param-card-wrap">
      <div v-if="paramColumns.length" class="param-card-grid">
        <div
          v-for="(column, columnIndex) in paramColumns"
          :key="columnIndex"
          class="param-card-column"
        >
          <div v-for="row in column" :key="row.key" class="param-card">
            <div class="param-card-name-cell">
              <el-tooltip placement="top" effect="dark">
                <template #content>
                  <div class="param-tip">
                    <div class="param-tip-name">{{ row.name }}</div>
                    <div>对象标识：{{ row.key }}</div>
                    <div>length：{{ row.length ?? '—' }}</div>
                    <div>读写属性：{{ row.readOnly ? '只读' : '可读可设置' }}</div>
                  </div>
                </template>
                <span class="param-card-name">{{ row.name }}</span>
              </el-tooltip>
              <span v-if="searching" class="param-card-category">{{ row.categoryName }}</span>
            </div>
            <div class="param-card-value">
              <el-input :model-value="row.value" readonly size="small" />
              <span class="param-card-unit" :title="row.unit">{{ row.unit }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="card-empty">
        {{ searching ? '没有匹配的参数' : '该分类下暂无参数' }}
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { formatCollectedAt } from '../lib/snapshot.js'
import {
  buildParamColumns,
  compareParamRows,
  resolveMinRowsPerColumn,
} from '../lib/paramLayout.js'

const props = defineProps({
  snapshot: { type: Object, required: true },
})

const activeIndex = ref(0)
const keyword = ref('')

watch(() => props.snapshot?.id, () => {
  activeIndex.value = 0
  keyword.value = ''
})

const totalParameters = computed(() => props.snapshot.parameterCount)

const statusClass = computed(() => {
  const result = props.snapshot.device.pollResult
  if (result === 'success' || result === 'ok') return 'is-success'
  if (result === 'fail' || result === 'failed') return 'is-fail'
  return 'is-neutral'
})

const searching = computed(() => keyword.value.trim().length > 0)

const allParameters = computed(() => {
  const out = []
  for (const category of props.snapshot.categories) {
    for (const p of category.parameters.slice().sort(compareParamRows)) {
      out.push({ ...p, categoryName: category.name })
    }
  }
  return out
})

const rows = computed(() => {
  if (!searching.value) {
    const parameters = props.snapshot.categories[activeIndex.value]?.parameters || []
    return parameters.slice().sort(compareParamRows)
  }
  const needle = keyword.value.trim().toLowerCase()
  return allParameters.value.filter((p) =>
    p.name.toLowerCase().includes(needle) || p.key.toLowerCase().includes(needle))
})

const paramColumns = computed(() => {
  if (!rows.value.length) return []
  const activeCategory = props.snapshot.categories[activeIndex.value]
  const categoryName = searching.value ? '' : activeCategory?.name
  const configured = searching.value ? null : activeCategory?.minRowsPerColumn
  const minRows = configured ?? resolveMinRowsPerColumn({
    devType: props.snapshot.device.devType,
    categoryName,
  })
  return buildParamColumns(rows.value, minRows)
})

function selectCategory(index) {
  activeIndex.value = index
  keyword.value = ''
}
</script>

<style scoped>
.device-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
}

.device-header-strip {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 14px;
  background: linear-gradient(180deg, #4cb24a 0%, #3ea23c 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 3px;
  flex-shrink: 0;
}

.header-name {
  font-size: 15px;
}

.header-type {
  font-weight: 500;
}

.header-id,
.header-ip {
  font-weight: 500;
}

.header-right-meta {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.result-pill {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.3);
}

.result-pill.is-fail {
  background: #f56c6c;
}

.result-pill.is-neutral {
  background: rgba(255, 255, 255, 0.18);
}

.time-meta {
  font-size: 12px;
  font-weight: normal;
  opacity: 0.95;
}

.param-tab-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 2px 0 5px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.param-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  flex: 1 1 auto;
}

.param-tab {
  padding: 4px 10px;
  font-size: 13px;
  background: #f4f4f5;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  color: #606266;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.param-tab .group-count {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.param-tab.active {
  background: #ecf5ff;
  color: #409eff;
  border-color: #409eff;
  font-weight: 600;
}

.param-tab.active .group-count {
  color: #409eff;
}

.param-tab:hover:not(.active) {
  color: #409eff;
}

.param-search {
  width: 220px;
  flex: 0 0 220px;
}

.search-summary {
  font-size: 12px;
  color: #7b8794;
  padding: 0 2px;
  flex-shrink: 0;
}

.param-card-wrap {
  flex: 1 1 0;
  min-height: 0;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 3px;
  overflow-x: auto;
  overflow-y: auto;
  padding: 2px;
}
.param-card-wrap::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.param-card-wrap::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 5px;
}
.param-card-wrap::-webkit-scrollbar-track {
  background: transparent;
}
.param-card-wrap::-webkit-scrollbar:vertical {
  display: none;
}

.param-card-grid {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: max-content;
  min-width: 100%;
}

.param-card-column {
  display: flex;
  flex: 1 0 340px;
  flex-direction: column;
  gap: 4px;
  min-width: 340px;
}

.param-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 260px);
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 30px;
  padding: 1px 10px;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 3px;
}

.param-card:hover {
  border-color: #c6e2ff;
  box-shadow: 0 1px 4px rgba(64, 158, 255, 0.12);
}

.param-card-name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.param-card-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #303133;
  cursor: default;
}

.param-card-category {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 8px;
  background: #f2f6fa;
  color: #7b8794;
  font-size: 11px;
}

.param-card-value {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.param-card-value :deep(.el-input) {
  flex: 1 1 0;
  width: 100%;
  min-width: 0;
}

.param-card-value :deep(.el-input__wrapper) {
  background: #eeeeee;
}

.param-card-unit {
  flex: 0 0 40px;
  width: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #909399;
}

.param-tip {
  line-height: 1.6;
}

.param-tip-name {
  font-weight: 600;
  margin-bottom: 2px;
}

.card-empty {
  padding: 18px 12px;
  color: #909399;
  font-size: 13px;
}
</style>
