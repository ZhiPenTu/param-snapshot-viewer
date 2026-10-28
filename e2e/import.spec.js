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

  await page.setInputFiles('input[type="file"]', [fixture('snapshot-near.json'), fixture('snapshot-remote.json')])

  const items = page.locator('.snapshot-item')
  await expect(items).toHaveCount(2)
  await expect(page.locator('.toolbar-meta')).toHaveText('已导入 2 份')

  // 默认展示最后导入的一份
  await expect(page.locator('.device-header-strip')).toContainText('测试远端机')
  await expect(page.locator('.device-header-strip')).toContainText('设备IP:192.0.2.31')
  await expect(page.locator('.param-tab')).toHaveCount(2)

  // 切回第一份，检查表格内容
  await items.filter({ hasText: '测试近端机' }).click()
  await expect(page.locator('.device-header-strip')).toContainText('WJQ400D数字光纤直放站近端机')
  const rows = page.locator('.el-table__body-wrapper tbody tr')
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
  await page.setInputFiles('input[type="file"]', fixture('snapshot-near.json'))
  await page.locator('.param-search input').fill('光功率')
  await expect(page.locator('.search-summary')).toContainText('命中 1 个')
  await expect(page.locator('.el-table__body-wrapper tbody tr')).toHaveCount(1)
  await expect(page.locator('.el-table__body-wrapper tbody tr').first()).toContainText('输入光功率')
})

test('重复导入同一份快照会跳过', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', fixture('snapshot-near.json'))
  await page.setInputFiles('input[type="file"]', fixture('snapshot-near.json'))
  await expect(page.locator('.snapshot-item')).toHaveCount(1)
  await expect(page.locator('.el-message--warning')).toContainText('已经导入过了')
})

test('导出当前设备 CSV 与全部 CSV', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', [fixture('snapshot-near.json'), fixture('snapshot-remote.json')])

  const currentDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出当前设备' }).click()
  const current = await currentDownload
  expect(current.suggestedFilename()).toMatch(/^参数快照_测试远端机_21120007_\d{8}-\d{6}\.csv$/)

  const allDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出全部' }).click()
  const all = await allDownload
  expect(all.suggestedFilename()).toMatch(/^参数快照_全部_\d{8}-\d{6}\.csv$/)
})

test('移除快照后回到空状态', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', fixture('snapshot-near.json'))
  await page.locator('.snapshot-item').hover()
  await page.getByTitle('移除该快照').click()
  await expect(page.locator('.snapshot-item')).toHaveCount(0)
  await expect(page.getByText('把网管系统导出的参数快照拖到这里')).toBeVisible()
})

test('系统真实导出的快照可直接导入展示', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', fixture('snapshot-system-export.json'))
  await expect(page.locator('.snapshot-item')).toHaveCount(1)
  await expect(page.locator('.device-header-strip')).toContainText('测试近端机')
  await expect(page.locator('.param-tab')).toHaveCount(2)
  const rows = page.locator('.el-table__body-wrapper tbody tr')
  await expect(rows).toHaveCount(6)
  await expect(rows.nth(4)).toContainText('监控版本信息')
  await expect(rows.nth(4).locator('input')).toHaveValue('DRTD-OMU-QZTT-SV1.0')
})

test('批次数组文件一次导入整批设备', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', fixture('snapshot-batch.json'))

  const items = page.locator('.snapshot-item')
  await expect(items).toHaveCount(2)
  await expect(page.locator('.toolbar-meta')).toHaveText('已导入 2 份')

  // 默认展示数组最后一份
  await expect(page.locator('.device-header-strip')).toContainText('测试远端机')
  await items.filter({ hasText: '测试近端机' }).click()
  await expect(page.locator('.device-header-strip')).toContainText('测试近端机')
  await expect(page.locator('.param-tab')).toHaveCount(2)
})

test('拖拽批次数组文件同样导入整批设备', async ({ page }) => {
  const payload = fs.readFileSync(fixture('snapshot-batch.json'), 'utf8')
  const dataTransfer = await page.evaluateHandle((text) => {
    const dt = new DataTransfer()
    dt.items.add(new File([text], '轮询参数批次_测试.json', { type: 'application/json' }))
    return dt
  }, payload)

  await page.locator('.detail-pane').dispatchEvent('drop', { dataTransfer })

  await expect(page.locator('.snapshot-item')).toHaveCount(2)
  await expect(page.locator('.toolbar-meta')).toHaveText('已导入 2 份')
})

test('快照列表可以收起并展开', async ({ page }) => {
  await page.setInputFiles('input[type="file"]', fixture('snapshot-near.json'))
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
