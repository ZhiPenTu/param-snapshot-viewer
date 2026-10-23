// 参数快照（param-snapshot）解析层。
// 快照由网管系统在「轮询结果 - 查看参数」中导出，本应用只读，不连接任何后端。
// 格式契约见 docs/format.md；版本号升级时同步调整这里的兼容逻辑。

export const SNAPSHOT_FORMAT = 'param-snapshot'
export const SUPPORTED_VERSION = 1

function text(value) {
  return value == null ? '' : String(value)
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export class SnapshotFormatError extends Error {}

function normalizeParameter(raw, index) {
  const p = raw && typeof raw === 'object' ? raw : {}
  const key = text(p.key) || (p.objectId != null ? `0x${Number(p.objectId).toString(16).toUpperCase().padStart(4, '0')}` : '')
  return {
    no: index + 1,
    key,
    objectId: toNumberOrNull(p.objectId),
    name: text(p.name),
    length: toNumberOrNull(p.length),
    mode: text(p.mode),
    readOnly: p.readOnly === true,
    value: text(p.value),
    unit: text(p.unit),
  }
}

function normalizeCategory(raw) {
  const c = raw && typeof raw === 'object' ? raw : {}
  const parameters = Array.isArray(c.parameters) ? c.parameters.map(normalizeParameter) : []
  return {
    name: text(c.name) || '未分类',
    parameters,
    count: parameters.length,
  }
}

function normalizeDevice(raw) {
  const d = raw && typeof raw === 'object' ? raw : {}
  return {
    name: text(d.name),
    typeName: text(d.typeName),
    devId: d.devId ?? null,
    devSubId: d.devSubId ?? null,
    ip: text(d.ip),
    pollResult: text(d.pollResult),
    pollResultLabel: text(d.pollResultLabel),
    collectedAt: text(d.collectedAt),
    finishedAt: text(d.finishedAt),
  }
}

// 把原始 JSON 解析成应用内部结构。不支持的结构抛出 SnapshotFormatError。
export function parseSnapshot(raw, { fileName = '' } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SnapshotFormatError('文件内容不是有效的参数快照')
  }
  if (text(raw.format) !== SNAPSHOT_FORMAT) {
    throw new SnapshotFormatError('文件不是参数快照文件')
  }
  const version = Number(raw.version)
  if (!Number.isFinite(version) || version < 1) {
    throw new SnapshotFormatError('快照版本号无效')
  }
  if (version > SUPPORTED_VERSION) {
    throw new SnapshotFormatError(`快照版本 ${version} 高于本工具支持的版本 ${SUPPORTED_VERSION}，请升级查看器`)
  }
  const categories = Array.isArray(raw.categories) ? raw.categories.map(normalizeCategory) : []
  const device = normalizeDevice(raw.device)
  const parameterCount = categories.reduce((sum, c) => sum + c.parameters.length, 0)
  const snapshot = {
    id: snapshotIdentity(device, raw.exportedAt),
    fileName,
    exportedAt: text(raw.exportedAt),
    device,
    categories,
    parameterCount,
  }
  if (!snapshot.device.name && !snapshot.device.devId && parameterCount === 0) {
    throw new SnapshotFormatError('快照中没有可展示的设备参数')
  }
  return snapshot
}

// 同一设备、同一采集时间视为同一份快照，重复导入时跳过。
// 采集时间为空时退回导出时间，避免旧文件无法判重。
export function snapshotIdentity(device, exportedAt) {
  return [device.devId ?? '', device.name, device.ip, device.collectedAt || exportedAt].join('|')
}

export function snapshotTitle(snapshot) {
  return snapshot.device.name || (snapshot.device.devId != null ? `设备 ${snapshot.device.devId}` : '未命名设备')
}

const pad2 = (n) => String(n).padStart(2, '0')

// 后端导出的采集时间是 "2026-10-23T13:22:05"（无时区，本地时间语义）。
export function formatCollectedAt(value) {
  const raw = text(value).trim()
  if (!raw) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw)
  if (!match) return raw
  const [, y, mo, d, h, mi, s] = match
  return `${y}-${mo}-${d} ${h}:${mi}:${s ?? '00'}`
}

export function formatClock(date = new Date()) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`
    + `-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`
}

export function sanitizeFileName(name) {
  return text(name).replace(/[\\/:*?"<>|\s]+/g, '_')
}
