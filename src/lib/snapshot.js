// 参数快照（param-snapshot XML）解析层。
// 快照由网管系统按设备参数模板导出：<Parameter> 保留模板字段并增加 Value，
// <Layout> 保留分类顺序与分列配置。本应用只读，不连接任何后端。
// 格式契约见 docs/format.md；版本号升级时同步调整这里的版本校验逻辑。

import { compareParamRows } from './paramLayout.js'

export const SNAPSHOT_FORMAT_VERSION = 3
export const SNAPSHOT_ROOT = 'ParamSnapshots'

function text(value) {
  return value == null ? '' : String(value)
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function directChildren(element, tagName) {
  return Array.from(element?.children || []).filter((child) => child.tagName === tagName)
}

function directChild(element, tagName) {
  return directChildren(element, tagName)[0] || null
}

function attr(element, name) {
  return element?.hasAttribute(name) ? element.getAttribute(name) : null
}

function boolAttr(element, name) {
  const value = text(attr(element, name)).trim().toLowerCase()
  return value === 'true' || value === '1'
}

export class SnapshotFormatError extends Error {}

function parseObjectId(value) {
  const raw = text(value).trim()
  if (!raw) return null
  if (/^0x[0-9a-f]+$/i.test(raw)) {
    const parsed = Number.parseInt(raw.slice(2), 16)
    return Number.isFinite(parsed) ? parsed : null
  }
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

function objectIdHex(objectId) {
  return objectId == null ? '' : `0x${objectId.toString(16).toUpperCase().padStart(4, '0')}`
}

function parseParameter(element) {
  const objectId = parseObjectId(attr(element, 'ObjectId'))
  if (objectId == null) {
    throw new SnapshotFormatError('快照中存在缺少有效 ObjectId 的参数')
  }
  return {
    no: 0,
    key: objectIdHex(objectId),
    objectId,
    sort: toNumberOrNull(attr(element, 'Sort')),
    name: text(attr(element, 'Name')) || '未命名参数',
    length: toNumberOrNull(attr(element, 'Length')),
    readOnly: boolAttr(element, 'ReadOnly'),
    value: text(attr(element, 'Value')),
    unit: text(attr(element, 'Unit')),
    dataType: text(attr(element, 'DataType')),
    showType: text(attr(element, 'ShowType')),
    valueExplain: text(attr(element, 'ValueExplain')),
    categoryName: text(attr(element, 'CategoryName')) || '未分类',
  }
}

function parseLayout(snapshotElement) {
  const layoutElement = directChild(snapshotElement, 'Layout')
  const categories = new Map()
  if (!layoutElement) {
    return { defaultMinRowsPerColumn: null, categories, order: [] }
  }

  const defaultMinRowsPerColumn = toNumberOrNull(attr(layoutElement, 'DefaultMinRowsPerColumn'))
  const order = []
  for (const categoryElement of directChildren(layoutElement, 'Category')) {
    const name = text(attr(categoryElement, 'Name')).trim()
    if (!name) continue
    if (!categories.has(name)) order.push(name)
    categories.set(name, {
      minRowsPerColumn: toNumberOrNull(attr(categoryElement, 'MinRowsPerColumn')),
      layoutSort: toNumberOrNull(attr(categoryElement, 'Sort')),
    })
  }
  return { defaultMinRowsPerColumn, categories, order }
}

function parseSnapshotElement(element, { exportedAt = '', fileName = '' } = {}) {
  const parametersElement = directChild(element, 'Parameters')
  if (!parametersElement) {
    throw new SnapshotFormatError('快照缺少 Parameters 节点')
  }

  const layout = parseLayout(element)
  const categoryMap = new Map()
  const appearanceOrder = []
  const seenObjectIds = new Set()
  for (const parameterElement of directChildren(parametersElement, 'Parameter')) {
    const parameter = parseParameter(parameterElement)
    if (seenObjectIds.has(parameter.objectId)) {
      throw new SnapshotFormatError(`快照中存在重复 ObjectId：${parameter.key}`)
    }
    seenObjectIds.add(parameter.objectId)
    let category = categoryMap.get(parameter.categoryName)
    if (!category) {
      category = { name: parameter.categoryName, parameters: [] }
      categoryMap.set(parameter.categoryName, category)
      appearanceOrder.push(parameter.categoryName)
    }
    category.parameters.push(parameter)
  }

  const categoryOrder = [...layout.order, ...appearanceOrder.filter((name) => !layout.categories.has(name))]
  const orderedNames = appearanceOrder
    .slice()
    .sort((left, right) => {
      const leftIndex = categoryOrder.indexOf(left)
      const rightIndex = categoryOrder.indexOf(right)
      const leftLayout = layout.categories.get(left) || {}
      const rightLayout = layout.categories.get(right) || {}
      const leftSort = leftLayout.layoutSort
      const rightSort = rightLayout.layoutSort
      if (leftSort != null && rightSort != null && leftSort !== rightSort) return leftSort - rightSort
      if (leftSort != null && rightSort == null) return -1
      if (leftSort == null && rightSort != null) return 1
      return leftIndex - rightIndex
    })

  const categories = orderedNames.map((name) => {
    const category = categoryMap.get(name)
    const layoutCategory = layout.categories.get(name) || {}
    const parameters = category.parameters
      .slice()
      .sort(compareParamRows)
      .map((parameter, index) => ({ ...parameter, no: index + 1 }))
    return {
      name,
      minRowsPerColumn: layoutCategory.minRowsPerColumn ?? layout.defaultMinRowsPerColumn,
      layoutSort: layoutCategory.layoutSort ?? null,
      parameters,
      count: parameters.length,
    }
  })

  const device = {
    name: text(attr(element, 'DeviceName')),
    typeName: text(attr(element, 'DeviceTypeName')),
    devId: attr(element, 'DevId') ?? null,
    devSubId: attr(element, 'DevSubId') ?? null,
    devType: toNumberOrNull(attr(element, 'DevType')),
    ip: text(attr(element, 'DeviceIp')),
    pollResult: text(attr(element, 'PollResult')),
    pollResultLabel: text(attr(element, 'PollResultLabel')),
    collectedAt: text(attr(element, 'CollectedAt')),
    finishedAt: text(attr(element, 'FinishedAt')),
  }
  const parameterCount = categories.reduce((sum, category) => sum + category.parameters.length, 0)
  if (!device.name && !device.devId && parameterCount === 0) {
    throw new SnapshotFormatError('快照中没有可展示的设备参数')
  }
  return {
    id: snapshotIdentity(device, exportedAt),
    fileName,
    exportedAt,
    device,
    categories,
    parameterCount,
  }
}

function parseXmlDocument(rawXml) {
  const raw = text(rawXml).trim()
  if (!raw) {
    throw new SnapshotFormatError('文件内容为空')
  }
  if (raw.startsWith('{') || raw.startsWith('[')) {
    throw new SnapshotFormatError('这是旧版 JSON 快照，已不再支持；请使用网管系统重新导出 XML 快照')
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(raw)) {
    throw new SnapshotFormatError('快照 XML 不允许包含 DOCTYPE 或 ENTITY 声明')
  }

  const document = new DOMParser().parseFromString(raw, 'application/xml')
  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new SnapshotFormatError('XML 格式有误')
  }
  const root = document.documentElement
  if (!root || root.tagName !== SNAPSHOT_ROOT) {
    throw new SnapshotFormatError(`文件不是参数快照 XML（根节点应为 ${SNAPSHOT_ROOT}）`)
  }

  const rawVersion = text(attr(root, 'FormatVersion')).trim()
  if (rawVersion !== String(SNAPSHOT_FORMAT_VERSION)) {
    if (/^\d+$/.test(rawVersion) && Number(rawVersion) > SNAPSHOT_FORMAT_VERSION) {
      throw new SnapshotFormatError(
        `快照格式版本 ${rawVersion} 高于本工具支持的版本 ${SNAPSHOT_FORMAT_VERSION}，请升级查看器`,
      )
    }
    if (/^\d+$/.test(rawVersion) && Number(rawVersion) < SNAPSHOT_FORMAT_VERSION) {
      throw new SnapshotFormatError(
        `快照格式版本 ${rawVersion} 已不再支持，请使用网管系统重新导出 XML 快照`,
      )
    }
    throw new SnapshotFormatError(
      `快照格式版本号无效，本工具仅支持 FormatVersion="${SNAPSHOT_FORMAT_VERSION}"`,
    )
  }

  const snapshotElements = directChildren(root, 'Snapshot')
  if (!snapshotElements.length) {
    throw new SnapshotFormatError('快照文件不包含设备数据')
  }
  const exportedAt = text(attr(root, 'ExportedAt'))
  return snapshotElements.map((element) => parseSnapshotElement(element, { exportedAt }))
}

// 解析网管系统导出的 XML。返回数组，单台快照也使用同一个根节点。
export function parseSnapshotsXml(rawXml, { fileName = '' } = {}) {
  return parseXmlDocument(rawXml).map((snapshot) => ({ ...snapshot, fileName }))
}

// 同一设备、同一采集时间视为同一份快照，重复导入时跳过。
// 采集时间为空时退回导出时间，避免无法判重。
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
