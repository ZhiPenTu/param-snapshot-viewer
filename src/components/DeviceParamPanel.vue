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

    <div class="param-table-wrap">
      <el-table
        :data="rows"
        border
        height="100%"
        size="small"
        :row-class-name="rowClassName"
      >
        <el-table-column prop="no" label="序号" width="60" />
        <el-table-column v-if="searching" prop="categoryName" label="分类" width="170" show-overflow-tooltip />
        <el-table-column prop="name" label="参数名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="key" label="对象标识" width="100" />
        <el-table-column prop="length" label="length" width="80" />
        <el-table-column prop="mode" label="读写属性" width="110" />
        <el-table-column prop="value" label="当前值" min-width="220">
          <template #default="{ row }">
            <el-input :model-value="row.value" readonly size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" />
        <template #empty>
          <span class="table-empty">
            {{ searching ? '没有匹配的参数' : '该分类下暂无参数' }}
          </span>
        </template>
      </el-table>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { formatCollectedAt } from '../lib/snapshot.js'

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
    for (const p of category.parameters) {
      out.push({ ...p, categoryName: category.name })
    }
  }
  return out
})

const rows = computed(() => {
  if (!searching.value) {
    return props.snapshot.categories[activeIndex.value]?.parameters || []
  }
  const needle = keyword.value.trim().toLowerCase()
  return allParameters.value.filter((p) =>
    p.name.toLowerCase().includes(needle) || p.key.toLowerCase().includes(needle))
})

function selectCategory(index) {
  activeIndex.value = index
  keyword.value = ''
}

function rowClassName({ rowIndex }) {
  return rowIndex % 2 === 1 ? 'param-row-alt' : ''
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

.param-table-wrap {
  flex: 1 1 0;
  min-height: 0;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 3px;
  overflow: hidden;
}

.param-table-wrap :deep(.el-table) {
  height: 100%;
}

.param-table-wrap :deep(.el-input__wrapper) {
  background: #eeeeee;
}

.param-table-wrap :deep(.param-row-alt td.el-table__cell) {
  background: #fafbfc;
}

.table-empty {
  color: #909399;
  font-size: 13px;
}
</style>
