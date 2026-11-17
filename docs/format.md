# 参数快照格式（param-snapshot XML）

网管系统把设备参数模板导出为参数快照 XML。模板里的参数定义保持不变，只在
`<Parameter>` 上增加当前值 `Value`，并原样保留模板的 `<Layout>`，因此网管系统、
轮询参数弹窗和参数快照查看器使用同一套分类、排序与分列配置。

快照是只读数据文件，本工具不依赖网管接口。

## 根节点

单台设备和整批设备使用同一个根节点，整批文件只是包含多个 `<Snapshot>`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ParamSnapshots FormatVersion="3" ExportedAt="2026-11-17T10:00:00+08:00">
  <Snapshot ...>
    ...
  </Snapshot>
</ParamSnapshots>
```

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `FormatVersion` | string | 固定为 `3`；本工具只接受精确的当前版本 |
| `ExportedAt` | string | 导出时间，本地时区 ISO 字符串 |

根节点下可以有一个或多个 `<Snapshot>`。单台导出与“导出整批”使用完全相同的结构，
批次文件不再使用 JSON 数组。

## Snapshot

```xml
<Snapshot
  DeviceName="测试近端机"
  DeviceTypeName="WJQ400D数字光纤直放站近端机"
  DevId="21120006"
  DevSubId="0"
  DevType="203"
  DeviceIp="192.168.16.30"
  PollResult="success"
  PollResultLabel="完成"
  CollectedAt="2026-11-17T09:59:00"
  FinishedAt="2026-11-17T09:59:06">
  <Parameters>...</Parameters>
  <Layout>...</Layout>
</Snapshot>
```

| 属性 | 说明 |
| --- | --- |
| `DeviceName` | 设备名称 |
| `DeviceTypeName` | 设备类型名称 |
| `DevId` | 设备 ID |
| `DevSubId` | 设备子 ID |
| `DevType` | 设备类型编号 |
| `DeviceIp` | 设备 IP |
| `PollResult` | 轮询结果原始值，如 `success`／`fail` |
| `PollResultLabel` | 轮询结果中文文案，如 `完成` |
| `CollectedAt` | 采集开始时间，本地时间字符串 |
| `FinishedAt` | 采集结束时间 |

## Parameters

`<Parameters>` 下是与设备参数模板相同的扁平 `<Parameter>` 列表，按模板项顺序导出。
每项保留模板字段，并增加 `Value`：

```xml
<Parameters>
  <Parameter
    ObjectId="0x0573"
    Name="设备温度"
    DataType="sint2"
    Length="2"
    ShowType="TextBox"
    ReadOnly="true"
    IsAlarm="false"
    Sort="3"
    Unit="℃"
    CategoryName="设备状态信息"
    Value="40.0" />
</Parameters>
```

| 属性 | 说明 |
| --- | --- |
| `ObjectId` | 参数对象标识的十六进制文本，如 `0x0573`，是参数主键 |
| `Name` | 参数名称 |
| `DataType` | 模板数据类型，可选 |
| `Length` | 参数长度（字节） |
| `ShowType` | 模板控件类型，可选 |
| `ReadOnly` | 是否只读，`true`／`false` |
| `IsAlarm` | 模板告警标记，可选 |
| `Sort` | 模板项排序号；查看器按此值升序展示，缺失时按对象标识兜底 |
| `Unit` | 单位，可能为空 |
| `CategoryName` | 所属分类；缺失时归入“未分类” |
| `Value` | 当前值（已按协议解释后的展示值）；缺失或空字符串表示本次没有值 |
| `ValueExplain` | 模板值说明，可选，查看器用作提示 |

快照应基于设备的完整参数模板导出（设备明确否认的未知对象除外）：本次没有
采集到值的参数仍保留在文件中，`Value` 为空即可。这样查看器显示的分类、
参数数量和分列都与网管系统一致。

## Layout

`<Layout>` 与参数模板 XML 的布局节点一致：

```xml
<Layout DefaultMinRowsPerColumn="8">
  <Category Name="设备基本信息" MinRowsPerColumn="10" Sort="2" />
  <Category Name="设备状态信息" MinRowsPerColumn="8" Sort="3" />
  <Category Name="一键查询" MinRowsPerColumn="4" Sort="1" />
</Layout>
```

| 属性 | 说明 |
| --- | --- |
| `DefaultMinRowsPerColumn` | 模板默认每列固定行数，合法范围为 `1..10000` |
| `Category.Name` | 分类名称 |
| `Category.MinRowsPerColumn` | 分类级覆盖值 |
| `Category.Sort` | 可选。分类页签顺序 |

查看器按 `Category.Sort` 升序显示分类；未配置的分类排在已配置分类之后。
`Layout` 中没有列出的分类使用 `DefaultMinRowsPerColumn`，没有 `Layout` 的异常文件
才使用查看器本地兜底配置。

## 分列规则

参数按 `Sort` 从小到大、从上到下填满一列后再进入下一列。
`MinRowsPerColumn` 表示“每列固定显示多少个参数（最后一列可不足）”：

- 列数 = `ceil(参数总数 / MinRowsPerColumn)`；
- 除最后一列外，每列固定填满该条数；
- 参数总数不足配置值时只保留一列；
- 示例：12 个参数、配置 `8` → 两列，分别为 8 和 4；
- 列数超出窗口宽度时使用横向滚动，参数区不使用纵向滚动。

## 示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ParamSnapshots FormatVersion="3" ExportedAt="2026-11-17T10:00:00+08:00">
  <Snapshot
    DeviceName="测试近端机"
    DeviceTypeName="WJQ400D数字光纤直放站近端机"
    DevId="21120006"
    DevSubId="0"
    DevType="203"
    DeviceIp="192.168.16.30"
    PollResult="success"
    PollResultLabel="完成"
    CollectedAt="2026-11-17T09:59:00"
    FinishedAt="2026-11-17T09:59:06">
    <Parameters>
      <Parameter ObjectId="0x0001" Name="设备厂商代码" DataType="uint1" Length="1" ShowType="TextBox" ReadOnly="false" IsAlarm="false" Sort="2" CategoryName="设备基本信息" Value="10" />
      <Parameter ObjectId="0x0573" Name="设备温度" DataType="sint2" Length="2" ShowType="TextBox" ReadOnly="true" IsAlarm="false" Sort="3" Unit="℃" CategoryName="设备状态信息" Value="40.0" />
    </Parameters>
    <Layout DefaultMinRowsPerColumn="8">
      <Category Name="设备基本信息" MinRowsPerColumn="10" Sort="2" />
      <Category Name="设备状态信息" MinRowsPerColumn="8" Sort="3" />
    </Layout>
  </Snapshot>
</ParamSnapshots>
```

## 版本规则

- 本工具只接受 `FormatVersion="3"` 的 XML 快照，不提供 JSON 或旧版 XML 兼容分支。
- 遇到旧版 JSON 快照、`FormatVersion` 为 `1`／`2` 或缺失时，提示使用网管系统重新导出 XML。
- 遇到高于 `3` 的版本时提示升级查看器，不猜测字段含义。
- 新增可选属性不升版本；删除、改名或改变语义必须提升 `FormatVersion`。
- 同一设备、同一采集时间的快照视为同一份数据，重复导入会被跳过。
- 为确保离线安全，含 `DOCTYPE`／`ENTITY` 的 XML 会被拒绝。
