import { DEVICE_PARAM_LAYOUT } from '../config/deviceParamLayout.js'

const DEFAULT_MIN_ROWS = 8

function positiveInt(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

export function resolveMinRowsPerColumn({ devType, categoryName, minRowsPerColumn } = {}) {
  const explicit = positiveInt(minRowsPerColumn, null)
  if (explicit != null) return explicit

  const config = DEVICE_PARAM_LAYOUT || {}
  const fallback = positiveInt(config.defaultMinRowsPerColumn, DEFAULT_MIN_ROWS)
  const category = String(categoryName || '')
  if (!category) return fallback

  const byDeviceType = config.byDeviceType || {}
  const deviceConfig = byDeviceType[String(devType ?? '')] || {}
  if (deviceConfig[category] != null) {
    return positiveInt(deviceConfig[category], fallback)
  }
  const byCategory = config.byCategory || {}
  return positiveInt(byCategory[category], fallback)
}

export function compareParamRows(a, b) {
  const aSort = a?.sort == null || a?.sort === '' ? null : Number(a.sort)
  const bSort = b?.sort == null || b?.sort === '' ? null : Number(b.sort)
  const aHasSort = aSort != null && Number.isFinite(aSort)
  const bHasSort = bSort != null && Number.isFinite(bSort)
  if (aHasSort && bHasSort && aSort !== bSort) return aSort - bSort
  if (aHasSort && !bHasSort) return -1
  if (!aHasSort && bHasSort) return 1
  const aId = Number(a?.objectId)
  const bId = Number(b?.objectId)
  return (Number.isFinite(aId) ? aId : 0) - (Number.isFinite(bId) ? bId : 0)
}

export function buildParamColumns(rows, minRowsPerColumn) {
  const list = Array.isArray(rows) ? rows : []
  if (!list.length) return []
  const minRows = positiveInt(minRowsPerColumn, DEFAULT_MIN_ROWS)
  const columns = []
  for (let offset = 0; offset < list.length; offset += minRows) {
    columns.push(list.slice(offset, offset + minRows))
  }
  return columns
}
