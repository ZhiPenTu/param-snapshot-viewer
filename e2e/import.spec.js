import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name) => path.join(here, 'fixtures', name)

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('导入多份快照后可切换设备并查看分类参数', async ({ page }) => {
  await expect(page.getByText('把网管系统导出的参数快照拖到这里')).toBeVisible()

  await page.setInputFiles('input[type="file"]', [fixture('snapshot-near.xml'), fixture('snapshot-remote.xml')])

  const items = page.locator('.snapshot-item')
  await expect(items).toHaveCount(2)
  await expect(page.locator('.toolbar-meta')).toHaveText('已导入 2 份')

  // 默认展示最后导入的一份
  await expect(page.locator('.device-header-strip')).toContainText('测试远端机')
  await expect(page.locator('.device-header-strip')).toContainText('设备IP:192.0.2.31')
  await expect(page.locator('.param-tab')).toHaveCount(2)

  // 切回第一份，检查卡片内容
  await items.filter({ hasText: '测试近端机' }).click()
  await expect(page.locator('.device-header-strip')).toContainText('WJQ400D数字光纤直放站近端机')
  const rows = page.locator('.param-card')
  await expect(rows).toHaveCount(6)
  await expect(rows.first()).toContainText('设备厂商代码')
  await expect(rows.first().locator('input')).toHaveValue('10')

  // 切换分类页签
  await page.locator('.param-tab', { hasText: '设备状态信息' }).click()
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(1)).toContainText('机内温度')
  await expect(rows.nth(1).locator('input')).toHaveValue('36.5')
})

test('搜索可跨分类命中参数', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', fixture('snapshot-near.xml'))
  await page.locator('.param-search input').fill('光功率')
  await expect(page.locator('.param-grid-selected')).toContainText('命中 1 个')
  await expect(page.locator('.param-card')).toHaveCount(1)
  await expect(page.locator('.param-card').first()).toContainText('输入光功率')
})

test('参数按 sort 升序列优先排列，并按快照配置固定行数分列', async ({ page }) => {
  const parameters = Array.from({ length: 30 }, (_, index) => ({
    key: `0x${(index + 1).toString(16).toUpperCase().padStart(4, '0')}`,
    objectId: index + 1,
    // 故意让 sort 与 objectId 反向，验证查看器没有按 objectId 覆盖排序。
    sort: 30 - index,
    name: `参数${index + 1}`,
    length: 1,
    readOnly: true,
    value: String(index + 1),
    unit: '',
  }))
  const parameterXml = parameters.map((parameter) => (
    `<Parameter ObjectId="${parameter.key}" Name="${parameter.name}" DataType="uint1" Length="1" `
    + `ShowType="TextBox" ReadOnly="true" IsAlarm="false" Sort="${parameter.sort}" `
    + `CategoryName="中频板状态信息" Value="${parameter.value}" />`
  )).join('')
  const snapshotXml = `<?xml version="1.0" encoding="UTF-8"?>
<ParamSnapshots FormatVersion="3" ExportedAt="2026-11-04T10:00:00+08:00">
  <Snapshot DeviceName="布局测试设备" DeviceTypeName="测试类型" DevId="1" DevSubId="0" DevType="203"
    DeviceIp="192.0.2.1" PollResult="success" PollResultLabel="完成"
    CollectedAt="2026-11-04T10:00:00" FinishedAt="2026-11-04T10:00:05">
    <Parameters>${parameterXml}</Parameters>
    <Layout DefaultMinRowsPerColumn="8">
      <Category Name="中频板状态信息" MinRowsPerColumn="8" Sort="1" />
    </Layout>
  </Snapshot>
</ParamSnapshots>`

  await page.setInputFiles('input[type="file"]', {
    name: 'layout.xml',
    mimeType: 'application/xml',
    buffer: Buffer.from(snapshotXml),
  })

  const columns = page.locator('.param-card-column')
  await expect(columns).toHaveCount(4)
  await expect(columns.nth(0).locator('.param-card')).toHaveCount(8)
  await expect(columns.nth(1).locator('.param-card')).toHaveCount(8)
  await expect(columns.nth(2).locator('.param-card')).toHaveCount(8)
  await expect(columns.nth(3).locator('.param-card')).toHaveCount(6)
  await expect(columns.nth(0).locator('.param-card').first()).toContainText('参数30')
  await expect(columns.nth(0).locator('.param-card').last()).toContainText('参数23')
  await expect(columns.nth(1).locator('.param-card').first()).toContainText('参数22')
  await expect(columns.nth(3).locator('.param-card').last()).toContainText('参数1')
})

test('12 个参数按每列 8 行分成 8/4 两列', async ({ page }) => {
  const parameterXml = Array.from({ length: 12 }, (_, index) => (
    `<Parameter ObjectId="0x${(index + 1).toString(16).toUpperCase().padStart(4, '0')}" `
    + `Name="参数${index + 1}" Length="1" ReadOnly="true" Sort="${index + 1}" `
    + `CategoryName="设备状态信息" Value="${index + 1}" />`
  )).join('')
  const snapshotXml = `<?xml version="1.0"?>
<ParamSnapshots FormatVersion="3" ExportedAt="2026-11-04T10:00:00+08:00">
  <Snapshot DeviceName="两列测试设备" DevId="2" DevType="203" DeviceIp="192.0.2.2">
    <Parameters>${parameterXml}</Parameters>
    <Layout DefaultMinRowsPerColumn="8">
      <Category Name="设备状态信息" MinRowsPerColumn="8" Sort="1" />
    </Layout>
  </Snapshot>
</ParamSnapshots>`
  await page.setInputFiles('input[type="file"]', {
    name: 'two-columns.xml',
    mimeType: 'application/xml',
    buffer: Buffer.from(snapshotXml),
  })

  const columns = page.locator('.param-card-column')
  await expect(columns).toHaveCount(2)
  await expect(columns.nth(0).locator('.param-card')).toHaveCount(8)
  await expect(columns.nth(1).locator('.param-card')).toHaveCount(4)
})

test('分类页签按 Layout.Sort 排列', async ({ page }) => {
  const snapshotXml = `<?xml version="1.0"?>
<ParamSnapshots FormatVersion="3" ExportedAt="2026-11-04T10:00:00+08:00">
  <Snapshot DeviceName="分类排序测试" DevId="3" DevType="203" DeviceIp="192.0.2.3">
    <Parameters>
      <Parameter ObjectId="0x0101" Name="后置分类参数" Length="1" ReadOnly="true" Sort="1" CategoryName="设备状态信息" Value="1" />
      <Parameter ObjectId="0x0001" Name="前置分类参数" Length="1" ReadOnly="true" Sort="1" CategoryName="设备基本信息" Value="2" />
    </Parameters>
    <Layout DefaultMinRowsPerColumn="8">
      <Category Name="设备基本信息" MinRowsPerColumn="8" Sort="1" />
      <Category Name="设备状态信息" MinRowsPerColumn="8" Sort="2" />
    </Layout>
  </Snapshot>
</ParamSnapshots>`
  await page.setInputFiles('input[type="file"]', {
    name: 'category-order.xml',
    mimeType: 'application/xml',
    buffer: Buffer.from(snapshotXml),
  })

  await expect(page.locator('.param-tab')).toHaveText([
    /设备基本信息\s*1/,
    /设备状态信息\s*1/,
  ])
})

test('重复导入同一份快照会跳过', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', fixture('snapshot-near.xml'))
  await page.setInputFiles('input[type="file"]', fixture('snapshot-near.xml'))
  await expect(page.locator('.snapshot-item')).toHaveCount(1)
  await expect(page.locator('.el-message--warning')).toContainText('已经导入过了')
})

test('拒绝旧版 JSON 快照并提示使用 XML 重新导出', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', fixture('snapshot-v1.json'))

  await expect(page.locator('.el-message--error')).toContainText('这是旧版 JSON 快照')
  await expect(page.locator('.el-message--error')).toContainText('重新导出 XML 快照')
  await expect(page.locator('.snapshot-item')).toHaveCount(0)
  await expect(page.locator('.toolbar-meta')).toHaveText('已导入 0 份')
})

test('拒绝旧版 XML 快照并提示重新导出', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', fixture('snapshot-v2.xml'))

  await expect(page.locator('.el-message--error')).toContainText('快照格式版本 2 已不再支持')
  await expect(page.locator('.el-message--error')).toContainText('重新导出 XML 快照')
  await expect(page.locator('.snapshot-item')).toHaveCount(0)
})

test('拒绝高于支持版本的 XML 快照并提示升级查看器', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', {
    name: 'snapshot-v4.xml',
    mimeType: 'application/xml',
    buffer: Buffer.from(
      '<?xml version="1.0"?><ParamSnapshots FormatVersion="4" ExportedAt="2026-11-04T10:00:00+08:00" />',
    ),
  })

  await expect(page.locator('.el-message--error')).toContainText('快照格式版本 4 高于本工具支持的版本 3')
  await expect(page.locator('.snapshot-item')).toHaveCount(0)
})

test('拒绝包含 DOCTYPE 或 ENTITY 声明的 XML', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', {
    name: 'unsafe.xml',
    mimeType: 'application/xml',
    buffer: Buffer.from(
      '<?xml version="1.0"?>'
      + '<!DOCTYPE ParamSnapshots [<!ENTITY unsafe "value">]>'
      + '<ParamSnapshots FormatVersion="3"><Snapshot DeviceName="测试">&unsafe;</Snapshot></ParamSnapshots>',
    ),
  })

  await expect(page.locator('.el-message--error')).toContainText('不允许包含 DOCTYPE 或 ENTITY')
  await expect(page.locator('.snapshot-item')).toHaveCount(0)
})

test('拒绝重复 ObjectId 的快照', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', {
    name: 'duplicate-object-id.xml',
    mimeType: 'application/xml',
    buffer: Buffer.from(
      '<?xml version="1.0"?>'
      + '<ParamSnapshots FormatVersion="3" ExportedAt="2026-11-04T10:00:00+08:00">'
      + '<Snapshot DeviceName="重复参数测试" DevId="4" DevType="203"><Parameters>'
      + '<Parameter ObjectId="0x0001" Name="参数A" CategoryName="设备基本信息" Value="1" />'
      + '<Parameter ObjectId="0x0001" Name="参数B" CategoryName="设备基本信息" Value="2" />'
      + '</Parameters></Snapshot></ParamSnapshots>',
    ),
  })

  await expect(page.locator('.el-message--error')).toContainText('重复 ObjectId')
  await expect(page.locator('.snapshot-item')).toHaveCount(0)
})

test('FormatVersion 必须精确为 3', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', {
    name: 'version-3.0.xml',
    mimeType: 'application/xml',
    buffer: Buffer.from(
      '<?xml version="1.0"?><ParamSnapshots FormatVersion="3.0" ExportedAt="2026-11-04T10:00:00+08:00" />',
    ),
  })

  await expect(page.locator('.el-message--error')).toContainText('仅支持 FormatVersion="3"')
  await expect(page.locator('.snapshot-item')).toHaveCount(0)
})

test('导出当前设备 CSV 与全部 CSV', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', [fixture('snapshot-near.xml'), fixture('snapshot-remote.xml')])

  const currentDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出当前设备' }).click()
  const current = await currentDownload
  expect(current.suggestedFilename()).toMatch(/^参数快照_测试远端机_21120007_\d{8}-\d{6}\.csv$/)
  const csv = fs.readFileSync(await current.path(), 'utf8').replace(/^\ufeff/, '')
  const header = csv.split('\r\n')[0]
  expect(header).toBe('设备名称,设备ID,采集时间,分类,序号,参数名称,对象标识,length,当前值,单位')
  expect(header).not.toContain('读写属性')

  const allDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出全部' }).click()
  const all = await allDownload
  expect(all.suggestedFilename()).toMatch(/^参数快照_全部_\d{8}-\d{6}\.csv$/)
})

test('移除快照后回到空状态', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', fixture('snapshot-near.xml'))
  await page.locator('.snapshot-item').hover()
  await page.getByTitle('移除该快照').click()
  await expect(page.locator('.snapshot-item')).toHaveCount(0)
  await expect(page.getByText('把网管系统导出的参数快照拖到这里')).toBeVisible()
})

test('系统真实导出的快照可直接导入展示', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', fixture('snapshot-system-export.xml'))
  await expect(page.locator('.snapshot-item')).toHaveCount(1)
  await expect(page.locator('.device-header-strip')).toContainText('测试近端机')
  await expect(page.locator('.param-tab')).toHaveCount(2)
  const rows = page.locator('.param-card')
  await expect(rows).toHaveCount(6)
  await expect(rows.nth(4)).toContainText('监控版本信息')
  await expect(rows.nth(4).locator('input')).toHaveValue('DRTD-OMU-QZTT-SV1.0')
})

test('批次 XML 一次导入整批设备', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', fixture('snapshot-batch.xml'))

  const items = page.locator('.snapshot-item')
  await expect(items).toHaveCount(2)
  await expect(page.locator('.toolbar-meta')).toHaveText('已导入 2 份')

  // 默认展示文件中的最后一份
  await expect(page.locator('.device-header-strip')).toContainText('测试远端机')
  await items.filter({ hasText: '测试近端机' }).click()
  await expect(page.locator('.device-header-strip')).toContainText('测试近端机')
  await expect(page.locator('.param-tab')).toHaveCount(2)
})

test('拖拽批次 XML 同样导入整批设备', async ({ page }) => {
  const payload = fs.readFileSync(fixture('snapshot-batch.xml'), 'utf8')
  const dataTransfer = await page.evaluateHandle((text) => {
    const dt = new DataTransfer()
    dt.items.add(new File([text], '轮询参数批次_测试.xml', { type: 'application/xml' }))
    return dt
  }, payload)

  await page.locator('.detail-pane').dispatchEvent('drop', { dataTransfer })

  await expect(page.locator('.snapshot-item')).toHaveCount(2)
  await expect(page.locator('.toolbar-meta')).toHaveText('已导入 2 份')
})

test('快照列表可以收起并展开', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', fixture('snapshot-near.xml'))
  await expect(page.locator('.snapshot-item')).toHaveCount(1)

  await page.getByRole('button', { name: '收起快照列表' }).click()
  await expect(page.locator('.snapshot-pane')).toHaveClass(/is-collapsed/)
  await expect(page.locator('.snapshot-item')).toHaveCount(0)

  await page.getByRole('button', { name: '展开快照列表' }).click()
  await expect(page.locator('.snapshot-pane')).not.toHaveClass(/is-collapsed/)
  await expect(page.locator('.snapshot-item')).toHaveCount(1)
})

test('浏览器预览中检查更新会提示仅在桌面版可用', async ({ page }) => {
  await page.getByRole('button', { name: '检查更新' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.el-alert--error')).toContainText('浏览器预览')
})
