// CSV 导出：UTF-8 BOM + CRLF，保证 Excel 直接打开不乱码。
import { formatCollectedAt, snapshotTitle } from './snapshot.js'

const HEADER = ['设备名称', '设备ID', '采集时间', '分类', '序号', '参数名称', '对象标识', 'length', '读写属性', '当前值', '单位']

function csvEscape(value) {
  const s = value == null ? '' : String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildSnapshotCsv(snapshots) {
  const lines = [HEADER.join(',')]
  for (const snapshot of snapshots) {
    const deviceName = snapshotTitle(snapshot)
    const devId = snapshot.device.devId ?? ''
    const collectedAt = formatCollectedAt(snapshot.device.collectedAt)
    for (const category of snapshot.categories) {
      for (const p of category.parameters) {
        lines.push([
          deviceName,
          devId,
          collectedAt,
          category.name,
          p.no,
          p.name,
          p.key,
          p.length ?? '',
          p.mode,
          p.value,
          p.unit,
        ].map(csvEscape).join(','))
      }
    }
  }
  return `\ufeff${lines.join('\r\n')}\r\n`
}
