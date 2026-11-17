// 参数卡片布局的兜底配置（可直接修改本文件后重新构建查看器）。
//
// 正式配置入口是网管系统的参数模板 XML：
//   <Layout DefaultMinRowsPerColumn="8">
//     <Category Name="设备状态信息" MinRowsPerColumn="12" />
//   </Layout>
// 快照会原样携带生效后的 Layout；这里只用于缺少布局信息的异常文件。
//
// MinRowsPerColumn 表示每列固定显示多少个参数（最后一列可不足）：
// 列数 = ceil(参数总数 / 该值)。
export const DEVICE_PARAM_LAYOUT = {
  defaultMinRowsPerColumn: 8,
  byDeviceType: {},
  byCategory: {
    // 中频板状态信息: 16,
  },
}
