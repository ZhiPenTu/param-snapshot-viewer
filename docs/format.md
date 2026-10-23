# 参数快照格式（param-snapshot）

网管系统在「轮询结果 → 查看参数」里把单台设备的全部参数导出为一个 JSON 文件，本工具只读取该文件，不依赖任何接口。

## 顶层字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `format` | string | 固定为 `param-snapshot` |
| `version` | number | 格式版本，当前为 `1` |
| `exportedAt` | string | 导出时间，本地时区 ISO 字符串，如 `2026-10-23T13:22:05+08:00` |
| `device` | object | 设备信息 |
| `categories` | array | 参数分类，按导出顺序展示 |

## device

| 字段 | 说明 |
| --- | --- |
| `name` | 设备名称 |
| `typeName` | 设备类型名称 |
| `devId` | 设备 ID |
| `devSubId` | 设备子 ID |
| `ip` | 设备 IP |
| `pollResult` | 轮询结果原始值，如 `success`／`fail` |
| `pollResultLabel` | 轮询结果中文文案，如 `完成` |
| `collectedAt` | 采集开始时间，本地时间字符串 `YYYY-MM-DDTHH:mm:ss` |
| `finishedAt` | 采集结束时间 |

## categories

每个分类包含 `name` 与 `parameters`。参数项：

| 字段 | 说明 |
| --- | --- |
| `key` | 参数对象标识的十六进制文本，如 `0x0001`，是参数的主键 |
| `objectId` | 对象标识的十进制值 |
| `name` | 参数名称 |
| `length` | 参数长度（字节） |
| `mode` | 读写属性文案，如 `可读可设置`／`只读` |
| `readOnly` | 是否只读 |
| `value` | 当前值（已按协议解释后的展示值） |
| `unit` | 单位，可能为空字符串 |

## 示例

```json
{
  "format": "param-snapshot",
  "version": 1,
  "exportedAt": "2026-10-23T13:22:05+08:00",
  "device": {
    "name": "测试近端机",
    "typeName": "WJQ400D数字光纤直放站近端机",
    "devId": 21120006,
    "devSubId": 0,
    "ip": "192.0.2.30",
    "pollResult": "success",
    "pollResultLabel": "完成",
    "collectedAt": "2026-10-23T13:22:05",
    "finishedAt": "2026-10-23T13:22:11"
  },
  "categories": [
    {
      "name": "设备基本信息",
      "parameters": [
        {
          "key": "0x0001",
          "objectId": 1,
          "name": "设备厂商代码",
          "length": 1,
          "mode": "可读可设置",
          "readOnly": false,
          "value": "10",
          "unit": ""
        }
      ]
    }
  ]
}
```

## 版本规则

- 新增可选字段不升版本；本工具忽略未知字段。
- 删除字段、改名、改变语义必须提升 `version`，导出方与工具同步升级。
- 工具遇到高于支持版本的快照会拒绝导入并提示升级，不猜测字段含义。
- 同一设备、同一采集时间的快照视为同一份数据，重复导入会被跳过。
