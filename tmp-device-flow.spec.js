const { test, expect } = require('playwright/test')
const fs = require('fs')

const baseUrl = 'http://localhost'
const executablePath =
  'C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe'

test.use({
  launchOptions: {
    executablePath
  },
  viewport: {
    width: 1440,
    height: 1200
  }
})

test('device asset and workorder flow smoke', async ({ page }) => {
  test.setTimeout(120000)
  const logs = []
  const record = (name, detail) => {
    logs.push(`${name}: ${detail}`)
    console.log(`${name}: ${detail}`)
  }

  let firstRow
  let firstDeviceCode
  let currentOperatorName = ''

  await test.step('login', async () => {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' })
    const loginForm = page.locator('.login-form:visible').first()
    await loginForm.locator('input:visible').first().fill('admin')
    await loginForm.locator('input[type="password"]:visible').first().fill('admin123')
    await loginForm.getByRole('button', { name: '登录', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.includes('/login'))
    record('登录', page.url())
  })

  await test.step('device list and export', async () => {
    await page.goto(`${baseUrl}/asset/device`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.el-table__body-wrapper tbody tr')
    firstRow = page.locator('.el-table__body-wrapper tbody tr').first()
    firstDeviceCode = (
      ((await firstRow.locator('td').nth(0).locator('.font-600').textContent()) || '').trim()
    )
    const firstBatteryCell = ((await firstRow.locator('td').nth(7).textContent()) || '').trim()
    record('设备台账', `${firstDeviceCode} / ${firstBatteryCell}`)

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '导出' }).click()
    await page.getByRole('button', { name: '确定' }).click()
    const download = await downloadPromise
    const filePath = `D:\\bamboo\\翼安智链\\tmp-device-export-${Date.now()}.xls`
    await download.saveAs(filePath)
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).toContain('责任人')
    expect(content).toContain('标配电池SN列表')
    record('设备导出', '已校验导出字段包含责任人与标配电池SN列表')
  })

  await test.step('edit dialog field alignment', async () => {
    await firstRow.getByRole('button', { name: '编辑' }).click()
    const dialog = page.locator('.el-dialog').last()
    await expect(dialog.getByText('责任人', { exact: false })).toBeVisible()
    record('编辑弹窗字段', '责任人字段已展示')
    await dialog.getByRole('button', { name: '取消' }).click()
  })

  await test.step('detail page sections', async () => {
    await Promise.all([
      page.waitForURL(/\/asset\/device\/detail\//),
      firstRow.getByRole('button', { name: '设备详情' }).click()
    ])
    await expect(page.getByText('建档资料', { exact: true })).toBeVisible()
    await expect(page.getByText('主档资料解析结果', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '查看建档附件' })).toBeVisible()
    await expect(page.getByRole('button', { name: '关联工单列表' })).toBeVisible()
    await expect(page.locator('.card-header').filter({ hasText: '设备巡检记录' })).toBeVisible()
    record('设备详情', '建档资料、解析结果、巡检记录与关联工单列表入口均已展示')
  })

  await test.step('inspection submit and redirect back to detail', async () => {
    await page.getByRole('button', { name: '设备巡检' }).click()
    await page.waitForURL(/\/asset\/device\/detail\/\d+\/inspection/)
    await expect(page.locator('.card-header').filter({ hasText: '巡检记录' })).toHaveCount(0)

    const inspectorInput = page.locator('.el-form-item').filter({ hasText: '巡检人' }).locator('input')
    await expect(inspectorInput).toBeDisabled()
    currentOperatorName = ((await inspectorInput.inputValue()) || '').trim()
    expect(currentOperatorName.length).toBeGreaterThan(0)

    const cycleSelect = page.locator('.el-form-item').filter({ hasText: '巡检周期' }).locator('.el-select')
    await cycleSelect.click()
    await page.getByText('30天例行巡检', { exact: true }).last().click()

    const structureFormItem = page.locator('.el-form-item').filter({ hasText: '结构与外观' })
    await structureFormItem.locator('.el-checkbox').nth(0).click()
    await structureFormItem.locator('textarea').fill('结构与外观存在轻微异常，已记录。')
    await page.locator('.el-form-item').filter({ hasText: '照片/附件说明' }).locator('input').fill('自动化冒烟巡检证据')
    await page.locator('.el-form-item').filter({ hasText: '巡检备注' }).locator('textarea').fill('自动化冒烟巡检提交')
    await page.getByRole('button', { name: '提交巡检' }).click()

    await page.waitForURL(/\/asset\/device\/detail\/\d+\?anchor=inspection/)
    await expect(page.locator('.card-header').filter({ hasText: '设备巡检记录' })).toBeVisible()
    await expect(page.getByText(currentOperatorName, { exact: false }).first()).toBeVisible()
    record('设备巡检', `提交后已回到详情并定位到巡检记录，操作人自动带入 ${currentOperatorName}`)
  })

  await test.step('workorder jump with device filter', async () => {
    await page.getByRole('button', { name: '关联工单列表' }).click()
    await page.waitForURL(/\/workorder\/list/)
    await expect(page).toHaveURL(new RegExp(`deviceCode=${firstDeviceCode}`))
    await expect(page.getByPlaceholder('工单编号 / 设备编号 / 提交人 / 责任人')).toHaveValue(firstDeviceCode)
    await expect(page.getByRole('tab', { name: /执行中/ })).toBeVisible()
    record('关联工单跳转', `已带入设备筛选 ${firstDeviceCode}`)
  })

  await test.step('import template field check', async () => {
    await page.goto(`${baseUrl}/asset/import`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.card-header').filter({ hasText: '模板字段说明' })).toBeVisible()
    await expect(page.getByText('责任人').first()).toBeVisible()
    record('导入模板字段', '责任人字段已包含在模板说明中')
  })

  await test.step('battery list and detail fallback', async () => {
    await page.goto(`${baseUrl}/asset/battery`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=YA-BT-00891', { timeout: 15000 })
    const firstBatteryRow = page.locator('.el-table__body-wrapper tbody tr').first()
    const firstBatteryCode = (
      ((await firstBatteryRow.locator('td').nth(0).locator('.font-600').textContent()) || '').trim()
    )
    await Promise.all([
      page.waitForURL(/\/asset\/battery\/detail\//),
      firstBatteryRow.locator('button').nth(1).click()
    ])
    await expect(page.locator('.summary-card').first()).toBeVisible()
    record('电池详情', `本地回退数据已可打开 ${firstBatteryCode} 详情页`)
  })

  await test.step('workorder creator auto-filled', async () => {
    await page.goto(`${baseUrl}/workorder/create`, { waitUntil: 'networkidle' })
    const creatorInput = page.locator('.el-form-item').filter({ hasText: '提交人' }).locator('input')
    await expect(creatorInput).toBeDisabled()
    await expect(creatorInput).toHaveValue(currentOperatorName)
    record('工单提交人', '当前登录人已自动带入且不可编辑')
  })

  await test.step('workorder board prototype skeleton', async () => {
    await page.goto(`${baseUrl}/workorder/board`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: '查看工单列表' })).toBeVisible()
    await expect(page.getByRole('button', { name: '新建工单' })).toBeVisible()
    await expect(page.getByText('工单总量', { exact: true })).toBeVisible()
    await expect(page.getByText('工单阶段看板', { exact: true })).toBeVisible()
    record('工单看板骨架', '筛选、统计卡与阶段看板均已展示')
  })

  await test.step('workorder detail prototype skeleton', async () => {
    await page.goto(`${baseUrl}/workorder/detail/104`, { waitUntil: 'networkidle' })
    await expect(page.getByText('工单 WO-20260510-011', { exact: true })).toBeVisible()
    await expect(page.getByText('复检结果', { exact: true })).toBeVisible()
    await expect(page.getByText('日志与附件', { exact: true })).toBeVisible()
    await expect(page.getByText('工单时间轴', { exact: true })).toBeVisible()
    await expect(page.getByText('当前动作', { exact: true })).toBeVisible()
    record('工单详情骨架', '基础信息、阶段结果、日志附件、时间轴与当前动作均已展示')
  })

  await test.step('release review page skeleton', async () => {
    await page.goto(`${baseUrl}/workorder/release?orderId=104`, { waitUntil: 'networkidle' })
    await expect(page.getByText('放行审核 / WO-20260510-011', { exact: true })).toBeVisible()
    await expect(page.getByText('审核依据', { exact: true })).toBeVisible()
    await expect(page.getByText('挂载电池核验', { exact: true })).toBeVisible()
    await expect(page.getByText('审核结论', { exact: true })).toBeVisible()
    record('放行审核骨架', '放行详情、审核依据和挂载电池核验均已展示')
  })

  console.log(`SMOKE_OK ${logs.length}`)
})
